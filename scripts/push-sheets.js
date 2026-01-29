// scripts/push-sheets.js
// Push queue_index.csv to Google Sheets (overwrite target sheet)
// Required env:
//   SPREADSHEET_ID
// Optional env:
//   SHEET_NAME (default: queue_index)
//   GOOGLE_SA_JSON (default: config/google-service-account.json)

import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const CSV_PATH = path.join(ROOT, "queue_index.csv");
const SA_PATH = process.env.GOOGLE_SA_JSON || path.join(ROOT, "config", "google-service-account.json");
const OAUTH_CLIENT_PATH = path.join(ROOT, "config", "oauth-client.json");

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "queue_index";

if (!SPREADSHEET_ID) {
  console.error("❌ SPREADSHEET_ID is missing. export SPREADSHEET_ID=...");
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

if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ CSV not found: ${CSV_PATH}. Run \`npm run export:csv\` first.`);
  process.exit(1);
}

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function parseCsvSimple(csvText) {
  // Simple CSV parser for our generated CSV (with quotes)
  // Returns 2D array values.
  const rows = [];
  let i = 0;
  let field = "";
  let row = [];
  let inQuotes = false;

  while (i < csvText.length) {
    const c = csvText[i];

    if (inQuotes) {
      if (c === '"') {
        const next = csvText[i + 1];
        if (next === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += c;
        i++;
        continue;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (c === ",") {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
        continue;
      }
      if (c === "\r") {
        i++;
        continue;
      }
      field += c;
      i++;
    }
  }
  // last
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function getSheetsClient() {
  // サービスアカウントキーが存在する場合はそれを使用
  if (fs.existsSync(SA_PATH)) {
    const auth = new google.auth.GoogleAuth({
      keyFile: SA_PATH,
      scopes: SCOPES,
    });
    const client = await auth.getClient();
    return google.sheets({ version: "v4", auth: client });
  }

  // サービスアカウントキーがない場合はOAuth認証を使用
  const { getAuthenticatedClient } = await import("./auth-oauth.js");
  const oAuth2Client = await getAuthenticatedClient();
  return google.sheets({ version: "v4", auth: oAuth2Client });
}

async function ensureSheetExists(sheets) {
  const ss = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = (ss.data.sheets || []).some((s) => s.properties?.title === SHEET_NAME);
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
    },
  });
}

async function main() {
  const sheets = await getSheetsClient();
  await ensureSheetExists(sheets);

  const csv = fs.readFileSync(CSV_PATH, "utf8");
  const values = parseCsvSimple(csv);

  // Clear
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:Z`,
  });

  // Write (USER_ENTERED so formulas like =IMAGE() work)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  console.log(`✅ Pushed ${values.length - 1} rows to sheet "${SHEET_NAME}"`);
}

main().catch((e) => {
  console.error("❌ push-sheets failed:", e);
  process.exit(1);
});
