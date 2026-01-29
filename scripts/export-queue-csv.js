// scripts/export-queue-csv.js
// Exports queue/*/* into queue_index.csv with Drive URL columns (from meta.json)
// Output: queue_index.csv (UTF-8)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const QUEUE_DIR = path.join(ROOT, "queue");
const OUT_CSV = path.join(ROOT, "queue_index.csv");

function readText(p) {
  try {
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return "";
  }
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function existsFile(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function escapeCsv(val) {
  const s = (val ?? "").toString();
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function listPacks() {
  if (!fs.existsSync(QUEUE_DIR)) return [];
  const platforms = fs
    .readdirSync(QUEUE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const packs = [];
  for (const platform of platforms) {
    const platformDir = path.join(QUEUE_DIR, platform);
    const folders = fs
      .readdirSync(platformDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.includes("__POSTED"))
      .map((d) => d.name);

    for (const folderName of folders) {
      const folder = path.join(platformDir, folderName);
      packs.push({ platform, folderName, folder });
    }
  }
  return packs;
}

function recommendTime(platform, idxWithinPlatform) {
  if (platform === "tiktok") {
    const slots = ["08:10", "12:10", "20:10"];
    return slots[idxWithinPlatform % slots.length];
  }
  if (platform === "instagram") return "12:00";
  if (platform === "twitter") return "08:30";
  return "";
}

/**
 * Convert Drive file ID to direct download URL for IMAGE() formula
 * @param {string} fileId - Drive file ID
 * @returns {string} Direct download URL or empty string
 */
function getDriveImageUrl(fileId) {
  if (!fileId) return "";
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Extract file ID from Drive URL (webViewLink or webContentLink)
 * @param {string} url - Drive URL
 * @returns {string} File ID or empty string
 */
function extractFileIdFromUrl(url) {
  if (!url) return "";
  // Match patterns like: /file/d/FILE_ID/view or /file/d/FILE_ID/
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
}

function main() {
  const packs = listPacks();
  if (packs.length === 0) {
    console.log("No packs in queue/. Run `npm run queue` first.");
    process.exit(0);
  }

  // Build rows
  const rows = [];
  const byPlatformIndex = { tiktok: 0, instagram: 0, twitter: 0 };

  for (const p of packs) {
    const meta = readJson(path.join(p.folder, "meta.json")) || {};
    const caption = readText(path.join(p.folder, "caption.txt"));
    const hashtags = readText(path.join(p.folder, "hashtags.txt"));

    const drive = meta.drive || {};

    const hasIg = existsFile(path.join(p.folder, "ig_1080x1350.png")) ? "✅" : "";
    const hasTtCover = existsFile(path.join(p.folder, "tt_1080x1920_cover.png")) ? "✅" : "";
    const hasTtVideo = existsFile(path.join(p.folder, "tt_1080x1920.mp4")) ? "✅" : "";

    const platformIdx = byPlatformIndex[p.platform] ?? 0;
    const recommendedTime = recommendTime(p.platform, platformIdx);
    byPlatformIndex[p.platform] = platformIdx + 1;

    const guidePreview = readText(path.join(p.folder, "POST_GUIDE.txt")).slice(0, 220);

    // Extract file IDs (prefer stored IDs, fallback to extracting from URLs)
    const igImageFileId = drive.igImageFileId || extractFileIdFromUrl(drive.igImageUrl || "");
    const ttCoverFileId = drive.ttCoverFileId || extractFileIdFromUrl(drive.ttCoverUrl || "");
    const ttVideoFileId = drive.ttVideoFileId || extractFileIdFromUrl(drive.ttVideoUrl || "");

    // Generate direct download URLs for IMAGE() formula
    const igImageDirectUrl = getDriveImageUrl(igImageFileId);
    const ttCoverDirectUrl = getDriveImageUrl(ttCoverFileId);

    rows.push({
      platform: p.platform,
      category: meta.categoryLabel || meta.category || "",
      score: meta.score ?? "",
      title: meta.title || "",
      link: meta.link || "",
      recommendedTime,
      scheduledDate: "",
      scheduledTime: "",
      posted: "",
      caption,
      hashtags,
      // ★ Drive URL columns (original sharing links)
      igImageUrl: drive.igImageUrl || "",
      ttCoverUrl: drive.ttCoverUrl || "",
      ttVideoUrl: drive.ttVideoUrl || "",
      // ★ Drive File IDs (for direct download URL generation)
      igImageFileId: igImageFileId || "",
      ttCoverFileId: ttCoverFileId || "",
      ttVideoFileId: ttVideoFileId || "",
      // ★ Image preview formula (uses direct download URL for IMAGE() function)
      igPreview: igImageDirectUrl ? `=IMAGE("${igImageDirectUrl}")` : "",
      ttCoverPreview: ttCoverDirectUrl ? `=IMAGE("${ttCoverDirectUrl}")` : "",
      hasIg,
      hasTtVideo,
      hasTtCover,
      accountId: meta.accountId || "",
      domain: meta.domain || "",
      pubDate: meta.pubDate || "",
      postId: meta.postId || meta.postID || "",
      folder: `queue/${p.platform}/${p.folderName}`,
      notes: "",
      guidePreview,
    });
  }

  // Sort by score desc (numbers), then title
  rows.sort((a, b) => {
    const sa = Number(a.score || 0);
    const sb = Number(b.score || 0);
    if (sb !== sa) return sb - sa;
    return (a.title || "").localeCompare(b.title || "");
  });

  const headers = [
    "platform",
    "category",
    "score",
    "title",
    "link",
    "recommendedTime",
    "scheduledDate",
    "scheduledTime",
    "posted",
    "caption",
    "hashtags",
    "igImageUrl",
    "ttCoverUrl",
    "ttVideoUrl",
    "igImageFileId",
    "ttCoverFileId",
    "ttVideoFileId",
    "igPreview",
    "ttCoverPreview",
    "hasIg",
    "hasTtVideo",
    "hasTtCover",
    "accountId",
    "domain",
    "pubDate",
    "postId",
    "folder",
    "notes",
    "guidePreview",
  ];

  const lines = [];
  lines.push(headers.map(escapeCsv).join(","));
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsv(r[h])).join(","));
  }

  fs.writeFileSync(OUT_CSV, lines.join("\n") + "\n", "utf8");
  console.log(`✅ Exported ${rows.length} rows -> ${path.relative(ROOT, OUT_CSV)}`);
}

main();
