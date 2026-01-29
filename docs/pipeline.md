# Pipeline Overview

## データ分離
- `apps/pipeline/data/facts/` : 正規化データ（facts）
- `apps/pipeline/data/sources/` : 根拠URL/収集元（sources）
- `apps/pipeline/data/contents/` : 生成物（contents）
- `apps/pipeline/data/state/` : 実行履歴/投稿履歴/差分（state）

## State構造
- `state/last_success.json` : 直近成功runの参照
- `state/runs/{run_id}.json` : 各runのメタ
- `state/changes/{date}.json` : 差分履歴
- `state/memory.json` : 投稿履歴/テンプレ/posted_hashes/publish_results
  - `runs.status` は `ok` / `degraded` / `fail` を取り得ます
- `state/metrics/{run_id}.json` : 反応ログ（学習用）
- `state/learning/learning.json` : 推奨フォーマットなどの集計結果

## パイプラインの流れ
1. collect: facts/sources を生成（失敗時は last_success でフォールバック）
2. validate: 重複排除/変更検知/信頼度付与
3. compose: X向けのフォーマット生成
4. publish: dry-run/manual/api（重複投稿防止）

## GitHub Actions 連携
`schedule_mvp.yml` は workflow_dispatch で `region/mode/format` を受け取り、
生成された `job_summary.txt` をArtifactsに含めます。
