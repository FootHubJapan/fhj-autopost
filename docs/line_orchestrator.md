# LINE Orchestrator 設計

## 目的
LINEから固定コマンドを送信し、GitHub Actionsのworkflowを安全に起動・監視・通知する。

## フロー
1. LINE Webhook `/callback` でメッセージを受信
2. allowlist コマンドのみ受理
3. GitHub Actions `workflow_dispatch` を実行
4. run_idを返信し、完了後に成果物を要約してLINEへ通知

## LINE Developers 設定
- Webhook URL: `https://<host>/callback`
- Webhook送信を有効化

## コマンド（allowlist）
- `run schedule today JP format=1`
- `run schedule changes JP`
- `run ingest`
- `run learn`
- `learn_status`
- `score <run_id> likes=.. reposts=.. replies=..`
- `status`
- `help`

## セキュリティ
- 署名検証: `X-Line-Signature`
- 任意コマンド実行は禁止（固定コマンドのみ）
- SecretsはGitHub Secrets/環境変数で管理
  - `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `GITHUB_TOKEN` などはコミットしない

## Changes定期実行
- GitHub Actionsの `schedule` で1時間おきに `mode=changes` を実行
- `job_summary.txt` に「差分なし」を明記
- Orchestrator側は `NOTIFY_ON_NO_CHANGES=false` の場合は通知を抑制
