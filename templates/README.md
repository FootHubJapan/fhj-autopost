# テンプレートファイルの配置

## ディレクトリ構造

```
templates/
  instagram/
    transfer.png    # 移籍カテゴリ用
    injury.png      # 怪我カテゴリ用
    manager.png     # 監督交代カテゴリ用
    tactics.png     # 分析カテゴリ用
    official.png    # 公式カテゴリ用
    result.png      # 速報カテゴリ用
    default.png     # デフォルト（カテゴリ未指定時）
  tiktok/
    transfer.png
    injury.png
    manager.png
    tactics.png
    official.png
    result.png
    default.png
```

## テンプレート仕様

### Instagram (1080x1350)

- **上部**: カテゴリタグ領域（例: 84x180から180x48の領域）
- **中央上部**: 結論1行（最大2行、自動改行）
- **中央下部**: 要点3つ（箇条書き）
- **下部**: フッター（ハンドル名、日付など）
- **右下**: 日付 + FHJブランド

### TikTok (1080x1920)

- **上部**: カテゴリタグ領域
- **中央上部**: 結論1行（最大2行）
- **中央下部**: 要点3つ（箇条書き）
- **下部**: フッター
- **右下**: 日付 + FHJブランド

## テンプレート作成方法

1. **デザインツールで作成**（Figma、Photoshop、Canvaなど）
2. **背景デザインのみ**を作成（テキストは含めない）
3. **PNG形式**で保存
4. 上記のディレクトリ構造に配置

## フォールバック

テンプレートファイルが存在しない場合、現在のSVGベースの生成にフォールバックします。

## カテゴリマッピング

`config/scoring.json` のカテゴリIDとテンプレートファイル名の対応：

- `transfer` → `transfer.png`
- `injury` → `injury.png`
- `manager` → `manager.png`
- `tactics` → `tactics.png`
- `official` → `official.png`
- `result` → `result.png`
- その他 → `default.png`
