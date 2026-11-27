#!/usr/bin/env python3
"""Conservative daily refresh of the public Bangladesh Department of Fisheries directory.

Only official source URLs already recorded in data/seed.json are fetched.
Existing records are not deleted when a source is unavailable or its layout changes.
Changes are matched by officer name within the same office; ambiguous duplicate names
are left untouched. New staff require a clear table row with both name and designation.
"""
from __future__ import annotations
import concurrent.futures as cf
import hashlib, json, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "seed.json"
REPORT = ROOT / "data" / "last-refresh.json"
PHOTO_DIR = ROOT / "public" / "photos"
UA = "DFD-Directory-Monitor/1.0 (+https://github.com/hasibranaofficial/dof-derectory-test)"
TIMEOUT = 12
MAX_STAFF_LINKS = 2

def clean(v):
    return re.sub(r"\s+", " ", str(v or "")).strip()

def norm(v):
    return re.sub(r"[^\w\u0980-\u09ff]+", "", clean(v).lower())

def is_probable_name(value):
    value = clean(value)
    if len(value) < 4 or len(value) > 90 or re.search(r"@|https?://|\d{4}", value):
        return False
    if re.search(r"(নাম|name|পদবি|designation|মোবাইল|ফোন|email|অফিস)", value, re.I):
        return False
    return len(value.split()) >= 2 and bool(re.search(r"[\u0980-\u09ffA-Za-z]", value))

def is_probable_designation(value):
    value = clean(value)
    if len(value) < 3 or len(value) > 110:
        return False
    return bool(re.search(r"(কর্মকর্তা|পরিচালক|সহকারী|উপজেলা|বৈজ্ঞানিক|প্রধান|অধ্যক্ষ|ইন্সট্রাক্টর|ইনস্ট্রাক্টর|অফিসার|manager|officer|director|assistant|principal|instructor|technologist|accountant|inspector)", value, re.I))

def staff_links(html, base):
    soup = BeautifulSoup(html, "html.parser")
    candidates = []
    for a in soup.find_all("a", href=True):
        label = clean(a.get_text(" ", strip=True))
        href = urljoin(base, a["href"])
        if urlparse(href).netloc != urlparse(base).netloc:
            continue
        if re.search(r"(কর্মকর্তা|কর্মচারী|জনবল|staff|officer|employee|personnel|team|directory|who.we.are)", label + " " + href, re.I):
            if href.startswith(("http://", "https://")) and href not in candidates and href != base:
                candidates.append(href)
    return candidates[:MAX_STAFF_LINKS]

def extract_people(html, page_url):
    soup = BeautifulSoup(html, "html.parser")
    found = []
    for tr in soup.find_all("tr"):
        cells = [clean(c.get_text(" ", strip=True)) for c in tr.find_all(["td", "th"], recursive=False)]
        cells = [c for c in cells if c]
        if len(cells) < 2:
            continue
        name_idx = next((i for i,c in enumerate(cells) if is_probable_name(c)), None)
        if name_idx is None:
            continue
        desig_idx = next((i for i,c in enumerate(cells) if i != name_idx and is_probable_designation(c)), None)
        if desig_idx is None:
            continue
        email_match = next((re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", c) for c in cells if re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", c)), None)
        phone_match = next((c for c in cells if re.search(r"(?:\+?\d|[০-৯])(?:[\d০-৯ +()-]{6,})", c)), "")
        image = tr.find("img", src=True)
        photo_url = urljoin(page_url, image["src"]) if image else ""
        if photo_url and urlparse(photo_url).netloc != urlparse(page_url).netloc:
            photo_url = ""
        found.append({
            "name": cells[name_idx], "designation": cells[desig_idx],
            "email": email_match.group(0) if email_match else "",
            "phone": re.sub(r"[^\d০-৯+()-]", "", phone_match),
            "photo_url": photo_url
        })
    return found

def save_photo(url):
    if not url:
        return ""
    try:
        response = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT, stream=True)
        response.raise_for_status()
        mime = response.headers.get("content-type", "").split(";")[0].lower()
        extensions = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
        ext = extensions.get(mime)
        if not ext:
            return ""
        content = response.raw.read(3 * 1024 * 1024 + 1)
        if not content or len(content) > 3 * 1024 * 1024:
            return ""
        PHOTO_DIR.mkdir(parents=True, exist_ok=True)
        filename = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24] + ext
        (PHOTO_DIR / filename).write_bytes(content)
        return "/photos/" + filename
    except Exception:
        return ""

def fetch_office(item):
    url = clean(item.get("url"))
    if not url.startswith(("http://", "https://")):
        return item["slug"], [], "missing_official_url", 0
    try:
        response = requests.get(url, headers={"User-Agent": UA, "Accept": "text/html"}, timeout=TIMEOUT)
        response.raise_for_status()
        if "html" not in response.headers.get("content-type", "").lower() and not response.text.lstrip().startswith("<"):
            return item["slug"], [], "not_html", response.status_code
        pages = [response.url] + staff_links(response.text, response.url)
        all_people = []
        for page in pages:
            try:
                r = requests.get(page, headers={"User-Agent": UA, "Accept": "text/html"}, timeout=TIMEOUT)
                r.raise_for_status()
                all_people.extend(extract_people(r.text, r.url))
            except Exception:
                continue
        unique = {}
        for p in all_people:
            key = (norm(p["name"]), norm(p["designation"]))
            if key[0] and key[1]:
                unique[key] = p
        result = []
        for p in unique.values():
            photo = save_photo(p["photo_url"])
            result.append({**p, "photo": photo})
        return item["slug"], result, "ok" if result else "no_confident_staff_table", response.status_code
    except Exception as exc:
        return item["slug"], [], type(exc).__name__, 0

def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    started = datetime.now(timezone.utc)
    changed_fields = added = updated_records = scanned = ok = 0
    failures = []
    office_by_slug = {office.get("slug"): office for office in data}
    with cf.ThreadPoolExecutor(max_workers=10) as pool:
        futures = [pool.submit(fetch_office, office) for office in data if office.get("url")]
        for future in cf.as_completed(futures):
            slug, fresh, status, http = future.result()
            scanned += 1
            office = office_by_slug.get(slug)
            if not office:
                continue
            if status == "ok":
                ok += 1
            elif status != "no_confident_staff_table":
                failures.append({"slug": slug, "status": status, "http": http})
            current = office.setdefault("officers", [])
            by_name = {}
            for old in current:
                by_name.setdefault(norm(old.get("name")), []).append(old)
            for person in fresh:
                key = norm(person["name"])
                candidates = by_name.get(key, [])
                if len(candidates) == 1:
                    old = candidates[0]
                    record_changed = False
                    for field in ("designation", "email", "phone", "photo"):
                        value = person.get(field) or ""
                        if not value:
                            continue
                        previous = old.get(field) or ""
                        if field == "photo" and previous.startswith("/photos/") and not (ROOT / "public" / previous.lstrip("/")).exists():
                            previous = ""
                        if value != previous:
                            old[field] = value
                            changed_fields += 1
                            record_changed = True
                    if record_changed:
                        updated_records += 1
                elif not candidates:
                    new_person = {
                        "branch": "ওয়েবসাইট থেকে শনাক্ত",
                        "name": person["name"], "designation": person["designation"],
                        "email": person.get("email", ""), "phone": person.get("phone", ""),
                        "mobile": "", "room": "", "fax": "", "bcs": "", "joined": "",
                        "photo": person.get("photo", "")
                    }
                    current.append(new_person)
                    by_name.setdefault(key, []).append(new_person)
                    added += 1
                    changed_fields += 1
                # Ambiguous duplicate names are intentionally not auto-merged.
    finished = datetime.now(timezone.utc)
    report = {
        "started_at": started.isoformat(), "finished_at": finished.isoformat(),
        "timezone": "UTC", "offices_in_dataset": len(data), "sources_scanned": scanned,
        "sources_with_staff_tables": ok, "new_officers": added,
        "updated_officer_records": updated_records, "changed_fields": changed_fields,
        "failed_sources": len(failures), "failures_sample": failures[:100],
        "policy": "No existing officers deleted; updates matched by unique name within an office; ambiguous names skipped."
    }
    if changed_fields:
        DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
