// src/scoring.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config/scoring.json"), "utf-8"));

function norm(s) {
  return String(s || "").toLowerCase();
}

function hasAny(text, arr) {
  return arr.some(k => text.includes(k));
}

export function scoreTitle(title) {
  const t = norm(title);

  // 除外
  if (hasAny(t, cfg.exclude.keywords.map(norm))) {
    return { score: cfg.exclude.score, categoryId: "exclude", categoryLabel: "除外" };
  }

  // カテゴリ判定（最大スコアのカテゴリ）
  let best = { score: 0, categoryId: "result", categoryLabel: "速報" };

  for (const c of cfg.categories) {
    const keys = c.keywords.map(norm);
    if (hasAny(t, keys)) {
      if (c.score > best.score) {
        best = { score: c.score, categoryId: c.id, categoryLabel: c.label };
      }
    }
  }

  // ブースト（人気クラブ/大会など）
  let boost = 0;
  for (const b of cfg.boost) {
    const keys = b.keywords.map(norm);
    if (hasAny(t, keys)) boost += b.score;
  }

  // 主語弱いペナルティ（ざっくり）
  const weakSubject = ["report", "preview", "recap", "highlights"].some(k => t.includes(k));
  const penalty = weakSubject ? -5 : 0;

  const total = best.score + boost + penalty;
  return { score: total, categoryId: best.categoryId, categoryLabel: best.categoryLabel };
}

export function minScoreToQueue() {
  return cfg.minScoreToQueue ?? 20;
}
