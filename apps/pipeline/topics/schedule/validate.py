import hashlib

from .schema import to_utc_iso
from .sources import compute_confidence


def build_natural_key(fixture, date_str, region):
    kickoff_utc = fixture.get("kickoff_utc") or to_utc_iso(
        date_str, fixture["kickoff_local"], region
    )
    payload = "|".join(
        [
            date_str,
            fixture.get("competition", ""),
            fixture.get("home", ""),
            fixture.get("away", ""),
            kickoff_utc,
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def detect_changes(previous_facts, current_facts):
    changes = []
    if not previous_facts:
        return changes
    prev_map = {item["natural_key"]: item for item in previous_facts.get("fixtures", [])}
    for fixture in current_facts.get("fixtures", []):
        prev = prev_map.get(fixture["natural_key"])
        if not prev:
            continue
        for field in ["kickoff_utc", "broadcast", "venue"]:
            if prev.get(field) != fixture.get(field):
                changes.append(
                    {
                        "natural_key": fixture["natural_key"],
                        "home": fixture.get("home"),
                        "away": fixture.get("away"),
                        "field": field,
                        "before": prev.get(field),
                        "after": fixture.get(field),
                    }
                )
    return changes


def validate(facts, sources, region, previous_facts=None):
    issues = []
    fixtures = facts.get("fixtures", [])
    if not fixtures:
        issues.append("fixtures が空です。")

    if not sources.get("items"):
        issues.append("sources.items が空です。")

    deduped = {}
    for fixture in fixtures:
        natural_key = build_natural_key(fixture, facts["date"], region)
        fixture["natural_key"] = natural_key
        deduped[natural_key] = fixture

    facts["fixtures"] = list(deduped.values())
    confidence = compute_confidence(sources.get("items", []))
    for fixture in facts["fixtures"]:
        fixture["confidence"] = confidence
    facts["confidence"] = confidence

    changes = detect_changes(previous_facts, facts)
    return issues, changes
