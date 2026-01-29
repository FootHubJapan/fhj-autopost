# Google Drive + Sheets API セットアップガイド

## 1. サービスアカウントJSONの配置（最重要）

### ✅ 正しい場所

プロジェクト直下（`package.json` がある階層）で：

```bash
mkdir -p config
mv ~/Downloads/*.json config/google-service-account.json
```

※ `~/Downloads/*.json` はダウンロードした鍵ファイル名に合わせてください。
（すでにファイルがあるなら `mv` は不要）

### ✅ 置けたか確認

```bash
ls -la config/google-service-account.json
```

### 使用するサービスアカウントの確認

JSONファイル内の `client_email` を確認：

```bash
cat config/google-service-account.json | grep client_email
```

**重要**: JSONの `client_email` と一致するサービスアカウントに共有してください。

## 2. DriveフォルダIDの取得

フォルダURLがこうなら：

```
https://drive.google.com/drive/folders/1dBlj3R8kbv00btJMX4OAIYf8x6ZcRfMd
```

この **`1dBlj3R8kbv00btJMX4OAIYf8x6ZcRfMd`** が `DRIVE_FOLDER_ID`

## 3. スプレッドシートIDの確認

Google SheetsのURLからスプレッドシートIDを取得：

```
https://docs.google.com/spreadsheets/d/【ここがスプレッドシートID】/edit
```

**使用するスプレッドシートID**: `1VeypuBvnyLO70JG2wY0Y78rMSnOe0lpR8VoZbQmc_XY`

## 4. 環境変数の設定（改行必須）

### ✅ ターミナルで一発（推奨）

```bash
export DRIVE_FOLDER_ID="your_drive_folder_id"
export SPREADSHEET_ID="1VeypuBvnyLO70JG2wY0Y78rMSnOe0lpR8VoZbQmc_XY"
```

**重要**: `export` コマンドは必ず改行して実行してください。

### ✅ ちゃんと入ったか確認

```bash
echo $DRIVE_FOLDER_ID
echo $SPREADSHEET_ID
```

### その他の環境変数（任意）

```bash
# サービスアカウントJSONのパス（デフォルト: config/google-service-account.json）
export GOOGLE_SA_JSON="config/google-service-account.json"

# シート名（デフォルト: queue_index）
export SHEET_NAME="queue_index"

# Driveリンクを公開するか（任意、デフォルト: false）
export DRIVE_MAKE_PUBLIC="true"
```

## 4. 共有設定の確認

### A) Driveフォルダの共有
✅ 完了済み（画像で確認）

- フォルダをサービスアカウントのメールに「編集者」で共有

### B) スプレッドシートの共有
✅ 完了済み（画像で確認）

- スプレッドシートをサービスアカウントのメールに「編集者」で共有

## 5. 画像表示について

### Driveリンクの形式

**共有リンク（閲覧用）**:
```
https://drive.google.com/file/d/FILE_ID/view?usp=sharing
```

**直接ダウンロード用URL（IMAGE()関数で使用）**:
```
https://drive.google.com/uc?export=download&id=FILE_ID
```

### CSVに含まれる列

- `igImageUrl`, `ttCoverUrl`, `ttVideoUrl` - 共有リンク（閲覧用）
- `igImageFileId`, `ttCoverFileId`, `ttVideoFileId` - ファイルID
- `igPreview`, `ttCoverPreview` - IMAGE()関数用の数式（自動生成）

### シートでの画像表示

`igPreview` 列に自動で `=IMAGE("https://drive.google.com/uc?export=download&id=FILE_ID")` が生成されます。

シートに反映すると、この列に画像が表示されます。

## 5. setup-env.sh で確認（推奨）

```bash
chmod +x setup-env.sh
./setup-env.sh
```

## 6. 実行

```bash
# 一括実行（推奨）
npm run sync

# 個別実行
npm run upload:drive  # Driveにアップロード
npm run export:csv    # CSV生成
npm run push:sheets   # Sheetsに反映
```

## トラブルシューティング

### A) `ENOENT: no such file or directory config/google-service-account.json`

→ JSONがその場所に無い / ファイル名違う

✅ **対処**: `ls -la config/` で確認

### B) `The caller does not have permission` / `insufficientPermissions`

→ 共有が足りないケース

✅ **対処**: **Driveフォルダ** と **スプレッドシート** の両方を、**"JSONの client_email" のサービスアカウントに編集者共有**してるか確認

### C) `Requested entity was not found`（folder not found）

→ `DRIVE_FOLDER_ID` が間違い（フォルダIDじゃなくて別のID貼ってる）

✅ **対処**: URLの `/folders/` の直後だけを入れる

### D) Sheetsに書けない / 反映されない

→ スプレッドシートID違い or シート名/タブ名が想定と違う

✅ **対処**: `SPREADSHEET_ID` がURLの `/d/` と `/edit` の間か確認

### E) `DRIVE_FOLDER_ID is missing`

→ 環境変数 `DRIVE_FOLDER_ID` が設定されていない

✅ **対処**: `export DRIVE_FOLDER_ID="your_folder_id"` を実行

### F) `SPREADSHEET_ID is missing`

→ 環境変数 `SPREADSHEET_ID` が設定されていない

✅ **対処**: `export SPREADSHEET_ID="1VeypuBvnyLO70JG2wY0Y78rMSnOe0lpR8VoZbQmc_XY"` を実行

### G) 画像が表示されない

→ `igPreview` 列の数式が正しく生成されているか確認

✅ **対処**: ファイルIDが正しく保存されているか `meta.json` を確認。Driveファイルが正しくアップロードされているか確認。
