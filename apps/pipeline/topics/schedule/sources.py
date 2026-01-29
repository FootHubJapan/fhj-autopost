SOURCE_PRIORITY = {
    "official": 1.0,
    "broadcast": 0.8,
    "api": 0.6,
    "secondary": 0.4,
}


def build_sources(region):
    return [
        {
            "name": "Jリーグ公式",
            "url": "https://www.jleague.jp/",
            "type": "official",
        },
        {
            "name": "DAZN",
            "url": "https://www.dazn.com/",
            "type": "broadcast",
        },
        {"name": "region", "url": region, "type": "meta"},
    ]


def compute_confidence(sources):
    score = 0.0
    for source in sources:
        score = max(score, SOURCE_PRIORITY.get(source.get("type"), 0.3))
    return round(score, 2)
