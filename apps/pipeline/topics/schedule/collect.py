from datetime import datetime

from .schema import normalize_date, normalize_fixture
from .sources import build_sources


def collect(date="today", region="JP"):
    normalized_date = normalize_date(date)
    raw_fixtures = [
        {
            "kickoff": "19:00",
            "home": "川崎フロンターレ",
            "away": "横浜F・マリノス",
            "competition": "J1",
            "broadcast": "DAZN",
        },
        {
            "kickoff": "21:00",
            "home": "鹿島アントラーズ",
            "away": "浦和レッズ",
            "competition": "J1",
            "broadcast": "DAZN",
        },
        {
            "kickoff": "23:00",
            "home": "FC東京",
            "away": "セレッソ大阪",
            "competition": "J1",
            "broadcast": "DAZN",
        },
        {
            "kickoff": "25:00",
            "home": "名古屋グランパス",
            "away": "ガンバ大阪",
            "competition": "J1",
            "broadcast": "DAZN",
        },
        {
            "kickoff": "27:00",
            "home": "柏レイソル",
            "away": "ヴィッセル神戸",
            "competition": "J1",
            "broadcast": "DAZN",
        },
    ]

    fixtures = [
        normalize_fixture(item, normalized_date, region).to_dict()
        for item in raw_fixtures
    ]
    sources = build_sources(region)

    facts = {
        "topic": "schedule",
        "region": region,
        "date": normalized_date,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "fixtures": fixtures,
    }
    sources_payload = {
        "topic": "schedule",
        "collected_at": datetime.utcnow().isoformat() + "Z",
        "items": sources,
    }
    return facts, sources_payload
