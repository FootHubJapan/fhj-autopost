from datetime import datetime

from .storage import load_metrics, save_learning


def score(entry: dict) -> float:
    outcome = entry.get("outcome") or {}
    likes = outcome.get("likes") or 0
    reposts = outcome.get("reposts") or 0
    replies = outcome.get("replies") or 0
    return likes * 1 + reposts * 2 + replies * 1


def time_window(created_at: str) -> str:
    try:
        dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        hour = dt.hour
    except Exception:
        return "unknown"
    if 5 <= hour < 11:
        return "morning"
    if 11 <= hour < 17:
        return "afternoon"
    if 17 <= hour < 22:
        return "evening"
    return "night"


def update_learning() -> dict:
    metrics = load_metrics()
    buckets: dict[str, dict[int, list[float]]] = {}
    for entry in metrics:
        created_at = entry.get("created_at") or ""
        window = time_window(created_at)
        format_id = entry.get("format") or 1
        buckets.setdefault(window, {}).setdefault(format_id, []).append(score(entry))

    best_by_window = {}
    for window, formats in buckets.items():
        best_format = None
        best_score = -1.0
        for format_id, scores in formats.items():
            avg = sum(scores) / len(scores)
            if avg > best_score:
                best_score = avg
                best_format = format_id
        if best_format is not None:
            best_by_window[window] = {"format": best_format, "score": round(best_score, 2)}

    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "best_format_by_timewindow": best_by_window,
        "best_templates_topk": [],
        "banned_templates": [],
    }
    save_learning(payload)
    return payload
