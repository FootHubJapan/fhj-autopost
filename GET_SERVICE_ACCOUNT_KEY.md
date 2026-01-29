# サービスアカウントJSONキーの取得方法

## ⚠️ 重要

現在共有されたJSONは **OAuth 2.0 クライアントシークレット** です。
このプロジェクトには **サービスアカウントのJSONキー** が必要です。

## 正しい手順

### 1. Google Cloud Consoleでサービスアカウントに移動

1. https://console.cloud.google.com/iam-admin/serviceaccounts にアクセス
2. プロジェクト「My First Project」を選択

### 2. サービスアカウントを選択

画像で確認したサービスアカウントのいずれかを選択：
- `fhj-autopost-525@project-7a4b7b1e-1c3a-4c55-b58.iam.gserviceaccount.com`
- `fhj-autopost@project-7a4b7b1e-1c3a-4c55-b58.iam.gserviceaccount.com`

### 3. JSONキーを作成

1. サービスアカウントの詳細ページで「キー」タブをクリック
2. 「キーを追加」→「新しいキーを作成」をクリック
3. **「JSON」** を選択
4. 「作成」をクリック
5. JSONファイルが自動ダウンロードされます

### 4. JSONファイルを配置

```bash
# ダウンロードしたJSONファイルを config/ に移動
mv ~/Downloads/*project-7a4b7b1e*.json config/google-service-account.json

# 確認
ls -la config/google-service-account.json
```

### 5. JSONファイルの形式確認

サービスアカウントのJSONは以下の形式です：

```json
{
  "type": "service_account",
  "project_id": "project-7a4b7b1e-1c3a-4c55-b58",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "fhj-autopost-525@project-7a4b7b1e-1c3a-4c55-b58.iam.gserviceaccount.com",
  ...
}
```

**重要**: `client_email` フィールドが含まれていることを確認してください。

## OAuthクライアントシークレットとの違い

| 項目 | OAuthクライアントシークレット | サービスアカウントJSON |
|------|---------------------------|---------------------|
| 用途 | ユーザー認証フロー | サーバー間認証 |
| 形式 | `{"installed": {...}}` | `{"type": "service_account", ...}` |
| 含まれる情報 | `client_id`, `client_secret` | `client_email`, `private_key` |
| 取得場所 | APIとサービス > 認証情報 | IAMと管理 > サービスアカウント > キー |

