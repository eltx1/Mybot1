const STREAM_BASE = (process.env.BINANCE_STREAM_BASE || "wss://stream.binance.com:9443").replace(/\/$/, "");
const HEARTBEAT_INTERVAL = Math.max(5000, Number(process.env.MARKET_FEED_HEARTBEAT_MS || 10000));
const FEED_DISABLED = String(process.env.MARKET_FEED_DISABLED || "").toLowerCase() === "true";

const feeds = new Map();

let webSocketCtorPromise = null;

async function getWebSocketCtor() {
  if (FEED_DISABLED) return null;
  if (!webSocketCtorPromise) {
    webSocketCtorPromise = import("ws").then(mod => mod?.default || mod).catch(() => null);
  }
  return webSocketCtorPromise;
}

async function createFeed(symbol) {
  const key = symbol.toUpperCase();
  if (feeds.has(key)) return feeds.get(key);

  if (FEED_DISABLED) {
    const placeholder = { symbol: key, price: 0, lastUpdate: Date.now(), ws: null, reconnectTimer: null };
    feeds.set(key, placeholder);
    return placeholder;
  }

  const WebSocket = await getWebSocketCtor();
  if (!WebSocket) {
    const placeholder = { symbol: key, price: 0, lastUpdate: Date.now(), ws: null, reconnectTimer: null };
    feeds.set(key, placeholder);
    return placeholder;
  }

  const state = {
    symbol: key,
    price: 0,
    lastUpdate: 0,
    ws: null,
    reconnectTimer: null
  };

  const connect = () => {
    const endpoint = `${STREAM_BASE}/ws/${key.toLowerCase()}@bookTicker`;
    const ws = new WebSocket(endpoint);
    state.ws = ws;

    ws.on("message", data => {
      try {
        const payload = JSON.parse(data.toString());
        const price = Number(payload.c ?? payload.a ?? payload.b ?? payload.p ?? 0);
        if (price > 0) {
          state.price = price;
          state.lastUpdate = Date.now();
        }
      } catch {}
    });

    ws.on("close", () => scheduleReconnect());
    ws.on("error", () => {
      scheduleReconnect();
      try { ws.close(); } catch {}
    });
  };

  const scheduleReconnect = () => {
    if (state.reconnectTimer) return;
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      connect();
    }, 3000);
  };

  connect();
  feeds.set(key, state);
  return state;
}

export async function ensureTicker(symbol) {
  if (!symbol || FEED_DISABLED) return;
  const key = symbol.toUpperCase();
  if (feeds.has(key)) return;
  await createFeed(key);
}

export function getTickerPrice(symbol) {
  if (!symbol) return 0;
  if (FEED_DISABLED) return 0;
  const feed = feeds.get(symbol.toUpperCase());
  if (!feed) return 0;
  const stale = Date.now() - feed.lastUpdate;
  if (stale > HEARTBEAT_INTERVAL * 3) {
    return 0;
  }
  return Number(feed.price || 0);
}

export function shutdownTicker(symbol) {
  if (!symbol) return;
  const key = symbol.toUpperCase();
  const feed = feeds.get(key);
  if (!feed) return;
  if (FEED_DISABLED) {
    feeds.delete(key);
    return;
  }
  feeds.delete(key);
  if (feed.reconnectTimer) {
    clearTimeout(feed.reconnectTimer);
  }
  try {
    feed.ws?.close();
  } catch {}
}

export function shutdownAllTickers() {
  if (FEED_DISABLED) {
    feeds.clear();
    return;
  }
  for (const key of feeds.keys()) {
    shutdownTicker(key);
  }
}

export default { ensureTicker, getTickerPrice, shutdownTicker, shutdownAllTickers };
