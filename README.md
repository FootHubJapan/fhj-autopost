# FHJ Auto Post

RSSフィードからソーシャルメディア投稿パックを自動生成するツールです。

## 機能

- 複数のRSSフィードから記事を取得
- 各プラットフォーム・アカウントごとに投稿パックを生成
- 二重生成防止（投稿済みIDを記録）
- エラーハンドリング（RSS単位・アカウント単位で継続実行）
- GitHub Actionsで定期実行（1時間に1回）

## セットアップ

1. 依存関係をインストール:
```bash
npm install
```

2. 環境変数を設定:
```bash
# .env ファイルを作成
cat > .env << EOF
RSS_URLS=https://example.com/feed1.xml,https://example.com/feed2.xml
EOF
# または手動で .env ファイルを作成して RSS_URLS を設定
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
          caption.txt      # 投稿本文
          hashtags.txt     # ハッシュタグ
          sources.txt      # ソースURL
          meta.json        # メタデータ
```

## 設定ファイル

### config/accounts.json

プラットフォームとアカウントの設定:

```json
{
  "platforms": {
    "twitter": {
      "accounts": [
        {
          "id": "account1",
          "name": "Account 1"
        }
      ]
    }
  }
}
```

### .env

環境変数:

```
RSS_URLS=https://example.com/feed1.xml,https://example.com/feed2.xml
```

## GitHub Actions

GitHub Actionsで1時間に1回自動実行されます。

### Secrets設定

リポジトリのSettings > Secrets and variables > Actions で以下を設定:

- `RSS_URLS`: カンマ区切りのRSSフィードURL

### Artifacts

実行結果はArtifactsとして保存され、30日間保持されます。

## 二重生成防止

`state/posted.json` に投稿済みの `post_id` を記録し、同じIDの記事はスキップします。

## ライセンス

MIT
