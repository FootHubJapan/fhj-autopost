import json
import os
from datetime import datetime, timezone
from typing import Any


def _base_dir() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pipeline", "data"))


def metrics_dir() -> str:
    return os.path.join(_base_dir(), "state", "metrics")


def learning_dir() -> str:
    return os.path.join(_base_dir(), "state", "learning")


def ensure_dirs() -> None:
    os.makedirs(metrics_dir(), exist_ok=True)
    os.makedirs(learning_dir(), exist_ok=True)


def record_metric(entry: dict[str, Any]) -> str:
    ensure_dirs()
    run_id = entry.get("run_id") or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = os.path.join(metrics_dir(), f"{run_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(entry, f, ensure_ascii=False, indent=2)
    return path


def update_metric(run_id: str, updates: dict[str, Any]) -> str:
    ensure_dirs()
    path = os.path.join(metrics_dir(), f"{run_id}.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
    else:
        payload = {"run_id": run_id}
    payload.update(updates)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return path


def load_metrics() -> list[dict[str, Any]]:
    ensure_dirs()
    entries = []
    for name in sorted(os.listdir(metrics_dir())):
        if not name.endswith(".json"):
            continue
        path = os.path.join(metrics_dir(), name)
        with open(path, "r", encoding="utf-8") as f:
            entries.append(json.load(f))
    return entries


def load_learning() -> dict[str, Any]:
    ensure_dirs()
    path = os.path.join(learning_dir(), "learning.json")
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_learning(payload: dict[str, Any]) -> str:
    ensure_dirs()
    path = os.path.join(learning_dir(), "learning.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return path
