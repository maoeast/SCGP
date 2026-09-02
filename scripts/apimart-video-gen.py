#!/usr/bin/env python3
"""apimart-video-gen.py — apimart 中继视频生成（提交/轮询/下载/上传图片）。

背景（2026-09-02）：apimart 提供统一视频入口 POST /v1/videos/generations，
异步任务（task_id 轮询 GET /v1/tasks/{id}），结果在 data.result.videos[].url[]。
图片素材必须先经 POST /v1/uploads/images 换公网 URL（72h 有效；生成接口不再支持
base64 直传——这曾是 413/上传失败的根因之一）。

用法：
  # 单任务：本地图片作首帧 + 提交 + 轮询 + 下载
  python scripts/apimart-video-gen.py --cwd G:/SCGP_Rec/AIimages submit \
      --name makebed-step2-demo --model veo3.1-fast --prompt "..." \
      --image E:/.../makebed-step2.png --duration 8 --resolution 720p \
      --out G:/SCGP_Rec/AIimages/AIimages/videos

  # 单任务：wan2.7-r2v 角色参考 + 首帧（image_with_roles）
  python scripts/apimart-video-gen.py --cwd G:/SCGP_Rec/AIimages submit \
      --name makebed-step2-r2v --model wan2.7-r2v --prompt "图1中的人物..." \
      --role-image char.png:reference_image --role-image step2.png:first_frame \
      --duration 8 --resolution 1080P --out .../videos

  # 批量：defaults + jobs[]（与 batch-wave1-steps-*.json 同结构）
  python scripts/apimart-video-gen.py --cwd G:/SCGP_Rec/AIimages batch-json \
      --path batch-video-makebed.json

  # 仅轮询已有任务并下载
  python scripts/apimart-video-gen.py --cwd G:/SCGP_Rec/AIimages poll \
      --task-id task_xxx --name makebed-step2-demo --out .../videos

批量 JSON 结构：
{
  "defaults": {"model": "veo3.1-fast", "duration": 8, "resolution": "720p",
               "aspect_ratio": "16:9"},
  "jobs": [
    {"name": "makebed-step2", "prompt": "男孩拉住床单...",
     "images": ["path/to/step2.png"]},            # 本地路径自动上传
    {"name": "makebed-step3", "prompt": "...",
     "image_urls": ["https://.../x.png"]},        # 公网 URL 直用
    {"name": "makebed-step4", "prompt": "...",
     "image_with_roles": [{"url": "char.png", "role": "reference_image"},
                          {"url": "step4.png", "role": "first_frame"}]}
  ]
}
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import re
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

VIDEO_SUBMIT_URL = "https://api.apimart.ai/v1/videos/generations"
VIDEO_TASK_URL = "https://api.apimart.ai/v1/tasks/{task_id}?language=zh"
UPLOAD_URL = "https://api.apimart.ai/v1/uploads/images"
USER_AGENT = "SCGP-Apimart-VideoGen/1.0"


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
    """把 images/image_urls 中的本地路径换为上传 URL；URL 原样保留。"""
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
                resolved.append(text)  # 保留（可能是相对引用，让服务端报错）
    return resolved


def resolve_image_with_roles(value: object, api_key: str) -> list[dict]:
    items = value or []
    resolved: list[dict] = []
    for item in items:
        entry = dict(item)
        url = str(entry.get("url") or "")
        if not re.match(r"^https?://", url):
            path = Path(url)
            if path.is_file():
                entry["url"] = upload_image(path, api_key)
        resolved.append(entry)
    return resolved


def submit_job(job: dict, defaults: dict, api_key: str) -> dict:
    payload = dict(defaults)
    payload.update({k: v for k, v in job.items() if k != "name"})
    if "images" in payload:
        payload["image_urls"] = resolve_image_urls(payload.pop("images"), api_key)
    if "image_urls" in payload:
        payload["image_urls"] = resolve_image_urls(payload["image_urls"], api_key)
    if "image_with_roles" in payload:
        payload["image_with_roles"] = resolve_image_with_roles(
            payload["image_with_roles"], api_key
        )
    response = http_json(VIDEO_SUBMIT_URL, api_key, payload)
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
        "duration": payload.get("duration", ""),
    }


def poll_task(task_id: str, api_key: str, timeout: int = 600,
              interval: int = 10) -> dict:
    deadline = time.time() + timeout
    last_error = None
    while time.time() < deadline:
        try:
            response = http_json(
                VIDEO_TASK_URL.format(task_id=task_id), api_key, method="GET",
                timeout=60,
            )
            data = response.get("data") or {}
            status = str(data.get("status") or "")
            progress = data.get("progress")
            print(f"[{task_id}] status={status or '<empty>'} progress={progress}",
                  flush=True)
            if status == "completed":
                result = data.get("result") or {}
                videos = result.get("videos") or []
                urls = []
                for video in videos:
                    candidates = video.get("url") or []
                    if candidates:
                        urls.append({
                            "url": str(candidates[0]),
                            "expires_at": video.get("expires_at"),
                        })
                if not urls:
                    raise RuntimeError("completed 但 result.videos 为空")
                return {
                    "status": status,
                    "task_id": task_id,
                    "cost": data.get("cost"),
                    "credits_cost": data.get("credits_cost"),
                    "actual_time": data.get("actual_time"),
                    "videos": urls,
                }
            if status == "failed":
                error = data.get("error") or {}
                raise RuntimeError(
                    f"任务失败: {error.get('message') or error} "
                    f"(code={error.get('code')})"
                )
            last_error = None
        except RuntimeError:
            raise
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            print(f"transient_error={last_error}", flush=True)
        time.sleep(interval)
    raise TimeoutError(f"轮询超时（{timeout}s），最后错误: {last_error}")


def download(url: str, target: Path, retries: int = 5) -> Path:
    for attempt in range(1, retries + 1):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=300) as resp:
                content = resp.read()
            if len(content) < 10 * 1024:
                print(f"  ! 视频内容可疑（{len(content)} 字节），重试", flush=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(content)
                return target
        except (urllib.error.URLError, OSError) as exc:
            print(f"  ! 下载失败（{attempt}/{retries}）: {exc}", flush=True)
        time.sleep(3 * attempt)
    raise RuntimeError(f"下载重试耗尽: {url}")


def ensure_unique(path: Path) -> Path:
    if not path.exists():
        return path
    counter = 2
    while True:
        candidate = path.with_name(f"{path.stem}-{counter}{path.suffix}")
        if not candidate.exists():
            return candidate
        counter += 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cwd", default=".")
    sub = parser.add_subparsers(dest="command", required=True)

    submit = sub.add_parser("submit")
    submit.add_argument("--name", required=True)
    submit.add_argument("--model", required=True)
    submit.add_argument("--prompt", required=True)
    submit.add_argument("--duration", type=int)
    submit.add_argument("--resolution")
    submit.add_argument("--aspect-ratio")
    submit.add_argument("--image", action="append", dest="images",
                        help="本地路径（自动上传）或公网 URL，作为 image_urls")
    submit.add_argument("--role-image", action="append", default=[],
                        metavar="PATH:ROLE",
                        help="image_with_roles 项，如 char.png:reference_image 或 step2.png:first_frame")
    submit.add_argument("--out", default="AIimages/videos")
    submit.add_argument("--timeout", type=int, default=600)

    poll = sub.add_parser("poll")
    poll.add_argument("--task-id", required=True)
    poll.add_argument("--name", required=True)
    poll.add_argument("--out", default="AIimages/videos")
    poll.add_argument("--timeout", type=int, default=600)
    poll.add_argument("--interval", type=int, default=10)

    batch = sub.add_parser("batch-json")
    batch.add_argument("--path", required=True)
    batch.add_argument("--out", default="AIimages/videos")
    batch.add_argument("--timeout", type=int, default=900)

    args = parser.parse_args()
    cwd = Path(args.cwd).resolve()
    api_key = load_api_key(cwd)

    if args.command == "submit":
        job = {
            "name": args.name,
            "model": args.model,
            "prompt": args.prompt,
        }
        if args.duration:
            job["duration"] = args.duration
        if args.resolution:
            job["resolution"] = args.resolution
        if args.aspect_ratio:
            job["aspect_ratio"] = args.aspect_ratio
        if args.images:
            job["images"] = args.images
        if args.role_image:
            roles = []
            for raw in args.role_image:
                # rpartition: 路径可能含盘符冒号（G:/...）或 https://，角色枚举在最后一段
                path, _, role = raw.rpartition(":")
                roles.append({"url": path, "role": role or "reference_image"})
            job["image_with_roles"] = roles
        result = submit_job(job, {}, api_key)
        print(f"submitted: {json.dumps(result, ensure_ascii=False)}", flush=True)
        final = poll_task(result["task_id"], api_key, args.timeout)
        videos = final.get("videos") or []
        target = ensure_unique(Path(args.out) / f"{args.name}.mp4")
        if videos:
            saved = download(videos[0]["url"], target)
            print(f"saved={saved}", flush=True)
        print(f"cost={final.get('cost')} credits={final.get('credits_cost')} "
              f"actual_time={final.get('actual_time')}", flush=True)
        return 0

    if args.command == "poll":
        final = poll_task(args.task_id, api_key, args.timeout, args.interval)
        videos = final.get("videos") or []
        target = ensure_unique(Path(args.out) / f"{args.name}.mp4")
        if videos:
            saved = download(videos[0]["url"], target)
            print(f"saved={saved}", flush=True)
        print(f"cost={final.get('cost')} credits={final.get('credits_cost')}", flush=True)
        return 0

    # batch-json
    raw = json.loads(Path(args.path).read_text(encoding="utf-8"))
    defaults = raw.get("defaults") or {}
    jobs = raw.get("jobs") or []
    submitted: list[dict] = []
    for job in jobs:
        try:
            info = submit_job(job, defaults, api_key)
            submitted.append(info)
            print(f"submitted: {info['name']} -> {info['task_id']}", flush=True)
        except Exception as exc:  # noqa: BLE001
            print(f"提交失败 [{job.get('name')}]: {exc}", file=sys.stderr, flush=True)
    pending = list(submitted)
    finished: dict[str, dict] = {}
    deadline = time.time() + args.timeout
    while pending and time.time() < deadline:
        for info in list(pending):
            try:
                final = poll_task(info["task_id"], api_key, timeout=600, interval=5)
                videos = final.get("videos") or []
                target = ensure_unique(Path(args.out) / f"{info['name']}.mp4")
                if videos:
                    download(videos[0]["url"], target)
                    final["saved_path"] = str(target)
                finished[info["task_id"]] = {
                    "name": info["name"],
                    "task_id": info["task_id"],
                    "status": "completed",
                    "cost": final.get("cost"),
                    "saved_path": final.get("saved_path"),
                    "urls": [v["url"] for v in videos],
                }
                pending.remove(info)
            except TimeoutError as exc:
                finished[info["task_id"]] = {
                    "name": info["name"], "task_id": info["task_id"],
                    "status": "timeout", "error": str(exc),
                }
                pending.remove(info)
            except RuntimeError as exc:
                finished[info["task_id"]] = {
                    "name": info["name"], "task_id": info["task_id"],
                    "status": "failed", "error": str(exc),
                }
                pending.remove(info)
                print(f"任务失败 [{info['name']}]: {exc}", file=sys.stderr, flush=True)
    summary_path = cwd / "AIimages" / (
        "batch-summary-video-" + time.strftime("%Y%m%d-%H%M%S") + ".json"
    )
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(
        json.dumps(
            {"source": str(Path(args.path).resolve()), "results": [
                finished.get(item["task_id"], {
                    "name": item["name"], "task_id": item["task_id"],
                    "status": "pending",
                }) for item in submitted
            ]},
            ensure_ascii=False, indent=2,
        ),
        encoding="utf-8",
    )
    print(f"summary={summary_path}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    raise SystemExit(main())
