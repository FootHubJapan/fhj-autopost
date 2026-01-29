import fs from "node:fs";
import path from "node:path";

const DEFAULT_PROMPT = {
  system:
    "You are a Japanese social media editor for soccer news. Produce concise, accurate summaries.",
  user:
    "Return JSON with keys caption and hashtags. caption should be 1-2 sentences in Japanese plus the link on a new line. hashtags should be an array of 5-10 Japanese/English hashtags (include #サッカー).",
};

function loadJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function loadAiConfig(configDir) {
  const configPath = path.join(configDir, "ai.json");
  const fileConfig = loadJsonIfExists(configPath) || {};
  const enabled =
    process.env.AI_ENABLED === "1" ||
    process.env.AI_ENABLED === "true" ||
    fileConfig.enabled === true;
  const apiKey = process.env.AI_API_KEY || fileConfig.apiKey || "";

  return {
    enabled: Boolean(enabled && apiKey),
    baseUrl: process.env.AI_BASE_URL || fileConfig.baseUrl || "https://api.openai.com/v1",
    apiKey,
    model: process.env.AI_MODEL || fileConfig.model || "gpt-4o-mini",
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || fileConfig.timeoutMs || 12000),
    prompt: {
      system: fileConfig.prompt?.system || DEFAULT_PROMPT.system,
      user: fileConfig.prompt?.user || DEFAULT_PROMPT.user,
    },
  };
}

function buildUserPrompt(item, feed, scoring, prompt) {
  const content = item.contentSnippet || item.content || "";
  const trimmedContent = content.replace(/\s+/g, " ").slice(0, 800);
  const parts = [
    prompt.user,
    "",
    `Title: ${item.title || ""}`,
    `Link: ${item.link || ""}`,
    `Feed: ${feed.name || ""}`,
    `Category: ${scoring.categoryLabel || ""}`,
    trimmedContent ? `Content: ${trimmedContent}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    return null;
  }
}

function normalizeHashtags(hashtags) {
  if (!Array.isArray(hashtags)) {
    return null;
  }
  const normalized = hashtags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  return normalized.length > 0 ? normalized : null;
}

export async function generateAiPost({ item, feed, scoring, config }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        messages: [
          { role: "system", content: config.prompt.system },
          {
            role: "user",
            content: buildUserPrompt(item, feed, scoring, config.prompt),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(content);
    if (!parsed) {
      throw new Error("AI response was not valid JSON");
    }
    const caption = String(parsed.caption || "").trim();
    const hashtags = normalizeHashtags(parsed.hashtags);
    if (!caption || !hashtags) {
      throw new Error("AI response missing caption or hashtags");
    }
    return { caption, hashtags: `${hashtags.join(" ")}\n` };
  } finally {
    clearTimeout(timeout);
  }
}
