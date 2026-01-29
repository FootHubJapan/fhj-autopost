# Soccer Media AI-Native Pipeline (MVP)

テーマ②「試合スケジュール・放送情報」を対象にした最小パイプラインです。

## 使い方（1コマンド）
```bash
python apps/pipeline/cli.py collect --topic schedule --date today \
  && python apps/pipeline/cli.py validate --topic schedule \
  && python apps/pipeline/cli.py compose --topic schedule --channel x --format 1 \
  && python apps/pipeline/cli.py publish --topic schedule --channel x --mode dry-run
```

## コマンド一覧
- `collect --topic schedule --date today --region JP`
- `validate --topic schedule --region JP`
- `compose --topic schedule --channel x --format 1 --mode full`
- `publish --topic schedule --channel x --mode dry-run`

## X向けフォーマット
- format=1: 注目3試合 + 見どころ
- format=2: 日本関係向け（注意書き付き）
- format=3: 配信サービス別まとめ

## 差分投稿
`compose --mode changes` で変更があった試合のみ投稿を生成します。

## publish mode
- dry-run: stdoutのみ（デフォ）
- manual: コピペ用の短縮ハッシュ付き
- api: スタブ（後でAPI連携）

## データ構造
- `data/facts/` : 正規化データ
- `data/sources/` : 根拠URL
- `data/contents/` : 生成物（X投稿）
- `data/state/` : Memory（過去投稿/テンプレ履歴）

## 拡張
`apps/pipeline/topics/` に `transfer` や `training` を追加するだけで、同じCLIで扱えます。
