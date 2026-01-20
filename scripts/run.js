import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Parser from "rss-parser";
import { generateImagesAndVideo } from "../src/media.js";
import { generatePostGuide } from "./make-guide.js";
import { scoreTitle } from "../src/scoring.js";

const argv = new Set(process.argv.slice(2));
const DRY = argv.has("--dry") || argv.has("--dry-run");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "out");
const CONFIG_DIR = path.join(ROOT, "config");
const STATE_DIR = path.join(ROOT, "state");

const ACCOUNTS_PATH = path.join(CONFIG_DIR, "accounts.json");
const FEEDS_PATH = path.join(CONFIG_DIR, "feeds.json");
const POSTED_PATH = path.join(STATE_DIR, "posted.json");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf-8");
}

function writeText(p, s) {
  fs.writeFileSync(p, s, "utf-8");
}

function todayJST() {
  // GitHub ActionsはUTCなので、JST寄せで日付フォルダを作る
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function hash(s) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
}

function formatCaption(item, categoryLabel) {
  const title = item.title?.trim() ?? "(no title)";
  const link = item.link?.trim() ?? "";
  
  // カテゴリラベルがある場合は追加
  if (categoryLabel && categoryLabel !== "速報" && categoryLabel !== "除外") {
    return `【${categoryLabel}】${title}\n\n🔗 ${link}\n`;
  }
  
  return `${title}\n\n🔗 ${link}\n`;
}

function formatHashtags(feedId) {
  // サッカー用ハッシュタグ
  const baseTags = [
    "#サッカー",
    "#海外サッカー",
    "#football",
    "#soccer"
  ];
  
  // feedIdに応じた追加タグ
  const feedTags = {
    "espn_soccer": ["#ESPN", "#サッカー情報"],
    "goal_japan": ["#Goal", "#サッカー速報"]
  };
  
  const tags = [...baseTags, ...(feedTags[feedId] || []), `#${feedId}`];
  return tags.join(" ") + "\n";
}

async function main() {
  ensureDir(OUT_DIR);
  ensureDir(STATE_DIR);

  const accounts = readJson(ACCOUNTS_PATH);
  const feedsCfg = readJson(FEEDS_PATH);

  let posted;
  if (fs.existsSync(POSTED_PATH)) {
    try {
      posted = readJson(POSTED_PATH);
      if (!posted.items) {
        posted.items = {};
      }
    } catch (error) {
      console.warn("Failed to read posted.json, starting fresh");
      posted = { items: {} };
    }
  } else {
    posted = { items: {} };
  }

  const parser = new Parser({
    customFields: {
      item: ['media:content', 'media:thumbnail']
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)'
    }
  });
  
  const dateFolder = todayJST();
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalGenerated = 0;

  for (const feed of feedsCfg.feeds) {
    try {
      console.log(`\nProcessing RSS feed: ${feed.name} (${feed.url})`);
      const parsed = await parser.parseURL(feed.url);
      console.log(`  Found ${parsed.items.length} items`);

      for (const item of parsed.items.slice(0, 10)) {
        const postId = item.guid || item.id || item.link || item.title || Math.random().toString();
        const key = `${feed.id}:${hash(postId)}`;

        if (posted.items[key]) {
          totalSkipped++;
          continue;
        }

        // スコアリング
        const scoring = scoreTitle(item.title || "");
        
        // ここで「どのプラットフォームに生成するか」を決める
        for (const [platform, pCfg] of Object.entries(accounts.platforms)) {
          for (const acct of pCfg.accounts) {
            try {
              const outBase = path.join(
                OUT_DIR,
                dateFolder,
                platform,
                acct.id,
                `${slugify(item.link || item.title || "item")}_${hash(key)}`
              );

              const caption = formatCaption(item, scoring.categoryLabel);
              const hashtags = formatHashtags(feed.id);

              if (!DRY) ensureDir(outBase);

              const meta = {
                postId: postId,
                title: item.title || "",
                link: item.link || "",
                pubDate: item.pubDate || item.isoDate || "",
                sourceUrl: feed.url,
                feedId: feed.id,
                platform,
                accountId: acct.id,
                generatedAt: new Date().toISOString(),
                score: scoring.score,
                categoryId: scoring.categoryId,
                categoryLabel: scoring.categoryLabel
              };

              if (DRY) {
                console.log(`  [DRY] ${platform}/${acct.id}: ${item.title?.substring(0, 50)}...`);
                totalProcessed++;
                continue;
              }

              writeText(path.join(outBase, "caption.txt"), caption);
              writeText(path.join(outBase, "hashtags.txt"), hashtags);
              writeText(path.join(outBase, "sources.txt"), `Feed: ${feed.url}\nItem: ${item.link || ""}\n`);
              writeJson(path.join(outBase, "meta.json"), meta);
              
              // 画像・動画生成（Instagram/TikTok用）
              if (platform === "instagram" || platform === "tiktok") {
                try {
                  // RSSアイテムからpoints/commentsを抽出（Hacker News形式の場合）
                  const points = item.points || item.score || null;
                  const comments = item.numComments || item.comments || null;
                  
                  await generateImagesAndVideo({
                    outDir: outBase,
                    title: item.title || "",
                    topicLabel: feed.name || "Daily Pick",
                    handle: acct.handle || "@football_hub_japan",
                    points,
                    comments,
                    categoryLabel: scoring.categoryLabel,
                  });
                  console.log(`      Generated media: ig_1080x1350.png, tt_1080x1920_cover.png, tt_1080x1920.mp4`);
                } catch (error) {
                  console.error(`      Error generating media:`, error.message);
                  // メディア生成エラーでも続行
                }
              }
              
              // 投稿ガイドを生成
              try {
                generatePostGuide(outBase, platform, {
                  title: item.title || "",
                  link: item.link || "",
                  sourceUrl: feed.url,
                });
              } catch (error) {
                console.error(`      Error generating guide:`, error.message);
                // ガイド生成エラーでも続行
              }
              
              totalGenerated++;
              console.log(`    Generated: ${platform}/${acct.id}/${path.basename(outBase)}`);
            } catch (error) {
              console.error(`    Error processing ${platform}/${acct.id}:`, error.message);
            }
          }
        }

        posted.items[key] = { at: new Date().toISOString(), feedId: feed.id };
        totalProcessed++;
      }
    } catch (error) {
      console.error(`Failed to process feed ${feed.name}:`, error.message);
      // エラーが発生しても続行
    }
  }

  if (!DRY) {
    writeJson(POSTED_PATH, posted);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total Processed: ${totalProcessed}`);
  console.log(`Total Skipped: ${totalSkipped}`);
  console.log(`Total Generated: ${totalGenerated}`);
  console.log(`Output Directory: ${OUT_DIR}`);
  
  if (DRY) {
    console.log('\n[Dry-run mode] No state was saved');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
