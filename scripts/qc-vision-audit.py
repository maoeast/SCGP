#!/usr/bin/env python3
"""qc_vision_audit.py — 图片提交 apimart 中继视觉模型审核判票。

背景（2026-09-02 实测）：2k PNG（2.3-3.2MB）直接 base64 提交给
api.apib.ai /v1/chat/completions 会返回 HTTP 413（Payload Too Large）。
提交前必须把图压缩到最长边 <=1024px 的 JPEG q88（约 100KB），
这是 2026-08-24 验证过的可行方案。

用法：
  python scripts/qc-vision-audit.py --cwd G:/SCGP_Rec/AIimages \
      "AIimages/selfcare-makebed-step2.png"
  python scripts/qc-vision-audit.py --cwd G:/SCGP_Rec/AIimages \
      --action "拉住床单四角拉平整" AIimages/selfcare-makebed-step2.png
  python scripts/qc-vision-audit.py --cwd G:/SCGP_Rec/AIimages \
      --config AIimages/config.json AIimages/selfcare-sweep-step2.png
  python scripts/qc-vision-audit.py --cwd G:/SCGP_Rec/AIimages \
      --report audit-result.json AIimages/selfcare-sweep-step2.png

要点：
- config.json 读取顺序：<cwd>/config.json  ->  <cwd>/AIimages/config.json
- 每张图独立一次请求（互不影响），默认输出单张判定（行内打印 + --report 汇总）
- 判票要求模型回复含【结论】pass/fail；未含则按防橡皮图章策略重试
  （默认最多 3 次），仍失败则该图标记为 UNKNOWN
- 零第三方 HTTP 依赖（urllib）；图像压缩用 Pillow
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_ENDPOINT = "https://api.apib.ai/v1/chat/completions"
DEFAULT_MODEL = "gpt-4o"
DEFAULT_MAX_WIDTH = 1024
DEFAULT_JPEG_QUALITY = 88
DEFAULT_RETRIES = 3
USER_AGENT = "SCGP-QcVisionAudit/1.0"

DEFAULT_CHECKLIST = (
    "请以严格的图片审核员身份检查这张儿童生活自理教学插画，逐项回答：\n"
    "1. 角色数量：画面中是否只有一个男孩？\n"
    "2. 形象一致性：男孩是否为圆脸、深棕短发、黄白条纹短袖T恤、深蓝色短裤、白色短袜？\n"
    "3. 文字水印：画面中是否出现文字、字母、数字、箭头、标签、水印？\n"
    "4. 画面完整性：男孩是否头部、上身、双手、腿部完整入镜？\n"
    "5. 画风：是否为温馨儿童绘本插图（柔和水彩/彩色铅笔、纤细棕色勾线、浅色背景）？\n"
    "6. 动作匹配：画面是否符合步骤动作描述？（当前步骤：「{action}」）\n"
    "7. 【结论】: 先输出 pass 或 fail；若 fail，紧接着用一句话说明最关键的问题。"
)


def load_api_key(cwd: Path, config: str | None) -> str:
    candidates = []
    if config:
        candidates.append(Path(config))
    candidates.append(cwd / "config.json")
    candidates.append(cwd / "AIimages" / "config.json")
    for path in candidates:
        if path.is_file():
            data = json.loads(path.read_text(encoding="utf-8"))
            api_key = str(data.get("api_key", "")).strip()
            if api_key:
                return api_key
    raise FileNotFoundError(
        f"未找到含 api_key 的 config.json（尝试: {', '.join(str(p) for p in candidates)}）"
    )


def compress_to_data_url(image_path: Path, max_width: int, quality: int) -> str:
    """把图片压缩为最长边 <= max_width 的 JPEG data URL（规避 413）。"""
    from PIL import Image

    with Image.open(image_path) as img:
        img = img.convert("RGB")
        if max(img.size) > max_width:
            ratio = max_width / max(img.size)
            img = img.resize(
                (max(1, round(img.width * ratio)), max(1, round(img.height * ratio))),
                Image.LANCZOS,
            )
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}", len(buffer.getvalue())


def build_payload(
    model: str, data_url: str, checklist: str, action: str
) -> dict:
    text = checklist.format(action=action or "未提供")
    return {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": text},
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url},
                    },
                ],
            }
        ],
        "temperature": 0.2,
        "stream": True,
    }


def parse_sse_chunks(body: str) -> str:
    """解析 SSE 流（data: 行）与普通 JSON 响应，返回拼接后的助手文本。"""
    content_parts: list[str] = []
    for raw in body.splitlines():
        line = raw.strip()
        if not line.startswith("data:"):
            continue
        data = line[len("data:"):].strip()
        if not data or data == "[DONE]":
            continue
        try:
            chunk = json.loads(data)
        except json.JSONDecodeError:
            continue
        choices = chunk.get("choices") or []
        if not choices:
            continue
        delta = choices[0].get("delta") or {}
        text = delta.get("content")
        if text:
            content_parts.append(str(text))
    if content_parts:
        return "".join(content_parts)
    # 非流式兼容：取 message.content
    try:
        data = json.loads(body)
        choices = data.get("choices") or []
        if choices:
            message = choices[0].get("message") or {}
            return str(message.get("content") or "")
    except json.JSONDecodeError:
        pass
    return ""


def call_chat(endpoint: str, api_key: str, payload: dict, timeout: int = 180) -> str:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:2000]
        raise RuntimeError(
            f"审核接口 HTTP {exc.code}: {detail}（payload {len(body)} 字节）"
        ) from exc
    text = parse_sse_chunks(raw)
    if not text:
        raise RuntimeError("审核接口返回空回复（模型空回复或响应格式未知）")
    return text


def extract_verdict(text: str) -> str | None:
    """提取【结论】行：pass / fail（或 PASS/FAIL/通过/不通过）。

    当【结论】存在但值不是 pass/fail（例如描述型清单的 NA），原样返回该值，
    视为有效收尾（描述型清单不需要重试）。
    """
    match = re.search(r"【结论】\s*[:：]?\s*([^\s，。；;]+)", text)
    if not match:
        # 宽松：整篇搜索 pass / fail 单词
        lowered = text.lower()
        if re.search(r"\bpass\b", lowered):
            return "pass"
        if re.search(r"\bfail\b", lowered):
            return "fail"
        return None
    verdict = match.group(1).lower().strip()
    if verdict.startswith("pass"):
        return "pass"
    if verdict.startswith("fail"):
        return "fail"
    return match.group(1).strip()


def judge_image(
    image_path: Path,
    endpoint: str,
    api_key: str,
    model: str,
    max_width: int,
    quality: int,
    retries: int,
    action: str,
    checklist: str,
) -> dict:
    data_url, jpeg_bytes = compress_to_data_url(image_path, max_width, quality)
    payload = build_payload(model, data_url, checklist, action)
    last_error = None
    last_text = ""
    for attempt in range(1, retries + 1):
        try:
            text = call_chat(endpoint, api_key, payload)
            verdict = extract_verdict(text)
            last_text = text
            if verdict:
                return {
                    "image": str(image_path),
                    "verdict": verdict,
                    "attempt": attempt,
                    "jpeg_bytes": jpeg_bytes,
                    "text": text,
                }
            last_error = f"回复未含【结论】，尝试 {attempt}/{retries}"
        except Exception as exc:  # noqa: BLE001
            last_error = f"{type(exc).__name__}: {exc}（尝试 {attempt}/{retries}）"
        time.sleep(2)
    return {
        "image": str(image_path),
        "verdict": "UNKNOWN",
        "attempt": retries,
        "jpeg_bytes": jpeg_bytes,
        "text": last_text,
        "error": last_error,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", nargs="+", help="待审核图片路径（glob 自动展开）")
    parser.add_argument("--cwd", default=".")
    parser.add_argument("--config", default=None, help="config.json 路径（缺省自动查找）")
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--max-width", type=int, default=DEFAULT_MAX_WIDTH)
    parser.add_argument("--quality", type=int, default=DEFAULT_JPEG_QUALITY)
    parser.add_argument("--retries", type=int, default=DEFAULT_RETRIES)
    parser.add_argument("--action", default="", help="本步骤动作描述，嵌入审核清单第 6 项")
    parser.add_argument("--checklist", default=None, help="自定义审核清单文件（UTF-8）")
    parser.add_argument("--report", default=None, help="结果汇总 JSON 输出路径")
    args = parser.parse_args()

    cwd = Path(args.cwd).resolve()
    api_key = load_api_key(cwd, args.config)
    checklist = DEFAULT_CHECKLIST
    if args.checklist:
        checklist = Path(args.checklist).read_text(encoding="utf-8")

    matched: list[Path] = []
    for raw in args.images:
        pattern = Path(raw)
        if not pattern.is_absolute():
            pattern = cwd / pattern
        if pattern.is_file():
            matched.append(pattern)
        else:
            import glob as _glob

            matched.extend(
                Path(p) for p in _glob.glob(str(pattern), recursive=True)
            )
    if not matched:
        print("未匹配到任何图片文件。", file=sys.stderr)
        return 1

    results = []
    for image in matched:
        print(f"== {image} ==", flush=True)
        result = judge_image(
            image_path=image,
            endpoint=args.endpoint,
            api_key=api_key,
            model=args.model,
            max_width=args.max_width,
            quality=args.quality,
            retries=args.retries,
            action=args.action,
            checklist=checklist,
        )
        print(f"判定: {result['verdict']}  (压缩后 {result['jpeg_bytes']} 字节, "
              f"尝试 {result['attempt']} 次)", flush=True)
        if result.get("error"):
            print(f"错误: {result['error']}", file=sys.stderr)
        preview = result["text"].strip()
        if preview:
            print("---- 模型回复 ----", flush=True)
            print(preview[:4000], flush=True)
        results.append(result)

    summary = {
        "endpoint": args.endpoint,
        "model": args.model,
        "max_width": args.max_width,
        "quality": args.quality,
        "results": results,
    }
    if args.report:
        report_path = Path(args.report)
        if not report_path.is_absolute():
            report_path = cwd / report_path
        report_path.write_text(
            json.dumps(summary, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"汇总已写入: {report_path}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    raise SystemExit(main())
