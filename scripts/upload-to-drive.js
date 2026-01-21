#!/usr/bin/env node
// scripts/upload-to-drive.js
// queue/ の画像・動画をGoogle Driveにアップロードして、URLをmeta.jsonに保存

import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const QUEUE_DIR = path.join(ROOT, "queue");
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || "";

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

async function uploadFile(drive, filePath, fileName, mimeType, folderId) {
  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : [],
  };
  
  const media = {
    mimeType,
    body: fs.createReadStream(filePath),
  };
  
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id,webViewLink,webContentLink",
  });
  
  return {
    fileId: response.data.id,
    webViewLink: response.data.webViewLink,
    webContentLink: response.data.webContentLink,
  };
}

async function uploadPackToDrive(drive, packDir, postId) {
  const results = {
    igImageUrl: "",
    ttCoverUrl: "",
    ttVideoUrl: "",
  };
  
  const igPath = path.join(packDir, "ig_1080x1350.png");
  const ttCoverPath = path.join(packDir, "tt_1080x1920_cover.png");
  const ttVideoPath = path.join(packDir, "tt_1080x1920.mp4");
  
  try {
    if (fs.existsSync(igPath)) {
      const result = await uploadFile(
        drive,
        igPath,
        `${postId}_ig_1080x1350.png`,
        "image/png",
        DRIVE_FOLDER_ID
      );
      results.igImageUrl = result.webViewLink;
      console.log(`  ✅ Instagram画像をアップロード: ${result.fileId}`);
    }
  } catch (error) {
    console.error(`  ❌ Instagram画像のアップロード失敗:`, error.message);
  }
  
  try {
    if (fs.existsSync(ttCoverPath)) {
      const result = await uploadFile(
        drive,
        ttCoverPath,
        `${postId}_tt_cover.png`,
        "image/png",
        DRIVE_FOLDER_ID
      );
      results.ttCoverUrl = result.webViewLink;
      console.log(`  ✅ TikTokカバー画像をアップロード: ${result.fileId}`);
    }
  } catch (error) {
    console.error(`  ❌ TikTokカバー画像のアップロード失敗:`, error.message);
  }
  
  try {
    if (fs.existsSync(ttVideoPath)) {
      const result = await uploadFile(
        drive,
        ttVideoPath,
        `${postId}_tt_video.mp4`,
        "video/mp4",
        DRIVE_FOLDER_ID
      );
      results.ttVideoUrl = result.webViewLink;
      console.log(`  ✅ TikTok動画をアップロード: ${result.fileId}`);
    }
  } catch (error) {
    console.error(`  ❌ TikTok動画のアップロード失敗:`, error.message);
  }
  
  // meta.jsonにURLを追加
  const metaPath = path.join(packDir, "meta.json");
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(safeRead(metaPath));
      meta.driveUrls = results;
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");
    } catch (error) {
      console.error(`  ⚠️  meta.jsonの更新失敗:`, error.message);
    }
  }
  
  return results;
}

async function main() {
  const authPath = path.join(ROOT, "config", "google-service-account.json");
  
  if (!fs.existsSync(authPath)) {
    console.error("❌ Google Service Account認証情報が見つかりません");
    console.error(`   設定ファイル: ${authPath}`);
    console.error("\n📝 セットアップ手順:");
    console.error("1. Google Cloud Consoleでサービスアカウントを作成");
    console.error("2. Google Drive APIとGoogle Sheets APIを有効化");
    console.error("3. 認証JSONをダウンロード");
    console.error(`4. ${authPath} に保存`);
    console.error("5. Driveフォルダとスプレッドシートをサービスアカウントに共有");
    console.error("6. DRIVE_FOLDER_ID環境変数を設定");
    process.exit(1);
  }
  
  if (!DRIVE_FOLDER_ID) {
    console.error("❌ DRIVE_FOLDER_ID環境変数が設定されていません");
    console.error("   export DRIVE_FOLDER_ID=your_folder_id");
    process.exit(1);
  }
  
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: authPath,
      scopes: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    });
    
    const drive = google.drive({ version: "v3", auth });
    
    const platforms = ["tiktok", "instagram"];
    let totalUploaded = 0;
    
    for (const platform of platforms) {
      const pdir = path.join(QUEUE_DIR, platform);
      const posts = listDirs(pdir);
      
      console.log(`\n📤 ${platform}: ${posts.length}件の投稿パックを処理中...`);
      
      for (const postId of posts) {
        const packDir = path.join(pdir, postId);
        console.log(`  📁 ${postId}`);
        
        const results = await uploadPackToDrive(drive, packDir, postId);
        
        if (results.igImageUrl || results.ttCoverUrl || results.ttVideoUrl) {
          totalUploaded++;
        }
      }
    }
    
    console.log(`\n✅ 完了: ${totalUploaded}件の投稿パックをDriveにアップロードしました`);
    
  } catch (error) {
    console.error("❌ エラーが発生しました:");
    console.error(error.message);
    if (error.response) {
      console.error("詳細:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
