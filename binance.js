import crypto from "crypto";
import fetch from "node-fetch";
const DEFAULT_BASE = process.env.BINANCE_BASE || "https://api.binance.com";
const DEFAULT_RETRY_ATTEMPTS = Math.max(1, Number(process.env.BINANCE_RETRY_ATTEMPTS || 3));
const RETRY_BACKOFF_BASE = Math.max(50, Number(process.env.BINANCE_RETRY_BACKOFF || 200));
const AVG_PRICE_TTL = Math.max(1000, Number(process.env.BINANCE_AVG_PRICE_TTL || 5000));
const EXCHANGE_INFO_TTL = Math.max(60000, Number(process.env.BINANCE_EXCHANGE_INFO_TTL || 300000));
const TIME_SYNC_TTL = Math.max(30000, Number(process.env.BINANCE_TIME_SYNC_MS || 60000));
const KLINES_TTL = Math.max(5000, Number(process.env.BINANCE_KLINES_TTL || 15000));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options) {
  let attempt = 0;
  let lastError;
  while (attempt < DEFAULT_RETRY_ATTEMPTS) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 || response.status === 418) {
        lastError = new Error(`Rate limited with status ${response.status}`);
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : RETRY_BACKOFF_BASE * Math.pow(2, attempt);
        await sleep(delay);
        attempt += 1;
        continue;
      }
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `${response.status} error from Binance`);
      }
      return response;
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt >= DEFAULT_RETRY_ATTEMPTS) {
        break;
      }
      const delay = RETRY_BACKOFF_BASE * Math.pow(2, attempt - 1);
      await sleep(Math.min(delay, 5000));
    }
  }
  throw lastError;
}

export function createBinanceClient(options = {}) {
  const {
    apiKey: providedKey,
    apiSecret: providedSecret,
    base = DEFAULT_BASE
  } = options;

  let apiKey = providedKey;
  let apiSecret = providedSecret;
  let timeOffset = 0;
  let lastTimeSync = 0;
  let syncingPromise = null;

  const caches = {
    avgPrice: new Map(),
    exchangeInfo: new Map(),
    klines: new Map()
  };

  function getCached(map, key) {
    const entry = map.get(key);
    if (!entry) return null;
    if (entry.expiresAt > Date.now()) {
      return { value: entry.value, fresh: true };
    }
    return { value: entry.value, fresh: false };
  }

  function setCached(map, key, value, ttl) {
    map.set(key, { value, expiresAt: Date.now() + ttl });
  }

  async function fetchServerTime() {
    const response = await fetchWithRetry(`${base}/api/v3/time`, { method: "GET" });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { serverTime: Date.now() };
    }
  }

  async function syncTime(force = false) {
    const now = Date.now();
    if (!force && (now - lastTimeSync) < TIME_SYNC_TTL && !syncingPromise) {
      return;
    }
    if (syncingPromise) {
      return syncingPromise;
    }
    syncingPromise = (async () => {
      try {
        const result = await fetchServerTime();
        if (result && Number(result.serverTime)) {
          const serverTime = Number(result.serverTime);
          const localNow = Date.now();
          timeOffset = serverTime - localNow;
          lastTimeSync = localNow;
        }
      } catch (err) {
        console.error("[BINANCE] failed to sync time", err?.message || err);
      } finally {
        syncingPromise = null;
      }
    })();
    return syncingPromise;
  }

  function parseErrorPayload(err) {
    if (!err) return { code: undefined, message: "" };
    let message = typeof err.message === "string" ? err.message : String(err);
    let code;
    try {
      const payload = JSON.parse(message);
      if (payload && typeof payload === "object") {
        if (payload.msg) message = String(payload.msg);
        if (payload.code !== undefined) code = Number(payload.code);
      }
    } catch {}
    return { code, message };
  }

  function ensureCreds() {
    if (!apiKey || !apiSecret) {
      throw new Error("This operation requires a Binance API key and secret");
    }
  }

  function sign(queryString) {
    ensureCreds();
    return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex");
  }

  async function request(path, method = "GET", params = {}, signed = false, attempt = 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }

    let url = `${base}${path}`;
    let body;
    const headers = {};

    if (apiKey) headers["X-MBX-APIKEY"] = apiKey;

    const appendSignature = async () => {
      ensureCreds();
      await syncTime(attempt > 0);
      const timestamp = Math.floor(Date.now() + timeOffset);
      searchParams.set("timestamp", timestamp.toString());
      searchParams.set("recvWindow", "5000");
      const qs = searchParams.toString();
      const signature = sign(qs);
      if (method === "GET") {
        url = `${url}?${qs}&signature=${signature}`;
      } else {
        body = `${qs}&signature=${signature}`;
      }
    };

    if (method === "GET") {
      if (signed) {
        await appendSignature();
      } else if ([...searchParams].length) {
        const qs = searchParams.toString();
        url = `${url}?${qs}`;
      }
    } else {
      if (signed) {
        await appendSignature();
      } else {
        body = searchParams.toString();
      }
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    try {
      const response = await fetchWithRetry(url, { method, headers, body });
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch (err) {
      const details = parseErrorPayload(err);
      if (signed && details.code === -1021 && attempt < 2) {
        await syncTime(true);
        return request(path, method, params, signed, attempt + 1);
      }
      throw err;
    }
  }

  return {
    async avgPrice(symbol) {
      const key = String(symbol || "").toUpperCase();
      const cached = getCached(caches.avgPrice, key);
      if (cached?.fresh) {
        return cached.value;
      }
      try {
        const result = await request(`/api/v3/avgPrice`, "GET", { symbol: key });
        setCached(caches.avgPrice, key, result, AVG_PRICE_TTL);
        return result;
      } catch (err) {
        if (cached?.value) {
          return cached.value;
        }
        throw err;
      }
    },
    async exchangeInfo(symbol) {
      const key = String(symbol || "").toUpperCase();
      const cached = getCached(caches.exchangeInfo, key || "__all__");
      if (cached?.fresh) {
        return cached.value;
      }
      try {
        const result = await request(`/api/v3/exchangeInfo`, "GET", { symbol: key });
        setCached(caches.exchangeInfo, key || "__all__", result, EXCHANGE_INFO_TTL);
        return result;
      } catch (err) {
        if (cached?.value) {
          return cached.value;
        }
        throw err;
      }
    },
    async klines(symbol, interval = "15m", limit = 120) {
      const key = `${String(symbol || "").toUpperCase()}:${interval}:${limit}`;
      const cached = getCached(caches.klines, key);
      if (cached?.fresh) {
        return cached.value;
      }
      try {
        const result = await request(`/api/v3/klines`, "GET", { symbol: String(symbol || "").toUpperCase(), interval, limit });
        setCached(caches.klines, key, result, KLINES_TTL);
        return result;
      } catch (err) {
        if (cached?.value) {
          return cached.value;
        }
        throw err;
      }
    },
    account() {
      return request(`/api/v3/account`, "GET", {}, true);
    },
    openOrders(symbol) {
      const params = symbol ? { symbol } : {};
      return request(`/api/v3/openOrders`, "GET", params, true);
    },
    myTrades(symbol, limit = 20) {
      return request(`/api/v3/myTrades`, "GET", { symbol, limit }, true);
    },
    placeLimit(symbol, side, qty, price, options = {}) {
      const { makerOnly = false, clientOrderId } = options;
      const payload = {
        symbol,
        side,
        type: makerOnly ? "LIMIT_MAKER" : "LIMIT",
        quantity: qty,
        price
      };
      if (!makerOnly) payload.timeInForce = "GTC";
      if (clientOrderId) payload.newClientOrderId = clientOrderId;
      return request(`/api/v3/order`, "POST", payload, true);
    },
    placeStopLossLimit(symbol, side, qty, stopPrice, limitPrice, options = {}) {
      const payload = {
        symbol,
        side,
        type: "STOP_LOSS_LIMIT",
        quantity: qty,
        price: limitPrice,
        stopPrice,
        timeInForce: "GTC"
      };
      if (options?.clientOrderId) payload.newClientOrderId = options.clientOrderId;
      return request(`/api/v3/order`, "POST", payload, true);
    },
    cancelOrder(symbol, orderId) {
      return request(`/api/v3/order`, "DELETE", { symbol, orderId }, true);
    }
  };
}

export const defaultClient = createBinanceClient();

export default createBinanceClient;
