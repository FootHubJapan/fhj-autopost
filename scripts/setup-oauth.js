#!/usr/bin/env node
// scripts/setup-oauth.js
// OAuth認証のセットアップ（初回のみ実行）

import { getAuthenticatedClient } from "./auth-oauth.js";

console.log("🔐 OAuth認証のセットアップを開始します...\n");

try {
  await getAuthenticatedClient();
  console.log("\n✅ セットアップが完了しました！");
  console.log("これで 'npm run sync' を実行できます。\n");
} catch (error) {
  console.error("\n❌ エラー:", error.message);
  process.exit(1);
}
