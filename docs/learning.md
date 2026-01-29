# Learning（パフォーマンス改善）

## metrics スキーマ
保存先: `apps/pipeline/data/state/metrics/`

```json
{
  "run_id": "20240101T000000Z",
  "created_at": "2024-01-01T00:00:00Z",
  "topic": "schedule",
  "channel": "x",
  "region": "JP",
  "mode": "full",
  "format": 1,
  "content_hash": "...",
  "features": {
    "length": 240,
    "hashtag_count": 2,
    "match_count": 5
  },
  "outcome": {
    "likes": 10,
    "reposts": 2,
    "replies": 1,
    "impressions": 1000
  }
}
```

## スコア関数
```
score = likes*1 + reposts*2 + replies*1
```

## 推奨ロジック
- 直近metricsの平均スコアを時間帯別に集計
- `best_format_by_timewindow` に最良formatを保存

保存先: `apps/pipeline/data/state/learning/learning.json`

## 将来の拡張
- テンプレート別のバンディット
- リーグ別の最適化
- 反応率（impressionsベース）の利用
