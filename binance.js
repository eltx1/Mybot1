import crypto from "crypto";
import fetch from "node-fetch";
import fs from "fs";

const BASE = process.env.BINANCE_BASE || "https://api.binance.com";
let API_KEY = process.env.BINANCE_KEY;
let API_SECRET = process.env.BINANCE_SECRET;

if (!API_KEY || !API_SECRET) {
  try {
    const creds = JSON.parse(fs.readFileSync("binance-keys.json", "utf8"));
    API_KEY = creds.BINANCE_KEY;
    API_SECRET = creds.BINANCE_SECRET;
  } catch {}
}

function ensureCreds(){
  if (!API_KEY || !API_SECRET) {
    throw new Error("BINANCE_KEY and BINANCE_SECRET are required (env or binance-keys.json)");
  }
}

function sign(qs){
  ensureCreds();
  return crypto.createHmac("sha256", API_SECRET).update(qs).digest("hex");
}

async function binance(path, method="GET", params={}, signed=false){
  const urlParams = new URLSearchParams();
  for (const [k,v] of Object.entries(params)) {
    if (v !== undefined && v !== null) urlParams.append(k, String(v));
  }
  let url = `${BASE}${path}`;
  let body = undefined;
  const headers = {};
  if (API_KEY) headers["X-MBX-APIKEY"] = API_KEY;

  if (method === "GET"){
    if (signed){
      ensureCreds();
      urlParams.set("timestamp", Date.now().toString());
      urlParams.set("recvWindow", "5000");
      const sig = sign(urlParams.toString());
      url = `${url}?${urlParams.toString()}&signature=${sig}`;
    }else{
      const qs = urlParams.toString();
      if (qs.length) url = `${url}?${qs}`;
    }
  } else {
    if (signed){
      ensureCreds();
      urlParams.set("timestamp", Date.now().toString());
      urlParams.set("recvWindow", "5000");
      const sig = sign(urlParams.toString());
      body = `${urlParams.toString()}&signature=${sig}`;
    } else {
      body = urlParams.toString();
    }
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  if (!res.ok) { throw new Error(text); }
  try { return JSON.parse(text); } catch { return text; }
}

// Public
export const avgPrice = (symbol) => binance(`/api/v3/avgPrice`, "GET", { symbol });
export const exchangeInfo = (symbol) => binance(`/api/v3/exchangeInfo`, "GET", { symbol });

// Signed
export const account = () => binance(`/api/v3/account`, "GET", {}, true);
export const openOrders = (symbol) => binance(`/api/v3/openOrders`, "GET", symbol?{ symbol }:{}, true);
export const myTrades = (symbol, limit=20) => binance(`/api/v3/myTrades`, "GET", { symbol, limit }, true);

export async function placeLimit(symbol, side, qty, price, options={}){
  const { makerOnly=false, clientOrderId } = options;
  const payload = {
    symbol,
    side,
    type: makerOnly ? "LIMIT_MAKER" : "LIMIT",
    quantity: qty,
    price
  };
  if (!makerOnly) payload.timeInForce = "GTC";
  if (clientOrderId) payload.newClientOrderId = clientOrderId;
  return binance(`/api/v3/order`, "POST", payload, true);
}

export const cancelOrder = (symbol, orderId) => binance(`/api/v3/order`, "DELETE", { symbol, orderId }, true);
