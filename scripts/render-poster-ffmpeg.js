#!/usr/bin/env node
// scripts/render-poster-ffmpeg.js
// テンプレート合成方式：HTML/CSS → PNG → ffmpeg overlay（プロ品質）

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const TEMPLATE_DIR = path.join(ROOT, 'templates', 'ig-card');
const TEMPLATE_HTML = path.join(TEMPLATE_DIR, 'template.html');
const TEMPLATE_CSS = path.join(TEMPLATE_DIR, 'template.css');

/**
 * ffmpegでテキストをdrawtextで合成（プロ品質）
 */
async function compositeWithFFmpeg({
  baseImagePath,
  outPath,
  title,
  categoryLabel,
  bullets,
  handle,
  dateString,
}) {
  const filters = [];
  
  // 1. 背景にノイズ/テクスチャを追加（のっぺり回避）
  filters.push('noise=alls=20:allf=t+u'); // 軽いノイズ
  
  // 2. カテゴリラベル（上部、安全域内）
  if (categoryLabel) {
    filters.push(
      `drawtext=text='${escapeDrawtext(categoryLabel)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=20:fontcolor=white:` +
      `x=104:y=90:box=1:boxcolor=#007bff@0.9:boxborderw=10:borderw=2:bordercolor=white@0.3`
    );
  }
  
  // 3. タイトル（中央、大きく、影付き）
  const titleLines = wrapText(title, 35, 2);
  titleLines.forEach((line, i) => {
    const fontSize = calculateFontSize(title, 35, 64);
    const y = 268 + i * (fontSize * 1.2 + 10);
    filters.push(
      `drawtext=text='${escapeDrawtext(line)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=${fontSize}:fontcolor=white:` +
      `x=104:y=${y}:box=1:boxcolor=black@0.4:boxborderw=8:` +
      `shadowx=4:shadowy=4:shadowcolor=black@0.6`
    );
  });
  
  // 4. 箇条書き（下部、読みやすく）
  bullets.slice(0, 3).forEach((bullet, i) => {
    const y = 750 + i * 60;
    filters.push(
      `drawtext=text='• ${escapeDrawtext(bullet)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=32:fontcolor=rgba(255,255,255,0.9):` +
      `x=104:y=${y}:shadowx=2:shadowy=2:shadowcolor=black@0.5`
    );
  });
  
  // 5. CTA（下部固定）
  filters.push(
    `drawtext=text='${escapeDrawtext("続きはプロフィールリンクから")}':` +
    `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=24:fontcolor=white:` +
    `x=540:y=1220:text_align=center:box=1:boxcolor=rgba(255,255,255,0.1)@0.9:boxborderw=8`
  );
  
  // 6. ハンドル（左下、安全域内）
  if (handle) {
    filters.push(
      `drawtext=text='${escapeDrawtext(handle)}':` +
      `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=28:fontcolor=rgba(255,255,255,0.85):` +
      `x=104:y=1270:shadowx=2:shadowy=2:shadowcolor=black@0.5`
    );
  }
  
  // 7. 日付 + ブランド（右下、安全域内）
  const footerText = `${dateString} Football Hub Japan`;
  filters.push(
    `drawtext=text='${escapeDrawtext(footerText)}':` +
    `fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=24:fontcolor=rgba(255,255,255,0.65):` +
    `x=976:y=1270:text_align=right:shadowx=2:shadowy=2:shadowcolor=black@0.5`
  );
  
  const filterComplex = filters.join(',');
  
  const args = [
    '-y',
    '-i', baseImagePath,
    '-vf', filterComplex,
    '-frames:v', '1',
    outPath
  ];
  
  const result = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('ffmpeg composition failed');
  }
  
  return outPath;
}

/**
 * テキストを自動改行
 */
function wrapText(text, maxChars, maxLines = 2) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  
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
 * フォントサイズを段階的に調整
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
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * メイン：HTML/CSS → PNG → ffmpeg overlay
 */
export async function renderPosterWithFFmpeg({
  outPath,
  title,
  categoryLabel,
  bullets = [],
  handle = '@football_hub_japan',
  dateString,
  heroImageUrl = null,
  useFFmpegOverlay = true, // ffmpeg合成を使うか
}) {
  // Step 1: HTML/CSSでベース画像を生成
  const tempBasePath = outPath.replace('.png', '_base.png');
  
  const { renderInstagramCard } = await import('./render-ig-card.js');
  await renderInstagramCard({
    outPath: tempBasePath,
    title,
    categoryLabel,
    bullets,
    handle,
    dateString,
    heroImageUrl,
  });
  
  // Step 2: ffmpegでテキストをdrawtextで合成（プロ品質）
  if (useFFmpegOverlay) {
    const ff = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    if (ff.status === 0) {
      await compositeWithFFmpeg({
        baseImagePath: tempBasePath,
        outPath,
        title,
        categoryLabel,
        bullets,
        handle,
        dateString,
      });
      
      // 一時ファイルを削除
      if (fs.existsSync(tempBasePath)) {
        fs.unlinkSync(tempBasePath);
      }
    } else {
      // ffmpegがない場合はHTML/CSS版をそのまま使用
      fs.renameSync(tempBasePath, outPath);
    }
  } else {
    // ffmpeg合成を使わない場合はHTML/CSS版をそのまま使用
    fs.renameSync(tempBasePath, outPath);
  }
  
  return outPath;
}
