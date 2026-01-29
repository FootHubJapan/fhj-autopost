# Pipeline Spec (Summary)

## CLI Flow
1. collect
2. validate
3. compose
4. publish

## State
- `state/runs/{run_id}.json` : 各runの結果
- `state/changes/{date}.json` : 差分履歴
- `state/last_success.json` : 最終成功run
- `state/memory.json` : posted_hashes/publish_results（重複投稿防止の実体）

## Confidence
`sources.items.type` によって `0.0-1.0` の数値で付与します。  
例: official=1.0, broadcast=0.8, api=0.6, secondary=0.4。
