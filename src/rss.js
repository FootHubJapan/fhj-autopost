import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail']
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)'
  }
});

/**
 * RSSフィードを取得してパースする
 * @param {string} url - RSSフィードのURL
 * @returns {Promise<Array>} 記事の配列
 */
export async function fetchRSSFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items || [];
  } catch (error) {
    console.error(`Failed to fetch RSS feed from ${url}:`, error.message);
    throw error;
  }
}

/**
 * 複数のRSSフィードを取得する
 * @param {string[]} urls - RSSフィードのURL配列
 * @returns {Promise<Array>} 全記事の配列（URL情報付き）
 */
export async function fetchMultipleRSSFeeds(urls) {
  const results = [];
  
  for (const url of urls) {
    try {
      const items = await fetchRSSFeed(url);
      results.push({
        url,
        items: items.map(item => ({
          ...item,
          sourceUrl: url
        }))
      });
    } catch (error) {
      console.error(`Skipping RSS feed ${url} due to error`);
      // エラーが発生しても続行
    }
  }
  
  return results;
}
