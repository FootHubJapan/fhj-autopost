# テンプレート実装の現状

## ✅ 完了したこと

1. **テンプレートベースの実装** (`src/media-template.js`)
   - テンプレートPNG + ffmpeg drawtext方式
   - TikTok動画の改善（テキスト出現タイミング、CTA追加）
   - フォールバック機能（テンプレートがない場合はSVG方式）

2. **テンプレートディレクトリ構造**
   - `templates/instagram/` と `templates/tiktok/` を作成
   - README.mdでテンプレート仕様を記載

## ⚠️ 次のステップ

### 1. テンプレートPNGファイルの作成

現在、テンプレートファイルは存在しないため、**フォールバックでSVG方式が使用されます**。

テンプレートを作成するには：

1. **デザインツールで背景を作成**（Figma、Photoshop、Canvaなど）
   - Instagram: 1080x1350
   - TikTok: 1080x1920
   - テキスト領域を考慮したレイアウト

2. **カテゴリごとにテンプレートを配置**
   ```
   templates/
     instagram/
       transfer.png
       injury.png
       manager.png
       tactics.png
       official.png
       result.png
       default.png
     tiktok/
       transfer.png
       injury.png
       manager.png
       tactics.png
       official.png
       result.png
       default.png
   ```

### 2. run.jsの更新（オプション）

テンプレート方式を使用するには、`scripts/run.js` を更新：

```javascript
// テンプレート方式を使用
import { generateImagesAndVideoTemplate } from "../src/media-template.js";

// または、条件付きで切り替え
const useTemplate = fs.existsSync(path.join(ROOT, "templates", "instagram", "default.png"));
if (useTemplate) {
  await generateImagesAndVideoTemplate({ ... });
} else {
  await generateImagesAndVideo({ ... });
}
```

### 3. フォントの問題

現在の実装では、Mac固有のフォントパス（`/System/Library/Fonts/Helvetica.ttc`）を使用しています。

**改善案**:
- 日本語フォント（Noto Sans JPなど）を使用
- フォントパスを環境変数で設定可能にする
- フォントが見つからない場合のフォールバック

## 現在の動作

- **テンプレートファイルがない場合**: 現在のSVG方式が使用される（既存の動作）
- **テンプレートファイルがある場合**: テンプレートベースの生成が使用される

## 確認方法

1. **テンプレートファイルを1つ配置**（例: `templates/instagram/default.png`）
2. **`npm run dry` を実行**
3. **生成された画像を確認**

## 次のアクション

テンプレートファイルを作成するか、既存のSVG方式を継続使用するか選択してください。

テンプレートファイルを作成する場合は、`templates/README.md` の仕様に従って作成してください。
