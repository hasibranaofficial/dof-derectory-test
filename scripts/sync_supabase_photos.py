#!/usr/bin/env python3
"""Mirror mapped Supabase officer portraits into same-origin static WebP assets.

This avoids browser cross-origin/storage delivery problems on GitHub Pages and
keeps the public directory independent of the Supabase image host at runtime.
"""
from __future__ import annotations
import concurrent.futures as cf
import hashlib, json
from io import BytesIO
from pathlib import Path
from urllib.parse import quote
import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MAP_FILE = ROOT / "data" / "photo-map.json"
LOCAL_MAP_FILE = ROOT / "data" / "photo-local-map.json"
STATE_FILE = ROOT / "data" / "photo-local-state.json"
REPORT_FILE = ROOT / "data" / "photo-sync-report.json"
PHOTO_DIR = ROOT / "public" / "photos"
SUPABASE_URL = "https://hlgtsigojqmpyqrrypye.supabase.co"
BASE = SUPABASE_URL + "/storage/v1/object/public/photos/"
HEADERS = {"User-Agent": "DFD-Directory-Photo-Mirror/1.0"}
TIMEOUT = 25

def read_json(path):
    if not path.exists():
        return {}
    raw = path.read_text(encoding="utf-8").strip()
    # Recover files written by the earlier version with a literal \\n suffix.
    if raw.endswith(chr(92) + "n"):
        raw = raw[:-2].rstrip()
    return json.loads(raw) if raw else {}

def download_one(item):
    slug, key, remote = item
    url = BASE + quote(remote, safe="/")
    old_path = local_map.get(slug, {}).get(key)
    old_state = state.get(slug, {}).get(key, {})
    old_file = ROOT / "public" / old_path.lstrip("/") if old_path else None
    etag = ""
    try:
        h = requests.head(url, headers=HEADERS, timeout=TIMEOUT)
        if h.ok:
            etag = h.headers.get("ETag", "").strip('"')
        if old_file and old_file.is_file() and etag and old_state.get("etag") == etag:
            return (slug, key, old_path, old_state, "unchanged")
    except Exception:
        pass
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        raw = r.content
        if not raw or len(raw) > 12 * 1024 * 1024:
            raise ValueError("invalid image size")
        content_sha = hashlib.sha256(raw).hexdigest()
        if old_file and old_file.is_file() and old_state.get("sha256") == content_sha:
            next_state = {"etag": etag or old_state.get("etag", ""), "sha256": content_sha}
            return (slug, key, old_path, next_state, "unchanged")
        with Image.open(BytesIO(raw)) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            im = ImageOps.fit(im, (256, 256), method=Image.Resampling.LANCZOS, centering=(0.5, 0.38))
            filename = "supa-" + hashlib.sha256(remote.encode("utf-8")).hexdigest()[:10] + "-" + content_sha[:12] + ".webp"
            target = PHOTO_DIR / filename
            target.parent.mkdir(parents=True, exist_ok=True)
            im.save(target, "WEBP", quality=80, method=6)
        next_path = "/photos/" + filename
        next_state = {"etag": etag or r.headers.get("ETag", "").strip('"'), "sha256": content_sha}
        return (slug, key, next_path, next_state, "updated")
    except Exception as exc:
        return (slug, key, old_path, old_state, "failed:" + type(exc).__name__)

photo_map = read_json(MAP_FILE)
local_map = read_json(LOCAL_MAP_FILE)
state = read_json(STATE_FILE)
items = [(slug, key, remote) for slug, people in photo_map.items()
         for key, remote in people.items() if isinstance(remote, str) and remote]
counts = {"mapped": len(items), "updated": 0, "unchanged": 0, "failed": 0}
failures = []
with cf.ThreadPoolExecutor(max_workers=12) as pool:
    for slug, key, path, meta, status in pool.map(download_one, items):
        if path:
            local_map.setdefault(slug, {})[key] = path
        if meta:
            state.setdefault(slug, {})[key] = meta
        if status == "updated":
            counts["updated"] += 1
        elif status == "unchanged":
            counts["unchanged"] += 1
        else:
            counts["failed"] += 1
            if len(failures) < 30:
                failures.append({"office": slug, "officer": key.split("|||")[0], "status": status})
for path, data in [(LOCAL_MAP_FILE, local_map), (STATE_FILE, state)]:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + chr(10), encoding="utf-8")
report = {**counts, "finished_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(), "failures_sample": failures}
REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2) + chr(10), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False))
