# Schedule Topic Spec

## Facts schema（例）
```json
{
  "topic": "schedule",
  "region": "JP",
  "date": "2026-01-28",
  "generated_at": "2026-01-28T05:46:36Z",
  "confidence": 0.8,
  "fixtures": [
    {
      "kickoff_local": "19:00",
      "kickoff_utc": "2026-01-28T10:00:00+00:00",
      "home": "川崎フロンターレ",
      "away": "横浜F・マリノス",
      "competition": "J1",
      "broadcast": "DAZN",
      "natural_key": "sha256..."
    }
  ]
}
```

## Sources schema（例）
```json
{
  "topic": "schedule",
  "collected_at": "2026-01-28T05:46:36Z",
  "items": [
    { "name": "Jリーグ公式", "url": "https://www.jleague.jp/", "type": "official" },
    { "name": "DAZN", "url": "https://www.dazn.com/", "type": "broadcast" }
  ]
}
```

## Confidence
`sources.items.type` を元に `0.0-1.0` で付与します。  
例: official=1.0, broadcast=0.8, api=0.6。

## Changes
`kickoff_utc` / `broadcast` / `venue` の変更のみ差分として記録します。

## Timezone
内部はUTC、表示は region によって変換します（JP=Asia/Tokyo / EU=Europe/Paris / US=America/New_York）。
