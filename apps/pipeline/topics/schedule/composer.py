from datetime import datetime
from zoneinfo import ZoneInfo

from ...storage import Paths, read_optional_json
from .compose import (
    compose_format_one,
    compose_format_two,
    compose_format_three,
    compose_changes,
)
from .schema import REGION_TZ


def compose(facts, sources, channel, memory, region, format_id=1, mode="full", changes=None):
    fixtures = facts.get("fixtures", [])[:5]
    source_names = [
        item.get("name")
        for item in sources.get("items", [])
        if item.get("name") and item.get("type") != "meta"
    ]
    source_label = "/".join(source_names) if source_names else "未定"

    selected_format = format_id
    if selected_format == 0:
        learning = read_optional_json(Paths.learning_path()) or {}
        tz_name = REGION_TZ.get(region, REGION_TZ["JP"])
        local_hour = datetime.now(ZoneInfo(tz_name)).hour
        if 5 <= local_hour < 11:
            window = "morning"
        elif 11 <= local_hour < 17:
            window = "afternoon"
        elif 17 <= local_hour < 22:
            window = "evening"
        else:
            window = "night"
        recommended = (
            learning.get("best_format_by_timewindow", {})
            .get(window, {})
            .get("format")
        )
        selected_format = recommended or 1

    if mode == "changes":
        content = compose_changes(changes or [], region)
    elif selected_format == 2:
        content = compose_format_two(fixtures, region, source_label)
    elif selected_format == 3:
        content = compose_format_three(fixtures, region, source_label)
    else:
        content = compose_format_one(fixtures, region, source_label)

    facts["resolved_format"] = selected_format
    memory.save_post(
        {
            "topic": facts.get("topic"),
            "channel": channel,
            "content": content,
            "format": selected_format,
            "mode": mode,
        }
    )
    return content
