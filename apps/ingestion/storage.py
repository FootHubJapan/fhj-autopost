import json
import os
from datetime import datetime


def _base_dir() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pipeline", "data"))


def ingestion_dir() -> str:
    return os.path.join(_base_dir(), "state", "ingestion")


def runs_dir() -> str:
    return os.path.join(ingestion_dir(), "runs")


def changes_dir() -> str:
    return os.path.join(ingestion_dir(), "changes")


def ensure_dirs() -> None:
    os.makedirs(os.path.join(_base_dir(), "facts", "ingestion"), exist_ok=True)
    os.makedirs(os.path.join(_base_dir(), "sources", "ingestion"), exist_ok=True)
    os.makedirs(runs_dir(), exist_ok=True)
    os.makedirs(changes_dir(), exist_ok=True)


def run_id() -> str:
    return datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")


def facts_path(profile: str) -> str:
    return os.path.join(_base_dir(), "facts", "ingestion", f"{profile}.json")


def raw_items_path(profile: str) -> str:
    return os.path.join(_base_dir(), "facts", "ingestion", f"{profile}_items.json")


def sources_path(profile: str) -> str:
    return os.path.join(_base_dir(), "sources", "ingestion", f"{profile}.json")


def last_success_path() -> str:
    return os.path.join(ingestion_dir(), "last_success.json")


def run_path(run_id_value: str) -> str:
    return os.path.join(runs_dir(), f"{run_id_value}.json")


def changes_path(date_str: str) -> str:
    return os.path.join(changes_dir(), f"{date_str}.json")


def write_json(path: str, payload: dict) -> None:
    ensure_dirs()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def read_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def read_optional_json(path: str):
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
