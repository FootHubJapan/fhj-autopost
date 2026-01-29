#!/usr/bin/env python3
import argparse
import hashlib
import os
import time
from datetime import datetime
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import feedparser
import requests
import yaml

from .storage import (
    changes_path,
    facts_path,
    raw_items_path,
    read_optional_json,
    read_json,
    run_id,
    run_path,
    sources_path,
    write_json,
    last_success_path,
)

USER_AGENT = "fhj-ingestion-bot/1.0 (+https://example.com)"


def load_sources(profile: str, path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    profiles = config.get("profiles", {})
    if profile not in profiles:
        raise ValueError(f"unknown profile: {profile}")
    return profiles[profile]


def _entry_id(entry: dict) -> str:
    raw = entry.get("id") or entry.get("guid") or entry.get("link", "")
    published = entry.get("published", "")
    payload = f"{raw}|{published}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def fetch_rss(url: str) -> dict:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    rp = RobotFileParser()
    rp.set_url(robots_url)
    try:
        rp.read()
        if not rp.can_fetch(USER_AGENT, url):
            raise RuntimeError(f"robots.txt disallows fetch: {url}")
    except Exception:
        pass
    headers = {"User-Agent": USER_AGENT}
    resp = requests.get(url, headers=headers, timeout=20)
    resp.raise_for_status()
    return feedparser.parse(resp.text)


def normalize_entries(feed: dict, source_id: str) -> list[dict]:
    items = []
    for entry in feed.entries:
        item = {
            "entry_id": _entry_id(entry),
            "title": entry.get("title", ""),
            "url": entry.get("link", ""),
            "published_at": entry.get("published", ""),
            "summary": entry.get("summary", ""),
            "source_id": source_id,
        }
        items.append(item)
    return items


def detect_changes(previous: list[dict], current: list[dict]) -> dict:
    prev_map = {item["entry_id"]: item for item in previous}
    curr_map = {item["entry_id"]: item for item in current}

    added = [item for key, item in curr_map.items() if key not in prev_map]
    removed = [item for key, item in prev_map.items() if key not in curr_map]
    updated = []
    for key, item in curr_map.items():
        prev = prev_map.get(key)
        if not prev:
            continue
        if prev.get("title") != item.get("title") or prev.get("summary") != item.get("summary"):
            updated.append({"before": prev, "after": item})
    return {"added": added, "removed": removed, "updated": updated}


def ingest(profile: str, sources_file: str) -> None:
    profile_config = load_sources(profile, sources_file)
    sources = profile_config.get("sources", [])
    if not sources:
        raise ValueError("sources is empty")
    status = "ok"
    error = ""
    try:
        all_items = []
        raw_items = []
        for source in sources:
            kind = source.get("kind")
            url = source.get("url")
            source_id = source.get("id")
            if kind != "rss":
                continue
            feed = fetch_rss(url)
            raw_items.extend(feed.entries)
            all_items.extend(normalize_entries(feed, source_id))
            time.sleep(1)

        unique = {item["entry_id"]: item for item in all_items}
        normalized_items = list(unique.values())
    except Exception as exc:
        status = "degraded"
        error = str(exc)
        fallback = read_optional_json(last_success_path())
        if not fallback:
            raise
        fallback_facts = read_json(fallback["facts_path"])
        normalized_items = fallback_facts.get("items", [])
        raw_items = []

    previous = read_optional_json(facts_path(profile))
    prev_items = previous.get("items", []) if previous else []
    changes = detect_changes(prev_items, normalized_items)

    facts_payload = {
        "profile": profile,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "items": normalized_items,
    }
    sources_payload = {
        "profile": profile,
        "collected_at": datetime.utcnow().isoformat() + "Z",
        "items": sources,
    }

    write_json(facts_path(profile), facts_payload)
    write_json(raw_items_path(profile), {"items": raw_items})
    write_json(sources_path(profile), sources_payload)

    change_summary = {
        "profile": profile,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "added": len(changes["added"]),
        "updated": len(changes["updated"]),
        "removed": len(changes["removed"]),
    }
    write_json(changes_path(datetime.utcnow().date().isoformat()), {"summary": change_summary})

    run_meta = {
        "run_id": run_id(),
        "profile": profile,
        "status": status,
        "error": error,
        "facts_path": facts_path(profile),
        "sources_path": sources_path(profile),
    }
    write_json(run_path(run_meta["run_id"]), run_meta)
    if status == "ok":
        write_json(last_success_path(), run_meta)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingestion CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    ingest_cmd = sub.add_parser("ingest")
    ingest_cmd.add_argument("--profile", required=True)
    ingest_cmd.add_argument(
        "--sources",
        default=os.path.join(os.path.dirname(__file__), "sources.yaml"),
    )

    args = parser.parse_args()
    if args.command == "ingest":
        ingest(args.profile, args.sources)
        print("ingestion completed")


if __name__ == "__main__":
    main()
