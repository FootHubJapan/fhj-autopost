from zoneinfo import ZoneInfo
from datetime import datetime

from ..schema import REGION_TZ


def format_kickoff(iso_ts, region):
    tz = ZoneInfo(REGION_TZ.get(region, REGION_TZ["JP"]))
    local = datetime.fromisoformat(iso_ts).astimezone(tz)
    return local.strftime("%H:%M")


def format_fixture_line(fixture, region):
    kickoff = format_kickoff(fixture["kickoff_utc"], region)
    return f"{kickoff} {fixture['home']} vs {fixture['away']} ({fixture['competition']})"


def compose_format_one(fixtures, region, sources):
    highlights = [
        "注目カードは首位争いの直接対決",
        "今節はナイトゲームが集中",
        "上位陣の連戦コンディションに注目",
    ]
    lines = [
        "【今日の試合スケジュール】",
        *[format_fixture_line(item, region) for item in fixtures],
        "",
        "見どころ:",
        *[f"- {point}" for point in highlights],
        "",
        f"配信: {sources}",
        "#サッカー #試合日程",
    ]
    return "\n".join(lines).strip() + "\n"


def compose_format_two(fixtures, region, sources):
    lines = [
        "【日本勢の試合チェック】",
        "※日本人選手の出場可否は公式発表をご確認ください。",
        *[format_fixture_line(item, region) for item in fixtures],
        "",
        f"配信: {sources}",
        "#サッカー #試合日程",
    ]
    return "\n".join(lines).strip() + "\n"


def compose_format_three(fixtures, region, sources):
    lines = [
        "【配信サービス別まとめ】",
        f"配信: {sources}",
        "",
        "ピックアップ:",
        *[format_fixture_line(item, region) for item in fixtures],
        "#サッカー #試合日程",
    ]
    return "\n".join(lines).strip() + "\n"


def compose_changes(changes, region):
    if not changes:
        return "【変更情報】変更はありません。\n#サッカー #試合日程\n"
    lines = ["【日程/配信変更】"]
    for change in changes:
        match = f"{change.get('home', '')} vs {change.get('away', '')}".strip()
        if match != "vs":
            lines.append(match)
        lines.append(
            f"{change['field']}: {change['before']} → {change['after']}"
        )
    lines.append("#サッカー #試合日程")
    return "\n".join(lines).strip() + "\n"
