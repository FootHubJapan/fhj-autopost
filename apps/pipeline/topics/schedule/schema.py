from dataclasses import dataclass, asdict
from datetime import datetime, date as date_class, timedelta
from zoneinfo import ZoneInfo

REGION_TZ = {
    "JP": "Asia/Tokyo",
    "EU": "Europe/Paris",
    "US": "America/New_York",
}


def normalize_date(input_date):
    if input_date == "today":
        return datetime.now().date().isoformat()
    return input_date


def to_utc_iso(date_str, kickoff_local, region):
    tz_name = REGION_TZ.get(region, REGION_TZ["JP"])
    local_tz = ZoneInfo(tz_name)
    base_date = date_class.fromisoformat(date_str)
    hour, minute = map(int, kickoff_local.split(":"))
    day_offset = hour // 24
    hour = hour % 24
    local_dt = datetime(
        base_date.year, base_date.month, base_date.day, hour, minute, tzinfo=local_tz
    ) + timedelta(days=day_offset)
    return local_dt.astimezone(ZoneInfo("UTC")).isoformat()


@dataclass
class Fixture:
    kickoff_local: str
    kickoff_utc: str
    home: str
    away: str
    competition: str
    venue: str | None = None
    broadcast: str | None = None
    natural_key: str | None = None
    confidence: float | None = None

    def to_dict(self):
        return asdict(self)


def normalize_fixture(data, date_str, region):
    kickoff_local = data["kickoff"]
    kickoff_utc = to_utc_iso(date_str, kickoff_local, region)
    fixture = Fixture(
        kickoff_local=kickoff_local,
        kickoff_utc=kickoff_utc,
        home=data["home"],
        away=data["away"],
        competition=data["competition"],
        venue=data.get("venue"),
        broadcast=data.get("broadcast"),
    )
    return fixture
