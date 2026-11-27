#!/usr/bin/env python3
"""Conservative daily refresh of the public Bangladesh Department of Fisheries directory.

Only verified official source URLs already recorded in data/seed.json are fetched.
Existing records are never deleted because a source is unavailable or changes layout.
New staff rows are added only when a table row clearly contains both a plausible name
and a designation. A refresh report records failures and coverage.
"""
from __future__ import annotations
import concurrent.futures as cf
import json, re, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "seed.json"
REPORT = ROOT / "data" / "last-refresh.json"
UA = "DFD-Directory-Monitor/1.0 (+https://github.com/hasibranaofficial/dof-derectory-test)"
TIMEOUT = 12
MAX_STAFF_LINKS = 2
session = requests.Session()
session.headers.update({"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"})

def clean(v):
    return re.sub(r"\s+", " ", str(v or "")).strip()

def norm(v):
    v = clean(v).lower()
    v = re.sub(r"[^\w\u0980-\u09ff]+", "", v)
    return v

def is_probable_name(value):
    value = clean(value)
    if len(value) < 4 or len(value) > 90 or re.search(r"@|https?://|\d{4}", value):
        return False
    if re.search(r"(নাম|name|পদবি|designation|মোবাইল|ফোন|email|অফিস)", value, re.I):
        return False
    words = value.split()
    return len(words) >= 2 and bool(re.search(r"[\u0980-\u09ffA-Za-z]", value))

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

def extract_people(html):
    soup = BeautifulSoup(html, "html.parser")
    found = []
    for table in soup.find_all("table"):
        for tr in table.find_all("tr"):
            cells = [clean(c.get_text(" ", strip=True)) for c in tr.find_all(["td", "th"], recursive=False)]
            cells = [c for c in cells if c]
            if len(cells) < 2:
                continue
            # Identify name and designation by content rather than fixed column positions.
            name_idx = next((i for i,c in enumerate(cells) if is_probable_name(c)), None)
            if name_idx is None:
                continue
            desig_idx = next((i for i,c in enumerate(cells) if i != name_idx and is_probable_designation(c)), None)
            if desig_idx is None:
                continue
            row_text = " | ".join(cells)
            email = next((re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", c).group(0) for c in cells if re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", c)), "")
            phone = next((re.sub(r"[^\d০-৯+()-]", "", c) for c in cells if re.search(r"(?:\+?\d|[০-৯])(?:[\d০-৯ +()-]{6,})", c)), "")
            found.append({"name": cells[name_idx], "designation": cells[desig_idx], "email": email, "phone": phone, "row": row_text})
    return found

def fetch_office(item):
    url = clean(item.get("url"))
    if not url.startswith(("http://", "https://")):
        return item["slug"], [], "missing_official_url", 0
    try:
        response = session.get(url, timeout=TIMEOUT)
        response.raise_for_status()
        if "html" not in response.headers.get("content-type", "").lower() and not response.text.lstrip().startswith("<"):
            return item["slug"], [], "not_html", response.status_code
        pages = [url] + staff_links(response.text, response.url)
        all_people = []
        for page in pages:
            try:
                r = session.get(page, timeout=TIMEOUT)
                r.raise_for_status()
                all_people.extend(extract_people(r.text))
            except Exception:
                continue
        # Deduplicate within the source.
        unique = {}
        for p in all_people:
            key = (norm(p["name"]), norm(p["designation"]))
            if key[0] and key[1]:
                unique[key] = p
        return item["slug"], list(unique.values()), "ok" if unique else "no_confident_staff_table", response.status_code
    except Exception as exc:
        return item["slug"], [], type(exc).__name__, 0

def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    started = datetime.now(timezone.utc)
    changed = added = updated = scanned = ok = 0
    failures = []
    # Avoid hammering one host: submit one URL per office, with modest concurrency.
    with cf.ThreadPoolExecutor(max_workers=10) as pool:
        futures = [pool.submit(fetch_office, office) for office in data if office.get("url")]
        for future in cf.as_completed(futures):
            slug, fresh, status, http = future.result()
            scanned += 1
            office = next((o for o in data if o.get("slug") == slug), None)
            if not office:
                continue
            if status == "ok":
                ok += 1
            elif status != "no_confident_staff_table":
                failures.append({"slug": slug, "status": status, "http": http})
            current = office.setdefault("officers", [])
            by_key = {(norm(p.get("name")), norm(p.get("designation"))): p for p in current}
            for p in fresh:
                key = (norm(p["name"]), norm(p["designation"]))
                if key in by_key:
                    old = by_key[key]
                    for field, value in (("email", p["email"]), ("phone", p["phone"])):
                        if value and not old.get(field):
                            old[field] = value
                            updated += 1
                            changed += 1
                else:
                    # Keep new records attributable to the source and clearly classified.
                    current.append({
                        "branch": "ওয়েবসাইট থেকে শনাক্ত",
                        "name": p["name"], "designation": p["designation"],
                        "email": p["email"], "phone": p["phone"], "mobile": "",
                        "room": "", "fax": "", "bcs": "", "joined": "", "photo": ""
                    })
                    by_key[key] = current[-1]
                    added += 1
                    changed += 1
    finished = datetime.now(timezone.utc)
    report = {
        "started_at": started.isoformat(), "finished_at": finished.isoformat(),
        "timezone": "UTC", "offices_in_dataset": len(data), "sources_scanned": scanned,
        "sources_with_staff_tables": ok, "new_officers": added, "filled_missing_fields": updated,
        "changes": changed, "failed_sources": len(failures), "failures_sample": failures[:100],
        "policy": "No existing officers deleted; additions require a clear name+designation table row."
    }
    if changed:
        DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
