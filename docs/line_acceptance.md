# LINE 受け入れ手順

## 事前準備
1. LINE Developers でチャネルを作成
2. Webhook URL を `https://<host>/callback` に設定
3. Webhook送信を有効化
4. 下記Secrets/環境変数を設定
   - `LINE_CHANNEL_SECRET`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `GITHUB_TOKEN`
   - `GITHUB_OWNER`
   - `GITHUB_REPO`
   - `WORKFLOW_FILE`
   - `WORKFLOW_INGESTION_FILE`
   - `WORKFLOW_LEARNING_FILE`

## 受け入れテスト手順
1. Orchestratorを起動
   ```bash
   uvicorn apps.line_orchestrator.main:app --host 0.0.0.0 --port 8000
   ```
2. LINEで `help` を送信 → コマンド一覧が返る
3. LINEで `run schedule today JP format=1` → run_idが返る
4. 完了後に結果要約がLINEへ通知される
5. LINEで `status` → 直近runの状態が返る
6. LINEで `run ingest` → 収集ジョブが起動し完了通知
7. LINEで `score <run_id> likes=5 reposts=2 replies=1` → 学習更新メッセージ
8. LINEで `learn_status` → 直近の勝ちパターンが返る

## 運用フロー
- 朝のfull: `schedule_mvp.yml`（JST 06:00 相当）
- 毎時changes: `schedule_mvp.yml`（mode=changes）
- 収集: `ingestion_mvp.yml`
- 学習: `learning_mvp.yml`
