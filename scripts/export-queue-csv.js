// scripts/export-queue-csv.js
// キュー一覧をCSVにエクスポート（Google Sheets投稿作業向け最適化版）

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const QUEUE_DIR = path.join(ROOT, "queue");
const OUT_CSV = path.join(ROOT, "queue_index.csv");

function safeRead(filePath) {
  try { return fs.readFileSync(filePath, "utf-8"); } catch { return ""; }
}

function listDirs(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.includes("__POSTED"))
      .map(d => d.name);
  } catch {
    return [];
  }
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function formatDateForSheets(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    // Google Sheets用の日付フォーマット (YYYY-MM-DD HH:MM)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

function getRecommendedTime(platform, index) {
  // TikTok: 08:10, 12:10, 20:10
  // Instagram: 12:00
  if (platform === "tiktok") {
    const times = ["08:10", "12:10", "20:10"];
    return times[index % times.length] || "08:10";
  } else if (platform === "instagram") {
    return "12:00";
  }
  return "";
}

const platforms = ["tiktok", "instagram", "twitter"];
const rows = [];

for (const platform of platforms) {
  const pdir = path.join(QUEUE_DIR, platform);
  const posts = listDirs(pdir);

  posts.forEach((postId, index) => {
    const dir = path.join(pdir, postId);
    const metaPath = path.join(dir, "meta.json");
    const metaRaw = safeRead(metaPath);
    let meta = {};
    try { meta = metaRaw ? JSON.parse(metaRaw) : {}; } catch {}

    const caption = safeRead(path.join(dir, "caption.txt")).trim();
    const hashtags = safeRead(path.join(dir, "hashtags.txt")).trim();
    const guide = safeRead(path.join(dir, "POST_GUIDE.txt")).trim();

    const link = meta.link || "";
    const title = meta.title || "";
    const category = meta.categoryLabel || meta.category || "";
    const score = meta.score ?? "";
    const accountId = meta.accountId || "";
    const pubDate = meta.pubDate || "";
    const domain = getDomain(link);

    // ファイル有無
    const hasIg = fs.existsSync(path.join(dir, "ig_1080x1350.png"));
    const hasTtVideo = fs.existsSync(path.join(dir, "tt_1080x1920.mp4"));
    const hasTtCover = fs.existsSync(path.join(dir, "tt_1080x1920_cover.png"));

    // 投稿作業向け情報
    const recommendedTime = getRecommendedTime(platform, index);
    const scheduledDate = ""; // 手動入力用
    const scheduledTime = ""; // 手動入力用
    const posted = ""; // POSTEDチェック用（手動入力: ✅）
    const notes = ""; // メモ用（手動入力）

    // フォルダパス（相対パス）
    const folderPath = dir.replace(ROOT + "/", "");

    rows.push({
      // 基本情報
      platform,
      accountId,
      category,
      score,
      title,
      link,
      domain,
      pubDate: formatDateForSheets(pubDate),
      
      // 投稿内容
      caption,
      hashtags,
      
      // ファイル有無
      hasIg: hasIg ? "✅" : "",
      hasTtVideo: hasTtVideo ? "✅" : "",
      hasTtCover: hasTtCover ? "✅" : "",
      
      // 投稿スケジュール（手動入力用）
      recommendedTime,
      scheduledDate,
      scheduledTime,
      posted,
      notes,
      
      // その他
      postId,
      folder: folderPath,
      guidePreview: guide.slice(0, 100)
    });
  });
}

// スコア降順（数値っぽいものだけ）
rows.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

// 投稿作業向けに最適化した列順
const header = [
  // 投稿管理
  "platform", "category", "score", "title", "link",
  // 投稿スケジュール
  "recommendedTime", "scheduledDate", "scheduledTime", "posted",
  // 投稿内容
  "caption", "hashtags",
  // ファイル確認
  "hasIg", "hasTtVideo", "hasTtCover",
  // その他
  "accountId", "domain", "pubDate", "postId", "folder", "notes", "guidePreview"
];

const csv = [
  header.join(","),
  ...rows.map(r => header.map(h => csvEscape(r[h])).join(","))
].join("\n");

fs.writeFileSync(OUT_CSV, csv, "utf-8");
console.log(`✅ Wrote ${rows.length} rows -> ${OUT_CSV}`);
console.log(`📊 Columns: ${header.length}`);
console.log(`📋 Ready for Google Sheets import!`);
