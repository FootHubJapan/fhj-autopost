// scripts/export-queue-csv.js
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

const platforms = ["tiktok", "instagram", "twitter"];
const rows = [];

for (const platform of platforms) {
  const pdir = path.join(QUEUE_DIR, platform);
  const posts = listDirs(pdir);

  for (const postId of posts) {
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

    rows.push({
      platform,
      accountId,
      postId,
      category,
      score,
      title,
      link,
      domain,
      pubDate,
      caption,
      hashtags,
      hasIg: hasIg ? "✅" : "",
      hasTtVideo: hasTtVideo ? "✅" : "",
      hasTtCover: hasTtCover ? "✅" : "",
      folder: dir.replace(ROOT + "/", ""),
      guidePreview: guide.slice(0, 120)
    });
  }
}

// スコア降順（数値っぽいものだけ）
rows.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

const header = [
  "platform","accountId","postId","category","score","title","link","domain","pubDate",
  "caption","hashtags","hasIg","hasTtVideo","hasTtCover","folder","guidePreview"
];

const csv = [
  header.join(","),
  ...rows.map(r => header.map(h => csvEscape(r[h])).join(","))
].join("\n");

fs.writeFileSync(OUT_CSV, csv, "utf-8");
console.log(`✅ Wrote ${rows.length} rows -> ${OUT_CSV}`);
