import fetch from "node-fetch";

const PRICE_CACHE = new Map();
const SNAPSHOT_CACHE = { data: null, expires: 0, limit: 0 };

const DEFAULT_PRICE_TTL = Math.max(5000, Number(process.env.COINGECKO_PRICE_TTL_MS || 20000));
const DEFAULT_SNAPSHOT_TTL = Math.max(15000, Number(process.env.COINGECKO_SNAPSHOT_TTL_MS || 60000));

function normaliseId(id) {
  if (typeof id !== "string") return "";
  return id.trim().toLowerCase();
}

function clampLimit(limit, { min = 1, max = 50, fallback = 10 } = {}) {
  const num = Number(limit);
  if (!Number.isFinite(num)) return fallback;
  if (num < min) return min;
  if (num > max) return max;
  return Math.floor(num);
}

export async function fetchCoinPriceUSD(coinId) {
  const id = normaliseId(coinId);
  if (!id) return null;
  const now = Date.now();
  const cached = PRICE_CACHE.get(id);
  if (cached && cached.expires > now) {
    return cached.price;
  }
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&precision=8`;
  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    const price = Number(payload?.[id]?.usd);
    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }
    PRICE_CACHE.set(id, { price, expires: now + DEFAULT_PRICE_TTL });
    return price;
  } catch (err) {
    return null;
  }
}

export async function fetchCoinMarketSnapshot(limit = 10) {
  const normalized = clampLimit(limit, { min: 3, max: 50, fallback: 10 });
  const now = Date.now();
  if (
    SNAPSHOT_CACHE.data
    && SNAPSHOT_CACHE.limit === normalized
    && SNAPSHOT_CACHE.expires > now
  ) {
    return SNAPSHOT_CACHE.data;
  }
  const params = new URLSearchParams({
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: String(normalized),
    page: "1",
    price_change_percentage: "1h,24h,7d"
  });
  const url = `https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`;
  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    if (!Array.isArray(payload)) {
      return [];
    }
    const mapped = payload.map(item => ({
      id: normaliseId(item?.id),
      symbol: typeof item?.symbol === "string" ? item.symbol.toUpperCase() : "",
      name: typeof item?.name === "string" ? item.name : "",
      priceUSD: Number(item?.current_price) || 0,
      change1hPct: Number(item?.price_change_percentage_1h_in_currency) || 0,
      change24hPct: Number(item?.price_change_percentage_24h) || 0,
      change7dPct: Number(item?.price_change_percentage_7d_in_currency) || 0,
      marketCap: Number(item?.market_cap) || 0,
      volume24h: Number(item?.total_volume) || 0
    })).filter(entry => entry.id && entry.symbol);
    SNAPSHOT_CACHE.data = mapped;
    SNAPSHOT_CACHE.limit = normalized;
    SNAPSHOT_CACHE.expires = now + DEFAULT_SNAPSHOT_TTL;
    return mapped;
  } catch (err) {
    return [];
  }
}

export function clearCoinCache() {
  PRICE_CACHE.clear();
  SNAPSHOT_CACHE.data = null;
  SNAPSHOT_CACHE.expires = 0;
  SNAPSHOT_CACHE.limit = 0;
}

export default {
  fetchCoinPriceUSD,
  fetchCoinMarketSnapshot,
  clearCoinCache
};
