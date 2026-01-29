#!/usr/bin/env python3
import argparse
import json
import os
import sqlite3

import requests

from .storage import db_path, ensure_dir


def _embed(text: str, dims: int = 64) -> list[float]:
    vec = [0.0] * dims
    for idx, char in enumerate(text.encode("utf-8")):
        vec[idx % dims] += char / 255.0
    return vec


def _connect():
    ensure_dir()
    conn = sqlite3.connect(db_path())
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS docs (
            doc_id TEXT PRIMARY KEY,
            title TEXT,
            summary TEXT,
            url TEXT,
            published_at TEXT,
            tags TEXT,
            embedding TEXT,
            source_quality REAL
        )
        """
    )
    return conn


def index_from_ingestion(profile: str) -> None:
    path = f"apps/pipeline/data/facts/ingestion/{profile}.json"
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    items = payload.get("items", [])
    cognition_base_url = os.environ.get("COGNITION_BASE_URL")
    if cognition_base_url:
        docs = []
        for item in items:
            docs.append(
                {
                    "doc_id": item.get("entry_id"),
                    "title": item.get("title"),
                    "summary": (item.get("summary") or "")[:240],
                    "url": item.get("url"),
                    "published_at": item.get("published_at"),
                    "tags": [item.get("source_id")],
                    "source_quality": 0.8,
                }
            )
        resp = requests.post(
            f"{cognition_base_url.rstrip('/')}/upsert",
            json={"documents": docs},
            timeout=20,
        )
        resp.raise_for_status()
        return
    conn = _connect()
    for item in items:
        doc_id = item.get("entry_id")
        title = item.get("title")
        summary = (item.get("summary") or "")[:240]
        url = item.get("url")
        published_at = item.get("published_at")
        tags = json.dumps([item.get("source_id")], ensure_ascii=False)
        embedding = json.dumps(_embed(" ".join([title or "", summary or ""])) )
        source_quality = 0.8
        conn.execute(
            """
            INSERT OR REPLACE INTO docs
            (doc_id, title, summary, url, published_at, tags, embedding, source_quality)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (doc_id, title, summary, url, published_at, tags, embedding, source_quality),
        )
    conn.commit()
    conn.close()


def search(query: str, limit: int = 5) -> None:
    conn = _connect()
    rows = conn.execute(
        """
        SELECT title, url, summary FROM docs
        WHERE title LIKE ? OR summary LIKE ?
        ORDER BY published_at DESC
        LIMIT ?
        """,
        (f"%{query}%", f"%{query}%", limit),
    ).fetchall()
    for title, url, summary in rows:
        print(f"- {title} ({url})\n  {summary}")
    conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Knowledge index CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    index_cmd = sub.add_parser("index")
    index_cmd.add_argument("--from", dest="source", required=True)
    index_cmd.add_argument("--profile", default="soccer_schedule")

    search_cmd = sub.add_parser("search")
    search_cmd.add_argument("--query", required=True)

    args = parser.parse_args()
    if args.command == "index" and args.source == "ingestion":
        index_from_ingestion(args.profile)
        print("index updated")
    elif args.command == "search":
        search(args.query)


if __name__ == "__main__":
    main()
