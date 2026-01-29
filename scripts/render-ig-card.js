#!/usr/bin/env node
// scripts/render-ig-card.js
// HTML/CSS → PNG レンダリング（Playwright使用）
// インフルエンサー級のデザインを生成

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const TEMPLATE_DIR = path.join(ROOT, 'templates', 'ig-card');
const TEMPLATE_HTML = path.join(TEMPLATE_DIR, 'template.html');
const TEMPLATE_CSS = path.join(TEMPLATE_DIR, 'template.css');

/**
 * タイトルの長さに応じてフォントサイズを調整
 */
function getTitleLengthClass(title) {
  const len = title.length;
  if (len > 80) return 'extremely-long';
  if (len > 60) return 'very-long';
  if (len > 40) return 'long';
  return 'normal';
}

/**
 * タイトルを2行にクランプ（CSSで処理、ここではdata属性を設定）
 */
function prepareTitle(title) {
  return {
    text: title,
    lengthClass: getTitleLengthClass(title)
  };
}

/**
 * 箇条書きを短縮（最大2行、長い場合は省略）
 */
function prepareBullets(bullets) {
  return (bullets || []).slice(0, 3).map(bullet => {
    // 長すぎる場合は省略
    if (bullet.length > 60) {
      return bullet.substring(0, 57) + '...';
    }
    return bullet;
  });
}

/**
 * Instagramカードをレンダリング
 */
export async function renderInstagramCard({
  outPath,
  title,
  categoryLabel,
  bullets = [],
  handle = '@football_hub_japan',
  dateString,
  heroImageUrl = null,
}) {
  if (!fs.existsSync(TEMPLATE_HTML)) {
    throw new Error(`Template not found: ${TEMPLATE_HTML}`);
  }

  const titleData = prepareTitle(title);
  const preparedBullets = prepareBullets(bullets);

  // データを準備
  const cardData = {
    title: titleData.text,
    categoryLabel: categoryLabel || '',
    bullets: preparedBullets,
    handle,
    dateString: dateString || new Date().toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\//g, '.'),
    heroImageUrl,
  };

  // タイトルの長さクラスを取得（CSS用）
  function getTitleLengthClass(title) {
    const len = title.length;
    if (len > 80) return 'extremely-long';
    if (len > 60) return 'very-long';
    if (len > 40) return 'long';
    return 'normal';
  }

  // Playwrightでレンダリング
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // ビューポート設定
  await page.setViewportSize({ width: 1080, height: 1350 });

  // HTMLを読み込み
  const htmlContent = fs.readFileSync(TEMPLATE_HTML, 'utf-8');
  
  // CSSをインライン化
  const cssContent = fs.existsSync(TEMPLATE_CSS) 
    ? fs.readFileSync(TEMPLATE_CSS, 'utf-8')
    : '';

  // データを注入
  const htmlWithData = htmlContent
    .replace('</head>', `<style>${cssContent}</style></head>`)
    .replace('<script>', `<script>window.CARD_DATA = ${JSON.stringify(cardData)};`);

  // タイトルの長さクラスを追加（CSSでフォントサイズ調整）
  const htmlWithTitleClass = htmlWithData.replace(
    'id="title" data-length="normal"',
    `id="title" data-length="${titleData.lengthClass}"`
  );

  await page.setContent(htmlWithTitleClass, { waitUntil: 'networkidle' });

  // フォント読み込み待機
  await page.waitForTimeout(500);

  // PNGとして保存
  await page.screenshot({
    path: outPath,
    type: 'png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 1080, height: 1350 }
  });

  await browser.close();

  return outPath;
}

/**
 * バッチ処理用（queue内の全投稿パックをレンダリング）
 */
async function main() {
  const queueDir = path.join(ROOT, 'queue');
  const platforms = ['instagram', 'tiktok'];

  for (const platform of platforms) {
    const platformDir = path.join(queueDir, platform);
    if (!fs.existsSync(platformDir)) continue;

    const posts = fs.readdirSync(platformDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.includes('__POSTED'))
      .map(d => path.join(platformDir, d.name));

    for (const postDir of posts) {
      const metaPath = path.join(postDir, 'meta.json');
      if (!fs.existsSync(metaPath)) continue;

      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const { title, categoryLabel } = meta;

        // summaryから結論と要点を取得（formatSummaryの形式を想定）
        // summaryが文字列の場合は分割、オブジェクトの場合はそのまま使用
        let conclusion = title;
        let bullets = [
          '最新情報をチェック',
          '詳細はリンクで確認',
          '続報をお待ちください'
        ];

        if (meta.summary) {
          if (typeof meta.summary === 'object') {
            conclusion = meta.summary.conclusion || title;
            bullets = meta.summary.points || bullets;
          } else if (typeof meta.summary === 'string') {
            // 文字列の場合は改行で分割
            const lines = meta.summary.split('\n').filter(l => l.trim());
            conclusion = lines[0] || title;
            bullets = lines.slice(1, 4);
          }
        }

        const outPath = path.join(postDir, 'ig_1080x1350.png');
        
        console.log(`🎨 Rendering: ${platform}/${path.basename(postDir)}`);

        await renderInstagramCard({
          outPath,
          title: conclusion,
          categoryLabel,
          bullets,
          handle: '@football_hub_japan',
          dateString: meta.generatedAt ? new Date(meta.generatedAt).toLocaleDateString('ja-JP', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          }).replace(/\//g, '.') : undefined,
          heroImageUrl: meta.drive?.heroImageUrl || null,
        });

        console.log(`   ✅ Generated: ${outPath}`);
      } catch (error) {
        console.error(`   ❌ Error rendering ${postDir}:`, error.message);
      }
    }
  }
}

// 直接実行時
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
