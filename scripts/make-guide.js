#!/usr/bin/env node
// scripts/make-guide.js
// 投稿パックに POST_GUIDE.txt を生成する

import fs from "node:fs";
import path from "node:path";

/**
 * 投稿ガイドを生成する
 * @param {string} packDir - 投稿パックのディレクトリ
 * @param {string} platform - プラットフォーム名 (tiktok/instagram)
 * @param {Object} meta - メタデータ
 */
export function generatePostGuide(packDir, platform, meta = {}) {
  const guidePath = path.join(packDir, "POST_GUIDE.txt");
  
  let guide = "";
  
  if (platform === "tiktok") {
    guide = `📱 TikTok 投稿ガイド

【使うファイル】
✅ 動画: tt_1080x1920.mp4
📝 文章: caption.txt + hashtags.txt

【投稿手順】
1. TikTok Studio → Upload
2. tt_1080x1920.mp4 をドラッグ&ドロップ
3. caption.txt の内容をコピペ
4. hashtags.txt を末尾に追記（またはまとめて貼る）
5. 設定 → 「いつ公開するか」→ 日時を設定
6. 投稿（スケジュール）

【推奨投稿時刻】
・朝: 08:10
・昼: 12:10
・夜: 20:10

【ソース情報】
${meta.title ? `タイトル: ${meta.title}` : ""}
${meta.link ? `URL: ${meta.link}` : ""}
${meta.sourceUrl ? `RSS: ${meta.sourceUrl}` : ""}
`;
  } else if (platform === "instagram") {
    guide = `📸 Instagram 投稿ガイド

【使うファイル】
✅ 画像: ig_1080x1350.png
📝 文章: caption.txt + hashtags.txt

【投稿手順】
1. ig_1080x1350.png をスマホに送る（AirDrop推奨）
2. Instagramアプリ → ＋ → 投稿
3. 画像選択 → 次へ → 次へ
4. caption.txt + hashtags.txt をコピペ
5. シェア

【コツ】
・captionの先頭に「結論1行」を追加すると伸びやすい
例: 【要点】Radboud大学がFairphone採用。修理できるスマホを標準化。

【ソース情報】
${meta.title ? `タイトル: ${meta.title}` : ""}
${meta.link ? `URL: ${meta.link}` : ""}
${meta.sourceUrl ? `RSS: ${meta.sourceUrl}` : ""}
`;
  } else {
    // その他のプラットフォーム用
    guide = `📝 投稿ガイド

【使うファイル】
📝 文章: caption.txt + hashtags.txt

【ソース情報】
${meta.title ? `タイトル: ${meta.title}` : ""}
${meta.link ? `URL: ${meta.link}` : ""}
${meta.sourceUrl ? `RSS: ${meta.sourceUrl}` : ""}
`;
  }
  
  fs.writeFileSync(guidePath, guide, "utf-8");
  return guidePath;
}
