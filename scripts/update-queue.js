#!/usr/bin/env node
// scripts/update-queue.js
// 今日分の投稿パックを queue/ にコピーする（上位スコアのみ＋同ドメイン制限）

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { minScoreToQueue } from "../src/scoring.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const OUT_DIR = path.join(ROOT, "out");
const QUEUE_DIR = path.join(ROOT, "queue");

// アカウント設定を読み込む
const accountsPath = path.join(ROOT, "config", "accounts.json");
const accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

// JSTの今日の日付を取得（GitHub ActionsはUTCなので9時間前）
function todayJST() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }
  
  // ディレクトリを再帰的にコピー
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  
  return true;
}

function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function loadMeta(packDir) {
  const metaPath = path.join(packDir, "meta.json");
  if (fs.existsSync(metaPath)) {
    try {
      return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    } catch {
      return null;
    }
  }
  return null;
}

function processPlatform(platform, accountId, maxItems) {
  const dateFolder = todayJST();
  const todayOutDir = path.join(OUT_DIR, dateFolder);
  const sourceDir = path.join(todayOutDir, platform, accountId);
  const queueDir = path.join(QUEUE_DIR, platform);
  
  if (!fs.existsSync(sourceDir)) {
    return 0;
  }
  
  // 既存のqueueをクリア（投稿済みは残す）
  if (fs.existsSync(queueDir)) {
    const existing = fs.readdirSync(queueDir);
    for (const item of existing) {
      if (!item.includes("__POSTED")) {
        const itemPath = path.join(queueDir, item);
        fs.rmSync(itemPath, { recursive: true, force: true });
      }
    }
  }
  
  // 全アイテムを読み込んでスコアリング
  const items = fs.readdirSync(sourceDir)
    .filter(item => {
      const itemPath = path.join(sourceDir, item);
      return fs.statSync(itemPath).isDirectory() && !item.includes("__POSTED");
    })
    .map(item => {
      const itemPath = path.join(sourceDir, item);
      const meta = loadMeta(itemPath);
      return {
        name: item,
        path: itemPath,
        meta: meta || {},
        score: meta?.score || 0,
        domain: getDomain(meta?.link || ""),
      };
    })
    .filter(item => {
      // 最小スコア以上のみ
      return item.score >= minScoreToQueue();
    })
    .sort((a, b) => b.score - a.score); // スコア降順
  
  // 同ドメイン制限：各ドメインから最大1件
  const domainMap = new Map();
  const selected = [];
  
  for (const item of items) {
    if (selected.length >= maxItems) break;
    
    const domain = item.domain || "unknown";
    if (!domainMap.has(domain)) {
      domainMap.set(domain, true);
      selected.push(item);
    }
  }
  
  // 選択されたアイテムをコピー
  let copied = 0;
  for (const item of selected) {
    const destPath = path.join(queueDir, item.name);
    if (copyDir(item.path, destPath)) {
      copied++;
    }
  }
  
  return copied;
}

function main() {
  const dateFolder = todayJST();
  const todayOutDir = path.join(OUT_DIR, dateFolder);
  
  if (!fs.existsSync(todayOutDir)) {
    console.log(`No output found for ${dateFolder}`);
    return;
  }
  
  // queue ディレクトリを作成
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  
  let totalCopied = 0;
  
  // TikTok用（上位3件）
  const tiktokAccount = accounts.platforms.tiktok?.accounts?.[0];
  if (tiktokAccount) {
    const copied = processPlatform("tiktok", tiktokAccount.id, 3);
    totalCopied += copied;
    console.log(`TikTok: ${copied} items queued (top 3)`);
  }
  
  // Instagram用（上位1件）
  const instagramAccount = accounts.platforms.instagram?.accounts?.[0];
  if (instagramAccount) {
    const copied = processPlatform("instagram", instagramAccount.id, 1);
    totalCopied += copied;
    console.log(`Instagram: ${copied} items queued (top 1)`);
  }
  
  console.log(`\nQueue updated: ${totalCopied} items copied from ${dateFolder}`);
  console.log(`TikTok: queue/tiktok/`);
  console.log(`Instagram: queue/instagram/`);
}

main();
