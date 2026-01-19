import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_FILE = path.join(__dirname, '..', 'state', 'posted.json');

/**
 * 投稿済みIDのセットを読み込む
 * @returns {Promise<Set<string>>}
 */
export async function loadPostedIds() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    const posted = JSON.parse(data);
    return new Set(posted.postIds || []);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // ファイルが存在しない場合は空のセットを返す
      return new Set();
    }
    throw error;
  }
}

/**
 * 投稿済みIDを保存する
 * @param {Set<string>} postedIds - 投稿済みIDのセット
 */
export async function savePostedIds(postedIds) {
  // state ディレクトリが存在しない場合は作成
  const stateDir = path.dirname(STATE_FILE);
  await fs.mkdir(stateDir, { recursive: true });
  
  const data = {
    postIds: Array.from(postedIds),
    updatedAt: new Date().toISOString()
  };
  
  await fs.writeFile(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 投稿済みIDを追加する
 * @param {string} postId - 追加する投稿ID
 */
export async function addPostedId(postId) {
  const postedIds = await loadPostedIds();
  postedIds.add(postId);
  await savePostedIds(postedIds);
}
