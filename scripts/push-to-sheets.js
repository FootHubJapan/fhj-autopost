#!/usr/bin/env node
// scripts/push-to-sheets.js
// CSVの内容をGoogle Sheetsに自動反映

import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const CSV_PATH = path.join(ROOT, "queue_index.csv");
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "1dBV92z75Se0LPsLOKo8_nhGzL6Q7CVipoGpcuCoi7pk";
const SHEET_NAME = "queue_index";

// CSVを読み込んで配列に変換
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());
  
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    // CSVのパース（カンマ区切り、ダブルクォート対応）
    const values = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  });
  
  return { headers, rows };
}

async function pushToSheets() {
  // 認証情報の読み込み
  const authPath = path.join(ROOT, "config", "google-service-account.json");
  
  if (!fs.existsSync(authPath)) {
    console.error("❌ Google Service Account認証情報が見つかりません");
    console.error(`   設定ファイル: ${authPath}`);
    console.error("\n📝 セットアップ手順:");
    console.error("1. Google Cloud Consoleでサービスアカウントを作成");
    console.error("2. Google Sheets APIを有効化");
    console.error("3. 認証JSONをダウンロード");
    console.error(`4. ${authPath} に保存`);
    console.error("5. スプレッドシートをサービスアカウントのメールに共有（編集権限）");
    process.exit(1);
  }
  
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSVファイルが見つかりません: ${CSV_PATH}`);
    console.error("   先に npm run export:csv を実行してください");
    process.exit(1);
  }
  
  try {
    // 認証
    const auth = new google.auth.GoogleAuth({
      keyFile: authPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    
    const sheets = google.sheets({ version: "v4", auth });
    
    // CSVを読み込む
    const { headers, rows } = readCSV(CSV_PATH);
    
    if (rows.length === 0) {
      console.log("⚠️  CSVにデータがありません");
      return;
    }
    
    console.log(`📊 ${rows.length}行のデータを読み込みました`);
    
    // シートを取得または作成
    let sheetId;
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });
      
      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === SHEET_NAME);
      if (sheet) {
        sheetId = sheet.properties.sheetId;
        console.log(`✅ シート "${SHEET_NAME}" が見つかりました`);
      } else {
        // シートを作成
        const createResponse = await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: SHEET_NAME,
                },
              },
            }],
          },
        });
        sheetId = createResponse.data.replies[0].addSheet.properties.sheetId;
        console.log(`✅ シート "${SHEET_NAME}" を作成しました`);
      }
    } catch (error) {
      console.error("❌ スプレッドシートへのアクセスに失敗しました");
      console.error("   スプレッドシートがサービスアカウントと共有されているか確認してください");
      throw error;
    }
    
    // データをクリア（ヘッダー以外）
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:Z1000`,
    });
    
    // データを書き込み
    const values = [headers, ...rows];
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      resource: {
        values,
      },
    });
    
    console.log(`✅ ${rows.length}行のデータをスプレッドシートに反映しました`);
    console.log(`📋 URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${sheetId}`);
    
  } catch (error) {
    console.error("❌ エラーが発生しました:");
    console.error(error.message);
    if (error.response) {
      console.error("詳細:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

pushToSheets();
