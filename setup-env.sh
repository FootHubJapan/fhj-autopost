#!/bin/bash
# 環境変数設定スクリプト

echo "📝 Google Drive + Sheets API セットアップ"
echo ""

# 1. JSONファイルの確認
if [ ! -f "config/google-service-account.json" ]; then
  echo "❌ config/google-service-account.json が見つかりません"
  echo "   Google Cloud ConsoleからサービスアカウントのJSONキーをダウンロードして配置してください"
  exit 1
fi

# 2. client_emailの確認
CLIENT_EMAIL=$(cat config/google-service-account.json | grep -o '"client_email":\s*"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ サービスアカウント: $CLIENT_EMAIL"
echo ""

# 3. 環境変数の設定
export SPREADSHEET_ID="1VeypuBvnyLO70JG2wY0Y78rMSnOe0lpR8VoZbQmc_XY"
export SHEET_NAME="queue_index"

# 4. DRIVE_FOLDER_IDの確認
if [ -z "$DRIVE_FOLDER_ID" ]; then
  echo "⚠️ DRIVE_FOLDER_IDが設定されていません"
  echo "   DriveフォルダのURLからフォルダIDを取得して設定してください:"
  echo "   export DRIVE_FOLDER_ID=\"your_folder_id\""
  echo ""
  echo "   例: https://drive.google.com/drive/folders/【ここがフォルダID】"
  exit 1
fi

echo "✅ SPREADSHEET_ID: $SPREADSHEET_ID"
echo "✅ DRIVE_FOLDER_ID: $DRIVE_FOLDER_ID"
echo "✅ SHEET_NAME: $SHEET_NAME"
echo ""
echo "🚀 実行準備完了！"
echo "   npm run sync で実行できます"
