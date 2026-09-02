#!/usr/bin/env python3
"""download-apimart-urls.py — 从 batch-summary JSON 补下载生成结果图片。

背景（2026-09-02）：batch-summary-*.json 显示任务 success 且 saved_paths 已写入，
但本地文件缺失（getapib.org 图床下载抖动老毛病）。本脚本按 summary 的
name + urls[0] 重新补下载，跳过已存在的文件。

用法：
  python scripts/download-apimart-urls.py \
      --summary "G:/SCGP_Rec/AIimages/AIimages/batch-summary-*.json" \
      --source-filter "steps-makebed" \
      --out G:/SCGP_Rec/AIimages/AIimages

参数：
  --summary         summary 文件路径（支持 glob）
  --source-filter   仅处理 source 含该子串的 summary（名称前缀，如 steps-makebed）
  --out             下载输出目录（缺省取 summary 文件所在目录）
  --retries         下载重试次数（默认 5）
"""

from __future__ import annotations

import argparse
import glob
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def http_download(url: str, output_path: Path, retries: int) -> bool:
    """下载并校验（>10KB）；返回是否最终成功。"""
    for attempt in range(1, retries + 1):
        try:
            request = urllib.request.Request(url, method="GET", headers={
                "User-Agent": "SCGP-Download/1.0",
            })
            with urllib.request.urlopen(request, timeout=120) as resp:
                content = resp.read()
            if len(content) < 10 * 1024:
                print(f"  ! 内容可疑（{len(content)} 字节），第 {attempt} 次", flush=True)
            else:
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_bytes(content)
                return True
        except (urllib.error.URLError, OSError) as exc:
            print(f"  ! 下载失败（第 {attempt}/{retries} 次）: {exc}", flush=True)
        time.sleep(2 * attempt)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--summary", nargs="+", required=True,
                        help="batch-summary JSON 路径或 glob")
    parser.add_argument("--source-filter", default="",
                        help="仅处理 source 含该子串的 summary")
    parser.add_argument("--out", default=None, help="输出目录（缺省 = summary 目录）")
    parser.add_argument("--retries", type=int, default=5)
    args = parser.parse_args()

    summary_paths: list[Path] = []
    for raw in args.summary:
        summary_paths.extend(Path(p) for p in glob.glob(raw))
    # 去重保序
    seen: set[Path] = set()
    summary_paths = [p for p in summary_paths if not (p in seen or seen.add(p))]
    if not summary_paths:
        print("未匹配到任何 batch-summary 文件。", file=sys.stderr)
        return 1

    ok_count = skip_count = fail_count = 0
    failures: list[str] = []
    for summary_path in summary_paths:
        data = json.loads(summary_path.read_text(encoding="utf-8"))
        source = str(data.get("source", ""))
        if args.source_filter and args.source_filter not in source:
            continue
        out_dir = Path(args.out) if args.out else summary_path.parent
        print(f"== {summary_path.name} (source={source}) ==", flush=True)
        for result in data.get("results", []):
            name = str(result.get("name", "")).strip()
            urls = result.get("urls") or []
            if not name or not urls:
                continue
            suffix = Path(urllib.parse.urlparse(urls[0]).path).suffix or ".png"
            target = out_dir / f"{name}{suffix}"
            if target.is_file():
                skip_count += 1
                print(f"  跳过（已存在）: {target}", flush=True)
                continue
            print(f"  下载: {name}{suffix}", flush=True)
            if http_download(str(urls[0]), target, args.retries):
                ok_count += 1
                print(f"  完成: {target}", flush=True)
            else:
                fail_count += 1
                failures.append(f"{name}: {urls[0]}")
                print(f"  失败（重试耗尽）: {name}", flush=True)

    print(f"\n结果: 下载 {ok_count}，跳过 {skip_count}，失败 {fail_count}", flush=True)
    if failures:
        print("失败清单:", file=sys.stderr)
        for item in failures:
            print(f"  {item}", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    raise SystemExit(main())
