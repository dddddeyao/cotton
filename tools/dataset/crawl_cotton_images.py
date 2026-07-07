#!/usr/bin/env python3
"""Multi-source cotton image crawler.

Targets image data useful for cotton recognition: cotton lint, raw cotton,
opened bolls, plants, leaves, flowers, seedlings, and disease examples.

Sources:
- Openverse: broad CC/public-domain image search across many providers.
- iNaturalist: field photos of Gossypium plants and observations.
- GBIF: biodiversity occurrence images with media/license metadata.
- Wikimedia Commons: stable Commons API fallback with image metadata.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import mimetypes
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any


COMMONS_API = "https://commons.wikimedia.org/w/api.php"
GBIF_API = "https://api.gbif.org/v1/occurrence/search"
INAT_API = "https://api.inaturalist.org/v1/observations"
OPENVERSE_APIS = [
    "https://api.openverse.engineering/v1/images/",
    "https://api.openverse.org/v1/images/",
]
USER_AGENT = os.environ.get("COTTON_CRAWLER_USER_AGENT", "cotton-recognition-assistant-crawler/1.0")
RASTER_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
CC_LICENSES = {
    "cc0",
    "cc-by",
    "cc-by-sa",
    "cc-by-nc",
    "cc-by-nc-sa",
    "pdm",
    "publicdomain",
}

DEFAULT_QUERIES = [
    "cotton lint",
    "raw cotton",
    "seed cotton",
    "opened cotton boll",
    "mature cotton boll",
    "cotton boll close up",
    "cotton fiber macro",
    "cotton plant close up",
    "cotton leaf disease",
    "cotton seedling",
    "Gossypium hirsutum",
    "Gossypium barbadense",
]
DEFAULT_INAT_TAXA = ["72151", "Gossypium hirsutum", "Gossypium barbadense"]
DEFAULT_GBIF_SCIENTIFIC_NAMES = ["Gossypium", "Gossypium hirsutum", "Gossypium barbadense"]
DEFAULT_COMMONS_CATEGORIES = ["Cotton bolls", "Cotton fibers", "Cotton plants", "Gossypium"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download cotton-recognition images from multiple open sources.")
    parser.add_argument("--output", default="datasets/cotton-images", help="Output directory.")
    parser.add_argument("--limit", type=int, default=200, help="Total selected image records to download.")
    parser.add_argument("--per-source-limit", type=int, default=80, help="Max candidate records per source family.")
    parser.add_argument("--per-query-limit", type=int, default=20, help="Max candidate records per query/taxon/category.")
    parser.add_argument("--workers", type=int, default=4, help="Parallel image download workers.")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between source API requests.")
    parser.add_argument("--min-width", type=int, default=240, help="Skip images narrower than this.")
    parser.add_argument("--min-height", type=int, default=240, help="Skip images shorter than this.")
    parser.add_argument("--max-bytes", type=int, default=12 * 1024 * 1024, help="Skip larger source files when known; 0 disables.")
    parser.add_argument("--query", action="append", default=[], help="Extra keyword for Openverse/Commons search.")
    parser.add_argument("--taxon", action="append", default=[], help="Extra taxon for iNaturalist/GBIF.")
    parser.add_argument("--category", action="append", default=[], help="Extra Wikimedia Commons category.")
    parser.add_argument(
        "--sources",
        default="openverse,inaturalist,gbif,commons",
        help="Comma-separated sources: openverse,inaturalist,gbif,commons.",
    )
    parser.add_argument("--no-defaults", action="store_true", help="Only use explicitly provided terms.")
    parser.add_argument("--retries", type=int, default=3, help="HTTP retry attempts for 429/5xx/timeouts.")
    parser.add_argument("--dry-run", action="store_true", help="Collect metadata only; do not download images.")
    parser.add_argument("--rebuild-manifest", action="store_true", help="Rebuild manifest.csv from existing metadata JSON files.")
    parser.add_argument("--run-name", default="", help="Optional run folder name under output/runs.")
    parser.add_argument("--request-timeout", type=float, default=20.0, help="API request timeout in seconds.")
    parser.add_argument("--download-timeout", type=float, default=45.0, help="Image download timeout in seconds.")
    return parser.parse_args()


def log(message: str) -> None:
    print(message, flush=True)


def sleep_for_retry(exc: BaseException, attempt: int) -> None:
    retry_after = None
    if isinstance(exc, urllib.error.HTTPError):
        retry_after = exc.headers.get("Retry-After")
    if retry_after:
        try:
            wait = max(1.0, float(retry_after))
        except ValueError:
            wait = min(45.0, 2.0**attempt)
    else:
        wait = min(45.0, 2.0**attempt)
    log(f"  retry after {wait:.1f}s ({exc})")
    time.sleep(wait)


def http_json(url: str, params: dict[str, Any], retries: int, timeout: float = 20.0) -> dict[str, Any]:
    query = urllib.parse.urlencode({key: value for key, value in params.items() if value is not None}, doseq=True)
    request = urllib.request.Request(
        f"{url}?{query}",
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            if isinstance(exc, urllib.error.HTTPError) and exc.code not in {429, 500, 502, 503, 504}:
                raise
            if attempt >= retries:
                raise
            sleep_for_retry(exc, attempt)
    raise RuntimeError("unreachable json retry loop")


def http_bytes(url: str, retries: int, timeout: float = 45.0) -> tuple[bytes, str]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                content_type = response.headers.get_content_type() or ""
                return response.read(), content_type
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            if isinstance(exc, urllib.error.HTTPError) and exc.code not in {429, 500, 502, 503, 504}:
                raise
            if attempt >= retries:
                raise
            sleep_for_retry(exc, attempt)
    raise RuntimeError("unreachable binary retry loop")


def clean_text(value: Any) -> str:
    text = str(value or "")
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_license(value: str) -> str:
    return clean_text(value).lower().replace("_", "-")


def license_url(code: str) -> str:
    normalized = normalize_license(code)
    if normalized in {"cc0", "cc-0"}:
        return "https://creativecommons.org/publicdomain/zero/1.0/"
    if normalized in {"pdm", "publicdomain", "public-domain"}:
        return "https://creativecommons.org/publicdomain/mark/1.0/"
    if normalized.startswith("cc-by-nc-sa"):
        return "https://creativecommons.org/licenses/by-nc-sa/4.0/"
    if normalized.startswith("cc-by-nc"):
        return "https://creativecommons.org/licenses/by-nc/4.0/"
    if normalized.startswith("cc-by-sa"):
        return "https://creativecommons.org/licenses/by-sa/4.0/"
    if normalized.startswith("cc-by"):
        return "https://creativecommons.org/licenses/by/4.0/"
    return ""


def is_allowed_license(code: str) -> bool:
    normalized = normalize_license(code)
    return any(normalized == item or normalized.startswith(f"{item}-") for item in CC_LICENSES)


def collect_openverse(queries: list[str], args: argparse.Namespace) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    page_size = min(50, max(1, args.per_query_limit))
    for query in queries:
        if len(records) >= args.per_source_limit:
            break
        log(f"openverse: {query}")
        for base_url in OPENVERSE_APIS:
            try:
                data = http_json(
                    base_url,
                    {
                        "q": query,
                        "page_size": page_size,
                        "page": 1,
                        "mature": "false",
                        "license_type": "all-cc",
                    },
                    args.retries,
                    args.request_timeout,
                )
                for item in data.get("results", []):
                    image_url = item.get("url")
                    if not image_url:
                        continue
                    license_code = item.get("license") or ""
                    records.append(
                        {
                            "provider": "openverse",
                            "source_query": query,
                            "source_id": clean_text(item.get("id")),
                            "title": clean_text(item.get("title")),
                            "url": image_url,
                            "landing_url": item.get("foreign_landing_url") or item.get("detail_url") or "",
                            "thumbnail_url": item.get("thumbnail") or "",
                            "mime": "",
                            "width": int(item.get("width") or 0),
                            "height": int(item.get("height") or 0),
                            "source_bytes": 0,
                            "license": normalize_license(license_code),
                            "license_url": item.get("license_url") or license_url(license_code),
                            "creator": clean_text(item.get("creator")),
                            "creator_url": item.get("creator_url") or "",
                            "source_name": clean_text(item.get("source")),
                        },
                    )
                break
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                log(f"  openverse endpoint failed: {base_url} ({exc})")
                continue
        time.sleep(args.delay)
    return records[: args.per_source_limit]


def inat_photo_url(photo: dict[str, Any]) -> str:
    url = photo.get("url") or ""
    if not url:
        return ""
    return url.replace("square.", "original.").replace("small.", "original.").replace("medium.", "original.")


def collect_inaturalist(taxa: list[str], args: argparse.Namespace) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    per_page = min(50, max(1, args.per_query_limit))
    for taxon in taxa:
        if len(records) >= args.per_source_limit:
            break
        log(f"inaturalist: {taxon}")
        try:
            params = {
                "photos": "true",
                "per_page": per_page,
                "page": 1,
                "order_by": "created_at",
                "order": "desc",
                "license": "cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa",
                "photo_license": "cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa",
            }
            if taxon.isdigit():
                params["taxon_id"] = taxon
            else:
                params["taxon_name"] = taxon
            data = http_json(
                INAT_API,
                params,
                args.retries,
                args.request_timeout,
            )
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            log(f"  inaturalist failed: {exc}")
            continue
        for obs in data.get("results", []):
            taxon_name = clean_text((obs.get("taxon") or {}).get("name"))
            for photo in obs.get("photos", []):
                image_url = inat_photo_url(photo)
                if not image_url:
                    continue
                license_code = photo.get("license_code") or obs.get("license_code") or ""
                dims = photo.get("original_dimensions") or {}
                records.append(
                    {
                        "provider": "inaturalist",
                        "source_query": taxon,
                        "source_id": f"{obs.get('id', '')}:{photo.get('id', '')}",
                        "title": clean_text(obs.get("species_guess") or taxon_name or taxon),
                        "url": image_url,
                        "landing_url": obs.get("uri") or "",
                        "thumbnail_url": photo.get("url") or "",
                        "mime": "",
                        "width": int(dims.get("width") or 0),
                        "height": int(dims.get("height") or 0),
                        "source_bytes": 0,
                        "license": normalize_license(license_code),
                        "license_url": license_url(license_code),
                        "creator": clean_text(photo.get("attribution") or obs.get("user", {}).get("login")),
                        "creator_url": "",
                        "source_name": "iNaturalist",
                    },
                )
        time.sleep(args.delay)
    return records[: args.per_source_limit]


def collect_gbif(scientific_names: list[str], args: argparse.Namespace) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    limit = min(50, max(1, args.per_query_limit))
    for name in scientific_names:
        if len(records) >= args.per_source_limit:
            break
        log(f"gbif: {name}")
        try:
            data = http_json(
                GBIF_API,
                {
                    "scientificName": name,
                    "mediaType": "StillImage",
                    "limit": limit,
                    "offset": 0,
                },
                args.retries,
                args.request_timeout,
            )
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            log(f"  gbif failed: {exc}")
            continue
        for occurrence in data.get("results", []):
            for media in occurrence.get("media", []):
                image_url = media.get("identifier") or media.get("references") or ""
                if not image_url:
                    continue
                license_code = media.get("license") or occurrence.get("license") or ""
                records.append(
                    {
                        "provider": "gbif",
                        "source_query": name,
                        "source_id": f"{occurrence.get('key', '')}:{hashlib.sha1(image_url.encode('utf-8')).hexdigest()[:8]}",
                        "title": clean_text(media.get("title") or occurrence.get("scientificName") or name),
                        "url": image_url,
                        "landing_url": media.get("references") or f"https://www.gbif.org/occurrence/{occurrence.get('key', '')}",
                        "thumbnail_url": "",
                        "mime": "",
                        "width": 0,
                        "height": 0,
                        "source_bytes": 0,
                        "license": normalize_license(license_code),
                        "license_url": license_url(license_code) or clean_text(license_code),
                        "creator": clean_text(media.get("creator") or occurrence.get("recordedBy")),
                        "creator_url": "",
                        "source_name": "GBIF",
                    },
                )
        time.sleep(args.delay)
    return records[: args.per_source_limit]


def commons_imageinfo_params() -> dict[str, str]:
    return {
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiextmetadatafilter": "ObjectName|ImageDescription|Artist|Credit|Attribution|LicenseShortName|LicenseUrl|UsageTerms",
    }


def commons_record(page: dict[str, Any], source: str) -> dict[str, Any] | None:
    imageinfo = (page.get("imageinfo") or [{}])[0]
    url = imageinfo.get("url")
    mime = imageinfo.get("mime") or ""
    if not url or mime not in RASTER_MIME_TYPES:
        return None
    ext = {
        key: clean_text(value.get("value") if isinstance(value, dict) else value)
        for key, value in (imageinfo.get("extmetadata") or {}).items()
    }
    return {
        "provider": "commons",
        "source_query": source,
        "source_id": str(page.get("pageid", "")),
        "title": clean_text(page.get("title")),
        "url": url,
        "landing_url": imageinfo.get("descriptionurl") or "",
        "thumbnail_url": "",
        "mime": mime,
        "width": int(imageinfo.get("width") or 0),
        "height": int(imageinfo.get("height") or 0),
        "source_bytes": int(imageinfo.get("size") or 0),
        "license": normalize_license(ext.get("LicenseShortName", "")),
        "license_url": ext.get("LicenseUrl", ""),
        "creator": clean_text(ext.get("Artist") or ext.get("Attribution")),
        "creator_url": "",
        "source_name": "Wikimedia Commons",
    }


def collect_commons(queries: list[str], categories: list[str], args: argparse.Namespace) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    limit = min(25, max(1, args.per_query_limit))
    for query in queries:
        if len(records) >= args.per_source_limit:
            break
        log(f"commons search: {query}")
        try:
            data = http_json(
                COMMONS_API,
                {
                    "action": "query",
                    "format": "json",
                    "generator": "search",
                    "gsrnamespace": 6,
                    "gsrsearch": query,
                    "gsrlimit": limit,
                    **commons_imageinfo_params(),
                },
                args.retries,
                args.request_timeout,
            )
            for page in data.get("query", {}).get("pages", {}).values():
                record = commons_record(page, f"search:{query}")
                if record:
                    records.append(record)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            log(f"  commons search failed: {exc}")
        time.sleep(args.delay)
    for category in categories:
        if len(records) >= args.per_source_limit:
            break
        log(f"commons category: {category}")
        try:
            data = http_json(
                COMMONS_API,
                {
                    "action": "query",
                    "format": "json",
                    "generator": "categorymembers",
                    "gcmtitle": f"Category:{category}",
                    "gcmnamespace": 6,
                    "gcmlimit": limit,
                    **commons_imageinfo_params(),
                },
                args.retries,
                args.request_timeout,
            )
            for page in data.get("query", {}).get("pages", {}).values():
                record = commons_record(page, f"category:{category}")
                if record:
                    records.append(record)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            log(f"  commons category failed: {exc}")
        time.sleep(args.delay)
    return records[: args.per_source_limit]


def passes_filters(record: dict[str, Any], args: argparse.Namespace) -> bool:
    width = int(record.get("width") or 0)
    height = int(record.get("height") or 0)
    source_bytes = int(record.get("source_bytes") or 0)
    if width and width < args.min_width:
        return False
    if height and height < args.min_height:
        return False
    if args.max_bytes > 0 and source_bytes and source_bytes > args.max_bytes:
        return False
    license_code = record.get("license") or ""
    return not license_code or is_allowed_license(license_code) or bool(record.get("license_url"))


def dedupe(records: list[dict[str, Any]], args: argparse.Namespace) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    seen: set[str] = set()
    for record in records:
        key = record.get("url") or f"{record.get('provider')}:{record.get('source_id')}"
        if key in seen:
            continue
        seen.add(key)
        if not passes_filters(record, args):
            continue
        selected.append(record)
        if len(selected) >= args.limit:
            break
    return selected


def safe_stem(value: str) -> str:
    stem = clean_text(value).removeprefix("File:")
    stem = re.sub(r"[^\w.-]+", "_", stem, flags=re.UNICODE).strip("._")
    return (stem or "cotton_image")[:80]


def extension_for(record: dict[str, Any], content_type: str) -> str:
    mime = content_type if content_type in RASTER_MIME_TYPES else record.get("mime", "")
    extension = mimetypes.guess_extension(mime) if mime else ""
    if not extension:
        extension = Path(urllib.parse.urlparse(record["url"]).path).suffix
    if extension.lower() == ".jpe":
        extension = ".jpg"
    if extension.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        extension = ".jpg"
    return extension.lower()


def sha256_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def download_one(record: dict[str, Any], raw_dir: Path, metadata_dir: Path, retries: int, download_timeout: float) -> dict[str, Any]:
    url_hash = hashlib.sha1(record["url"].encode("utf-8")).hexdigest()[:12]
    base = f"{record['provider']}_{safe_stem(record.get('title') or record.get('source_query') or 'cotton')}_{url_hash}"
    candidate = raw_dir / f"{base}.jpg"
    status = "exists"
    error = ""
    content_type = ""
    payload = b""
    try:
        if candidate.exists():
            sha256 = sha256_file(candidate)
            byte_count = candidate.stat().st_size
        else:
            payload, content_type = http_bytes(record["url"], retries, download_timeout)
            extension = extension_for(record, content_type)
            candidate = raw_dir / f"{base}{extension}"
            part_path = candidate.with_suffix(f"{candidate.suffix}.part")
            part_path.write_bytes(payload)
            part_path.replace(candidate)
            sha256 = hashlib.sha256(payload).hexdigest()
            byte_count = len(payload)
            status = "downloaded"
        metadata_path = metadata_dir / f"{candidate.stem}.json"
        result = {
            **record,
            "file": candidate.as_posix(),
            "metadata_file": metadata_path.as_posix(),
            "download_mime": content_type,
            "sha256": sha256,
            "bytes": byte_count,
            "status": status,
            "error": error,
        }
        metadata_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        return result
    except (OSError, urllib.error.URLError, TimeoutError) as exc:
        return {
            **record,
            "file": candidate.as_posix(),
            "metadata_file": "",
            "download_mime": content_type,
            "sha256": "",
            "bytes": len(payload),
            "status": "failed",
            "error": str(exc),
        }


MANIFEST_FIELDS = [
    "status",
    "provider",
    "source_query",
    "source_id",
    "source_name",
    "title",
    "file",
    "metadata_file",
    "url",
    "landing_url",
    "thumbnail_url",
    "license",
    "license_url",
    "creator",
    "creator_url",
    "mime",
    "download_mime",
    "width",
    "height",
    "source_bytes",
    "bytes",
    "sha256",
    "error",
]


def write_manifest(path: Path, records: list[dict[str, Any]]) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=MANIFEST_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)


def append_jsonl(path: Path, record: dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def load_seen_urls(output_dir: Path) -> set[str]:
    seen: set[str] = set()
    for metadata_path in (output_dir / "metadata").glob("*.json"):
        try:
            item = json.loads(metadata_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        url = item.get("url")
        if url:
            seen.add(str(url))
    return seen

def rebuild_manifest(output_dir: Path) -> int:
    records: list[dict[str, Any]] = []
    for metadata_path in sorted((output_dir / "metadata").glob("*.json")):
        try:
            item = json.loads(metadata_path.read_text(encoding="utf-8"))
            item["metadata_file"] = metadata_path.as_posix()
            item["status"] = "exists" if Path(item.get("file", "")).exists() else "missing"
            records.append(item)
        except (OSError, json.JSONDecodeError) as exc:
            records.append({"status": "failed", "metadata_file": metadata_path.as_posix(), "error": str(exc)})
    write_manifest(output_dir / "manifest.csv", records)
    log(f"manifest rebuilt rows={len(records)}")
    return 0


def collect_all(args: argparse.Namespace) -> list[dict[str, Any]]:
    sources = {item.strip().lower() for item in args.sources.split(",") if item.strip()}
    queries = ([] if args.no_defaults else DEFAULT_QUERIES) + args.query
    taxa = ([] if args.no_defaults else DEFAULT_INAT_TAXA) + args.taxon
    scientific_names = ([] if args.no_defaults else DEFAULT_GBIF_SCIENTIFIC_NAMES) + args.taxon
    categories = ([] if args.no_defaults else DEFAULT_COMMONS_CATEGORIES) + args.category
    records: list[dict[str, Any]] = []
    if "openverse" in sources:
        records.extend(collect_openverse(queries, args))
    if "inaturalist" in sources:
        records.extend(collect_inaturalist(taxa, args))
    if "gbif" in sources:
        records.extend(collect_gbif(scientific_names, args))
    if "commons" in sources:
        records.extend(collect_commons(queries, categories, args))
    return dedupe(records, args)


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output)
    raw_dir = output_dir / "raw"
    metadata_dir = output_dir / "metadata"
    logs_dir = output_dir / "logs"
    run_name = args.run_name or datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = output_dir / "runs" / run_name
    run_manifest_jsonl = run_dir / "manifest.jsonl"
    raw_dir.mkdir(parents=True, exist_ok=True)
    metadata_dir.mkdir(parents=True, exist_ok=True)
    logs_dir.mkdir(parents=True, exist_ok=True)
    run_dir.mkdir(parents=True, exist_ok=True)
    if args.rebuild_manifest:
        return rebuild_manifest(output_dir)
    log(f"sources={args.sources} limit={args.limit}")
    records = collect_all(args)
    seen_urls = load_seen_urls(output_dir)
    if seen_urls:
        records = [record for record in records if record["url"] not in seen_urls]
    log(f"selected records={len(records)}")
    (logs_dir / "last-candidates.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    (run_dir / "candidates.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.dry_run:
        return 0
    results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = [executor.submit(download_one, record, raw_dir, metadata_dir, args.retries, args.download_timeout) for record in records]
        for index, future in enumerate(as_completed(futures), start=1):
            result = future.result()
            results.append(result)
            append_jsonl(run_manifest_jsonl, result)
            if index % 5 == 0 or index == len(futures):
                write_manifest(output_dir / "manifest.csv", sorted(results, key=lambda item: (item["provider"], item["title"])))
                downloaded = sum(1 for item in results if item["status"] == "downloaded")
                failed = sum(1 for item in results if item["status"] == "failed")
                log(f"progress {index}/{len(futures)} downloaded={downloaded} failed={failed}")
    write_manifest(output_dir / "manifest.csv", sorted(results, key=lambda item: (item["provider"], item["title"])))
    return rebuild_manifest(output_dir)


if __name__ == "__main__":
    raise SystemExit(main())
