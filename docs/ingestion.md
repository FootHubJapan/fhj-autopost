# Ingestion

## sources.yaml の追加方法
`apps/ingestion/sources.yaml` に profile を追加します。

```yaml
profiles:
  soccer_schedule:
    description: "公式/配信の発表をRSS/APIから取得"
    sources:
      - id: example_official
        name: "公式サイト"
        kind: rss
        url: "https://example.com/rss"
        type: official
```

- `kind`: 現状は `rss` のみ対応
- `type`: `official` / `broadcast` / `api` / `secondary`

## 実行
```bash
python apps/ingestion/cli.py ingest --profile soccer_schedule
```
