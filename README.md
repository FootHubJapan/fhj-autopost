# FHJ Auto Post

RSSフィードからソーシャルメディア投稿パックを自動生成するツールです。

## 機能

- 複数のRSSフィードから記事を取得
- 各プラットフォーム・アカウントごとに投稿パックを生成
- 二重生成防止（投稿済みIDを記録）
- エラーハンドリング（RSS単位・アカウント単位で継続実行）
- GitHub Actionsで定期実行（1時間に1回）
- サッカー用RSSフィードに対応

## セットアップ

1. 依存関係をインストール:
```bash
npm install
```

2. ffmpegをインストール（TikTok動画生成に必要）:
```bash
# macOS
brew install ffmpeg

# Linux (Ubuntu/Debian)
sudo apt-get install ffmpeg

# Windows
# https://ffmpeg.org/download.html からダウンロード
```

2. RSSフィードを設定:
```bash
# config/feeds.json を編集して使用するRSSフィードを設定
```

3. アカウント設定を編集:
```bash
# config/accounts.json を編集してプラットフォームとアカウントを設定
```

## 使い方

### ローカル実行（dry-run）

```bash
npm run dry
```

### 通常実行

```bash
npm run run
```

## 出力形式

投稿パックは以下のディレクトリ構造で生成されます:

```
out/
  YYYY-MM-DD/
    <platform>/
      <account>/
        <post_id>/
          caption.txt           # 投稿本文（タイトル + リンク）
          hashtags.txt          # ハッシュタグ
          sources.txt           # ソースURL（フィードURL + 記事URL）
          meta.json             # メタデータ（postId, title, link, pubDate等）
          ig_1080x1350.png      # Instagram用画像（4:5、instagram/tiktokプラットフォームのみ）
          tt_1080x1920_cover.png # TikTok用カバー画像（9:16、instagram/tiktokプラットフォームのみ）
          tt_1080x1920.mp4      # TikTok用簡易動画（ズーム演出、ffmpegが必要）
```

### 画像・動画生成

- **Instagram用画像**: 1080x1350px（4:5）の縦型画像
- **TikTok用カバー画像**: 1080x1920px（9:16）の縦型画像
- **TikTok用動画**: 12秒のズーム演出付き動画（ffmpegが必要）

画像・動画は `instagram` と `tiktok` プラットフォームの投稿パックにのみ生成されます。

## 設定ファイル

### config/feeds.json

RSSフィードの設定:

```json
{
  "feeds": [
    {
      "id": "espn_soccer",
      "name": "ESPN Soccer News",
      "url": "https://www.espn.com/espn/rss/soccer/news"
    },
    {
      "id": "bbc_sport",
      "name": "BBC Sport Football",
      "url": "https://feeds.bbci.co.uk/sport/football/rss.xml"
    }
  ]
}
```

### config/accounts.json

プラットフォームとアカウントの設定:

```json
{
  "platforms": {
    "twitter": {
      "accounts": [
        { "id": "x_soccer", "name": "X Soccer" }
      ]
    },
    "instagram": {
      "accounts": [
        {
          "id": "ig_football_hub_japan",
          "handle": "@football_hub_japan",
          "name": "Football Hub Japan"
        }
      ]
    },
    "tiktok": {
      "accounts": [
        {
          "id": "tt_fhj",
          "handle": "@football_hub_japan",
          "name": "TikTok FHJ"
        }
      ]
    }
  }
}
```

## GitHub Actions

GitHub Actionsで1時間に1回自動実行されます。

### Artifacts

実行結果はArtifactsとして保存され、ダウンロード可能です。

## 二重生成防止

`state/posted.json` に投稿済みの `post_id` を記録し、同じIDの記事はスキップします。

## 運用フロー（手動投稿）

### 1. 投稿キューを更新

毎日、今日分の投稿パックを `queue/` に集めます：

```bash
npm run queue
```

これで以下が作成されます：
- `queue/tiktok/` - TikTok用投稿パック
- `queue/instagram/` - Instagram用投稿パック

### 2. TikTok予約投稿（約3分/本）

1. TikTok Studio → Upload
2. `queue/tiktok/投稿フォルダ/tt_1080x1920.mp4` をドラッグ
3. `caption.txt` の内容をコピペ
4. 設定 → いつ公開するか → 日時を設定（例：08:10, 12:10, 20:10）
5. 投稿（スケジュール）

**推奨**: 1日3本（朝/昼/夜）

### 3. Instagram投稿（約2分/本）

1. `queue/instagram/投稿フォルダ/ig_1080x1350.png` をスマホに送る（AirDrop推奨）
2. Instagramアプリ → ＋ → 投稿
3. 画像選択 → 次へ → 次へ
4. `caption.txt` + `hashtags.txt` をコピペ
5. シェア

**コツ**: captionの先頭に「結論1行」を追加すると伸びやすい

### 4. 投稿済みマーク

投稿したフォルダに `__POSTED` を付けて、二重投稿を防止：

```bash
npm run mark-posted tiktok フォルダ名
npm run mark-posted instagram フォルダ名
```

または手動で：
```bash
mv "queue/tiktok/xxx" "queue/tiktok/xxx__POSTED"
mv "queue/instagram/yyy" "queue/instagram/yyy__POSTED"
```

### 毎日の作業（合計10分以内）

1. `npm run queue` 実行（10秒）
2. TikTok：3本予約（6分）
3. Instagram：1本投稿（2分）
4. 投稿済みマーク（30秒）

## キュー一覧のエクスポート

投稿パックをスプレッドシートで管理できます：

```bash
npm run export:csv
```

これで `queue_index.csv` が生成されます。Google Sheetsにインポートして投稿作業を管理できます。

### CSVの列構成

- **投稿管理**: platform, category, score, title, link
- **投稿スケジュール**: recommendedTime, scheduledDate, scheduledTime, posted
- **投稿内容**: caption, hashtags
- **ファイル確認**: hasIg, hasTtVideo, hasTtCover
- **その他**: accountId, domain, pubDate, postId, folder, notes, guidePreview

### Google Sheetsでの使い方

1. `npm run export:csv` でCSVを生成
2. Google Sheets → ファイル → インポート → `queue_index.csv` をアップロード
3. `scheduledDate`, `scheduledTime`, `posted`, `notes` 列に手動で入力
4. `link` 列は自動的にクリック可能なリンクになります

## 次のステップ

現在は「投稿パックの生成」まで実装済みです。次は以下のいずれかを実装できます：

1. **TikTok Studioへの自動入力**（Playwright等でブラウザ自動操作）
2. **X (Twitter) API**での自動投稿
3. **Instagram Graph API**での自動投稿
4. **Google Sheets API**での自動反映（B案）

## ライセンス

MIT
