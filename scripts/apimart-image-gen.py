"""
apimart 图片生成工具（图生图，batch-json 驱动）。

背景（2026-09-02）：apimart 图片入口 POST /v1/images/generations，
异步任务（task_id 轮询 GET /v1/tasks/{id}），结果在 data.result.images[].url[]。
本地参考图必须先经 POST /v1/uploads/images 换公网 URL（生成接口不支持 base64/本地路径直传）。

用法：
    python scripts/apimart-image-gen.py batch.json --cwd G:/SCGP_Rec/AIimages \
        --output G:/SCGP_Rec/AIimages/AIimages/rerun --api-key-from-env
batch.json：
{
  "defaults": { "model": "gpt-image-2", "size": "16:9", "resolution": "2k" },
  "jobs": [
    { "name": "xxx", "prompt": "...", "image_paths": ["本地路径或URL"] },
    ...
  ]
}
支持 --only name1,name2 只跑子集；--poll-timeout 600（秒/任务）。
"""
import argparse
import json
import mimetypes
import re
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

IMAGE_SUBMIT_URL = "https://api.apimart.ai/v1/images/generations"
IMAGE_TASK_URL = "https://api.apimart.ai/v1/tasks/{task_id}?language=zh"
UPLOAD_URL = "https://api.apimart.ai/v1/uploads/images"
USER_AGENT = "SCGP-Apimart-ImageGen/1.0"


def load_api_key(cwd: Path) -> str:
    candidates = [cwd / "config.json", cwd / "AIimages" / "config.json"]
    for path in candidates:
        if path.is_file():
            data = json.loads(path.read_text(encoding="utf-8"))
            api_key = str(data.get("api_key", "")).strip()
            if api_key:
                return api_key
    raise FileNotFoundError(
        f"未找到含 api_key 的 config.json（尝试: {', '.join(str(p) for p in candidates)}）"
    )


def http_json(url: str, api_key: str, payload: dict | None = None,
              method: str = "POST", timeout: int = 120) -> dict:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "User-Agent": USER_AGENT,
    }
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:1200]
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    return json.loads(body) if body else {}


def upload_image(path: Path, api_key: str) -> str:
    """multipart/form-data 上传本地图片，返回公网 URL（72h 有效）。"""
    content = path.read_bytes()
    boundary = "----SCGPBoundary" + uuid.uuid4().hex
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
        f"Content-Type: {mime}\r\n\r\n"
    ).encode("utf-8") + content + f"\r\n--{boundary}--\r\n".encode("utf-8")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "User-Agent": USER_AGENT,
    }
    request = urllib.request.Request(UPLOAD_URL, data=body, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=120) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:1200]
        raise RuntimeError(f"上传失败 HTTP {exc.code}: {detail}") from exc
    data = json.loads(raw)
    url = str(data.get("url") or "")
    if not url:
        raise RuntimeError(f"上传响应无 url: {raw[:300]}")
    return url


def resolve_image_urls(value: object, api_key: str) -> list:
    """把 image_paths/image_urls 中的本地路径换为上传 URL；URL 原样保留。"""
    if isinstance(value, str):
        value = [value]
    resolved: list[str] = []
    for item in value or []:
        text = str(item)
        if re.match(r"^https?://", text):
            resolved.append(text)
        else:
            path = Path(text)
            if path.is_file():
                resolved.append(upload_image(path, api_key))
            else:
                resolved.append(text)
    return resolved


def submit_job(job: dict, defaults: dict, api_key: str) -> dict:
    payload = dict(defaults)
    payload.update({k: v for k, v in job.items() if k != "name"})
    if "images" in payload:
        payload["image_urls"] = resolve_image_urls(payload.pop("images"), api_key)
    if "image_paths" in payload:
        payload["image_urls"] = resolve_image_urls(payload.pop("image_paths"), api_key)
    if "image_urls" in payload:
        payload["image_urls"] = resolve_image_urls(payload["image_urls"], api_key)
    response = http_json(IMAGE_SUBMIT_URL, api_key, payload)
    data = (response.get("data") or [{}])[0]
    task_id = str(data.get("task_id") or "")
    status = str(data.get("status") or "")
    if not task_id:
        raise RuntimeError(f"提交响应无 task_id: {json.dumps(response, ensure_ascii=False)[:400]}")
    return {
        "name": str(job.get("name") or ""),
        "task_id": task_id,
        "status": status,
        "model": payload.get("model", ""),
        "size": payload.get("size", ""),
        "resolution": payload.get("resolution", ""),
    }


def poll_task(task_id: str, api_key: str, timeout: int = 600,
              interval: int = 12) -> dict:
    deadline = time.time() + timeout
    last_error = None
    while time.time() < deadline:
        try:
            response = http_json(
                IMAGE_TASK_URL.format(task_id=task_id), api_key, method="GET",
                timeout=60,
            )
            data = response.get("data") or {}
            status = str(data.get("status") or "")
            progress = data.get("progress")
            print(f"[{task_id}] status={status or '<empty>'} progress={progress}",
                  flush=True)
            if status == "completed":
                result = data.get("result") or {}
                images = result.get("images") or []
                urls = []
                for image in images:
                    candidates = image.get("url") or []
                    if candidates:
                        urls.append({
                            "url": str(candidates[0]),
                            "expires_at": image.get("expires_at"),
                        })
                if not urls:
                    raise RuntimeError("completed 但 result.images 为空")
                return {
                    "status": status,
                    "task_id": task_id,
                    "cost": data.get("cost"),
                    "credits_cost": data.get("credits_cost"),
                    "actual_time": data.get("actual_time"),
                    "images": urls,
                }
            if status == "failed":
                error = data.get("error") or {}
                raise RuntimeError(
                    f"任务失败: {error.get('message') or error} "
                    f"(code={error.get('code')})"
                )
            last_error = None
        except RuntimeError:
            # 网络/解析抖动：继续轮询，不退出
            last_error = None
            continue
        time.sleep(interval)
    raise TimeoutError(f"轮询超时 {timeout}s（task_id={task_id}，可二次轮询状态文件）")


def download(url: str, target: Path, retries: int = 5) -> Path:
    last_error = None
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=180) as resp:
                content = resp.read()
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            return target
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"下载失败（{retries} 次重试）: {url} / {last_error}")


def main() -> int:
    parser = argparse.ArgumentParser(description="apimart 图片批量生成（图生图）")
    parser.add_argument("batch", help="batch json 路径")
    parser.add_argument("--cwd", default=".", help="config.json 所在目录（含 api_key）")
    parser.add_argument("--output", required=True, help="输出目录")
    parser.add_argument("--only", default="", help="逗号分隔的 job name 子集")
    parser.add_argument("--poll-timeout", type=int, default=600)
    args = parser.parse_args()

    config = json.loads(Path(args.batch).read_text(encoding="utf-8"))
    defaults = config.get("defaults") or {}
    jobs = config.get("jobs") or []
    if args.only:
        subset = {name.strip() for name in args.only.split(",") if name.strip()}
        jobs = [job for job in jobs if str(job.get("name") or "") in subset]
    if not jobs:
        print("无任务（--only 过滤后为空）")
        return 1

    api_key = load_api_key(Path(args.cwd))
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)
    summary = {"generated": [], "failed": []}
    for job in jobs:
        name = str(job.get("name") or "job")
        print(f"\n=== 提交 {name} ===", flush=True)
        try:
            submitted = submit_job(job, defaults, api_key)
            print(f"    task_id={submitted['task_id']} status={submitted['status']}",
                  flush=True)
            result = poll_task(submitted["task_id"], api_key,
                               timeout=args.poll_timeout)
            target = out_dir / f"{name}.png"
            url = result["images"][0]["url"]
            download(url, target)
            summary["generated"].append({
                "name": name,
                "file": str(target),
                "task_id": submitted["task_id"],
            })
            print(f"    ✓ 保存 {target}", flush=True)
        except Exception as exc:  # noqa: BLE001
            print(f"    ✗ {name} 失败: {exc}", flush=True)
            summary["failed"].append({"name": name, "error": str(exc)})
    report_path = out_dir / "gen-summary.json"
    report_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\n完成: {len(summary['generated'])} 成功 / {len(summary['failed'])} 失败")
    print(f"报告: {report_path}")
    return 0 if not summary["failed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
