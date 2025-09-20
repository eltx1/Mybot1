import crypto from "crypto";
import fetch from "node-fetch";
import fs from "fs";

const DEFAULT_BASE = process.env.BINANCE_BASE || "https://api.binance.com";

function loadFallbackCredentials() {
  try {
    const raw = fs.readFileSync("binance-keys.json", "utf8");
    const creds = JSON.parse(raw);
    return {
      apiKey: creds.BINANCE_KEY,
      apiSecret: creds.BINANCE_SECRET
    };
  } catch {
    return { apiKey: process.env.BINANCE_KEY, apiSecret: process.env.BINANCE_SECRET };
  }
}

export function createBinanceClient(options = {}) {
  const {
    apiKey: providedKey,
    apiSecret: providedSecret,
    base = DEFAULT_BASE,
    fallbackToFile = true
  } = options;

  let apiKey = providedKey;
  let apiSecret = providedSecret;

  if ((!apiKey || !apiSecret) && fallbackToFile) {
    const fallback = loadFallbackCredentials();
    apiKey = fallback.apiKey;
    apiSecret = fallback.apiSecret;
  }

  function ensureCreds() {
    if (!apiKey || !apiSecret) {
      throw new Error("BINANCE_KEY and BINANCE_SECRET are required");
    }
  }

  function sign(queryString) {
    ensureCreds();
    return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex");
  }

  async function request(path, method = "GET", params = {}, signed = false) {
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

    if (method === "GET") {
      if (signed) {
        ensureCreds();
        searchParams.set("timestamp", Date.now().toString());
        searchParams.set("recvWindow", "5000");
        const qs = searchParams.toString();
        const signature = sign(qs);
        url = `${url}?${qs}&signature=${signature}`;
      } else if ([...searchParams].length) {
        const qs = searchParams.toString();
        url = `${url}?${qs}`;
      }
    } else {
      if (signed) {
        ensureCreds();
        searchParams.set("timestamp", Date.now().toString());
        searchParams.set("recvWindow", "5000");
        const qs = searchParams.toString();
        const signature = sign(qs);
        body = `${qs}&signature=${signature}`;
      } else {
        body = searchParams.toString();
      }
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    const response = await fetch(url, { method, headers, body });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `${response.status} error from Binance`);
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return {
    avgPrice(symbol) {
      return request(`/api/v3/avgPrice`, "GET", { symbol });
    },
    exchangeInfo(symbol) {
      return request(`/api/v3/exchangeInfo`, "GET", { symbol });
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
    cancelOrder(symbol, orderId) {
      return request(`/api/v3/order`, "DELETE", { symbol, orderId }, true);
    }
  };
}

export const defaultClient = createBinanceClient();

export default createBinanceClient;
