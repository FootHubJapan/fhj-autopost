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
          caption.txt      # 投稿本文（タイトル + リンク）
          hashtags.txt     # ハッシュタグ
          sources.txt      # ソースURL（フィードURL + 記事URL）
          meta.json        # メタデータ（postId, title, link, pubDate等）
```

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

## 次のステップ

現在は「投稿パックの生成」まで実装済みです。次は以下のいずれかを実装できます：

1. **TikTok Studioへの自動入力**（Playwright等でブラウザ自動操作）
2. **X (Twitter) API**での自動投稿
3. **Instagram Graph API**での自動投稿

## ライセンス

MIT
