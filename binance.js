import dotenv from "dotenv";
import crypto from "crypto";
import fetch from "node-fetch";

dotenv.config();

const BASE = process.env.BINANCE_BASE || "https://api.binance.com";

function apiKey() {
  return process.env.BINANCE_KEY;
}

function apiSecret() {
  return process.env.BINANCE_SECRET;
}

function ensureCreds(){
  if (!apiKey() || !apiSecret()) {
    throw new Error("BINANCE_KEY and BINANCE_SECRET env vars are required for signed requests");
  }
}

function sign(qs){
  ensureCreds();
  return crypto.createHmac("sha256", apiSecret()).update(qs).digest("hex");
}

async function binance(path, method="GET", params={}, signed=false){
  const urlParams = new URLSearchParams();
  for (const [k,v] of Object.entries(params)) {
    if (v !== undefined && v !== null) urlParams.append(k, String(v));
  }
  let url = `${BASE}${path}`;
  let body = undefined;
  const headers = {};
  const key = apiKey();
  if (key) headers["X-MBX-APIKEY"] = key;

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

export async function placeLimit(symbol, side, qty, price, makerOnly=false){
  const payload = {
    symbol,
    side,
    type: makerOnly ? "LIMIT_MAKER" : "LIMIT",
    quantity: qty,
    price
  };
  if (!makerOnly) payload.timeInForce = "GTC";
  return binance(`/api/v3/order`, "POST", payload, true);
}

export const cancelOrder = (symbol, orderId) => binance(`/api/v3/order`, "DELETE", { symbol, orderId }, true);
