# 実行準備完了！

## ✅ 完了していること

- OAuth認証: 完了（`config/oauth-token.json` が存在）
- SPREADSHEET_ID: 設定済み
- queue/ ディレクトリ: 投稿パックが存在

## ⚠️ 実行前に必要な設定

`DRIVE_FOLDER_ID` を設定してください：

```bash
export DRIVE_FOLDER_ID="1dBIj3R8kbv00btJMX4OAIfY8x6ZcRfMd"
```

## 実行

環境変数を設定したら：

```bash
npm run sync
```

これで以下が順番に実行されます：
1. `npm run upload:drive` - Driveに画像・動画をアップロード
2. `npm run export:csv` - CSVを生成
3. `npm run push:sheets` - Google Sheetsに反映

## 確認

実行後、以下を確認してください：
- Google Driveフォルダに画像・動画がアップロードされているか
- Google Sheetsにデータが反映されているか
- `igPreview` 列に画像が表示されているか

