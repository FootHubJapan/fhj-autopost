// scripts/upload-to-drive.js
// Uploads media files under queue/*/* to Google Drive and stores URLs into meta.json
// Required env:
//   DRIVE_FOLDER_ID
// Optional env:
//   GOOGLE_SA_JSON (default: config/google-service-account.json)
//   DRIVE_MAKE_PUBLIC=true  (if you want anyone-with-link access)

import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const QUEUE_DIR = path.join(ROOT, "queue");
const SA_PATH = process.env.GOOGLE_SA_JSON || path.join(ROOT, "config", "google-service-account.json");
const OAUTH_CLIENT_PATH = path.join(ROOT, "config", "oauth-client.json");
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;
const MAKE_PUBLIC = String(process.env.DRIVE_MAKE_PUBLIC || "").toLowerCase() === "true";

if (!DRIVE_FOLDER_ID) {
  console.error("❌ DRIVE_FOLDER_ID is missing. export DRIVE_FOLDER_ID=...");
  process.exit(1);
}

// サービスアカウントキーまたはOAuthクライアントのいずれかが必要
if (!fs.existsSync(SA_PATH) && !fs.existsSync(OAUTH_CLIENT_PATH)) {
  console.error(`❌ 認証情報が見つかりません:`);
  console.error(`   - サービスアカウントキー: ${SA_PATH}`);
  console.error(`   - OAuthクライアント: ${OAUTH_CLIENT_PATH}`);
  console.error(`\nどちらか一方を配置してください。`);
  console.error(`OAuth認証を使用する場合: npm run setup:oauth`);
  process.exit(1);
}

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets", // not used here but ok
];

function listPostPackFolders(queueDir) {
  if (!fs.existsSync(queueDir)) return [];
  const platforms = fs
    .readdirSync(queueDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const packs = [];
  for (const platform of platforms) {
    const platformDir = path.join(queueDir, platform);
    const postFolders = fs
      .readdirSync(platformDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.includes("__POSTED"))
      .map((d) => d.name);
    for (const folderName of postFolders) {
      packs.push({ platform, folderName, folderPath: path.join(platformDir, folderName) });
    }
  }
  return packs;
}

function safeReadJson(jsonPath) {
  try {
    return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch (e) {
    return null;
  }
}

function safeWriteJson(jsonPath, obj) {
  fs.writeFileSync(jsonPath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function fileExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

async function getDriveClient() {
  // サービスアカウントキーが存在する場合はそれを使用
  if (fs.existsSync(SA_PATH)) {
    const auth = new google.auth.GoogleAuth({
      keyFile: SA_PATH,
      scopes: SCOPES,
    });
    const authClient = await auth.getClient();
    return google.drive({ version: "v3", auth: authClient });
  }

  // サービスアカウントキーがない場合はOAuth認証を使用
  const { getAuthenticatedClient } = await import("./auth-oauth.js");
  const oAuth2Client = await getAuthenticatedClient();
  return google.drive({ version: "v3", auth: oAuth2Client });
}

async function ensureAnyoneWithLinkReadable(drive, fileId) {
  // Make file public to anyone with link (reader)
  // If you don't want public links, set DRIVE_MAKE_PUBLIC=false (default).
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { type: "anyone", role: "reader" },
    });
  } catch (e) {
    // If org policy blocks public sharing, it may fail. Still okay.
    console.warn(`⚠️ Could not make public (fileId=${fileId}): ${e.message}`);
  }
}

async function uploadFile(drive, localPath, parentFolderId, desiredName) {
  const mime =
    localPath.endsWith(".png")
      ? "image/png"
      : localPath.endsWith(".mp4")
        ? "video/mp4"
        : "application/octet-stream";

  const fileMetadata = {
    name: desiredName || path.basename(localPath),
    parents: [parentFolderId],
  };

  const media = {
    mimeType: mime,
    body: fs.createReadStream(localPath),
  };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  const file = res.data;
  if (MAKE_PUBLIC) {
    await ensureAnyoneWithLinkReadable(drive, file.id);
  }

  // Re-fetch links (sometimes links may not be immediately present)
  const got = await drive.files.get({
    fileId: file.id,
    fields: "id, name, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  return got.data;
}

function buildDriveFileName(pack, originalFile) {
  // Example: tiktok__www_espn_com_xxx__tt_1080x1920.mp4
  return `${pack.platform}__${pack.folderName}__${originalFile}`;
}

async function main() {
  const drive = await getDriveClient();

  const packs = listPostPackFolders(QUEUE_DIR);
  if (packs.length === 0) {
    console.log("No post packs found under queue/. Run `npm run queue` first.");
    return;
  }

  const targets = [
    { key: "igImage", file: "ig_1080x1350.png", urlKey: "igImageUrl", idKey: "igImageFileId" },
    { key: "ttCover", file: "tt_1080x1920_cover.png", urlKey: "ttCoverUrl", idKey: "ttCoverFileId" },
    { key: "ttVideo", file: "tt_1080x1920.mp4", urlKey: "ttVideoUrl", idKey: "ttVideoFileId" },
  ];

  let uploadedCount = 0;

  for (const pack of packs) {
    const metaPath = path.join(pack.folderPath, "meta.json");
    const meta = safeReadJson(metaPath) || {};
    meta.drive = meta.drive || {};

    for (const t of targets) {
      const local = path.join(pack.folderPath, t.file);
      if (!fileExists(local)) continue;

      // Skip if already in meta and fileId exists (but allow re-upload if file is newer)
      const localStat = fs.statSync(local);
      const localMtime = localStat.mtimeMs;
      const lastUploadTime = meta.drive[`${t.idKey}UploadedAt`];
      
      if (meta.drive[t.urlKey] && meta.drive[t.idKey] && lastUploadTime && localMtime <= lastUploadTime) {
        console.log(`⏭️  Skipping (already uploaded): ${pack.platform}/${pack.folderName}/${t.file}`);
        continue;
      }

      const driveName = buildDriveFileName(pack, t.file);
      console.log(`⬆️  Uploading: ${pack.platform}/${pack.folderName}/${t.file}`);

      const uploaded = await uploadFile(drive, local, DRIVE_FOLDER_ID, driveName);

      // Prefer webContentLink for direct download; webViewLink for preview page.
      // For images, IMAGE() works better with webContentLink sometimes,
      // but Google can block hotlinking occasionally. We'll store BOTH.
      meta.drive[t.idKey] = uploaded.id;
      meta.drive[t.urlKey] = uploaded.webContentLink || uploaded.webViewLink || "";
      meta.drive[`${t.urlKey}View`] = uploaded.webViewLink || "";
      meta.drive[`${t.urlKey}Download`] = uploaded.webContentLink || "";
      meta.drive[`${t.idKey}UploadedAt`] = localMtime;

      uploadedCount++;
    }

    // Write back meta.json if something changed
    safeWriteJson(metaPath, meta);
  }

  console.log(`✅ Done. Uploaded ${uploadedCount} file(s). Updated meta.json in queue packs.`);
  if (!MAKE_PUBLIC) {
    console.log("ℹ️ Links are accessible based on Drive permissions. If you want public links, set DRIVE_MAKE_PUBLIC=true");
  }
}

main().catch((e) => {
  console.error("❌ upload-to-drive failed:", e);
  process.exit(1);
});
