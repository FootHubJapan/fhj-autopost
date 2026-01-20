// src/media.js
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { spawnSync } from "child_process";

function escapeXml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLines(text, maxChars = 24) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const cand = line ? `${line} ${w}` : w;
    if (cand.length <= maxChars) line = cand;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4); // 最大4行
}

function svgCard({
  width,
  height,
  title,
  subtitle,
  footerLeft,
  footerRight,
}) {
  const safeTitle = escapeXml(title);
  const safeSub = escapeXml(subtitle || "");
  const safeFL = escapeXml(footerLeft || "");
  const safeFR = escapeXml(footerRight || "");

  const lines = wrapLines(safeTitle, width === 1080 && height === 1920 ? 26 : 24);
  const lineHeight = width === 1080 && height === 1920 ? 92 : 86;
  const startY = width === 1080 && height === 1920 ? 520 : 430;

  const titleSvg = lines
    .map((ln, i) => {
      const y = startY + i * lineHeight;
      return `<text x="84" y="${y}" font-size="${width === 1080 && height === 1920 ? 78 : 72}" font-weight="800" fill="#ffffff" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${ln}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1020"/>
      <stop offset="45%" stop-color="#1b2a6b"/>
      <stop offset="100%" stop-color="#0a0f1f"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>

  <!-- glass panel -->
  <rect x="56" y="${width === 1080 && height === 1920 ? 260 : 220}" rx="44" ry="44"
        width="${width - 112}" height="${width === 1080 && height === 1920 ? 980 : 720}"
        fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.14)" filter="url(#shadow)"/>

  <!-- subtitle -->
  <text x="84" y="${width === 1080 && height === 1920 ? 360 : 310}" font-size="34" font-weight="700"
        fill="rgba(255,255,255,0.80)" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
    ${safeSub}
  </text>

  <!-- title -->
  ${titleSvg}

  <!-- footer bar -->
  <rect x="56" y="${height - 220}" rx="32" ry="32"
        width="${width - 112}" height="148"
        fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.14)"/>

  <text x="84" y="${height - 130}" font-size="30" font-weight="700"
        fill="rgba(255,255,255,0.85)" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
    ${safeFL}
  </text>

  <text x="${width - 84}" y="${height - 130}" text-anchor="end"
        font-size="30" font-weight="700"
        fill="rgba(255,255,255,0.85)" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
    ${safeFR}
  </text>

  <!-- brand -->
  <text x="${width - 84}" y="120" text-anchor="end"
        font-size="28" font-weight="800" fill="rgba(255,255,255,0.65)"
        font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
    Football Hub Japan
  </text>
</svg>`;
}

export async function generateImagesAndVideo({
  outDir,
  title,
  topicLabel = "Daily Pick",
  handle = "@football_hub_japan",
  points,
  comments,
}) {
  fs.mkdirSync(outDir, { recursive: true });

  // Instagram feed: 1080x1350
  const igSvg = svgCard({
    width: 1080,
    height: 1350,
    title,
    subtitle: topicLabel,
    footerLeft: handle,
    footerRight: points != null && comments != null ? `★${points}  💬${comments}` : "",
  });

  const igPath = path.join(outDir, "ig_1080x1350.png");
  await sharp(Buffer.from(igSvg)).png().toFile(igPath);

  // TikTok cover: 1080x1920
  const ttSvg = svgCard({
    width: 1080,
    height: 1920,
    title,
    subtitle: topicLabel,
    footerLeft: handle,
    footerRight: points != null && comments != null ? `★${points}  💬${comments}` : "",
  });

  const ttCoverPath = path.join(outDir, "tt_1080x1920_cover.png");
  await sharp(Buffer.from(ttSvg)).png().toFile(ttCoverPath);

  // TikTok simple video: cover image -> zoompan (12s)
  const videoPath = path.join(outDir, "tt_1080x1920.mp4");

  // ffmpeg が無い環境でも落ちないようにガード
  const ff = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (ff.status === 0) {
    // 30fps * 12s = 360 frames
    const args = [
      "-y",
      "-loop", "1",
      "-i", ttCoverPath,
      "-t", "12",
      "-vf",
      // ゆっくりズーム＋フェード
      "scale=1080:1920,zoompan=z='min(1.10,1.0+0.00025*on)':d=1:s=1080x1920:fps=30,fade=t=in:st=0:d=0.6,fade=t=out:st=11.4:d=0.6",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      videoPath
    ];

    const run = spawnSync("ffmpeg", args, { stdio: "inherit" });
    if (run.status !== 0) {
      console.warn("ffmpeg failed: video was not created");
    }
  } else {
    console.warn("ffmpeg not found. Skipped video generation.");
  }

  return { igPath, ttCoverPath, videoPath };
}
