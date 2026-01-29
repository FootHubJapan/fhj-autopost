// src/media-template.js
// テンプレートベースのメディア生成（PSDレベルの見た目を目指す）
// テンプレートPNG + ffmpeg drawtext方式

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const TEMPLATES_DIR = path.join(ROOT, "templates");

/**
 * テンプレートファイルのパスを取得
 */
function getTemplatePath(platform, categoryId) {
  const platformDir = path.join(TEMPLATES_DIR, platform);
  const templateFile = path.join(platformDir, `${categoryId || "default"}.png`);
  
  if (fs.existsSync(templateFile)) {
    return templateFile;
  }
  
  // デフォルトテンプレートを試す
  const defaultFile = path.join(platformDir, "default.png");
  if (fs.existsSync(defaultFile)) {
    return defaultFile;
  }
  
  return null; // テンプレートが見つからない
}

/**
 * テキストを自動改行（最大行数制限付き）
 */
function wrapText(text, maxChars, maxLines = 2) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  
  for (const w of words) {
    const cand = line ? `${line} ${w}` : w;
    if (cand.length <= maxChars) {
      line = cand;
    } else {
      if (line) lines.push(line);
      line = w;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  
  return lines;
}

/**
 * フォントサイズを段階的に調整（長いテキスト用）
 */
function calculateFontSize(text, maxChars, baseSize) {
  if (text.length <= maxChars) return baseSize;
  if (text.length <= maxChars * 1.5) return baseSize - 8;
  if (text.length <= maxChars * 2) return baseSize - 16;
  return baseSize - 24;
}

/**
 * ffmpegのdrawtext用エスケープ
 */
function escapeDrawtext(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

/**
 * Instagram画像を生成（テンプレート + drawtext）
 */
async function generateInstagramImage({
  templatePath,
  outPath,
  categoryLabel,
  conclusion,
  bullets,
  dateString,
  handle,
}) {
  if (!templatePath) {
    throw new Error("Template file not found");
  }

  // テキストの準備
  const conclusionLines = wrapText(conclusion, 35, 2);
  const fontSize = calculateFontSize(conclusion, 35, 72);
  
  // drawtextフィルターを構築
  const filters = [];
  
  // カテゴリタグ（上部）
  if (categoryLabel) {
    filters.push(
      `drawtext=text='${escapeDrawtext(categoryLabel)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=28:fontcolor=white:` +
      `x=84:y=200:box=1:boxcolor=black@0.5:boxborderw=10`
    );
  }
  
  // 結論1行（中央上部）
  conclusionLines.forEach((line, i) => {
    const y = 450 + i * (fontSize + 10);
    filters.push(
      `drawtext=text='${escapeDrawtext(line)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=${fontSize}:fontcolor=white:` +
      `x=84:y=${y}:box=1:boxcolor=black@0.4:boxborderw=8`
    );
  });
  
  // 要点3つ（中央下部）
  bullets.slice(0, 3).forEach((bullet, i) => {
    const y = 750 + i * 60;
    filters.push(
      `drawtext=text='• ${escapeDrawtext(bullet)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=36:fontcolor=rgba(255,255,255,0.9):` +
      `x=84:y=${y}`
    );
  });
  
  // ハンドル（下部左）
  if (handle) {
    filters.push(
      `drawtext=text='${escapeDrawtext(handle)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=30:fontcolor=rgba(255,255,255,0.85):` +
      `x=84:y=1220`
    );
  }
  
  // 日付 + FHJ（右下）
  const footerText = `${dateString} Football Hub Japan`;
  filters.push(
    `drawtext=text='${escapeDrawtext(footerText)}':` +
    `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=28:fontcolor=rgba(255,255,255,0.65):` +
    `x=996:y=120:text_align=right`
  );
  
  const filterComplex = filters.join(",");
  
  // ffmpegで画像生成
  const args = [
    "-y",
    "-i", templatePath,
    "-vf", filterComplex,
    "-frames:v", "1",
    outPath
  ];
  
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error("ffmpeg failed to generate image");
  }
}

/**
 * TikTok動画を生成（改善版：テキスト出現タイミング付き）
 */
async function generateTikTokVideo({
  templatePath,
  coverPath,
  outPath,
  categoryLabel,
  conclusion,
  bullets,
  dateString,
  handle,
}) {
  if (!templatePath) {
    throw new Error("Template file not found");
  }

  // まずカバー画像を生成（動画のベース）
  await generateTikTokCover({
    templatePath,
    outPath: coverPath,
    categoryLabel,
    conclusion,
    bullets,
    dateString,
    handle,
  });

  // テキスト出現タイミング付き動画を生成
  const conclusionLines = wrapText(conclusion, 40, 2);
  const fontSize = calculateFontSize(conclusion, 40, 78);
  
  // 複雑なフィルター（テキスト出現 + zoompan）
  const filters = [];
  
  // 0-2秒: カテゴリタグ + 結論フェードイン
  if (categoryLabel) {
    filters.push(
      `drawtext=text='${escapeDrawtext(categoryLabel)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=28:fontcolor=white:` +
      `x=84:y=360:box=1:boxcolor=black@0.5:boxborderw=10:` +
      `enable='between(t,0,12)'`
    );
  }
  
  conclusionLines.forEach((line, i) => {
    const y = 520 + i * (fontSize + 10);
    filters.push(
      `drawtext=text='${escapeDrawtext(line)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=${fontSize}:fontcolor=white:` +
      `x=84:y=${y}:box=1:boxcolor=black@0.4:boxborderw=8:` +
      `enable='between(t,${i * 0.5},12)':` +
      `alpha='if(lt(t,${i * 0.5 + 0.5}),0,if(lt(t,${i * 0.5 + 1}),(t-${i * 0.5})/0.5,1))'`
    );
  });
  
  // 2-8秒: 要点が1つずつ出現（2秒ごと）
  bullets.slice(0, 3).forEach((bullet, i) => {
    const startTime = 2 + i * 2;
    const y = 980 + i * 70;
    filters.push(
      `drawtext=text='• ${escapeDrawtext(bullet)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=42:fontcolor=rgba(255,255,255,0.9):` +
      `x=84:y=${y}:` +
      `enable='between(t,${startTime},12)':` +
      `alpha='if(lt(t,${startTime}),0,if(lt(t,${startTime + 0.5}),(t-${startTime})/0.5,1))'`
    );
  });
  
  // 8-12秒: CTA表示
  const ctaText = "続報はフォロー";
  filters.push(
    `drawtext=text='${escapeDrawtext(ctaText)}':` +
    `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=36:fontcolor=white:` +
    `x=540:y=1700:text_align=center:box=1:boxcolor=black@0.6:boxborderw=10:` +
    `enable='between(t,8,12)':` +
    `alpha='if(lt(t,8),0,if(lt(t,8.5),(t-8)/0.5,if(lt(t,11.5),1,(12-t)/0.5)))'`
  );
  
  // ハンドル + 日付（常時表示）
  if (handle) {
    filters.push(
      `drawtext=text='${escapeDrawtext(handle)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=30:fontcolor=rgba(255,255,255,0.85):` +
      `x=84:y=1850:enable='between(t,0,12)'`
    );
  }
  
  const footerText = `${dateString} FHJ`;
  filters.push(
    `drawtext=text='${escapeDrawtext(footerText)}':` +
    `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=28:fontcolor=rgba(255,255,255,0.65):` +
    `x=996:y=120:text_align=right:enable='between(t,0,12)'`
  );
  
  const filterComplex = filters.join(",");
  
  // zoompan + テキスト + フェード
  const finalFilter = `scale=1080:1920,zoompan=z='min(1.04,1.0+0.0002*on)':d=1:s=1080x1920:fps=30,${filterComplex},fade=t=in:st=0:d=0.6,fade=t=out:st=11.4:d=0.6`;
  
  const args = [
    "-y",
    "-loop", "1",
    "-i", coverPath,
    "-t", "12",
    "-vf", finalFilter,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "20",
    "-preset", "medium",
    "-movflags", "+faststart",
    "-r", "30",
    outPath
  ];
  
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error("ffmpeg failed to generate video");
  }
}

/**
 * TikTokカバー画像を生成
 */
async function generateTikTokCover({
  templatePath,
  outPath,
  categoryLabel,
  conclusion,
  bullets,
  dateString,
  handle,
}) {
  const conclusionLines = wrapText(conclusion, 40, 2);
  const fontSize = calculateFontSize(conclusion, 40, 78);
  
  const filters = [];
  
  if (categoryLabel) {
    filters.push(
      `drawtext=text='${escapeDrawtext(categoryLabel)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=28:fontcolor=white:` +
      `x=84:y=360:box=1:boxcolor=black@0.5:boxborderw=10`
    );
  }
  
  conclusionLines.forEach((line, i) => {
    const y = 520 + i * (fontSize + 10);
    filters.push(
      `drawtext=text='${escapeDrawtext(line)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=${fontSize}:fontcolor=white:` +
      `x=84:y=${y}:box=1:boxcolor=black@0.4:boxborderw=8`
    );
  });
  
  bullets.slice(0, 3).forEach((bullet, i) => {
    const y = 980 + i * 70;
    filters.push(
      `drawtext=text='• ${escapeDrawtext(bullet)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=42:fontcolor=rgba(255,255,255,0.9):` +
      `x=84:y=${y}`
    );
  });
  
  if (handle) {
    filters.push(
      `drawtext=text='${escapeDrawtext(handle)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=30:fontcolor=rgba(255,255,255,0.85):` +
      `x=84:y=1850`
    );
  }
  
  const footerText = `${dateString} FHJ`;
  filters.push(
    `drawtext=text='${escapeDrawtext(footerText)}':` +
    `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=28:fontcolor=rgba(255,255,255,0.65):` +
    `x=996:y=120:text_align=right`
  );
  
  const filterComplex = filters.join(",");
  
  const args = [
    "-y",
    "-i", templatePath,
    "-vf", filterComplex,
    "-frames:v", "1",
    outPath
  ];
  
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error("ffmpeg failed to generate cover");
  }
}

/**
 * メインエクスポート関数（テンプレートベース）
 */
export async function generateImagesAndVideoTemplate({
  outDir,
  title,
  categoryLabel,
  categoryId,
  handle = "@football_hub_japan",
  summary, // { conclusion, points }
}) {
  fs.mkdirSync(outDir, { recursive: true });
  
  const dateString = new Date().toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).replace(/\//g, '.');
  
  const conclusion = summary?.conclusion || title;
  const bullets = summary?.points || [
    "最新情報をチェック",
    "詳細はリンクで確認",
    "続報をお待ちください"
  ];
  
  // テンプレートパスを取得
  const igTemplate = getTemplatePath("instagram", categoryId);
  const ttTemplate = getTemplatePath("tiktok", categoryId);
  
  // テンプレートが存在しない場合は、従来のSVG方式にフォールバック
  if (!igTemplate || !ttTemplate) {
    console.warn("⚠️ テンプレートファイルが見つかりません。SVG方式にフォールバックします。");
    const { generateImagesAndVideo } = await import("./media.js");
    return await generateImagesAndVideo({
      outDir,
      title,
      topicLabel: categoryLabel,
      handle,
      categoryLabel,
      summary,
    });
  }
  
  const igPath = path.join(outDir, "ig_1080x1350.png");
  const ttCoverPath = path.join(outDir, "tt_1080x1920_cover.png");
  const videoPath = path.join(outDir, "tt_1080x1920.mp4");
  
  try {
    // Instagram画像生成
    await generateInstagramImage({
      templatePath: igTemplate,
      outPath: igPath,
      categoryLabel,
      conclusion,
      bullets,
      dateString,
      handle,
    });
    
    // TikTokカバー生成
    await generateTikTokCover({
      templatePath: ttTemplate,
      outPath: ttCoverPath,
      categoryLabel,
      conclusion,
      bullets,
      dateString,
      handle,
    });
    
    // TikTok動画生成（改善版）
    const ff = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
    if (ff.status === 0) {
      await generateTikTokVideo({
        templatePath: ttTemplate,
        coverPath: ttCoverPath,
        outPath: videoPath,
        categoryLabel,
        conclusion,
        bullets,
        dateString,
        handle,
      });
    } else {
      console.warn("ffmpeg not found. Skipped video generation.");
    }
    
    return { igPath, ttCoverPath, videoPath };
  } catch (error) {
    console.error("Template-based generation failed:", error.message);
    // フォールバック
    const { generateImagesAndVideo } = await import("./media.js");
    return await generateImagesAndVideo({
      outDir,
      title,
      topicLabel: categoryLabel,
      handle,
      categoryLabel,
      summary,
    });
  }
}
