import hashlib
from datetime import datetime, timezone

from ....storage import record_metric


def publish(content, mode, memory, meta=None, run_id=None):
    content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
    if memory.has_posted_hash(content_hash):
        return {"status": "skipped", "reason": "duplicate", "hash": content_hash}

    if mode == "manual":
        output = content.rstrip() + f"\n\n#copy-{content_hash[:8]}\n"
    else:
        output = content

    if mode == "api":
        result = {
            "status": "stub",
            "reason": "api_not_implemented",
            "hash": content_hash,
            "output": output,
        }
        memory.record_publish({"hash": content_hash, "mode": mode, "status": "stub"})
        _record_metrics(meta, run_id, content_hash, content)
        return result

    memory.record_publish({"hash": content_hash, "mode": mode, "status": "ok"})
    _record_metrics(meta, run_id, content_hash, content)
    return {"status": "ok", "hash": content_hash, "output": output}


def _record_metrics(meta, run_id, content_hash, content):
    meta = meta or {}
    run_id = run_id or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    metrics = {
        "run_id": run_id,
        "created_at": datetime.now(timezone.utc).isoformat() + "Z",
        "topic": meta.get("topic", "schedule"),
        "channel": meta.get("channel", "x"),
        "region": meta.get("region", "JP"),
        "mode": meta.get("mode", "full"),
        "format": meta.get("format", 1),
        "content_hash": content_hash,
        "features": {
            "length": len(content),
            "hashtag_count": content.count("#"),
            "match_count": meta.get("match_count", 0),
        },
        "outcome": {
            "likes": None,
            "reposts": None,
            "replies": None,
            "impressions": None,
        },
    }
    record_metric(run_id, metrics)
