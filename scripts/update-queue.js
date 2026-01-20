#!/usr/bin/env node
// scripts/update-queue.js
// 今日分の投稿パックを queue/ にコピーする

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

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

function main() {
  const dateFolder = todayJST();
  const todayOutDir = path.join(OUT_DIR, dateFolder);
  
  if (!fs.existsSync(todayOutDir)) {
    console.log(`No output found for ${dateFolder}`);
    return;
  }
  
  // queue ディレクトリを作成
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  
  let copied = 0;
  
  // TikTok用
  const tiktokAccount = accounts.platforms.tiktok?.accounts?.[0];
  if (tiktokAccount) {
    const tiktokQueueDir = path.join(QUEUE_DIR, "tiktok");
    const tiktokSourceDir = path.join(todayOutDir, "tiktok", tiktokAccount.id);
    
    if (fs.existsSync(tiktokSourceDir)) {
      // 既存のqueue/tiktokをクリア（投稿済みは残す）
      if (fs.existsSync(tiktokQueueDir)) {
        const existing = fs.readdirSync(tiktokQueueDir);
        for (const item of existing) {
          if (!item.includes("__POSTED")) {
            const itemPath = path.join(tiktokQueueDir, item);
            fs.rmSync(itemPath, { recursive: true, force: true });
          }
        }
      }
      
      // 今日分をコピー（投稿済みでないもののみ）
      const items = fs.readdirSync(tiktokSourceDir);
      for (const item of items) {
        const srcPath = path.join(tiktokSourceDir, item);
        const destPath = path.join(tiktokQueueDir, item);
        
        // 投稿済みでない場合のみコピー
        if (!item.includes("__POSTED") && fs.statSync(srcPath).isDirectory()) {
          copyDir(srcPath, destPath);
          copied++;
        }
      }
    }
  }
  
  // Instagram用
  const instagramAccount = accounts.platforms.instagram?.accounts?.[0];
  if (instagramAccount) {
    const instagramQueueDir = path.join(QUEUE_DIR, "instagram");
    const instagramSourceDir = path.join(todayOutDir, "instagram", instagramAccount.id);
    
    if (fs.existsSync(instagramSourceDir)) {
      // 既存のqueue/instagramをクリア（投稿済みは残す）
      if (fs.existsSync(instagramQueueDir)) {
        const existing = fs.readdirSync(instagramQueueDir);
        for (const item of existing) {
          if (!item.includes("__POSTED")) {
            const itemPath = path.join(instagramQueueDir, item);
            fs.rmSync(itemPath, { recursive: true, force: true });
          }
        }
      }
      
      // 今日分をコピー（投稿済みでないもののみ）
      const items = fs.readdirSync(instagramSourceDir);
      for (const item of items) {
        const srcPath = path.join(instagramSourceDir, item);
        const destPath = path.join(instagramQueueDir, item);
        
        // 投稿済みでない場合のみコピー
        if (!item.includes("__POSTED") && fs.statSync(srcPath).isDirectory()) {
          copyDir(srcPath, destPath);
          copied++;
        }
      }
    }
  }
  
  console.log(`Queue updated: ${copied} items copied from ${dateFolder}`);
  console.log(`TikTok: queue/tiktok/`);
  console.log(`Instagram: queue/instagram/`);
}

main();
