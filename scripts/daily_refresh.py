#!/usr/bin/env python3
"""Conservative daily refresh of the public Bangladesh Department of Fisheries directory.
Supabase photo sync is enabled by the repository secret when configured.
Includes BCS/cadre batch extraction where official staff tables publish that field.

Only official source URLs already recorded in data/seed.json are fetched.
Existing records are not deleted when a source is unavailable or its layout changes.
Changes are matched by officer name within the same office; ambiguous duplicate names
are left untouched. New staff require a clear table row with both name and designation.
"""
from __future__ import annotations
import concurrent.futures as cf
import hashlib, json, re, os, mimetypes
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "seed.json"
REPORT = ROOT / "data" / "last-refresh.json"
PHOTO_MAP = ROOT / "data" / "photo-map.json"
SUPABASE_URL = "https://hlgtsigojqmpyqrrypye.supabase.co"
PHOTO_DIR = ROOT / "public" / "photos"
UA = "DFD-Directory-Monitor/1.0 (+https://github.com/hasibranaofficial/dof-derectory-test)"
TIMEOUT = 12
MAX_STAFF_LINKS = 40

def clean(v):
    return re.sub(r"\s+", " ", str(v or "")).strip()

def norm(v):
    return re.sub(r"[^\w\u0980-\u09ff]+", "", clean(v).lower())

def extract_bcs(value):
    """Read BCS/cadre batch whether it appears in a dedicated field or designation text."""
    match = re.search(r"(?:বিসিএস|BCS|ক্যাডার|cadre)(?:\\s*ব্যাচ)?\\s*[-–—:：]?\\s*([০-৯\\d]{1,3}\\s*(?:তম|th)?)", clean(value), re.I)
    return clean(match.group(1)) if match else ""

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
        staff_hint = re.search(r"(কর্মকর্তা|কর্মচারী|জনবল|staff|officer|employee|personnel|team|directory|who.we.are|profile|প্রোফাইল|জীবনবৃত্তান্ত)", label + " " + href, re.I)
        row_link = a.find_parent(["tr", "article", "li"]) is not None and is_probable_name(label)
        if staff_hint or row_link:
            if href.startswith(("http://", "https://")) and href not in candidates and href != base:
                candidates.append(href)
    return candidates[:MAX_STAFF_LINKS]

def extract_people(html, page_url):
    soup = BeautifulSoup(html, "html.parser")
    found = []
    for tr in soup.find_all("tr"):
        cells = [clean(c.get_text(" ", strip=True)) for c in tr.find_all(["td", "th"], recursive=False)]
        if len([c for c in cells if c]) < 2:
            continue
        # Read BCS/cadre/batch columns from the table header when present.
        bcs_value = ""
        table = tr.find_parent("table")
        if table:
            for header_row in table.find_all("tr"):
                if header_row is tr:
                    break
                headers = [clean(c.get_text(" ", strip=True)).lower() for c in header_row.find_all(["th", "td"], recursive=False)]
                bcs_idx = next((i for i, h in enumerate(headers) if re.search(r"(বিসিএস|ক্যাডার|batch|cadre)", h, re.I)), None)
                if bcs_idx is not None and bcs_idx < len(cells):
                    bcs_value = cells[bcs_idx]
                    break
        # Also support explicit label/value cells when no header row exists.
        if not bcs_value:
            for i, cell in enumerate(cells):
                if re.search(r"(বিসিএস|ক্যাডার|batch|cadre)", cell, re.I):
                    candidate = re.sub(r"^(বিসিএস(?:\s*\(মৎস্য\))?|ক্যাডার|batch|cadre)(?:\s*ব্যাচ)?\s*[:：-]?\s*", "", cell, flags=re.I).strip()
                    if candidate and candidate != cell:
                        bcs_value = candidate
                    elif i + 1 < len(cells):
                        bcs_value = cells[i + 1]
                    break
        if not bcs_value:\n            bcs_value = extract_bcs(" ".join(cells))\n        name_idx = next((i for i,c in enumerate(cells) if is_probable_name(c)), None)
        if name_idx is None:
            continue
        desig_idx = next((i for i,c in enumerate(cells) if i != name_idx and is_probable_designation(c)), None)
        if desig_idx is None:
            continue
        email_match = next((re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", c) for c in cells if re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", c)), None)
        phone_match = next((c for c in cells if re.search(r"(?:\+?\d|[০-৯])(?:[\d০-৯ +()-]{6,})", c)), "")
        # Government portals frequently lazy-load portraits or host them on
        # a separate official/CDN image host. Accept common image attributes.
        image = tr.find("img")
        photo_src = ""
        if image:
            for attr in ("src", "data-src", "data-original", "data-lazy-src", "data-original-src"):
                candidate = clean(image.get(attr))
                if candidate and not candidate.startswith("data:"):
                    photo_src = candidate
                    break
            if not photo_src and image.get("srcset"):
                photo_src = clean(image.get("srcset")).split(",")[0].strip().split(" ")[0]
        photo_url = urljoin(page_url, photo_src) if photo_src else ""
        phone_value = re.sub(r"[^\d০-৯+()-]", "", phone_match)
        found.append({
            "name": cells[name_idx], "designation": cells[desig_idx],
            "email": email_match.group(0) if email_match else "",
            "phone": phone_value,
            "mobile": phone_value if re.search(r"(মোবাইল|mobile|cell)", " ".join(cells), re.I) else "",
            "room": next((re.sub(r"^(কক্ষ|রুম|room|কক্ষ নং)\s*[:：-]?\s*", "", c, flags=re.I) for c in cells if re.search(r"(কক্ষ|রুম|room)", c, re.I)), ""),
            "fax": next((re.sub(r"^(ফ্যাক্স|fax)\s*[:：-]?\s*", "", c, flags=re.I) for c in cells if re.search(r"(ফ্যাক্স|fax)", c, re.I)), ""),
            "bcs": bcs_value,
            "photo_url": photo_url
        })

    selectors = ["article", "[class*=officer]", "[class*=employee]", "[class*=staff]", "[class*=person]", "[class*=profile]", "[class*=team]", "[class*=member]", "[class*=card]", ".views-row"]
    seen_blocks = set()
    for selector in selectors:
        try:
            blocks = soup.select(selector)
        except Exception:
            continue
        for block in blocks:
            marker = id(block)
            if marker in seen_blocks:
                continue
            seen_blocks.add(marker)
            text = clean(block.get_text(" ", strip=True))
            if len(text) < 12 or len(text) > 1800:
                continue
            email = re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text)
            phones = re.findall(r"(?:\+?৮৮০|\+?880|0|০)[\d০-৯ +()-]{7,}", text)
            name = ""
            for node in block.find_all(["h1","h2","h3","h4","h5","strong","b","a"], limit=12):
                candidate = clean(node.get_text(" ", strip=True))
                if is_probable_name(candidate) and not is_probable_designation(candidate):
                    name = candidate
                    break
            designation = ""
            for node in block.find_all(["h1","h2","h3","h4","h5","p","span","div","td","strong"], limit=30):
                candidate = clean(node.get_text(" ", strip=True))
                if candidate != name and is_probable_designation(candidate):
                    designation = candidate
                    break
            if not name or not designation:
                continue
            image = block.find("img")
            photo_src = ""
            if image:
                for attr in ("src","data-src","data-original","data-lazy-src","data-original-src"):
                    candidate = clean(image.get(attr))
                    if candidate and not candidate.startswith("data:"):
                        photo_src = candidate
                        break
            bcs = extract_bcs(text)
            found.append({
                "name": name, "designation": designation,
                "email": email.group(0) if email else "",
                "phone": re.sub(r"[^\d০-৯+()-]", "", phones[0]) if phones else "",
                "mobile": re.sub(r"[^\d০-৯+()-]", "", phones[0]) if phones and re.search(r"(মোবাইল|mobile|cell)", text, re.I) else "",
                "room": "", "fax": "", "bcs": bcs,
                "photo_url": urljoin(page_url, photo_src) if photo_src else ""
            })
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            payload = json.loads(script.string or script.get_text())
            nodes = payload if isinstance(payload, list) else [payload]
            for node in nodes:
                if not isinstance(node, dict):
                    continue
                if isinstance(node.get("@graph"), list):
                    nodes.extend(x for x in node["@graph"] if isinstance(x, dict))
                if str(node.get("@type", "")).lower() in ("person", "employee"):
                    name, job = clean(node.get("name")), clean(node.get("jobTitle"))
                    if is_probable_name(name) and job:
                        found.append({"name":name,"designation":job,"email":clean(node.get("email")),"phone":clean(node.get("telephone")),"mobile":"","room":"","fax":"","bcs":"","photo_url":urljoin(page_url, clean(node.get("image"))) if node.get("image") else ""})
        except Exception:
            pass
    unique = {}
    for person in found:
        key = (norm(person.get("name")), norm(person.get("designation")))
        if key[0] and key[1]:
            previous = unique.get(key, {})
            unique[key] = {k: (person.get(k) or previous.get(k) or "") for k in set(previous) | set(person)}
    return list(unique.values())

def save_photo(url):
    if not url:
        return ""
    try:
        response = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT, stream=True)
        response.raise_for_status()
        mime = response.headers.get("content-type", "").split(";")[0].lower()
        extensions = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
        content = response.raw.read(3 * 1024 * 1024 + 1)
        if not content or len(content) > 3 * 1024 * 1024:
            return ""
        # Some government servers return application/octet-stream for images.
        ext = extensions.get(mime)
        if not ext:
            if content.startswith(b"\\xff\\xd8\\xff"):
                ext = ".jpg"
            elif content.startswith(b"\\x89PNG\\r\\n\\x1a\\n"):
                ext = ".png"
            elif content[:4] == b"RIFF" and content[8:12] == b"WEBP":
                ext = ".webp"
            elif content[:3] == b"GIF":
                ext = ".gif"
        if not ext:
            return ""
        PHOTO_DIR.mkdir(parents=True, exist_ok=True)
        filename = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24] + ext
        (PHOTO_DIR / filename).write_bytes(content)
        return "/photos/" + filename
    except Exception:
        return ""


def upload_supabase_photo(local_path, remote_path, secret):
    """Upload/replace one officer photo in the public Supabase bucket."""
    if not secret or not local_path or not remote_path:
        return False
    file_path = ROOT / "public" / local_path.lstrip("/")
    if not file_path.is_file():
        return False
    mime = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    try:
        with file_path.open("rb") as photo_file:
            response = requests.post(
                f"{SUPABASE_URL}/storage/v1/object/photos/{remote_path}",
                headers={
                    "apikey": secret,
                    **({"Authorization": f"Bearer {secret}"} if secret.startswith("eyJ") else {}),
                    "Content-Type": mime,
                    "x-upsert": "true",
                },
                data=photo_file,
                timeout=30,
            )
        response.raise_for_status()
        return True
    except Exception as exc:
        print(f"Supabase photo upload failed for {remote_path}: {type(exc).__name__}")
        return False

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
        # FIQC Chattogram publishes its staff directory on a dedicated
        # static page rather than a reliably discoverable homepage link.
        if item.get("slug") == "fiqc-chattogram":
            pages.append("https://fiqcchattogram.fisheries.gov.bd/pages/static-pages/officers-a224b5-6922dfe4933eb65569e24849")
        pages = list(dict.fromkeys(pages))
        all_people = []
        for page in pages[:MAX_STAFF_LINKS + 1]:
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
    photos_saved = photo_urls_found = 0
    failures = []
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    photo_map = json.loads(PHOTO_MAP.read_text(encoding="utf-8")) if PHOTO_MAP.exists() else {}
    supabase_photo_uploads = 0
    supabase_photo_failures = 0
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
                if person.get("photo_url"):
                    photo_urls_found += 1
                if person.get("photo"):
                    photos_saved += 1
                key = norm(person["name"])
                candidates = by_name.get(key, [])
                if len(candidates) == 1:
                    old = candidates[0]
                    record_changed = False
                    for field in ("designation", "email", "phone", "mobile", "room", "fax", "bcs", "photo"):
                        value = person.get(field) or ""
                        if not value:
                            continue
                        if field == "bcs" and value in ("0", "০", "-"):
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
                        "branch": "",
                        "name": person["name"], "designation": person["designation"],
                        "email": person.get("email", ""), "phone": person.get("phone", ""),
                        "mobile": person.get("mobile", ""), "room": person.get("room", ""), "fax": person.get("fax", ""), "bcs": person.get("bcs", ""), "joined": "",
                        "photo": person.get("photo", "")
                    }
                    current.append(new_person)
                    by_name.setdefault(key, []).append(new_person)
                    added += 1
                    changed_fields += 1
                # Sync the latest official image to Supabase Storage.
                if supabase_key and person.get("photo"):
                    photo_key = f"{person['name']}|||{person['designation']}"
                    office_map = photo_map.setdefault(slug, {})
                    remote_path = office_map.get(photo_key)
                    if not remote_path:
                        ext = Path(person["photo"]).suffix or ".jpg"
                        identity = hashlib.sha256(f"{slug}|||{photo_key}".encode("utf-8")).hexdigest()[:24]
                        remote_path = f"auto/{slug}/{identity}{ext}"
                    if upload_supabase_photo(person["photo"], remote_path, supabase_key):
                        if office_map.get(photo_key) != remote_path:
                            office_map[photo_key] = remote_path
                            changed_fields += 1
                        supabase_photo_uploads += 1
                    else:
                        supabase_photo_failures += 1
                # Ambiguous duplicate names are intentionally not auto-merged.
    finished = datetime.now(timezone.utc)
    report = {
        "started_at": started.isoformat(), "finished_at": finished.isoformat(),
        "timezone": "UTC", "offices_in_dataset": len(data), "sources_scanned": scanned,
        "sources_with_staff_tables": ok, "new_officers": added,
        "updated_officer_records": updated_records, "changed_fields": changed_fields,
        "photo_urls_found": photo_urls_found, "photos_saved": photos_saved,
        "supabase_photo_uploads": supabase_photo_uploads,
        "supabase_photo_failures": supabase_photo_failures,
        "supabase_photo_sync_enabled": bool(supabase_key),
        "photo_files_on_disk": len(list(PHOTO_DIR.glob("*"))) if PHOTO_DIR.exists() else 0,
        "failed_sources": len(failures), "failures_sample": failures[:100],
        "policy": "Extracts staff tables, profile cards and JSON-LD; follows up to 40 same-host staff/profile links; existing records are retained; ambiguous names are skipped; source failures are reported for retry."
    }
    if changed_fields:
        DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    if supabase_key and supabase_photo_uploads:
        PHOTO_MAP.write_text(json.dumps(photo_map, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
