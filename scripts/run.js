import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { fetchMultipleRSSFeeds } from '../src/rss.js';
import { generatePostPack } from '../src/post-pack.js';
import { loadPostedIds, addPostedId } from '../src/state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env ファイルを読み込む
config();

// アカウント設定を読み込む
const accountsConfigPath = path.join(__dirname, '..', 'config', 'accounts.json');
const accountsConfig = JSON.parse(await fs.readFile(accountsConfigPath, 'utf-8'));

const isDryRun = process.argv.includes('--dry-run');
const OUTPUT_DIR = path.join(__dirname, '..', 'out');

/**
 * メイン処理
 */
async function main() {
  const rssUrls = process.env.RSS_URLS;
  
  if (!rssUrls) {
    console.error('Error: RSS_URLS environment variable is not set');
    process.exit(1);
  }
  
  const urlList = rssUrls.split(',').map(url => url.trim()).filter(Boolean);
  
  if (urlList.length === 0) {
    console.error('Error: No valid RSS URLs found');
    process.exit(1);
  }
  
  console.log(`Starting ${isDryRun ? 'dry-run' : 'normal'} mode`);
  console.log(`RSS URLs: ${urlList.length}`);
  
  // 出力ディレクトリを作成
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  
  // 投稿済みIDを読み込む
  const postedIds = await loadPostedIds();
  console.log(`Loaded ${postedIds.size} posted IDs`);
  
  // RSSフィードを取得
  const feedResults = await fetchMultipleRSSFeeds(urlList);
  
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalGenerated = 0;
  
  // 各RSSフィードを処理
  for (const feedResult of feedResults) {
    console.log(`\nProcessing RSS feed: ${feedResult.url}`);
    console.log(`  Items: ${feedResult.items.length}`);
    
    // 各プラットフォームとアカウントの組み合わせで処理
    for (const [platform, platformConfig] of Object.entries(accountsConfig.platforms)) {
      for (const account of platformConfig.accounts) {
        try {
          console.log(`  Processing ${platform}/${account.id}...`);
          
          let accountProcessed = 0;
          let accountSkipped = 0;
          let accountGenerated = 0;
          
          // 各記事を処理
          for (const item of feedResult.items) {
            try {
              const postId = item.guid || item.link || `${item.title}-${Date.now()}`;
              
              // 既に投稿済みかチェック
              if (postedIds.has(postId)) {
                accountSkipped++;
                continue;
              }
              
              // 投稿パックを生成
              const result = await generatePostPack(
                item,
                platform,
                account.id,
                OUTPUT_DIR
              );
              
              // 投稿済みIDに追加
              if (!isDryRun) {
                await addPostedId(result.postId);
                postedIds.add(result.postId);
              }
              
              accountGenerated++;
              console.log(`    Generated: ${result.packPath}`);
              
            } catch (error) {
              console.error(`    Error processing item "${item.title}":`, error.message);
              // エラーが発生しても続行
            }
            
            accountProcessed++;
          }
          
          totalProcessed += accountProcessed;
          totalSkipped += accountSkipped;
          totalGenerated += accountGenerated;
          
          console.log(`  ${platform}/${account.id}: Processed=${accountProcessed}, Skipped=${accountSkipped}, Generated=${accountGenerated}`);
          
        } catch (error) {
          console.error(`  Error processing ${platform}/${account.id}:`, error.message);
          // エラーが発生しても続行
        }
      }
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Total Processed: ${totalProcessed}`);
  console.log(`Total Skipped: ${totalSkipped}`);
  console.log(`Total Generated: ${totalGenerated}`);
  console.log(`Output Directory: ${OUTPUT_DIR}`);
  
  if (isDryRun) {
    console.log('\n[Dry-run mode] No state was saved');
  }
}

// エラーハンドリング
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
