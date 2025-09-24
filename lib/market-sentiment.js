import fetch from "node-fetch";

const DEFAULT_FEED_URL = "https://news.google.com/rss/search?q=cryptocurrency&hl=en-US&gl=US&ceid=US:en";
const POSITIVE_KEYWORDS = [
  "surge", "soar", "rally", "gain", "bull", "bullish", "record", "approval", "growth", "support", "recover"
];
const NEGATIVE_KEYWORDS = [
  "drop", "plunge", "fall", "hack", "lawsuit", "ban", "bear", "bearish", "loss", "down", "warning", "fear"
];

const ENTITY_MAP = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'"
};

function decodeHtmlEntities(text = "") {
  return String(text).replace(/&[a-zA-Z0-9#]+;/g, match => ENTITY_MAP[match] || match);
}

function extractTagValue(block, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = block.match(regex);
  if (!match) return "";
  const value = match[1].trim();
  if (!value) return "";
  const cdata = value.match(/<!\[CDATA\[([\\s\\S]*?)\]\]>/i);
  return decodeHtmlEntities(cdata ? cdata[1] : value);
}

function normaliseHeadline(item) {
  const lower = item.title.toLowerCase();
  let score = 0;
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lower.includes(keyword)) score += 1;
  }
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lower.includes(keyword)) score -= 1;
  }
  return { ...item, sentimentScore: score };
}

function parseRss(text, limit) {
  if (!text) return [];
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(text)) && items.length < limit) {
    const block = match[1];
    const title = extractTagValue(block, "title");
    if (!title) continue;
    const link = extractTagValue(block, "link");
    const pubDateRaw = extractTagValue(block, "pubDate");
    const publishedAt = pubDateRaw ? new Date(pubDateRaw).toISOString() : null;
    items.push(normaliseHeadline({ title, link, publishedAt }));
  }
  return items;
}

export async function fetchMarketSentiment(options = {}) {
  const limit = Math.max(1, Math.min(20, Number(options.limit || process.env.MARKET_SENTIMENT_HEADLINES || 6)));
  const feedUrl = options.feedUrl || process.env.MARKET_SENTIMENT_FEED_URL || DEFAULT_FEED_URL;
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": "my1-bot-sentiment/1.0"
      }
    });
    if (!response.ok) {
      return { headlines: [], sentimentScore: 0, sentimentLabel: "neutral", error: `Feed error ${response.status}` };
    }
    const text = await response.text();
    const headlines = parseRss(text, limit);
    if (!headlines.length) {
      return { headlines: [], sentimentScore: 0, sentimentLabel: "neutral" };
    }
    const totalScore = headlines.reduce((sum, item) => sum + (item.sentimentScore || 0), 0);
    const sentimentScore = Number((totalScore / headlines.length).toFixed(2));
    let sentimentLabel = "neutral";
    if (sentimentScore > 0.5) sentimentLabel = "positive";
    else if (sentimentScore < -0.5) sentimentLabel = "negative";
    return { headlines, sentimentScore, sentimentLabel };
  } catch (err) {
    return { headlines: [], sentimentScore: 0, sentimentLabel: "neutral", error: err?.message || String(err) };
  }
}

export default fetchMarketSentiment;
