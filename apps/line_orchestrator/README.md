# LINE Orchestrator

LINEから固定コマンドを受け取り、GitHub Actionsの `workflow_dispatch` を起動するための最小オーケストレーターです。

## セットアップ

### 必要な環境変数
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `WORKFLOW_FILE` (例: `schedule_mvp.yml`)
- `GITHUB_REF` (例: `main`)
- `WORKFLOW_INGESTION_FILE` (例: `ingestion_mvp.yml`)
- `WORKFLOW_LEARNING_FILE` (例: `learning_mvp.yml`)

任意:
- `LINE_ORCHESTRATOR_STATE_PATH` (default: `apps/line_orchestrator/state/jobs.json`)
- `POLL_INTERVAL_SEC` (default: 30)
- `POLL_TIMEOUT_SEC` (default: 600)
- `CHANGES_POLL_ENABLED` (default: false)
- `CHANGES_POLL_INTERVAL_SEC` (default: 3600)
- `NOTIFY_ON_NO_CHANGES` (default: false)
- `LINE_NOTIFY_USER_ID` (changes速報の通知先。必要な場合のみ設定)

### 依存関係
```bash
pip install -r apps/line_orchestrator/requirements.txt
```

### 起動
```bash
uvicorn apps.line_orchestrator.main:app --host 0.0.0.0 --port 8000
```

### LINE Developers の設定
- Webhook URL: `https://<host>/callback`
- Webhook送信を有効化

## コマンド
- `run schedule today JP format=1`
- `run schedule changes JP`
- `run ingest`
- `run learn`
- `learn_status`
- `score <run_id> likes=.. reposts=.. replies=..`
- `status`
- `help`

## 動作概要
1. LINE Webhook `/callback` にメッセージが到達
2. allowlistコマンドだけを受け付けてGitHub Actionsを起動
3. run_idを返信し、完了後に結果要約をLINEへ通知
