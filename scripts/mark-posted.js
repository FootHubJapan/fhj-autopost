#!/usr/bin/env node
// scripts/mark-posted.js
// 投稿済みフォルダに __POSTED を付ける

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const QUEUE_DIR = path.join(ROOT, "queue");

function markPosted(platform, folderName) {
  const queuePlatformDir = path.join(QUEUE_DIR, platform);
  
  if (!fs.existsSync(queuePlatformDir)) {
    console.error(`Queue directory not found: ${queuePlatformDir}`);
    return false;
  }
  
  const folderPath = path.join(queuePlatformDir, folderName);
  
  if (!fs.existsSync(folderPath)) {
    console.error(`Folder not found: ${folderPath}`);
    return false;
  }
  
  if (folderName.includes("__POSTED")) {
    console.log(`Already marked as posted: ${folderName}`);
    return true;
  }
  
  const newFolderName = `${folderName}__POSTED`;
  const newFolderPath = path.join(queuePlatformDir, newFolderName);
  
  fs.renameSync(folderPath, newFolderPath);
  console.log(`Marked as posted: ${platform}/${newFolderName}`);
  return true;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("Usage: npm run mark-posted <platform> <folder-name>");
    console.log("Example: npm run mark-posted tiktok www_espn_com_soccer_story_id_47664309_...");
    process.exit(1);
  }
  
  const [platform, folderName] = args;
  
  if (!["tiktok", "instagram"].includes(platform)) {
    console.error("Platform must be 'tiktok' or 'instagram'");
    process.exit(1);
  }
  
  markPosted(platform, folderName);
}

main();
