// scripts/auth-oauth.js
// OAuth 2.0 クライアント認証のヘルパー
// サービスアカウントキーが作成できない場合の代替手段

import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const OAUTH_CLIENT_PATH = path.join(ROOT, "config", "oauth-client.json");
const TOKEN_PATH = path.join(ROOT, "config", "oauth-token.json");

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
];

/**
 * OAuth 2.0 クライアントを読み込む
 */
function loadOAuthClient() {
  if (!fs.existsSync(OAUTH_CLIENT_PATH)) {
    throw new Error(
      `OAuth client JSON not found: ${OAUTH_CLIENT_PATH}\n` +
      `Please copy your OAuth client secret JSON to ${OAUTH_CLIENT_PATH}`
    );
  }

  const credentials = JSON.parse(fs.readFileSync(OAUTH_CLIENT_PATH, "utf8"));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web || {};

  if (!client_id || !client_secret) {
    throw new Error("Invalid OAuth client JSON: missing client_id or client_secret");
  }

  return new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris?.[0] || "http://localhost"
  );
}

/**
 * トークンを保存
 */
function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
}

/**
 * 保存されたトークンを読み込む
 */
function loadToken() {
  if (fs.existsSync(TOKEN_PATH)) {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  }
  return null;
}

/**
 * 認証URLを取得
 */
function getAuthUrl(oAuth2Client) {
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
}

/**
 * ユーザーから認証コードを取得
 */
function getCodeFromUser() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("認証コードを入力してください: ", (code) => {
      rl.close();
      resolve(code);
    });
  });
}

/**
 * トークンを取得（初回認証）
 */
async function authorize() {
  const oAuth2Client = loadOAuthClient();
  const token = loadToken();

  if (token) {
    oAuth2Client.setCredentials(token);
    // トークンの有効性を確認
    try {
      await oAuth2Client.getAccessToken();
      return oAuth2Client;
    } catch (error) {
      console.log("保存されたトークンが無効です。再認証が必要です。");
    }
  }

  // 初回認証フロー
  const authUrl = getAuthUrl(oAuth2Client);
  console.log("\n以下のURLにアクセスして認証してください:");
  console.log(authUrl);
  console.log("\n認証後、ブラウザのURLバーに表示される認証コードをコピーしてください。");
  console.log("URL例: localhost/?code=4/0AeanS...");
  console.log("→ コピーする部分: code= の後の文字列（&scope= の前まで）\n");

  const code = await getCodeFromUser();
  
  // 認証コードの前後の不要な文字を削除
  let cleanCode = code.trim();
  // URL全体がコピーされた場合、code= の後の部分だけを抽出
  if (cleanCode.includes("code=")) {
    const match = cleanCode.match(/code=([^&]+)/);
    if (match) {
      cleanCode = match[1];
    }
  }
  // 余分な空白や改行を削除
  cleanCode = cleanCode.replace(/\s+/g, "");

  try {
    const { tokens } = await oAuth2Client.getToken(cleanCode);
    oAuth2Client.setCredentials(tokens);
    saveToken(tokens);

    console.log("✅ 認証が完了しました。トークンが保存されました。\n");
    return oAuth2Client;
  } catch (error) {
    console.error("\n❌ エラー:", error.message);
    if (error.message.includes("invalid_grant")) {
      console.error("\n考えられる原因:");
      console.error("1. 認証コードが既に使用済み（一度しか使えません）");
      console.error("2. 認証コードの有効期限切れ（数分以内に使用してください）");
      console.error("3. 認証コードの形式が間違っている");
      console.error("\n解決方法: もう一度認証フローを開始してください。");
      console.error("npm run setup:oauth を再実行してください。\n");
    }
    throw error;
  }
}

/**
 * 認証済みのOAuth2クライアントを取得
 */
export async function getAuthenticatedClient() {
  return await authorize();
}
