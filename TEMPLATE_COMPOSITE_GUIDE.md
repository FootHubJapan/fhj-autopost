# テンプレート合成方式ガイド

## 実装完了

### 1. HTML/CSSテンプレート（固定レイアウト）
- **`templates/ig-card/template.html`** - 固定レイアウト
- **`templates/ig-card/template.css`** - 安全域64px、階層設計、フォント固定

### 2. レンダリングスクリプト
- **`scripts/render-ig-card.js`** - HTML/CSS → PNG（Playwright）
- **`scripts/render-poster-ffmpeg.js`** - HTML/CSS → PNG → ffmpeg overlay（プロ品質）

## テンプレートの特徴

### 安全域（Safe Area）
- **上下左右64px**を厳守
- すべての要素が安全域内に配置

### 階層設計
1. **カテゴリラベル**（上部、小さく）
2. **大見出し**（中央、大きく、最大2行）
3. **箇条書き**（下部、3つまで）
4. **CTA**（最下部固定）
5. **フッター**（ハンドル + 日付）

### フォント固定
- **日本語**: Noto Sans JP
- **英語**: Inter
- **タイトル**: 64px（長い場合は自動縮小）
- **箇条書き**: 32px
- **CTA**: 24px

### 自動調整機能
- **タイトル**: 最大2行、超えたら省略（…）
- **フォント縮小**: 長さに応じて64px→56px→48px→42px
- **箇条書き**: 60文字超は自動省略

## 使用方法

### 基本（HTML/CSSレンダリングのみ）

```bash
npm run render:ig
```

### プロ品質（HTML/CSS + ffmpeg overlay）

```javascript
import { renderPosterWithFFmpeg } from './scripts/render-poster-ffmpeg.js';

await renderPosterWithFFmpeg({
  outPath: 'output.png',
  title: 'タイトル',
  categoryLabel: '移籍',
  bullets: ['要点1', '要点2', '要点3'],
  handle: '@football_hub_japan',
  dateString: '2026.01.21',
  heroImageUrl: 'https://...', // オプション
  useFFmpegOverlay: true,
});
```

## テンプレートのカスタマイズ

### CSSを編集
`templates/ig-card/template.css` を編集して、デザインを調整できます。

### レイアウト変更
- **カテゴリラベル位置**: `.category-label` の `top`, `left` を変更
- **タイトル位置**: `.title` の `margin-top`, `margin-bottom` を変更
- **箇条書き位置**: `.bullets` の `margin-top` を変更

### 色の変更
- **背景グラデ**: `.background` の `background` を変更
- **ガラスカード**: `.glass-card` の `background`, `backdrop-filter` を変更
- **カテゴリラベル**: `.category-label` の `background` を変更

## ヒーロー画像の追加

`meta.json` に `heroImageUrl` を追加すると、右上に円形画像が表示されます：

```json
{
  "heroImageUrl": "https://example.com/player.jpg"
}
```

## 品質保証

- **20枚連続生成してもレイアウトが崩れない**
- **文字が切れない**（安全域64px内）
- **中央寄せが毎回一致**（CSS固定）
- **フォントが固定**（Google Fonts使用）

## 次のステップ

1. **ヒーロー画像の自動取得**: 記事URLから選手画像を取得
2. **背景テクスチャの追加**: ノイズ/グランジ効果
3. **TikTokカードテンプレート**: 同様の方式で1080x1920版を作成
