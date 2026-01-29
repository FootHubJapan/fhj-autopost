# OAuth認証でのクイックスタート

## 状況

組織ポリシーによりサービスアカウントキーの作成が無効化されているため、OAuth 2.0クライアント認証を使用します。

## セットアップ手順

### 1. OAuthクライアントJSONの配置（完了済み）

✅ `config/oauth-client.json` が配置されています。

### 2. 環境変数の設定

```bash
export DRIVE_FOLDER_ID="1dBIj3R8kbv00btJMX4OAIfY8x6ZcRfMd"
export SPREADSHEET_ID="1VeypuBvnyLO70JG2wY0Y78rMSnOe0lpR8VoZbQmc_XY"
```

### 3. 初回認証（一度だけ実行）

```bash
npm run setup:oauth
```

このコマンドを実行すると：
1. ブラウザで認証URLが表示されます
2. Googleアカウントでログインして権限を付与
3. 表示される認証コードをコピー
4. ターミナルに貼り付けてEnter

認証トークンが `config/oauth-token.json` に保存されます。

### 4. 実行

```bash
npm run sync
```

これで以下が実行されます：
- Driveに画像・動画をアップロード
- CSVを生成
- Google Sheetsに反映

## 注意事項

- **初回のみ手動認証が必要**: 一度認証すれば、以降は自動的にトークンが使用されます
- **トークンの有効期限**: トークンが期限切れになった場合は、再度 `npm run setup:oauth` を実行してください
- **セキュリティ**: `config/oauth-token.json` は `.gitignore` に含まれていますが、絶対にGitにコミットしないでください

## トラブルシューティング

### 認証コードが表示されない
→ ブラウザで認証URLを開いて、手動でコードを取得してください

### トークンが無効になった
→ `npm run setup:oauth` を再実行して再認証してください

### 権限エラーが発生する
→ Driveフォルダとスプレッドシートが、あなたのGoogleアカウントで共有されているか確認してください
