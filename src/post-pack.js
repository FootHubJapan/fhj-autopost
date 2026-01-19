import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 投稿パックを生成する
 * @param {Object} item - RSSアイテム
 * @param {string} platform - プラットフォーム名
 * @param {string} accountId - アカウントID
 * @param {string} outputDir - 出力ディレクトリ
 */
export async function generatePostPack(item, platform, accountId, outputDir) {
  const dateStr = new Date().toISOString().split('T')[0];
  const packDir = path.join(outputDir, dateStr, platform, accountId);
  
  // ディレクトリが存在しない場合は作成
  await fs.mkdir(packDir, { recursive: true });
  
  // post_id を生成（guid または link を使用）
  const postId = item.guid || item.link || `${item.title}-${Date.now()}`;
  
  // ファイル名（post_id のハッシュ化または簡易化）
  const safePostId = postId.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const packBaseDir = path.join(packDir, safePostId);
  await fs.mkdir(packBaseDir, { recursive: true });
  
  // caption.txt - タイトルと説明を組み合わせ
  const caption = item.title || '';
  const description = item.contentSnippet || item.content || '';
  const captionText = `${caption}\n\n${description}`.trim();
  await fs.writeFile(path.join(packBaseDir, 'caption.txt'), captionText, 'utf-8');
  
  // hashtags.txt - 空ファイル（後で手動で追加可能）
  await fs.writeFile(path.join(packBaseDir, 'hashtags.txt'), '', 'utf-8');
  
  // sources.txt - リンクとRSSフィードURL
  const sources = [
    item.link || '',
    item.sourceUrl || ''
  ].filter(Boolean).join('\n');
  await fs.writeFile(path.join(packBaseDir, 'sources.txt'), sources, 'utf-8');
  
  // meta.json - メタデータ
  const meta = {
    postId,
    title: item.title || '',
    link: item.link || '',
    pubDate: item.pubDate || '',
    creator: item.creator || '',
    categories: item.categories || [],
    sourceUrl: item.sourceUrl || '',
    platform,
    accountId,
    generatedAt: new Date().toISOString()
  };
  await fs.writeFile(
    path.join(packBaseDir, 'meta.json'),
    JSON.stringify(meta, null, 2),
    'utf-8'
  );
  
  return {
    postId,
    packPath: packBaseDir
  };
}
