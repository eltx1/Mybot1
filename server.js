// --- ESM dirname + dotenv (must be first lines) ---
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
// --- end bootstrap ---

import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import Stripe from "stripe";
import rateLimit from "express-rate-limit";
import { authenticator } from "otplib";
import {
  randomUUID,
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from "crypto";
import EngineManager from "./engine/manager.js";
import { createBinanceClient } from "./binance.js";
import { summariseCompletedTrades, calculatePerformanceMetrics } from "./lib/trades.js";
import { fetchMarketSentiment } from "./lib/market-sentiment.js";

const app = express();
app.use(express.json({
  verify: (req, res, buf) => {
    if (buf && buf.length) {
      req.rawBody = Buffer.from(buf);
    }
  }
}));

const loginLimiter = rateLimit({
  windowMs: Math.max(30000, Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 60000)),
  max: Math.max(5, Number(process.env.LOGIN_RATE_LIMIT_MAX || 10)),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "";
    return `${req.ip || "unknown"}:${email}`;
  },
  handler: (req, res) => {
    res.status(429).json({ error: "Too many login attempts. Please wait and try again." });
  }
});

const allowList = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  if (allowList.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const API_NO_CACHE_PATTERNS = [
  /^\/api\//,
  /^\/healthz$/,
  /^\/api\/health$/,
  /^\/webhooks\//
];

app.use((req, res, next) => {
  const path = typeof req.path === "string" ? req.path : req.url || "";
  if (API_NO_CACHE_PATTERNS.some(pattern => pattern.test(path))) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
  }
  next();
});

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mybot",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 10)
};

const pool = mysql.createPool(dbConfig);

const stripeClient = (() => {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY || "";
  if (!key) return null;
  try {
    return new Stripe(key, { apiVersion: "2024-06-20" });
  } catch (err) {
    console.error("Failed to initialise Stripe client", err.message);
    return null;
  }
})();

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SIGNING_SECRET || "";

const CRYPTOMUS_MERCHANT_ID = process.env.CRYPTOMUS_MERCHANT_ID || process.env.CRYPTOMUS_MERCHANT || "";
const CRYPTOMUS_PAYMENT_KEY = process.env.CRYPTOMUS_PAYMENT_KEY || process.env.CRYPTOMUS_API_KEY || "";
const CRYPTOMUS_SUCCESS_URL = process.env.CRYPTOMUS_SUCCESS_URL || "";
const CRYPTOMUS_CANCEL_URL = process.env.CRYPTOMUS_CANCEL_URL || "";

const APP_BASE_URL = process.env.APP_BASE_URL || process.env.FRONTEND_URL || process.env.PUBLIC_URL || "http://localhost:8080";

const PAYMENT_PROVIDERS = {
  stripe: Boolean(stripeClient),
  cryptomus: Boolean(CRYPTOMUS_MERCHANT_ID && CRYPTOMUS_PAYMENT_KEY)
};

const DEFAULT_SENTIMENT_LIMIT = Math.max(3, Number(process.env.MARKET_SENTIMENT_HEADLINES || 6));
const MARKET_SNAPSHOT_LIMIT = Math.max(6, Number(process.env.MARKET_SNAPSHOT_LIMIT || 12));

function getNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function roundNumber(value, decimals = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const places = Math.max(0, Number(decimals) || 0);
  return Number(num.toFixed(places));
}

function clampNumber(value, min = 0, max = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

const SUBSCRIPTION_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  FAILED: "failed"
};

const SUBSCRIPTION_PROVIDERS = {
  STRIPE: "stripe",
  CRYPTOMUS: "cryptomus"
};

const DEFAULT_PLANS = [
  {
    code: "manual-starter",
    name: "Manual Starter",
    description: "Manual automation essentials",
    manualEnabled: true,
    aiEnabled: false,
    manualLimit: 10,
    aiLimit: 0,
    durationDays: 30,
    priceUSD: 30
  },
  {
    code: "pro-ai",
    name: "AI Pro",
    description: "Full manual & AI automation",
    manualEnabled: true,
    aiEnabled: true,
    manualLimit: 50,
    aiLimit: 20,
    durationDays: 30,
    priceUSD: 50
  }
];

const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || "change-this-secret";
const CREDENTIALS_SECRET = process.env.CREDENTIALS_SECRET || JWT_SECRET;
const ENC_ALGO = "aes-256-gcm";

const DEFAULT_AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_AI_BUDGET = (() => {
  const raw = Number(process.env.DEFAULT_AI_BUDGET);
  return Number.isFinite(raw) && raw > 0 ? raw : 100;
})();

const ENGINE_INTERVAL_MS = Number(process.env.ENGINE_INTERVAL_MS || 5000);
const SNAPSHOT_CONCURRENCY = Math.max(1, Number(process.env.ENGINE_SNAPSHOT_CONCURRENCY || 4));
const LOGIN_LOCK_WINDOW_MS = Math.max(60000, Number(process.env.LOGIN_LOCK_WINDOW_MS || 15 * 60 * 1000));
const LOGIN_FAILURE_THRESHOLD = Math.max(3, Number(process.env.LOGIN_FAILURE_THRESHOLD || 5));
const MFA_TOKEN_WINDOW = Math.max(0, Number(process.env.MFA_WINDOW || 1));
const MFA_STEP_SECONDS = Math.max(15, Number(process.env.MFA_STEP || 30));
const NOTIFICATION_MAX_RETRIES = Math.max(1, Number(process.env.NOTIFICATION_MAX_RETRIES || 3));
const RULE_STATE_VERSION = 1;
const NOTIFICATION_EVENT_TYPES = {
  RULE_ISSUE: "rule_issue",
  LOGIN_FAILURE: "login_failure",
  LOGIN_SUCCESS: "login_success",
  POSITION_CLOSED: "position_closed",
  POSITION_OPENED: "position_opened"
};
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const MFA_ISSUER = process.env.MFA_ISSUER || "My1 Bot";
const credentialCache = new Map();
let engineManager;
const ADMIN_EMAILS = new Set((process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(email => email.trim().toLowerCase())
  .filter(Boolean));

authenticator.options = {
  ...authenticator.options,
  step: MFA_STEP_SECONDS,
  window: MFA_TOKEN_WINDOW
};


function encryptionKey() {
  if (!CREDENTIALS_SECRET) {
    throw new Error("CREDENTIALS_SECRET is required to store Binance credentials");
  }
  return createHash("sha256").update(String(CREDENTIALS_SECRET)).digest();
}

function encryptSecret(value) {
  if (!value) return null;
  const key = encryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ENC_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptSecret(payload) {
  if (!payload) return null;
  try {
    const key = encryptionKey();
    const buffer = Buffer.from(payload, "base64");
    const iv = buffer.subarray(0, 16);
    const tag = buffer.subarray(16, 32);
    const data = buffer.subarray(32);
    const decipher = createDecipheriv(ENC_ALGO, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("Failed to decrypt Binance credential", err.message);
    return null;
  }
}

function buildAbsoluteUrl(pathname, fallback) {
  try {
    if (!pathname) return fallback || APP_BASE_URL;
    const url = new URL(pathname, APP_BASE_URL);
    return url.toString();
  } catch {
    return fallback || APP_BASE_URL;
  }
}

function isLikelyUrl(value) {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value.trim());
    return Boolean(url.protocol && url.host);
  } catch {
    return false;
  }
}

function addDaysToDate(base, days) {
  const date = base ? new Date(base) : new Date();
  if (Number.isFinite(Number(days))) {
    date.setTime(date.getTime() + Number(days) * 86400000);
  }
  return date;
}

function safeJSONStringify(value) {
  if (value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function safeJSONParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function fetchMarketSnapshot(limit = MARKET_SNAPSHOT_LIMIT) {
  const size = Math.max(1, Math.min(50, Number(limit) || MARKET_SNAPSHOT_LIMIT));
  try {
    const response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
    if (!response.ok) {
      console.error("Failed to fetch Binance market snapshot", response.status);
      return [];
    }
    const payload = await response.json();
    if (!Array.isArray(payload)) return [];
    return payload
      .filter(item => typeof item?.symbol === "string" && item.symbol.endsWith("USDT"))
      .map(item => ({
        symbol: item.symbol,
        lastPrice: getNumber(item.lastPrice || item.last || item.price),
        priceChangePercent: getNumber(item.priceChangePercent),
        highPrice: getNumber(item.highPrice),
        lowPrice: getNumber(item.lowPrice),
        volume: getNumber(item.volume),
        quoteVolume: getNumber(item.quoteVolume)
      }))
      .filter(item => item.lastPrice > 0)
      .sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0))
      .slice(0, size);
  } catch (err) {
    console.error("Failed to fetch Binance market snapshot", err);
    return [];
  }
}

async function fetchUserTradeSummaries({ userId, symbols, limit = 200 } = {}) {
  if (!userId) {
    return { trades: [], metrics: calculatePerformanceMetrics([]), errors: ["Missing userId"], symbols: [], bySymbol: {} };
  }
  const creds = await getUserApiKeys(userId);
  if (!creds) {
    return {
      trades: [],
      metrics: calculatePerformanceMetrics([]),
      errors: ["Connect your Binance API keys first"],
      symbols: [],
      bySymbol: {},
      missingKeys: true
    };
  }

  let targetSymbols = Array.isArray(symbols) && symbols.length
    ? symbols.map(s => String(s || "").toUpperCase()).filter(Boolean)
    : null;

  if (!targetSymbols) {
    const rules = await readRules(userId);
    targetSymbols = Array.from(new Set(rules.map(r => (r.symbol || "").toUpperCase()).filter(Boolean)));
  } else {
    targetSymbols = Array.from(new Set(targetSymbols));
  }

  if (!targetSymbols.length) {
    return { trades: [], metrics: calculatePerformanceMetrics([]), errors: [], symbols: [], bySymbol: {} };
  }

  const client = createBinanceClient({ apiKey: creds.apiKey, apiSecret: creds.apiSecret });
  const trades = [];
  const errors = [];
  const bySymbol = new Map();
  const fetchLimit = Math.max(20, Math.min(1000, Number(limit) || 200));

  for (const symbol of targetSymbols) {
    try {
      const history = await client.myTrades(symbol, fetchLimit);
      const summaries = summariseCompletedTrades(Array.isArray(history) ? history : [], symbol);
      bySymbol.set(symbol, summaries);
      if (summaries.length) {
        trades.push(...summaries);
      }
    } catch (err) {
      errors.push(`${symbol}: ${err?.message || err}`);
      bySymbol.set(symbol, []);
    }
  }

  trades.sort((a, b) => Number(b?.closedAt || 0) - Number(a?.closedAt || 0));
  const metrics = calculatePerformanceMetrics(trades);
  return {
    trades,
    metrics,
    errors,
    symbols: targetSymbols,
    bySymbol: Object.fromEntries(bySymbol)
  };
}

function summarizeRulePerformance(rule, trades = []) {
  const createdAt = Number(rule.createdAt) || 0;
  const orderedTrades = [...trades].sort((a, b) => Number(b?.closedAt || 0) - Number(a?.closedAt || 0));
  const relevantTrades = orderedTrades.filter(trade => {
    if (!trade || typeof trade !== "object") return false;
    const closedAt = Number(trade.closedAt || trade.openedAt || 0);
    if (createdAt > 0 && closedAt > 0) {
      return closedAt >= createdAt;
    }
    return true;
  });
  const metrics = calculatePerformanceMetrics(relevantTrades);
  const recentTrades = relevantTrades.slice(0, 5).map(item => ({
    closedAt: item.closedAt,
    profit: roundNumber(item.profit, 6),
    profitPct: roundNumber(item.profitPct, 4),
    durationMs: getNumber(item.durationMs),
    buyPrice: roundNumber(item.buyPrice, 6),
    sellPrice: roundNumber(item.sellPrice, 6),
    quantity: roundNumber(item.quantity, 6)
  }));
  return {
    ruleId: rule.id,
    symbol: rule.symbol,
    enabled: Boolean(rule.enabled),
    createdAt,
    createdAtIso: createdAt ? new Date(createdAt).toISOString() : null,
    entryPrice: getNumber(rule.entryPrice) || null,
    exitPrice: getNumber(rule.exitPrice) || null,
    budgetUSDT: getNumber(rule.budgetUSDT),
    aiSummary: typeof rule.aiSummary === "string" ? rule.aiSummary : null,
    tradesAnalyzed: relevantTrades.length,
    metrics: {
      totalTrades: metrics.totalTrades,
      totalProfit: roundNumber(metrics.totalProfit, 6),
      averageProfitPct: roundNumber(metrics.averageProfitPct, 4),
      winRate: roundNumber(metrics.winRate, 2),
      averageHoldHours: roundNumber((metrics.averageHoldMs || 0) / 3600000, 2),
      bestTrade: metrics.bestTrade ? {
        profit: roundNumber(metrics.bestTrade.profit, 6),
        profitPct: roundNumber(metrics.bestTrade.profitPct, 4),
        closedAt: metrics.bestTrade.closedAt
      } : null,
      worstTrade: metrics.worstTrade ? {
        profit: roundNumber(metrics.worstTrade.profit, 6),
        profitPct: roundNumber(metrics.worstTrade.profitPct, 4),
        closedAt: metrics.worstTrade.closedAt
      } : null
    },
    recentTrades
  };
}

function canonicaliseCryptomusPayload(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map(canonicaliseCryptomusPayload);
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = canonicaliseCryptomusPayload(value[key]);
  }
  return sorted;
}

function cryptomusPayloadBuffer(payload, rawBody) {
  if (rawBody && rawBody.length) {
    return Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody));
  }
  if (Buffer.isBuffer(payload)) {
    return payload;
  }
  if (typeof payload === "string") {
    return Buffer.from(payload, "utf8");
  }
  if (!payload || typeof payload !== "object") {
    return Buffer.from("{}", "utf8");
  }
  try {
    const canonical = canonicaliseCryptomusPayload(payload);
    return Buffer.from(JSON.stringify(canonical));
  } catch (err) {
    console.error("Failed to serialise Cryptomus payload", err.message);
    return Buffer.from("{}", "utf8");
  }
}

function generateCryptomusSignature(payload, rawBody) {
  const buffer = cryptomusPayloadBuffer(payload, rawBody);
  const base64 = buffer.toString("base64");
  return createHash("md5").update(base64 + String(CRYPTOMUS_PAYMENT_KEY || "")).digest("hex");
}

function verifyCryptomusSignature(payload, signature, rawBody) {
  if (!signature) return false;
  const expected = generateCryptomusSignature(payload, rawBody);
  return typeof signature === "string" && signature.toLowerCase() === expected.toLowerCase();
}

function extractCryptomusResult(payload) {
  if (!payload || typeof payload !== "object") return {};
  const candidates = [payload.result, payload.data];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      return candidate;
    }
  }
  return payload;
}

function createSubscriptionReference(userId, planId, provider) {
  const base = randomUUID().replace(/-/g, "").slice(0, 12);
  const prefix = String(provider || "checkout").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "checkout";
  const reference = `${prefix}_${userId}_${planId}_${base}`;
  return reference.slice(0, 120);
}

function mapPlanRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || "",
    manualEnabled: row.manual_enabled === 1 || row.manual_enabled === true,
    aiEnabled: row.ai_enabled === 1 || row.ai_enabled === true,
    manualLimit: Number(row.manual_limit) || 0,
    aiLimit: Number(row.ai_limit) || 0,
    durationDays: Number(row.duration_days) || 0,
    priceUSD: row.price_usd !== null && row.price_usd !== undefined ? Number(row.price_usd) : 0,
    isActive: row.is_active === 1 || row.is_active === true
  };
}

async function seedDefaultPlans(conn) {
  for (const plan of DEFAULT_PLANS) {
    const [rows] = await conn.query("SELECT id FROM plans WHERE code = ? LIMIT 1", [plan.code]);
    if (rows.length) continue;
    await conn.query(
      `INSERT INTO plans (code, name, description, manual_enabled, ai_enabled, manual_limit, ai_limit, duration_days, price_usd, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        plan.code,
        plan.name,
        plan.description,
        plan.manualEnabled ? 1 : 0,
        plan.aiEnabled ? 1 : 0,
        Number(plan.manualLimit) || 0,
        Number(plan.aiLimit) || 0,
        Number(plan.durationDays) || 0,
        Number(plan.priceUSD) || 0
      ]
    );
  }
}

async function listActivePlans() {
  const [rows] = await pool.query(
    `SELECT id, code, name, description, manual_enabled, ai_enabled, manual_limit, ai_limit, duration_days, price_usd, is_active
     FROM plans WHERE is_active = 1 ORDER BY price_usd ASC, id ASC`
  );
  return rows.map(mapPlanRow);
}

async function listAllPlans() {
  const [rows] = await pool.query(
    `SELECT id, code, name, description, manual_enabled, ai_enabled, manual_limit, ai_limit, duration_days, price_usd, is_active
     FROM plans ORDER BY price_usd ASC, id ASC`
  );
  return rows.map(mapPlanRow);
}

function normalizePlanPayload(payload = {}) {
  const code = typeof payload.code === "string" ? payload.code.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const manualEnabled = payload.manualEnabled !== false;
  const aiEnabled = payload.aiEnabled === true || payload.aiEnabled === 1;
  const manualLimit = Number(payload.manualLimit);
  const aiLimit = Number(payload.aiLimit);
  const durationDays = Number(payload.durationDays);
  const priceUSD = Number(payload.priceUSD);
  const isActive = payload.isActive !== false;

  return {
    code,
    name,
    description,
    manualEnabled,
    aiEnabled,
    manualLimit: Number.isFinite(manualLimit) ? manualLimit : 0,
    aiLimit: Number.isFinite(aiLimit) ? aiLimit : 0,
    durationDays: Number.isFinite(durationDays) ? Math.max(1, durationDays) : 30,
    priceUSD: Number.isFinite(priceUSD) ? Math.max(0, priceUSD) : 0,
    isActive: Boolean(isActive)
  };
}

async function createPlan(payload) {
  const plan = normalizePlanPayload(payload);
  if (!plan.code || !plan.name) {
    throw new Error("Plan code and name are required");
  }
  const [result] = await pool.query(
    `INSERT INTO plans (code, name, description, manual_enabled, ai_enabled, manual_limit, ai_limit, duration_days, price_usd, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      plan.code,
      plan.name,
      plan.description,
      plan.manualEnabled ? 1 : 0,
      plan.aiEnabled ? 1 : 0,
      plan.manualLimit,
      plan.aiLimit,
      plan.durationDays,
      plan.priceUSD,
      plan.isActive ? 1 : 0
    ]
  );
  return getPlanById(result.insertId);
}

async function updatePlan(planId, payload) {
  const existing = await getPlanById(planId);
  if (!existing) {
    throw new Error("Plan not found");
  }
  const plan = normalizePlanPayload({ ...existing, ...payload });
  await pool.query(
    `UPDATE plans SET code = ?, name = ?, description = ?, manual_enabled = ?, ai_enabled = ?, manual_limit = ?, ai_limit = ?, duration_days = ?, price_usd = ?, is_active = ?
     WHERE id = ? LIMIT 1`,
    [
      plan.code,
      plan.name,
      plan.description,
      plan.manualEnabled ? 1 : 0,
      plan.aiEnabled ? 1 : 0,
      plan.manualLimit,
      plan.aiLimit,
      plan.durationDays,
      plan.priceUSD,
      plan.isActive ? 1 : 0,
      planId
    ]
  );
  return getPlanById(planId);
}

async function getPlanById(planId) {
  if (!planId) return null;
  const [rows] = await pool.query(
    `SELECT id, code, name, description, manual_enabled, ai_enabled, manual_limit, ai_limit, duration_days, price_usd, is_active
     FROM plans WHERE id = ? LIMIT 1`,
    [planId]
  );
  if (!rows.length) return null;
  return mapPlanRow(rows[0]);
}

async function getPlanByCode(code) {
  if (!code) return null;
  const [rows] = await pool.query(
    `SELECT id, code, name, description, manual_enabled, ai_enabled, manual_limit, ai_limit, duration_days, price_usd, is_active
     FROM plans WHERE code = ? LIMIT 1`,
    [code]
  );
  if (!rows.length) return null;
  return mapPlanRow(rows[0]);
}

async function initDb() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(191) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_api_keys (
        user_id INT PRIMARY KEY,
        api_key VARCHAR(512) NOT NULL,
        api_secret VARCHAR(512) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_keys FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS rules (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(16) NOT NULL,
        symbol VARCHAR(32) NOT NULL,
        dip_pct DECIMAL(18,8) DEFAULT NULL,
        tp_pct DECIMAL(18,8) DEFAULT NULL,
        stop_loss_pct DECIMAL(18,8) DEFAULT NULL,
        trailing_stop_pct DECIMAL(18,8) DEFAULT NULL,
        take_profit_steps LONGTEXT DEFAULT NULL,
        entry_price DECIMAL(18,8) DEFAULT NULL,
        exit_price DECIMAL(18,8) DEFAULT NULL,
        budget_usdt DECIMAL(18,8) NOT NULL DEFAULT 0,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        ai_summary TEXT,
        ai_model VARCHAR(100),
        created_at BIGINT NOT NULL,
        INDEX idx_rules_user (user_id),
        CONSTRAINT fk_rules_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS rule_state (
        rule_id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        state_json LONGTEXT,
        updated_at BIGINT NOT NULL,
        CONSTRAINT fk_rule_state_rule FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE,
        INDEX idx_rule_state_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        email VARCHAR(191) DEFAULT NULL,
        ip_address VARCHAR(64) DEFAULT NULL,
        user_agent VARCHAR(255) DEFAULT NULL,
        success TINYINT(1) NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        INDEX idx_login_attempts_email (email),
        INDEX idx_login_attempts_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_security_settings (
        user_id INT PRIMARY KEY,
        mfa_secret VARCHAR(255) DEFAULT NULL,
        mfa_enabled TINYINT(1) NOT NULL DEFAULT 0,
        alert_email VARCHAR(191) DEFAULT NULL,
        alert_webhook_url VARCHAR(255) DEFAULT NULL,
        alert_telegram_chat VARCHAR(64) DEFAULT NULL,
        preferences_json LONGTEXT DEFAULT NULL,
        updated_at BIGINT NOT NULL,
        CONSTRAINT fk_security_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notification_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        channel VARCHAR(32) NOT NULL,
        target VARCHAR(255) NOT NULL,
        payload LONGTEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        last_error TEXT DEFAULT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_notification_status (status),
        INDEX idx_notification_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS rule_errors (
        rule_id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        code VARCHAR(64) DEFAULT NULL,
        message TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        CONSTRAINT fk_rule_errors_rule FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE,
        INDEX idx_rule_errors_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ai_rule_feedback (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        model VARCHAR(100) DEFAULT NULL,
        prompt LONGTEXT DEFAULT NULL,
        response_json LONGTEXT DEFAULT NULL,
        metrics_json LONGTEXT DEFAULT NULL,
        sentiment_json LONGTEXT DEFAULT NULL,
        created_at BIGINT NOT NULL,
        CONSTRAINT fk_ai_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_ai_feedback_user (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        manual_enabled TINYINT(1) NOT NULL DEFAULT 0,
        ai_enabled TINYINT(1) NOT NULL DEFAULT 0,
        manual_limit INT NOT NULL DEFAULT 0,
        ai_limit INT NOT NULL DEFAULT 0,
        duration_days INT NOT NULL DEFAULT 30,
        price_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id INT NOT NULL,
        provider VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL,
        reference VARCHAR(128) NOT NULL,
        provider_session_id VARCHAR(191) DEFAULT NULL,
        provider_invoice_id VARCHAR(191) DEFAULT NULL,
        amount_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(16) NOT NULL DEFAULT 'USD',
        started_at DATETIME DEFAULT NULL,
        expires_at DATETIME DEFAULT NULL,
        metadata TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
        UNIQUE KEY uniq_reference (reference),
        INDEX idx_user_status (user_id, status),
        INDEX idx_provider (provider, provider_session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await seedDefaultPlans(conn);
  } finally {
    conn.release();
  }
}

async function findUserByEmail(email) {
  if (!email) return null;
  const [rows] = await pool.query("SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1", [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  if (!id) return null;
  const [rows] = await pool.query("SELECT id, name, email FROM users WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function hasApiKeys(userId) {
  const [rows] = await pool.query("SELECT 1 FROM user_api_keys WHERE user_id = ? LIMIT 1", [userId]);
  return rows.length > 0;
}

async function getUserApiKeys(userId) {
  const [rows] = await pool.query("SELECT api_key, api_secret FROM user_api_keys WHERE user_id = ? LIMIT 1", [userId]);
  if (!rows.length) return null;
  const apiKey = decryptSecret(rows[0].api_key);
  const apiSecret = decryptSecret(rows[0].api_secret);
  if (!apiKey || !apiSecret) return null;
  return { apiKey, apiSecret };
}

async function upsertUserApiKeys(userId, apiKey, apiSecret) {
  const encKey = encryptSecret(apiKey);
  const encSecret = encryptSecret(apiSecret);
  await pool.query(
    `INSERT INTO user_api_keys (user_id, api_key, api_secret)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE api_key = VALUES(api_key), api_secret = VALUES(api_secret)`,
    [userId, encKey, encSecret]
  );
}

async function deleteUserApiKeys(userId) {
  await pool.query("DELETE FROM user_api_keys WHERE user_id = ?", [userId]);
}

function mapAiFeedbackRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    model: row.model || null,
    createdAt: Number(row.created_at) || Date.now(),
    feedback: safeJSONParse(row.response_json) || null,
    metrics: safeJSONParse(row.metrics_json) || null,
    sentiment: safeJSONParse(row.sentiment_json) || null
  };
}

async function recordAiFeedback({ userId, model, prompt, response, metrics, sentiment }) {
  if (!userId) throw new Error("userId is required");
  const createdAt = Date.now();
  const payload = [
    userId,
    model || null,
    safeJSONStringify(prompt) || null,
    safeJSONStringify(response) || null,
    safeJSONStringify(metrics) || null,
    safeJSONStringify(sentiment) || null,
    createdAt
  ];
  const [result] = await pool.query(
    `INSERT INTO ai_rule_feedback (user_id, model, prompt, response_json, metrics_json, sentiment_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    payload
  );
  const id = Number(result?.insertId) || null;
  return mapAiFeedbackRow({
    id,
    user_id: userId,
    model: model || null,
    response_json: safeJSONStringify(response),
    metrics_json: safeJSONStringify(metrics),
    sentiment_json: safeJSONStringify(sentiment),
    created_at: createdAt
  });
}

async function listAiFeedback(userId, options = {}) {
  if (!userId) return [];
  const limit = Math.max(1, Math.min(20, Number(options.limit) || 5));
  const [rows] = await pool.query(
    `SELECT id, user_id, model, response_json, metrics_json, sentiment_json, created_at
     FROM ai_rule_feedback
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows.map(mapAiFeedbackRow);
}

async function getSecuritySettings(userId, options = {}) {
  if (!userId) return null;
  const [rows] = await pool.query(
    `SELECT user_id, mfa_secret, mfa_enabled, alert_email, alert_webhook_url, alert_telegram_chat, preferences_json
     FROM user_security_settings WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) {
    return {
      userId,
      mfaEnabled: false,
      alertEmail: null,
      alertWebhookUrl: null,
      alertTelegramChat: null,
      preferences: {},
      ...(options.includeSecret ? { mfaSecret: null } : {})
    };
  }
  const row = rows[0];
  const preferences = safeJSONParse(row.preferences_json) || {};
  const payload = {
    userId,
    mfaEnabled: row.mfa_enabled === 1 || row.mfa_enabled === true,
    alertEmail: row.alert_email || null,
    alertWebhookUrl: row.alert_webhook_url || null,
    alertTelegramChat: row.alert_telegram_chat || null,
    preferences
  };
  if (options.includeSecret) {
    payload.mfaSecret = row.mfa_secret ? decryptSecret(row.mfa_secret) : null;
  }
  return payload;
}

async function upsertSecuritySettings(userId, updates = {}) {
  if (!userId) return await getSecuritySettings(userId);
  const existing = await getSecuritySettings(userId, { includeSecret: true }) || {};
  const changes = {};
  if (updates.mfaSecret !== undefined) {
    changes.mfa_secret = updates.mfaSecret ? encryptSecret(updates.mfaSecret) : null;
  }
  if (updates.mfaEnabled !== undefined) {
    changes.mfa_enabled = updates.mfaEnabled ? 1 : 0;
  }
  if (updates.alertEmail !== undefined) {
    changes.alert_email = updates.alertEmail ? String(updates.alertEmail).trim() : null;
  }
  if (updates.alertWebhookUrl !== undefined) {
    const trimmed = updates.alertWebhookUrl ? String(updates.alertWebhookUrl).trim() : "";
    changes.alert_webhook_url = trimmed || null;
  }
  if (updates.alertTelegramChat !== undefined) {
    const trimmed = updates.alertTelegramChat ? String(updates.alertTelegramChat).trim() : "";
    changes.alert_telegram_chat = trimmed || null;
  }
  if (updates.preferences !== undefined) {
    changes.preferences_json = safeJSONStringify(updates.preferences) || null;
  }

  const now = Date.now();
  const hasExisting = existing && (existing.mfaEnabled !== undefined || existing.alertEmail !== undefined || existing.alertWebhookUrl !== undefined || existing.alertTelegramChat !== undefined || existing.preferences !== undefined || existing.mfaSecret !== undefined);
  if (hasExisting) {
    if (Object.keys(changes).length) {
      const assignments = Object.keys(changes).map(column => `${column} = ?`).join(", ");
      const values = [...Object.values(changes), now, userId];
      await pool.query(`UPDATE user_security_settings SET ${assignments}${assignments ? ", " : ""}updated_at = ? WHERE user_id = ?`, values);
    } else {
      await pool.query(`UPDATE user_security_settings SET updated_at = ? WHERE user_id = ?`, [now, userId]);
    }
  } else {
    await pool.query(
      `INSERT INTO user_security_settings (user_id, mfa_secret, mfa_enabled, alert_email, alert_webhook_url, alert_telegram_chat, preferences_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        changes.mfa_secret !== undefined ? changes.mfa_secret : null,
        changes.mfa_enabled !== undefined ? changes.mfa_enabled : 0,
        changes.alert_email !== undefined ? changes.alert_email : null,
        changes.alert_webhook_url !== undefined ? changes.alert_webhook_url : null,
        changes.alert_telegram_chat !== undefined ? changes.alert_telegram_chat : null,
        changes.preferences_json !== undefined ? changes.preferences_json : null,
        now
      ]
    );
  }
  return getSecuritySettings(userId, { includeSecret: true });
}

async function recordLoginAttempt({ userId = null, email = null, ip = null, userAgent = null, success = false }) {
  const cleanIp = ip ? String(ip).slice(0, 60) : null;
  const agent = userAgent ? String(userAgent).slice(0, 250) : null;
  await pool.query(
    `INSERT INTO login_attempts (user_id, email, ip_address, user_agent, success, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId || null, email || null, cleanIp, agent, success ? 1 : 0, Date.now()]
  );
}

async function countRecentFailedAttempts({ userId = null, email = null, ip = null, windowMs = LOGIN_LOCK_WINDOW_MS }) {
  const since = Date.now() - Math.max(60000, Number(windowMs) || LOGIN_LOCK_WINDOW_MS);
  const conditions = ["success = 0", "created_at >= ?"];
  const params = [since];
  if (userId) {
    conditions.push("user_id = ?");
    params.push(userId);
  } else if (email) {
    conditions.push("email = ?");
    params.push(email);
  }
  if (ip) {
    conditions.push("ip_address = ?");
    params.push(String(ip).slice(0, 60));
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(`SELECT COUNT(*) AS attempts FROM login_attempts ${where}`, params);
  return Number(rows[0]?.attempts || 0);
}

async function shouldLockLogin({ userId = null, email = null, ip = null }) {
  const attempts = await countRecentFailedAttempts({ userId, email, ip });
  return attempts >= LOGIN_FAILURE_THRESHOLD;
}

async function getRuleState(userId, ruleId) {
  if (!userId || !ruleId) return null;
  const [rows] = await pool.query(
    `SELECT state_json FROM rule_state WHERE user_id = ? AND rule_id = ? LIMIT 1`,
    [userId, ruleId]
  );
  if (!rows.length) return null;
  const parsed = safeJSONParse(rows[0].state_json);
  return parsed && typeof parsed === "object" ? parsed : null;
}

async function saveRuleState(userId, ruleId, state) {
  if (!userId || !ruleId) return;
  if (!state) {
    await pool.query(`DELETE FROM rule_state WHERE user_id = ? AND rule_id = ?`, [userId, ruleId]);
    return;
  }
  const payload = safeJSONStringify(state) || "{}";
  await pool.query(
    `INSERT INTO rule_state (rule_id, user_id, state_json, updated_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = VALUES(updated_at)` ,
    [ruleId, userId, payload, Date.now()]
  );
}

async function enqueueNotificationEvent({ userId, channel, target, payload }) {
  if (!userId || !channel || !target) return null;
  const jsonPayload = safeJSONStringify(payload) || "{}";
  const now = Date.now();
  const [result] = await pool.query(
    `INSERT INTO notification_events (user_id, channel, target, payload, status, attempts, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
    [userId, channel, target, jsonPayload, now, now]
  );
  return { id: result.insertId, userId, channel, target, payload, attempts: 0, status: "pending" };
}

async function deliverNotificationEvent(event) {
  if (!event) return;
  const payload = {
    timestamp: Date.now(),
    eventType: event.payload?.eventType,
    data: event.payload?.data
  };
  try {
    if (event.channel === "webhook") {
      const response = await fetch(event.target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
      }
    } else if (event.channel === "email") {
      console.log(`[ALERT][EMAIL] ${event.target}:`, payload);
    } else if (event.channel === "telegram") {
      if (TELEGRAM_BOT_TOKEN) {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const body = new URLSearchParams({
          chat_id: event.target,
          text: `[${payload.eventType}] ${payload.data?.message || payload.data?.ruleId || ''}`
        });
        const response = await fetch(url, { method: "POST", body });
        if (!response.ok) {
          throw new Error(`Telegram responded with status ${response.status}`);
        }
      } else {
        console.log(`[ALERT][TELEGRAM:${event.target}]`, payload);
      }
    } else {
      console.log(`[ALERT][${event.channel}] ${event.target}:`, payload);
    }
    await pool.query(
      `UPDATE notification_events
       SET status = 'delivered', attempts = attempts + 1, last_error = NULL, updated_at = ?
       WHERE id = ?`,
      [Date.now(), event.id]
    );
  } catch (err) {
    await pool.query(
      `UPDATE notification_events
       SET status = 'failed', attempts = attempts + 1, last_error = ?, updated_at = ?
       WHERE id = ?`,
      [err?.message || String(err), Date.now(), event.id]
    );
    throw err;
  }
}

async function triggerNotifications(userId, eventType, data = {}) {
  if (!userId || !eventType) return;
  const settings = await getSecuritySettings(userId, { includeSecret: false });
  if (!settings) return;
  const channels = [];
  if (settings.alertWebhookUrl) {
    channels.push({ channel: "webhook", target: settings.alertWebhookUrl });
  }
  if (settings.alertEmail) {
    channels.push({ channel: "email", target: settings.alertEmail });
  }
  if (settings.alertTelegramChat) {
    channels.push({ channel: "telegram", target: settings.alertTelegramChat });
  }
  if (!channels.length) return;
  const payload = { eventType, data };
  for (const channel of channels) {
    try {
      const event = await enqueueNotificationEvent({ userId, channel: channel.channel, target: channel.target, payload });
      if (event) {
        await deliverNotificationEvent({ ...event, payload });
      }
    } catch (err) {
      console.error(`[NOTIFY] ${eventType} via ${channel.channel} failed`, err?.message || err);
    }
  }
}

function mapSubscriptionRow(row) {
  const plan = mapPlanRow({
    id: row.plan_id_internal !== undefined ? row.plan_id_internal : row.plan_id,
    code: row.plan_code ?? row.code,
    name: row.plan_name ?? row.name,
    description: row.plan_description ?? row.description,
    manual_enabled: row.plan_manual_enabled ?? row.manual_enabled ?? 0,
    ai_enabled: row.plan_ai_enabled ?? row.ai_enabled ?? 0,
    manual_limit: row.plan_manual_limit ?? row.manual_limit ?? 0,
    ai_limit: row.plan_ai_limit ?? row.ai_limit ?? 0,
    duration_days: row.plan_duration_days ?? row.duration_days ?? 0,
    price_usd: row.plan_price_usd ?? row.price_usd ?? 0,
    is_active: row.plan_is_active ?? row.is_active ?? 1
  });
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    provider: row.provider,
    status: row.status,
    reference: row.reference,
    providerSessionId: row.provider_session_id || null,
    providerInvoiceId: row.provider_invoice_id || null,
    amountUSD: row.amount_usd !== null && row.amount_usd !== undefined ? Number(row.amount_usd) : 0,
    currency: row.currency || "USD",
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    metadata: safeJSONParse(row.metadata),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    plan
  };
}

function computeRemainingDays(expiresAt) {
  if (!expiresAt) return null;
  const expiresTs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresTs)) return null;
  const diff = expiresTs - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

async function expireStaleSubscriptions(userId) {
  if (!userId) return;
  await pool.query(
    `UPDATE user_subscriptions
     SET status = ?
     WHERE user_id = ? AND status = ? AND expires_at IS NOT NULL AND expires_at <= NOW()`
    ,
    [SUBSCRIPTION_STATUS.EXPIRED, userId, SUBSCRIPTION_STATUS.ACTIVE]
  );
}

async function findSubscriptionByReference(reference) {
  if (!reference) return null;
  const [rows] = await pool.query(
    `SELECT s.*, p.id AS plan_id_internal, p.code AS plan_code, p.name AS plan_name, p.description AS plan_description,
            p.manual_enabled AS plan_manual_enabled, p.ai_enabled AS plan_ai_enabled,
            p.manual_limit AS plan_manual_limit, p.ai_limit AS plan_ai_limit,
            p.duration_days AS plan_duration_days, p.price_usd AS plan_price_usd,
            p.is_active AS plan_is_active
     FROM user_subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.reference = ?
     LIMIT 1`,
    [reference]
  );
  if (!rows.length) return null;
  return mapSubscriptionRow(rows[0]);
}

async function findSubscriptionByProviderSession(provider, sessionId) {
  if (!provider || !sessionId) return null;
  const [rows] = await pool.query(
    `SELECT s.*, p.id AS plan_id_internal, p.code AS plan_code, p.name AS plan_name, p.description AS plan_description,
            p.manual_enabled AS plan_manual_enabled, p.ai_enabled AS plan_ai_enabled,
            p.manual_limit AS plan_manual_limit, p.ai_limit AS plan_ai_limit,
            p.duration_days AS plan_duration_days, p.price_usd AS plan_price_usd,
            p.is_active AS plan_is_active
     FROM user_subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.provider = ? AND s.provider_session_id = ?
     LIMIT 1`,
    [provider, sessionId]
  );
  if (!rows.length) return null;
  return mapSubscriptionRow(rows[0]);
}

async function findLatestSubscription(userId) {
  if (!userId) return null;
  const [rows] = await pool.query(
    `SELECT s.*, p.id AS plan_id_internal, p.code AS plan_code, p.name AS plan_name, p.description AS plan_description,
            p.manual_enabled AS plan_manual_enabled, p.ai_enabled AS plan_ai_enabled,
            p.manual_limit AS plan_manual_limit, p.ai_limit AS plan_ai_limit,
            p.duration_days AS plan_duration_days, p.price_usd AS plan_price_usd,
            p.is_active AS plan_is_active
     FROM user_subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = ?
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [userId]
  );
  if (!rows.length) return null;
  return mapSubscriptionRow(rows[0]);
}

async function listRecentSubscriptions(userId, limit = 8) {
  if (!userId) return [];
  const size = Math.max(1, Math.min(Number(limit) || 8, 20));
  const [rows] = await pool.query(
    `SELECT s.*, p.id AS plan_id_internal, p.code AS plan_code, p.name AS plan_name, p.description AS plan_description,
            p.manual_enabled AS plan_manual_enabled, p.ai_enabled AS plan_ai_enabled,
            p.manual_limit AS plan_manual_limit, p.ai_limit AS plan_ai_limit,
            p.duration_days AS plan_duration_days, p.price_usd AS plan_price_usd,
            p.is_active AS plan_is_active
     FROM user_subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = ?
     ORDER BY s.created_at DESC
     LIMIT ?`,
    [userId, size]
  );
  return rows.map(mapSubscriptionRow);
}

async function listSubscriptions(options = {}) {
  const size = Math.max(1, Math.min(Number(options.limit) || 50, 200));
  const filters = [];
  const values = [];
  if (options.status) {
    filters.push("s.status = ?");
    values.push(options.status);
  }
  if (options.userId) {
    filters.push("s.user_id = ?");
    values.push(options.userId);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT s.*, p.id AS plan_id_internal, p.code AS plan_code, p.name AS plan_name, p.description AS plan_description,
            p.manual_enabled AS plan_manual_enabled, p.ai_enabled AS plan_ai_enabled,
            p.manual_limit AS plan_manual_limit, p.ai_limit AS plan_ai_limit,
            p.duration_days AS plan_duration_days, p.price_usd AS plan_price_usd,
            p.is_active AS plan_is_active
     FROM user_subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     ${where}
     ORDER BY s.created_at DESC
     LIMIT ?`,
    [...values, size]
  );
  return rows.map(mapSubscriptionRow);
}

async function getActiveSubscription(userId) {
  if (!userId) return null;
  await expireStaleSubscriptions(userId);
  const [rows] = await pool.query(
    `SELECT s.*, p.id AS plan_id_internal, p.code AS plan_code, p.name AS plan_name, p.description AS plan_description,
            p.manual_enabled AS plan_manual_enabled, p.ai_enabled AS plan_ai_enabled,
            p.manual_limit AS plan_manual_limit, p.ai_limit AS plan_ai_limit,
            p.duration_days AS plan_duration_days, p.price_usd AS plan_price_usd,
            p.is_active AS plan_is_active
     FROM user_subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = ? AND s.status = ?
     ORDER BY s.expires_at DESC, s.id DESC
     LIMIT 1`,
    [userId, SUBSCRIPTION_STATUS.ACTIVE]
  );
  if (!rows.length) return null;
  return mapSubscriptionRow(rows[0]);
}

async function getPendingSubscription(userId) {
  if (!userId) return null;
  const [rows] = await pool.query(
    `SELECT s.*, p.id AS plan_id_internal, p.code AS plan_code, p.name AS plan_name, p.description AS plan_description,
            p.manual_enabled AS plan_manual_enabled, p.ai_enabled AS plan_ai_enabled,
            p.manual_limit AS plan_manual_limit, p.ai_limit AS plan_ai_limit,
            p.duration_days AS plan_duration_days, p.price_usd AS plan_price_usd,
            p.is_active AS plan_is_active
     FROM user_subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = ? AND s.status = ?
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [userId, SUBSCRIPTION_STATUS.PENDING]
  );
  if (!rows.length) return null;
  return mapSubscriptionRow(rows[0]);
}

async function getSubscriptionSnapshot(userId, options = {}) {
  if (!userId) return { active: null, pending: null, history: [] };
  const includeHistory = options.includeHistory === true;
  await expireStaleSubscriptions(userId);
  const tasks = [
    getActiveSubscription(userId),
    getPendingSubscription(userId)
  ];
  if (includeHistory) {
    tasks.push(listRecentSubscriptions(userId, 6));
  } else {
    tasks.push(Promise.resolve([]));
  }
  const [active, pending, history] = await Promise.all(tasks);
  return { active, pending, history };
}

async function getSubscriptionEntitlements(userId, options = {}) {
  const includeHistory = options.includeHistory === true;
  const snapshot = await getSubscriptionSnapshot(userId, { includeHistory });
  const active = snapshot.active;
  if (!active) {
    return {
      status: SUBSCRIPTION_STATUS.EXPIRED,
      manualEnabled: false,
      aiEnabled: false,
      manualLimit: 0,
      aiLimit: 0,
      plan: null,
      startedAt: null,
      expiresAt: null,
      remainingDays: null,
      provider: null,
      history: includeHistory ? snapshot.history : [],
      pending: snapshot.pending
    };
  }
  return {
    status: active.status,
    manualEnabled: Boolean(active.plan.manualEnabled),
    aiEnabled: Boolean(active.plan.aiEnabled),
    manualLimit: Number(active.plan.manualLimit) || 0,
    aiLimit: Number(active.plan.aiLimit) || 0,
    plan: {
      id: active.plan.id,
      code: active.plan.code,
      name: active.plan.name,
      description: active.plan.description,
      priceUSD: active.plan.priceUSD,
      durationDays: active.plan.durationDays
    },
    startedAt: active.startedAt,
    expiresAt: active.expiresAt,
    remainingDays: computeRemainingDays(active.expiresAt),
    provider: active.provider,
    history: includeHistory ? snapshot.history : [],
    pending: snapshot.pending
  };
}

async function createPendingSubscription({
  userId,
  planId,
  provider,
  reference,
  amountUSD,
  currency = "USD",
  metadata,
  providerSessionId,
  providerInvoiceId
}) {
  if (!userId || !planId || !provider || !reference) return null;
  const payload = [
    userId,
    planId,
    provider,
    SUBSCRIPTION_STATUS.PENDING,
    reference,
    providerSessionId || null,
    providerInvoiceId || null,
    Number(amountUSD) || 0,
    currency || "USD",
    safeJSONStringify(metadata)
  ];
  await pool.query(
    `INSERT INTO user_subscriptions (user_id, plan_id, provider, status, reference, provider_session_id, provider_invoice_id, amount_usd, currency, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       plan_id = VALUES(plan_id),
       provider = VALUES(provider),
       status = VALUES(status),
       provider_session_id = VALUES(provider_session_id),
       provider_invoice_id = VALUES(provider_invoice_id),
       amount_usd = VALUES(amount_usd),
       currency = VALUES(currency),
       metadata = VALUES(metadata)`,
    payload
  );
  return findSubscriptionByReference(reference);
}

async function markSubscriptionStatus(reference, status, updates = {}) {
  if (!reference || !status) return null;
  const sets = ["status = ?"];
  const values = [status];
  if (Object.prototype.hasOwnProperty.call(updates, "providerInvoiceId")) {
    sets.push("provider_invoice_id = ?");
    values.push(updates.providerInvoiceId || null);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "providerSessionId")) {
    sets.push("provider_session_id = ?");
    values.push(updates.providerSessionId || null);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "amountUSD")) {
    sets.push("amount_usd = ?");
    values.push(Number(updates.amountUSD) || 0);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "currency")) {
    sets.push("currency = ?");
    values.push(updates.currency || "USD");
  }
  if (Object.prototype.hasOwnProperty.call(updates, "startedAt")) {
    sets.push("started_at = ?");
    values.push(updates.startedAt ? new Date(updates.startedAt) : null);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "expiresAt")) {
    sets.push("expires_at = ?");
    values.push(updates.expiresAt ? new Date(updates.expiresAt) : null);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "metadata")) {
    sets.push("metadata = ?");
    values.push(safeJSONStringify(updates.metadata));
  }
  sets.push("updated_at = CURRENT_TIMESTAMP");
  values.push(reference);
  await pool.query(
    `UPDATE user_subscriptions SET ${sets.join(", ")} WHERE reference = ? LIMIT 1`,
    values
  );
  return findSubscriptionByReference(reference);
}

async function activateSubscription(reference, overrides = {}) {
  if (!reference) return null;
  const current = await findSubscriptionByReference(reference);
  if (!current) return null;
  const plan = current.plan || (await getPlanById(current.planId));
  if (!plan) {
    await markSubscriptionStatus(reference, SUBSCRIPTION_STATUS.FAILED, overrides);
    return null;
  }
  const start = overrides.startedAt ? new Date(overrides.startedAt) : new Date();
  const expires = overrides.expiresAt ? new Date(overrides.expiresAt) : addDaysToDate(start, plan.durationDays || 0);
  const amountUSD = Object.prototype.hasOwnProperty.call(overrides, "amountUSD")
    ? Number(overrides.amountUSD) || 0
    : (current.amountUSD || Number(plan.priceUSD) || 0);
  const currency = overrides.currency || current.currency || "USD";
  const metadata = Object.prototype.hasOwnProperty.call(overrides, "metadata") ? overrides.metadata : current.metadata;

  await pool.query(
    `UPDATE user_subscriptions
     SET status = ?, provider_invoice_id = COALESCE(?, provider_invoice_id),
         started_at = ?, expires_at = ?, amount_usd = ?, currency = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? LIMIT 1`,
    [
      SUBSCRIPTION_STATUS.ACTIVE,
      overrides.providerInvoiceId || current.providerInvoiceId || null,
      start,
      expires,
      amountUSD,
      currency,
      safeJSONStringify(metadata),
      current.id
    ]
  );

  await pool.query(
    `UPDATE user_subscriptions
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND status = ? AND id <> ?`,
    [SUBSCRIPTION_STATUS.EXPIRED, current.userId, SUBSCRIPTION_STATUS.ACTIVE, current.id]
  );

  return findSubscriptionByReference(reference);
}

function normalizeTakeProfitSteps(input, fallbackPct) {
  const steps = [];
  const source = Array.isArray(input) ? input : [];
  for (const raw of source) {
    if (!raw || typeof raw !== "object") continue;
    const profit = Number(raw.profitPct ?? raw.tpPct ?? raw.targetPct ?? raw.percent ?? raw.pct);
    const portion = Number(raw.portionPct ?? raw.sizePct ?? raw.quantityPct ?? raw.weightPct ?? raw.weight ?? raw.percentOfPosition ?? raw.quantityPercent);
    if (!(profit > 0)) continue;
    const weight = Number.isFinite(portion) && portion > 0 ? portion : 0;
    steps.push({ profitPct: profit, portionPct: weight });
  }
  if (!steps.length && fallbackPct > 0) {
    steps.push({ profitPct: fallbackPct, portionPct: 100 });
  }
  steps.sort((a, b) => a.profitPct - b.profitPct);
  const totalWeight = steps.reduce((sum, step) => sum + (Number(step.portionPct) || 0), 0);
  if (totalWeight > 100.0001) {
    const scale = 100 / totalWeight;
    for (const step of steps) {
      step.portionPct = Number((step.portionPct * scale).toFixed(4));
    }
  }
  return steps;
}

function normalizeRules(input) {
  const normalized = [];
  let mutated = false;
  for (const item of Array.isArray(input) ? input : []) {
    if (!item || typeof item !== "object") {
      mutated = true;
      continue;
    }
    const rule = { ...item };
    if (!rule.id) {
      rule.id = randomUUID();
      mutated = true;
    }
    const cleanSymbol = (rule.symbol || "").trim().toUpperCase();
    if (!cleanSymbol) {
      mutated = true;
      continue;
    }
    if (cleanSymbol !== rule.symbol) mutated = true;
    rule.symbol = cleanSymbol;

    const rawType = typeof rule.type === "string" ? rule.type.toLowerCase() : "";
    let type = rawType === "ai" ? "ai" : "manual";
    if (!rawType) {
      if (!rule.dipPct && !rule.tpPct && rule.entryPrice && rule.exitPrice) {
        type = "ai";
      }
    }
    if (type !== rule.type) mutated = true;
    rule.type = type;

    const enabled = rule.enabled !== false;
    if (enabled !== rule.enabled) mutated = true;
    rule.enabled = enabled;

    if (typeof rule.createdAt !== "number") {
      rule.createdAt = Date.now();
      mutated = true;
    }

    const budget = Number(rule.budgetUSDT);
    if (Number.isFinite(budget)) {
      if (budget !== rule.budgetUSDT) mutated = true;
      rule.budgetUSDT = budget;
    } else {
      if (rule.budgetUSDT !== 0) mutated = true;
      rule.budgetUSDT = 0;
    }

    const stopLoss = Number(rule.stopLossPct);
    if (Number.isFinite(stopLoss) && stopLoss > 0) {
      if (stopLoss !== rule.stopLossPct) mutated = true;
      rule.stopLossPct = stopLoss;
    } else if (rule.stopLossPct) {
      rule.stopLossPct = 0;
      mutated = true;
    }

    const trailing = Number(rule.trailingStopPct);
    if (Number.isFinite(trailing) && trailing > 0) {
      if (trailing !== rule.trailingStopPct) mutated = true;
      rule.trailingStopPct = trailing;
    } else if (rule.trailingStopPct) {
      rule.trailingStopPct = 0;
      mutated = true;
    }

    const takeProfitSteps = normalizeTakeProfitSteps(rule.takeProfitSteps, Number(rule.tpPct));
    if (JSON.stringify(takeProfitSteps) !== JSON.stringify(rule.takeProfitSteps || [])) {
      mutated = true;
      rule.takeProfitSteps = takeProfitSteps;
    } else {
      rule.takeProfitSteps = takeProfitSteps;
    }

    if (rule.type === "manual") {
      const dip = Number(rule.dipPct);
      if (Number.isFinite(dip)) {
        if (dip !== rule.dipPct) mutated = true;
        rule.dipPct = dip;
      } else {
        if (rule.dipPct !== 0) mutated = true;
        rule.dipPct = 0;
      }
      const tp = Number(rule.tpPct);
      if (Number.isFinite(tp)) {
        if (tp !== rule.tpPct) mutated = true;
        rule.tpPct = tp;
      } else {
        if (rule.tpPct !== 0) mutated = true;
        rule.tpPct = 0;
      }
      rule.entryPrice = 0;
      rule.exitPrice = 0;
    } else {
      const entry = Number(rule.entryPrice);
      if (Number.isFinite(entry)) {
        if (entry !== rule.entryPrice) mutated = true;
        rule.entryPrice = entry;
      } else {
        if (rule.entryPrice) mutated = true;
        rule.entryPrice = 0;
      }
      const exit = Number(rule.exitPrice);
      if (Number.isFinite(exit)) {
        if (exit !== rule.exitPrice) mutated = true;
        rule.exitPrice = exit;
      } else {
        if (rule.exitPrice) mutated = true;
        rule.exitPrice = 0;
      }
      if (rule.aiSummary !== undefined) {
        const summary = typeof rule.aiSummary === "string" ? rule.aiSummary.trim() : String(rule.aiSummary || "").trim();
        if (summary !== rule.aiSummary) mutated = true;
        rule.aiSummary = summary;
      }
    }

    if (!Array.isArray(rule.takeProfitSteps) || !rule.takeProfitSteps.length) {
      const fallbackPct = Number(rule.tpPct);
      if (fallbackPct > 0) {
        rule.takeProfitSteps = [{ profitPct: fallbackPct, portionPct: 100 }];
      } else {
        rule.takeProfitSteps = [];
      }
    }

    normalized.push(rule);
  }
  return { rules: normalized, mutated };
}

function mapRuleRow(row) {
  return {
    id: row.id,
    type: row.type,
    symbol: row.symbol,
    dipPct: row.dip_pct !== null ? Number(row.dip_pct) : 0,
    tpPct: row.tp_pct !== null ? Number(row.tp_pct) : 0,
    stopLossPct: row.stop_loss_pct !== null ? Number(row.stop_loss_pct) : 0,
    trailingStopPct: row.trailing_stop_pct !== null ? Number(row.trailing_stop_pct) : 0,
    takeProfitSteps: safeJSONParse(row.take_profit_steps) || [],
    entryPrice: row.entry_price !== null ? Number(row.entry_price) : 0,
    exitPrice: row.exit_price !== null ? Number(row.exit_price) : 0,
    budgetUSDT: row.budget_usdt !== null ? Number(row.budget_usdt) : 0,
    enabled: row.enabled === 1 || row.enabled === true,
    aiSummary: row.ai_summary || undefined,
    aiModel: row.ai_model || undefined,
    createdAt: Number(row.created_at) || Date.now(),
    lastError: row.last_error || undefined,
    lastErrorCode: row.last_error_code || undefined,
    lastErrorAt: row.last_error_at !== null && row.last_error_at !== undefined ? Number(row.last_error_at) : undefined
  };
}

function applyEntitlementsToRules(rules, entitlements) {
  if (!Array.isArray(rules) || !rules.length) return [];
  const manualEnabled = Boolean(entitlements && entitlements.manualEnabled);
  const aiEnabled = Boolean(entitlements && entitlements.aiEnabled);
  const manualLimit = Number(entitlements && entitlements.manualLimit);
  const aiLimit = Number(entitlements && entitlements.aiLimit);
  const result = rules.map(rule => ({ ...rule }));

  const manualIndexes = [];
  const aiIndexes = [];
  result.forEach((rule, index) => {
    const type = (rule.type || "").toLowerCase();
    if (type === "manual") manualIndexes.push(index);
    else if (type === "ai") aiIndexes.push(index);
  });

  manualIndexes.sort((a, b) => {
    const aRule = result[a];
    const bRule = result[b];
    return (Number(aRule.createdAt) || 0) - (Number(bRule.createdAt) || 0);
  });

  aiIndexes.sort((a, b) => {
    const aRule = result[a];
    const bRule = result[b];
    return (Number(aRule.createdAt) || 0) - (Number(bRule.createdAt) || 0);
  });

  let manualActive = 0;
  for (const idx of manualIndexes) {
    const rule = result[idx];
    if (!manualEnabled) {
      rule.enabled = false;
      continue;
    }
    if (!rule.enabled) continue;
    if (Number.isFinite(manualLimit) && manualLimit >= 0 && manualLimit !== Infinity) {
      if (manualLimit <= 0 || manualActive >= manualLimit) {
        rule.enabled = false;
        continue;
      }
    }
    manualActive += 1;
  }

  let aiActive = 0;
  for (const idx of aiIndexes) {
    const rule = result[idx];
    if (!aiEnabled) {
      rule.enabled = false;
      continue;
    }
    if (!rule.enabled) continue;
    if (Number.isFinite(aiLimit) && aiLimit >= 0 && aiLimit !== Infinity) {
      if (aiLimit <= 0 || aiActive >= aiLimit) {
        rule.enabled = false;
        continue;
      }
    }
    aiActive += 1;
  }

  return result;
}

function countActiveRules(rules, type) {
  const target = (type || "").toLowerCase();
  return rules.filter(rule => (rule.type || "").toLowerCase() === target && rule.enabled).length;
}

function validateRulesAgainstEntitlements(rules, entitlements) {
  const manualEnabled = Boolean(entitlements && entitlements.manualEnabled);
  const aiEnabled = Boolean(entitlements && entitlements.aiEnabled);
  const manualLimit = Number(entitlements && entitlements.manualLimit);
  const aiLimit = Number(entitlements && entitlements.aiLimit);

  const manualActive = countActiveRules(rules, "manual");
  const aiActive = countActiveRules(rules, "ai");

  if (!manualEnabled && manualActive > 0) {
    return { ok: false, message: "Manual rules are disabled for your current plan." };
  }
  if (!aiEnabled && aiActive > 0) {
    return { ok: false, message: "AI rules are disabled for your current plan." };
  }

  if (manualEnabled && Number.isFinite(manualLimit) && manualLimit >= 0 && manualLimit !== Infinity && manualActive > manualLimit) {
    return { ok: false, message: `Your plan allows up to ${manualLimit} active manual rules.` };
  }

  if (aiEnabled && Number.isFinite(aiLimit) && aiLimit >= 0 && aiLimit !== Infinity && aiActive > aiLimit) {
    return { ok: false, message: `Your plan allows up to ${aiLimit} active AI rules.` };
  }

  return { ok: true };
}

async function readRules(userId, options = {}) {
  const [rows] = await pool.query(
    `SELECT r.*, e.message AS last_error, e.code AS last_error_code, e.created_at AS last_error_at
     FROM rules r
     LEFT JOIN rule_errors e ON e.rule_id = r.id AND e.user_id = r.user_id
     WHERE r.user_id = ?
     ORDER BY r.created_at ASC`,
    [userId]
  );
  const list = rows.map(mapRuleRow);
  if (!userId) {
    if (options.withEntitlements) {
      return { rules: list, entitlements: null };
    }
    return list;
  }
  const entitlements = await getSubscriptionEntitlements(userId, { includeHistory: options.includeHistory === true });
  const enforced = applyEntitlementsToRules(list, entitlements);
  if (options.withEntitlements) {
    return { rules: enforced, entitlements };
  }
  return enforced;
}

async function writeRules(userId, rules) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const ids = [];
    for (const rule of rules) {
      ids.push(rule.id);
      await connection.query(
        `INSERT INTO rules (id, user_id, type, symbol, dip_pct, tp_pct, stop_loss_pct, trailing_stop_pct, take_profit_steps, entry_price, exit_price, budget_usdt, enabled, ai_summary, ai_model, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           type = VALUES(type),
           symbol = VALUES(symbol),
           dip_pct = VALUES(dip_pct),
           tp_pct = VALUES(tp_pct),
           stop_loss_pct = VALUES(stop_loss_pct),
           trailing_stop_pct = VALUES(trailing_stop_pct),
           take_profit_steps = VALUES(take_profit_steps),
           entry_price = VALUES(entry_price),
           exit_price = VALUES(exit_price),
           budget_usdt = VALUES(budget_usdt),
           enabled = VALUES(enabled),
           ai_summary = VALUES(ai_summary),
           ai_model = VALUES(ai_model),
           created_at = VALUES(created_at)
        `,
        [
          rule.id,
          userId,
          rule.type,
          rule.symbol,
          rule.type === "manual" ? Number(rule.dipPct) : null,
          rule.type === "manual" ? Number(rule.tpPct) : null,
          Number(rule.stopLossPct) > 0 ? Number(rule.stopLossPct) : null,
          Number(rule.trailingStopPct) > 0 ? Number(rule.trailingStopPct) : null,
          safeJSONStringify(rule.takeProfitSteps) || null,
          rule.type === "ai" ? Number(rule.entryPrice) : null,
          rule.type === "ai" ? Number(rule.exitPrice) : null,
          Number(rule.budgetUSDT) || 0,
          rule.enabled ? 1 : 0,
          rule.aiSummary || null,
          rule.aiModel || null,
          Number(rule.createdAt) || Date.now()
        ]
      );
    }

    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      await connection.query(
        `DELETE FROM rules WHERE user_id = ? AND id NOT IN (${placeholders})`,
        [userId, ...ids]
      );
    } else {
      await connection.query("DELETE FROM rules WHERE user_id = ?", [userId]);
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function removeRule(userId, id) {
  await pool.query("DELETE FROM rules WHERE user_id = ? AND id = ?", [userId, id]);
}

async function upsertRuleError({ userId, ruleId, code, message }) {
  if (!userId || !ruleId) return { changed: false };
  const text = typeof message === "string" ? message.trim() : String(message || "").trim();
  if (!text) return { changed: false };
  const [rows] = await pool.query(
    `SELECT code, message FROM rule_errors WHERE user_id = ? AND rule_id = ? LIMIT 1`,
    [userId, ruleId]
  );
  const existing = rows[0];
  if (existing && existing.code === (code || null) && existing.message === text) {
    await pool.query(`UPDATE rule_errors SET created_at = ? WHERE user_id = ? AND rule_id = ?`, [Date.now(), userId, ruleId]);
    return { changed: false };
  }
  await pool.query(
    `INSERT INTO rule_errors (rule_id, user_id, code, message, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE code = VALUES(code), message = VALUES(message), created_at = VALUES(created_at)`,
    [ruleId, userId, code || null, text, Date.now()]
  );
  return { changed: true };
}

async function clearRuleError(userId, ruleId) {
  if (!userId || !ruleId) return;
  await pool.query("DELETE FROM rule_errors WHERE user_id = ? AND rule_id = ?", [userId, ruleId]);
}

function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });
}

function authRequired(handler) {
  return async (req, res, next) => {
    const header = req.headers["authorization"] || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await findUserById(payload.sub);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      req.user = user;
      return handler(req, res, next);
    } catch (err) {
      console.error("auth error", err.message);
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
}

function isAdminUser(user) {
  if (!user || ADMIN_EMAILS.size === 0) return false;
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  return ADMIN_EMAILS.has(email);
}

function adminRequired(handler) {
  return authRequired(async (req, res, next) => {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return handler(req, res, next);
  });
}

function handleAsync(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error("API error", err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  };
}

app.post("/api/auth/register", handleAsync(async (req, res) => {
  const { name, email, password } = req.body || {};
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanPassword = typeof password === "string" ? password : "";

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = await findUserByEmail(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const hash = await bcrypt.hash(cleanPassword, 10);
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    [cleanName, cleanEmail, hash]
  );

  const user = { id: result.insertId, name: cleanName, email: cleanEmail };
  const token = signToken(user);
  res.json({ token, user });
}));

app.post("/api/auth/login", loginLimiter, handleAsync(async (req, res) => {
  const { email, password, mfaToken } = req.body || {};
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPassword = typeof password === "string" ? password : "";
  const ip = req.ip || req.headers["x-forwarded-for"] || "";
  const userAgent = req.headers["user-agent"] || "";

  if (!cleanEmail || !cleanPassword) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (await shouldLockLogin({ email: cleanEmail, ip })) {
    await recordLoginAttempt({ email: cleanEmail, ip, userAgent, success: false });
    return res.status(429).json({ error: "Too many failed attempts. Please try again later." });
  }

  const user = await findUserByEmail(cleanEmail);
  if (!user) {
    await recordLoginAttempt({ email: cleanEmail, ip, userAgent, success: false });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (await shouldLockLogin({ userId: user.id, ip })) {
    await recordLoginAttempt({ userId: user.id, email: cleanEmail, ip, userAgent, success: false });
    await triggerNotifications(user.id, NOTIFICATION_EVENT_TYPES.LOGIN_FAILURE, {
      email: cleanEmail,
      message: "Account temporarily locked due to repeated login failures",
      ip
    });
    return res.status(429).json({ error: "Account temporarily locked due to repeated failures." });
  }

  const match = await bcrypt.compare(cleanPassword, user.password_hash);
  if (!match) {
    await recordLoginAttempt({ userId: user.id, email: cleanEmail, ip, userAgent, success: false });
    const failures = await countRecentFailedAttempts({ userId: user.id, ip });
    if (failures >= LOGIN_FAILURE_THRESHOLD) {
      await triggerNotifications(user.id, NOTIFICATION_EVENT_TYPES.LOGIN_FAILURE, {
        email: cleanEmail,
        attempts: failures,
        ip
      });
    }
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const security = await getSecuritySettings(user.id, { includeSecret: true });
  if (security?.mfaEnabled) {
    if (!mfaToken) {
      await recordLoginAttempt({ userId: user.id, email: cleanEmail, ip, userAgent, success: false });
      return res.status(401).json({ error: "MFA token required", mfaRequired: true });
    }
    const secret = security.mfaSecret;
    const valid = secret ? authenticator.check(String(mfaToken), secret) : false;
    if (!valid) {
      await recordLoginAttempt({ userId: user.id, email: cleanEmail, ip, userAgent, success: false });
      return res.status(401).json({ error: "Invalid MFA token", mfaRequired: true });
    }
  }

  await recordLoginAttempt({ userId: user.id, email: cleanEmail, ip, userAgent, success: true });
  await triggerNotifications(user.id, NOTIFICATION_EVENT_TYPES.LOGIN_SUCCESS, { ip, email: cleanEmail });

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email }, mfaRequired: Boolean(security?.mfaEnabled) });
}));

app.get("/api/auth/me", authRequired(handleAsync(async (req, res) => {
  const [hasKeys, subscription] = await Promise.all([
    hasApiKeys(req.user.id),
    getSubscriptionEntitlements(req.user.id, { includeHistory: true })
  ]);
  res.json({ user: req.user, hasApiKeys: hasKeys, subscription });
}))); 

app.get("/api/security/settings", authRequired(handleAsync(async (req, res) => {
  const settings = await getSecuritySettings(req.user.id, { includeSecret: true });
  res.json({
    mfaEnabled: Boolean(settings?.mfaEnabled),
    mfaConfigured: Boolean(settings?.mfaSecret),
    alertEmail: settings?.alertEmail || null,
    alertWebhookUrl: settings?.alertWebhookUrl || null,
    alertTelegramChat: settings?.alertTelegramChat || null,
    preferences: settings?.preferences || {}
  });
})));

app.post("/api/security/alerts", authRequired(handleAsync(async (req, res) => {
  const { alertEmail, alertWebhookUrl, alertTelegramChat, preferences } = req.body || {};
  const updates = {};
  if (alertEmail !== undefined) {
    const trimmed = typeof alertEmail === "string" ? alertEmail.trim() : "";
    updates.alertEmail = trimmed || null;
  }
  if (alertWebhookUrl !== undefined) {
    const trimmed = typeof alertWebhookUrl === "string" ? alertWebhookUrl.trim() : "";
    if (trimmed && !isLikelyUrl(trimmed)) {
      return res.status(400).json({ error: "Invalid webhook URL" });
    }
    updates.alertWebhookUrl = trimmed || null;
  }
  if (alertTelegramChat !== undefined) {
    const trimmed = typeof alertTelegramChat === "string" ? alertTelegramChat.trim() : "";
    updates.alertTelegramChat = trimmed || null;
  }
  if (preferences !== undefined) {
    if (preferences && typeof preferences !== "object") {
      return res.status(400).json({ error: "Preferences must be an object" });
    }
    updates.preferences = preferences || {};
  }
  const updated = await upsertSecuritySettings(req.user.id, updates);
  res.json({ ok: true, settings: {
    mfaEnabled: Boolean(updated?.mfaEnabled),
    alertEmail: updated?.alertEmail || null,
    alertWebhookUrl: updated?.alertWebhookUrl || null,
    alertTelegramChat: updated?.alertTelegramChat || null,
    preferences: updated?.preferences || {}
  }});
})));

app.post("/api/security/mfa/setup", authRequired(handleAsync(async (req, res) => {
  const secret = authenticator.generateSecret();
  await upsertSecuritySettings(req.user.id, { mfaSecret: secret, mfaEnabled: false });
  const otpauth = authenticator.keyuri(req.user.email || String(req.user.id), MFA_ISSUER, secret);
  res.json({ secret, otpauth, step: MFA_STEP_SECONDS });
})));

app.post("/api/security/mfa/enable", authRequired(handleAsync(async (req, res) => {
  const { token } = req.body || {};
  const settings = await getSecuritySettings(req.user.id, { includeSecret: true });
  if (!settings?.mfaSecret) {
    return res.status(400).json({ error: "Generate a secret first" });
  }
  if (!token || !authenticator.check(String(token), settings.mfaSecret)) {
    return res.status(401).json({ error: "Invalid MFA token" });
  }
  await upsertSecuritySettings(req.user.id, { mfaEnabled: true });
  res.json({ ok: true });
})));

app.post("/api/security/mfa/disable", authRequired(handleAsync(async (req, res) => {
  const { token } = req.body || {};
  const settings = await getSecuritySettings(req.user.id, { includeSecret: true });
  if (settings?.mfaEnabled) {
    if (!settings?.mfaSecret || !token || !authenticator.check(String(token), settings.mfaSecret)) {
      return res.status(401).json({ error: "Invalid MFA token" });
    }
  }
  await upsertSecuritySettings(req.user.id, { mfaEnabled: false, mfaSecret: null });
  res.json({ ok: true });
})));

app.get("/api/health", handleAsync(async (req, res) => {
  let database = { ok: true };
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    database = { ok: false, error: err.message };
  }
  const engineMetrics = engineManager ? engineManager.getMetrics() : null;
  const ok = database.ok && (!engineMetrics || (engineMetrics.workerReady && !engineMetrics.lastError));
  res.json({
    status: ok ? "ok" : "degraded",
    timestamp: Date.now(),
    uptime: process.uptime(),
    engine: engineMetrics,
    database
  });
}));

app.get("/api/users/api-keys", authRequired(handleAsync(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT updated_at FROM user_api_keys WHERE user_id = ? LIMIT 1",
    [req.user.id]
  );
  res.json({
    hasKeys: rows.length > 0,
    updatedAt: rows.length ? rows[0].updated_at : null
  });
})));

app.post("/api/users/api-keys", authRequired(handleAsync(async (req, res) => {
  const { apiKey, apiSecret } = req.body || {};
  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: "apiKey and apiSecret are required" });
  }
  await upsertUserApiKeys(req.user.id, apiKey.trim(), apiSecret.trim());
  res.json({ ok: true });
})));

app.delete("/api/users/api-keys", authRequired(handleAsync(async (req, res) => {
  await deleteUserApiKeys(req.user.id);
  res.json({ ok: true });
})));

app.get("/api/rules", authRequired(handleAsync(async (req, res) => {
  const { rules, entitlements } = await readRules(req.user.id, { withEntitlements: true });
  res.json({ rules, entitlements });
})));

app.get("/api/rules/errors", authRequired(handleAsync(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT rule_id, code, message, created_at FROM rule_errors WHERE user_id = ?",
    [req.user.id]
  );
  const errors = rows.map(row => ({
    id: row.rule_id,
    code: row.code || undefined,
    message: row.message || "",
    createdAt: row.created_at !== null && row.created_at !== undefined ? Number(row.created_at) : Date.now()
  }));
  res.json({ errors });
})));

app.post("/api/rules", authRequired(handleAsync(async (req, res) => {
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  const { rules: normalized } = normalizeRules(payload);
  const entitlements = await getSubscriptionEntitlements(req.user.id, { includeHistory: false });
  const validation = validateRulesAgainstEntitlements(normalized, entitlements);
  if (!validation.ok) {
    return res.status(403).json({ error: validation.message });
  }
  const enforced = applyEntitlementsToRules(normalized, entitlements);
  await writeRules(req.user.id, enforced);
  const { rules: saved, entitlements: nextEntitlements } = await readRules(req.user.id, { withEntitlements: true });
  res.json({ ok: true, count: saved.length, rules: saved, entitlements: nextEntitlements });
})));

app.delete("/api/rules/:id", authRequired(handleAsync(async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "id is required" });
  await removeRule(req.user.id, id);
  const { rules: saved, entitlements } = await readRules(req.user.id, { withEntitlements: true });
  res.json({ ok: true, count: saved.length, rules: saved, entitlements });
})));

app.post("/api/rules/sync", authRequired(handleAsync(async (req, res) => {
  const { rules, entitlements } = await readRules(req.user.id, { withEntitlements: true });
  res.json({ ok: true, count: rules.length, rules, entitlements });
})));

app.get("/api/billing/subscription", authRequired(handleAsync(async (req, res) => {
  const subscription = await getSubscriptionEntitlements(req.user.id, { includeHistory: true });
  res.json({ subscription });
})));

app.post("/api/billing/checkout", authRequired(handleAsync(async (req, res) => {
  const { planId, provider } = req.body || {};
  const plan = await getPlanById(Number(planId));
  if (!plan || !plan.isActive) {
    return res.status(404).json({ error: "Plan not found" });
  }
  if (!(plan.priceUSD > 0)) {
    return res.status(400).json({ error: "Plan price must be greater than zero" });
  }

  const normalizedProvider = typeof provider === "string" ? provider.toLowerCase() : "";
  if (normalizedProvider === SUBSCRIPTION_PROVIDERS.STRIPE && !PAYMENT_PROVIDERS.stripe) {
    return res.status(400).json({ error: "Stripe payments are not configured" });
  }
  if (normalizedProvider === SUBSCRIPTION_PROVIDERS.CRYPTOMUS && !PAYMENT_PROVIDERS.cryptomus) {
    return res.status(400).json({ error: "Cryptomus payments are not configured" });
  }
  if (!Object.values(SUBSCRIPTION_PROVIDERS).includes(normalizedProvider)) {
    return res.status(400).json({ error: "Unsupported payment provider" });
  }

  const reference = createSubscriptionReference(req.user.id, plan.id, normalizedProvider);
  const amountUSD = Number(plan.priceUSD) || 0;
  const successUrl = buildAbsoluteUrl(`/billing/success?ref=${encodeURIComponent(reference)}`);
  const cancelUrl = buildAbsoluteUrl(`/billing/cancel?ref=${encodeURIComponent(reference)}`);
  let checkoutPayload = {};

  if (normalizedProvider === SUBSCRIPTION_PROVIDERS.STRIPE) {
    if (!stripeClient) {
      return res.status(500).json({ error: "Stripe client not initialised" });
    }
    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: reference,
      customer_email: req.user.email || undefined,
      metadata: {
        userId: String(req.user.id),
        planId: String(plan.id),
        planCode: plan.code,
        reference
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amountUSD * 100),
            product_data: {
              name: plan.name,
              description: plan.description || undefined
            }
          }
        }
      ]
    });
    await createPendingSubscription({
      userId: req.user.id,
      planId: plan.id,
      provider: SUBSCRIPTION_PROVIDERS.STRIPE,
      reference,
      amountUSD,
      currency: "USD",
      metadata: {
        provider: SUBSCRIPTION_PROVIDERS.STRIPE,
        sessionId: session.id
      },
      providerSessionId: session.id,
      providerInvoiceId: session.payment_intent || null
    });
    checkoutPayload = {
      sessionId: session.id,
      url: session.url,
      reference
    };
  } else {
    const callbackUrl = buildAbsoluteUrl("/webhooks/cryptomus");
    const invoicePayload = {
      amount: amountUSD.toFixed(2),
      currency: "USD",
      order_id: reference,
      lifetime: 3600,
      url_success: CRYPTOMUS_SUCCESS_URL ? buildAbsoluteUrl(CRYPTOMUS_SUCCESS_URL) : successUrl,
      url_error: CRYPTOMUS_CANCEL_URL ? buildAbsoluteUrl(CRYPTOMUS_CANCEL_URL) : cancelUrl,
      callback_url: callbackUrl,
      url_callback: callbackUrl,
      description: plan.description || plan.name
    };
    if (req.user.email) invoicePayload.payer_email = req.user.email;
    const signature = generateCryptomusSignature(invoicePayload);
    const response = await fetch("https://api.cryptomus.com/v1/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        merchant: CRYPTOMUS_MERCHANT_ID,
        sign: signature
      },
      body: JSON.stringify(invoicePayload)
    });
    const invoiceData = await response.json().catch(() => ({}));
    const invoiceResult = extractCryptomusResult(invoiceData);
    const stateToken = String(invoiceData?.state ?? invoiceData?.status ?? invoiceResult?.state ?? invoiceResult?.status ?? "").toLowerCase();
    const failedStates = new Set(["error", "failed", "canceled", "cancelled", "expired"]);
    if (!response.ok || failedStates.has(stateToken)) {
      console.error("Cryptomus checkout error", invoiceData);
      const errorMessage = invoiceData?.message || invoiceData?.error || invoiceResult?.message || invoiceResult?.error || "Cryptomus API error";
      return res.status(response.ok ? 502 : response.status).json({ error: errorMessage });
    }
    const paymentUrl = invoiceResult?.result_url
      || invoiceResult?.url
      || invoiceResult?.payment_url
      || invoiceResult?.redirect_url
      || invoiceResult?.checkout_url;
    if (!paymentUrl) {
      const errorMessage = invoiceData?.message || invoiceData?.error || "Cryptomus did not return a payment URL";
      return res.status(502).json({ error: errorMessage });
    }
    const invoiceId = invoiceResult?.uuid
      || invoiceResult?.payment_uuid
      || invoiceResult?.invoice_uuid
      || invoiceData?.uuid
      || invoiceData?.payment_uuid
      || invoiceData?.invoice_uuid
      || null;
    await createPendingSubscription({
      userId: req.user.id,
      planId: plan.id,
      provider: SUBSCRIPTION_PROVIDERS.CRYPTOMUS,
      reference,
      amountUSD,
      currency: "USD",
      metadata: {
        provider: SUBSCRIPTION_PROVIDERS.CRYPTOMUS,
        invoiceId,
        response: invoiceData,
        result: invoiceResult
      },
      providerSessionId: invoiceId,
      providerInvoiceId: invoiceId
    });
    checkoutPayload = {
      url: paymentUrl,
      invoiceId,
      address: invoiceResult?.address || invoiceData?.address,
      reference
    };
  }

  const subscription = await getSubscriptionEntitlements(req.user.id, { includeHistory: true });
  res.json({ ok: true, provider: normalizedProvider, reference, checkout: checkoutPayload, subscription });
})));

app.get("/api/orders", authRequired(handleAsync(async (req, res) => {
  const creds = await getUserApiKeys(req.user.id);
  if (!creds) {
    return res.status(400).json({ error: "Connect your Binance API keys first" });
  }
  const rules = await readRules(req.user.id);
  const symbols = Array.from(new Set(rules.map(r => r.symbol).filter(Boolean)));
  if (!symbols.length) {
    return res.json([]);
  }
  const client = createBinanceClient({ apiKey: creds.apiKey, apiSecret: creds.apiSecret });
  const data = [];
  for (const symbol of symbols) {
    try {
      const orders = await client.openOrders(symbol);
      data.push({ symbol, orders });
    } catch (err) {
      data.push({ symbol, error: err.message });
    }
  }
  res.json(data);
})));

app.get("/api/trades/completed", authRequired(handleAsync(async (req, res) => {
  const { trades, metrics, errors, missingKeys } = await fetchUserTradeSummaries({ userId: req.user.id, limit: 50 });
  if (missingKeys) {
    return res.status(400).json({ error: "Connect your Binance API keys first" });
  }
  res.json({
    trades: trades.slice(0, 20),
    metrics,
    errors
  });
}))); 

function parseAiRoleResponse(text) {
  if (!text) throw new Error("AI response was empty.");
  const cleaned = text.replace(/```json|```/gi, "").replace(/\r/g, "").trim();
  if (!cleaned) throw new Error("AI response was empty.");

  const parseNumeric = value => {
    if (value === null || value === undefined) return NaN;
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    let str = String(value).trim();
    if (!str) return NaN;
    str = str.replace(/[\s,_]/g, "");
    str = str.replace(/[\u066b\u066c]/g, ".");
    const num = Number(str);
    return Number.isFinite(num) ? num : NaN;
  };

  let symbol = "";
  let entryPrice = NaN;
  let exitPrice = NaN;
  let summary = "";

  try {
    const parsedJson = JSON.parse(cleaned);
    if (parsedJson && typeof parsedJson === "object" && !Array.isArray(parsedJson)) {
      if (parsedJson.error) {
        throw new Error(`AI error: ${parsedJson.error}`);
      }
      const candidateSymbol = parsedJson.symbol || parsedJson.pair || parsedJson.ticker;
      if (candidateSymbol) {
        symbol = String(candidateSymbol).toUpperCase().replace(/[^A-Z0-9]/g, "");
      }
      const candidateEntry = parsedJson.entryPrice ?? parsedJson.entry ?? parsedJson.buy;
      const candidateExit = parsedJson.exitPrice ?? parsedJson.takeProfit ?? parsedJson.sell;
      entryPrice = parseNumeric(candidateEntry);
      exitPrice = parseNumeric(candidateExit);
      if (typeof parsedJson.summary === "string") {
        summary = parsedJson.summary.trim();
      } else if (typeof parsedJson.reason === "string") {
        summary = parsedJson.reason.trim();
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("AI error:")) {
      throw err;
    }
  }

  const parseFallback = () => {
    const lines = cleaned.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const parseNumberToken = token => {
      const parsed = parseNumeric(token);
      return Number.isFinite(parsed) ? parsed : NaN;
    };
    const numberFromLine = line => {
      const match = line.match(/([0-9]+(?:[.,\u066c][0-9]+)?)/);
      if (!match) return null;
      const n = parseNumberToken(match[1]);
      return Number.isFinite(n) ? n : null;
    };

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!symbol && (lower.includes("pair") || lower.includes("symbol") || lower.includes("زوج"))) {
        const symMatch = line.match(/([A-Z]{3,}(?:USDT|USDC|BUSD|BTC|ETH)?)/);
        if (symMatch) symbol = symMatch[1].replace(/[^A-Z0-9]/gi, "").toUpperCase();
      }
      if (!Number.isFinite(entryPrice) && (lower.includes("entry") || lower.includes("limit") || lower.includes("دخول"))) {
        const num = numberFromLine(line);
        if (Number.isFinite(num)) entryPrice = num;
      }
      if (!Number.isFinite(exitPrice) && (lower.includes("take") || lower.includes("profit") || lower.includes("exit") || lower.includes("هدف") || lower.includes("ربح"))) {
        const num = numberFromLine(line);
        if (Number.isFinite(num)) exitPrice = num;
      }
    }

    if (!symbol) {
      const fallback = cleaned.match(/([A-Z]{3,}(?:USDT|USDC|BUSD|BTC|ETH)?)/);
      if (fallback) symbol = fallback[1].replace(/[^A-Z0-9]/gi, "").toUpperCase();
    }

    const numbers = cleaned.match(/([0-9]+(?:[.,\u066c][0-9]+)?)/g) || [];
    if (!Number.isFinite(entryPrice) && numbers.length >= 1) {
      const parsed = parseNumberToken(numbers[0]);
      if (Number.isFinite(parsed)) entryPrice = parsed;
    }
    if (!Number.isFinite(exitPrice) && numbers.length >= 2) {
      const parsed = parseNumberToken(numbers[numbers.length - 1]);
      if (Number.isFinite(parsed)) exitPrice = parsed;
    }
  };

  if (!symbol || !Number.isFinite(entryPrice) || !Number.isFinite(exitPrice)) {
    parseFallback();
  }

  if (!symbol || !(entryPrice > 0) || !(exitPrice > 0)) {
    throw new Error("Unable to read the trading pair or price targets from the AI response.");
  }

  if (!symbol.endsWith("USDT") && symbol.includes("/")) {
    symbol = symbol.replace(/\//g, "");
  }

  if (symbol.length < 6) {
    throw new Error("The trading pair suggested by the AI is not valid for spot trading.");
  }

  return { symbol, entryPrice, exitPrice, raw: cleaned, summary: summary || undefined };
}

function parseAiFeedbackResponse(text) {
  if (!text) throw new Error("AI response was empty.");
  const cleaned = text.replace(/```json|```/gi, "").trim();
  if (!cleaned) throw new Error("AI response was empty.");
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error("AI response was not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI response did not contain the expected object.");
  }

  const updates = Array.isArray(parsed.updates) ? parsed.updates : [];
  const normalizedUpdates = updates
    .map(update => {
      if (!update || typeof update !== "object") return null;
      const ruleId = typeof update.ruleId === "string" && update.ruleId.trim()
        ? update.ruleId.trim()
        : typeof update.id === "string" && update.id.trim()
          ? update.id.trim()
          : "";
      if (!ruleId) return null;
      const action = typeof update.action === "string" ? update.action.trim().toLowerCase() : "review";
      const confidence = clampNumber(update.confidence, 0, 1);
      const notes = typeof update.notes === "string" ? update.notes.trim() : "";
      const adjustments = update.adjustments && typeof update.adjustments === "object"
        ? {
            entryPrice: update.adjustments.entryPrice !== undefined ? roundNumber(update.adjustments.entryPrice, 6) : undefined,
            exitPrice: update.adjustments.exitPrice !== undefined ? roundNumber(update.adjustments.exitPrice, 6) : undefined,
            budgetUSDT: update.adjustments.budgetUSDT !== undefined ? roundNumber(update.adjustments.budgetUSDT, 2) : undefined
          }
        : {};
      const priority = update.priority !== undefined ? clampNumber(update.priority, 0, 1) : undefined;
      return {
        ruleId,
        action,
        confidence,
        priority,
        notes,
        adjustments
      };
    })
    .filter(Boolean);

  const globalInsights = typeof parsed.globalInsights === "string" ? parsed.globalInsights.trim() : "";
  const sentimentSummary = typeof parsed.sentimentSummary === "string" ? parsed.sentimentSummary.trim() : "";
  const nextSteps = Array.isArray(parsed.nextSteps)
    ? parsed.nextSteps.map(step => typeof step === "string" ? step.trim() : null).filter(Boolean)
    : [];

  return {
    updates: normalizedUpdates,
    globalInsights,
    sentimentSummary,
    nextSteps,
    raw: cleaned
  };
}

app.post("/api/ai-role", authRequired(handleAsync(async (req, res) => {
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!key) {
    return res.status(400).json({ error: "OPENAI_API_KEY is required" });
  }

  const model = (req.body && req.body.model) || DEFAULT_AI_MODEL;
  const budget = Number(req.body && req.body.budgetUSDT !== undefined ? req.body.budgetUSDT : DEFAULT_AI_BUDGET);
  const locale = typeof req.body?.locale === "string" ? req.body.locale.toLowerCase() : "en";
  if (!(budget > 0)) {
    return res.status(400).json({ error: "budgetUSDT must be a positive number" });
  }

  const { rules: currentRules, entitlements } = await readRules(req.user.id, { withEntitlements: true });
  if (!entitlements.aiEnabled) {
    return res.status(403).json({ error: "AI rules are disabled for your current plan." });
  }
  if (Number.isFinite(entitlements.aiLimit) && entitlements.aiLimit >= 0 && entitlements.aiLimit !== Infinity) {
    const aiActive = countActiveRules(currentRules, "ai");
    if (entitlements.aiLimit <= 0 || aiActive >= entitlements.aiLimit) {
      return res.status(403).json({ error: `Your plan allows up to ${entitlements.aiLimit} active AI rules.` });
    }
  }

  const marketSnapshot = await fetchMarketSnapshot(MARKET_SNAPSHOT_LIMIT);

  const snapshotText = JSON.stringify(marketSnapshot, null, 2);
  const summaryLanguage = locale === "ar" ? "Arabic" : "English";
  const userPrompt = [
    `You have ${budget} USDT to allocate to a single Binance spot trade that should complete within 24 hours.`,
    "Use the following live market snapshot (JSON) as your primary data source:",
    snapshotText,
    "Before finalizing the trade idea you MUST research the latest public crypto headlines online and factor any breaking news into your reasoning.",
    "Respond ONLY with minified JSON using this schema: {\"symbol\":\"PAIR\",\"entryPrice\":number,\"exitPrice\":number,\"summary\":\"...\"}.",
    "Rules:",
    "1. Choose a symbol from the snapshot with healthy liquidity.",
    "2. entryPrice must stay within 3% of the snapshot lastPrice and represent a realistic limit maker entry.",
    "3. exitPrice must be higher than entryPrice by 0.5% - 5% unless news justifies a different range.",
    "4. Target a quick setup that can realistically fill and close within 24 hours based on liquidity and recent volatility.",
    "5. Account for Binance trading fees on both entry and exit so the net result remains profitable after fees.",
    `6. Mention the supporting data and news you considered inside the summary and write it in ${summaryLanguage}.`
  ].join("\n");

  const userPrompt = [
    "Analyse the following trading context and respond using the requested JSON schema.",
    "DATA:",
    JSON.stringify(aiInput, null, 2)
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You are an elite crypto trading analyst with live data access. Conduct up-to-date market research before responding. Think step-by-step privately and return only the JSON result requested."
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    return res.status(502).json({ error: `OpenAI API error: ${errText}` });
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || "";
  const parsed = parseAiRoleResponse(text);

  const snapshotMap = new Map(marketSnapshot.map(item => [item.symbol, item]));
  let referencePrice = snapshotMap.get(parsed.symbol)?.lastPrice;
  if (!Number.isFinite(referencePrice)) {
    try {
      const tickerRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${parsed.symbol}`);
      if (tickerRes.ok) {
        const tickerPayload = await tickerRes.json();
        const maybePrice = Number(tickerPayload?.price);
        if (Number.isFinite(maybePrice) && maybePrice > 0) {
          referencePrice = maybePrice;
        }
      }
    } catch (err) {
      console.error("Failed to fetch live ticker for", parsed.symbol, err);
    }
  }

  if (Number.isFinite(referencePrice) && referencePrice > 0) {
    const normalise = (value, fallback) => {
      if (!Number.isFinite(value) || value <= 0) return fallback;
      return Number(value);
    };
    let entry = normalise(parsed.entryPrice, referencePrice * 0.995);
    let exit = normalise(parsed.exitPrice, entry * 1.015);
    const entryDiff = Math.abs(entry - referencePrice) / referencePrice;
    if (!Number.isFinite(entry) || entryDiff > 0.05) {
      entry = Number((referencePrice * 0.995).toFixed(6));
    }
    if (!Number.isFinite(exit) || exit <= entry) {
      exit = Number((entry * 1.015).toFixed(6));
    } else {
      let delta = (exit - entry) / entry;
      if (delta < 0.003) {
        exit = Number((entry * 1.008).toFixed(6));
      } else if (delta > 0.08) {
        exit = Number((entry * 1.05).toFixed(6));
      } else {
        exit = Number(exit.toFixed(6));
      }
    }
    parsed.entryPrice = Number(entry.toFixed(6));
    parsed.exitPrice = Number(exit.toFixed(6));
  }

  const aiRule = {
    id: randomUUID(),
    type: "ai",
    symbol: parsed.symbol,
    entryPrice: parsed.entryPrice,
    exitPrice: parsed.exitPrice,
    budgetUSDT: budget,
    enabled: true,
    createdAt: Date.now(),
    aiSummary: (() => {
      const parts = [];
      if (parsed.summary) parts.push(parsed.summary);
      else parts.push(parsed.raw);
      if (Number.isFinite(referencePrice) && referencePrice > 0) {
        parts.push(`Live price check (${parsed.symbol}): ${referencePrice} USDT at ${new Date().toISOString()}. Entry ${parsed.entryPrice}, take-profit ${parsed.exitPrice}.`);
      }
      return parts.join("\n\n");
    })(),
    aiModel: model
  };

  const combined = [...currentRules, aiRule];
  const { rules: normalized } = normalizeRules(combined);
  const validation = validateRulesAgainstEntitlements(normalized, entitlements);
  if (!validation.ok) {
    return res.status(403).json({ error: validation.message });
  }
  const enforced = applyEntitlementsToRules(normalized, entitlements);
  await writeRules(req.user.id, enforced);
  const { rules: saved, entitlements: nextEntitlements } = await readRules(req.user.id, { withEntitlements: true });
  const created = saved.find(r => r.id === aiRule.id) || aiRule;

  res.json({ ok: true, rule: created, entitlements: nextEntitlements });
}))); 

app.post("/api/ai/feedback", authRequired(handleAsync(async (req, res) => {
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!key) {
    return res.status(400).json({ error: "OPENAI_API_KEY is required" });
  }

  const model = typeof req.body?.model === "string" && req.body.model.trim() ? req.body.model.trim() : DEFAULT_AI_MODEL;
  const includeDisabled = req.body?.includeDisabled === true;

  const { rules: allRules, entitlements } = await readRules(req.user.id, { withEntitlements: true, includeHistory: true });
  const aiRules = allRules.filter(rule => (rule.type || "").toLowerCase() === "ai" && (includeDisabled || rule.enabled));
  if (!aiRules.length) {
    return res.status(400).json({ error: "No AI rules available for review." });
  }

  const tradeData = await fetchUserTradeSummaries({ userId: req.user.id, symbols: aiRules.map(rule => rule.symbol), limit: 200 });
  if (tradeData.missingKeys) {
    return res.status(400).json({ error: "Connect your Binance API keys first" });
  }

  const marketSnapshot = await fetchMarketSnapshot(MARKET_SNAPSHOT_LIMIT);
  const sentiment = await fetchMarketSentiment({ limit: DEFAULT_SENTIMENT_LIMIT });

  const bySymbol = tradeData.bySymbol || {};
  const ruleInsights = aiRules.map(rule => {
    const symbol = String(rule.symbol || "").toUpperCase();
    const trades = Array.isArray(bySymbol[symbol]) ? bySymbol[symbol] : [];
    return summarizeRulePerformance(rule, trades);
  });

  const overallMetrics = tradeData.metrics || calculatePerformanceMetrics([]);
  const overallSummary = {
    totalTrades: overallMetrics.totalTrades,
    totalProfit: roundNumber(overallMetrics.totalProfit, 6),
    averageProfitPct: roundNumber(overallMetrics.averageProfitPct, 4),
    winRate: roundNumber(overallMetrics.winRate, 2),
    averageHoldHours: roundNumber((overallMetrics.averageHoldMs || 0) / 3600000, 2)
  };

  const aiInput = {
    generatedAt: new Date().toISOString(),
    plan: {
      aiEnabled: Boolean(entitlements?.aiEnabled),
      aiLimit: Number.isFinite(entitlements?.aiLimit) ? entitlements.aiLimit : null
    },
    account: {
      totalAiRules: aiRules.length,
      overallPerformance: overallSummary,
      recentIssues: tradeData.errors || []
    },
    rules: ruleInsights,
    market: {
      sentiment,
      snapshot: marketSnapshot
    }
  };

  const instructions = [
    "You are a senior quantitative crypto trading coach.",
    "You will receive automated rule performance metrics and current market context.",
    "Analyse the data and propose concrete actions to keep, adjust, pause, or retire rules.",
    "For each rule give short notes and optional numeric adjustments.",
    "Return a JSON object with this schema:",
    '{"updates":[{"ruleId":"...","action":"keep|adjust|pause|retire","confidence":0-1,"priority":0-1,"notes":"...","adjustments":{"entryPrice":number?,"exitPrice":number?,"budgetUSDT":number?}}],"globalInsights":"...","sentimentSummary":"...","nextSteps":["..."]}',
    "Focus on the provided performance data. Do not hallucinate symbols that are not listed.",
    "If data is insufficient, flag the rule for manual review instead of guessing."
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: instructions
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    return res.status(502).json({ error: `OpenAI API error: ${errText}` });
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || "";
  const parsed = parseAiFeedbackResponse(text);

  const record = await recordAiFeedback({
    userId: req.user.id,
    model,
    prompt: aiInput,
    response: parsed,
    metrics: {
      overall: overallSummary,
      rules: ruleInsights
    },
    sentiment
  });

  res.json({
    ok: true,
    feedback: parsed,
    metrics: {
      overall: overallSummary,
      rules: ruleInsights
    },
    sentiment,
    marketSnapshot,
    errors: tradeData.errors || [],
    record
  });
})));

app.get("/api/ai/feedback", authRequired(handleAsync(async (req, res) => {
  const limit = Math.max(1, Math.min(20, Number(req.query?.limit) || 5));
  const items = await listAiFeedback(req.user.id, { limit });
  res.json({ items });
})));

app.get("/api/plans", handleAsync(async (req, res) => {
  const plans = await listActivePlans();
  res.json({
    plans,
    currency: "USD",
    providers: {
      stripe: PAYMENT_PROVIDERS.stripe,
      cryptomus: PAYMENT_PROVIDERS.cryptomus
    }
  });
}));

app.get("/api/admin/plans", adminRequired(handleAsync(async (req, res) => {
  const plans = await listAllPlans();
  res.json({ plans });
})));

app.post("/api/admin/plans", adminRequired(handleAsync(async (req, res) => {
  const plan = await createPlan(req.body || {});
  res.status(201).json({ plan });
})));

app.put("/api/admin/plans/:id", adminRequired(handleAsync(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid plan id" });
  }
  const plan = await updatePlan(id, req.body || {});
  res.json({ plan });
})));

app.get("/api/admin/subscriptions", adminRequired(handleAsync(async (req, res) => {
  const { limit, status, userId } = req.query || {};
  const normalizedStatus = Object.values(SUBSCRIPTION_STATUS).includes(status) ? status : undefined;
  const userFilter = Number(userId);
  const items = await listSubscriptions({
    limit,
    status: normalizedStatus,
    userId: Number.isFinite(userFilter) && userFilter > 0 ? userFilter : undefined
  });
  res.json({ subscriptions: items });
})));

app.post("/api/admin/subscriptions/:reference/status", adminRequired(handleAsync(async (req, res) => {
  const reference = req.params.reference;
  const status = req.body?.status;
  if (!reference || typeof status !== "string" || !Object.values(SUBSCRIPTION_STATUS).includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const updated = await markSubscriptionStatus(reference, status, req.body || {});
  res.json({ subscription: updated });
})));

app.post("/api/admin/subscriptions/:reference/activate", adminRequired(handleAsync(async (req, res) => {
  const reference = req.params.reference;
  if (!reference) {
    return res.status(400).json({ error: "Reference is required" });
  }
  const overrides = {
    startedAt: req.body?.startedAt,
    expiresAt: req.body?.expiresAt,
    amountUSD: req.body?.amountUSD,
    currency: req.body?.currency,
    metadata: req.body?.metadata,
    providerInvoiceId: req.body?.providerInvoiceId,
    providerSessionId: req.body?.providerSessionId
  };
  const subscription = await activateSubscription(reference, overrides);
  if (!subscription) {
    return res.status(404).json({ error: "Subscription not found" });
  }
  res.json({ subscription });
})));

app.get("/healthz", handleAsync(async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) as count FROM rules");
    res.json({ ok: true, rulesCount: rows[0]?.count || 0 });
  } catch {
    res.status(500).json({ ok: false });
  }
}));

app.post("/webhooks/stripe", async (req, res) => {
  if (!stripeClient || !STRIPE_WEBHOOK_SECRET) {
    return res.json({ ok: true });
  }
  const signature = req.headers["stripe-signature"];
  if (!signature || !req.rawBody) {
    return res.status(400).json({ error: "Missing Stripe signature" });
  }
  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature error", err.message);
    return res.status(400).json({ error: "Invalid Stripe signature" });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object || {};
      const reference = session.client_reference_id || session.metadata?.reference;
      if (reference) {
        await activateSubscription(reference, {
          providerInvoiceId: session.payment_intent || session.id,
          amountUSD: session.amount_total ? Number(session.amount_total) / 100 : undefined,
          currency: session.currency ? session.currency.toUpperCase() : "USD",
          metadata: { eventId: event.id, type: event.type }
        });
      }
    } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data?.object || {};
      const reference = session.client_reference_id || session.metadata?.reference;
      if (reference) {
        await markSubscriptionStatus(reference, SUBSCRIPTION_STATUS.FAILED, {
          metadata: { eventId: event.id, type: event.type }
        });
      }
    }
  } catch (err) {
    console.error("Stripe webhook handling error", err);
    return res.status(500).json({ error: "Failed to process Stripe webhook" });
  }

  res.json({ received: true });
});

app.post("/webhooks/cryptomus", async (req, res) => {
  if (!PAYMENT_PROVIDERS.cryptomus) {
    return res.json({ ok: true });
  }
  const payload = req.body || {};
  const signature = req.headers?.sign || req.headers?.["x-sign"];
  const merchantHeader = req.headers?.merchant;
  if (CRYPTOMUS_MERCHANT_ID && merchantHeader && merchantHeader !== CRYPTOMUS_MERCHANT_ID) {
    return res.status(400).json({ error: "Invalid merchant" });
  }
  const rawBody = req.rawBody;
  if (!verifyCryptomusSignature(payload, signature, rawBody)) {
    console.error("Cryptomus webhook signature mismatch", payload);
    return res.status(400).json({ error: "Invalid signature" });
  }

  const result = extractCryptomusResult(payload);

  const reference = payload?.order_id
    || payload?.orderId
    || payload?.merchant_order_id
    || result?.order_id
    || result?.orderId
    || result?.merchant_order_id;
  if (!reference) {
    return res.json({ ok: true });
  }

  const status = String(payload?.status || payload?.state || result?.status || result?.state || "").toLowerCase();
  const successfulStates = new Set(["paid", "paid_over", "paid_partially", "success"]);
  const failedStates = new Set(["cancelled", "canceled", "failed", "expired", "error"]);

  try {
    if (successfulStates.has(status)) {
      const amount = Number(payload?.amount || payload?.paid_amount || payload?.payment_amount || result?.amount || result?.paid_amount || result?.payment_amount);
      await activateSubscription(reference, {
        providerInvoiceId: payload?.uuid || payload?.payment_uuid || payload?.invoice_uuid || result?.uuid || result?.payment_uuid || result?.invoice_uuid || null,
        amountUSD: Number.isFinite(amount) ? amount : undefined,
        currency: payload?.currency || result?.currency || "USD",
        metadata: payload
      });
    } else if (failedStates.has(status)) {
      await markSubscriptionStatus(reference, SUBSCRIPTION_STATUS.FAILED, { metadata: payload });
    }
  } catch (err) {
    console.error("Cryptomus webhook handling error", err);
    return res.status(500).json({ error: "Failed to process Cryptomus webhook" });
  }

  res.json({ received: true });
});

app.use("/", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 8080;

async function getEngineSnapshots() {
  const [rows] = await pool.query(
    `SELECT u.id as user_id, k.api_key, k.api_secret
     FROM users u
     INNER JOIN user_api_keys k ON k.user_id = u.id`
  );
  const tasks = Array.isArray(rows) ? rows : [];

  async function mapWithConcurrency(items, mapper, limit = SNAPSHOT_CONCURRENCY) {
    const size = Math.max(1, Math.min(limit, items.length || 0));
    const results = new Array(items.length);
    let pointer = 0;

    async function worker() {
      while (true) {
        const index = pointer;
        if (index >= items.length) break;
        pointer += 1;
        try {
          results[index] = await mapper(items[index], index);
        } catch (err) {
          console.error("[ENGINE] snapshot build error", err);
          results[index] = null;
        }
      }
    }

    const workers = [];
    for (let i = 0; i < size; i += 1) {
      workers.push(worker());
    }
    await Promise.all(workers);
    return results;
  }

  const snapshots = await mapWithConcurrency(tasks, async row => {
    const cacheKey = row.user_id;
    let cached = credentialCache.get(cacheKey);
    if (!cached || cached.rawKey !== row.api_key || cached.rawSecret !== row.api_secret) {
      const apiKey = decryptSecret(row.api_key);
      const apiSecret = decryptSecret(row.api_secret);
      cached = { rawKey: row.api_key, rawSecret: row.api_secret, apiKey, apiSecret };
      credentialCache.set(cacheKey, cached);
    }
    if (!cached.apiKey || !cached.apiSecret) return null;

    const rules = await readRules(row.user_id);
    const active = rules.filter(r => r.enabled);
    if (!active.length) return null;

    return {
      userId: row.user_id,
      credentials: { apiKey: cached.apiKey, apiSecret: cached.apiSecret },
      rules: active
    };
  });

  return snapshots.filter(Boolean);
}

async function bootstrap() {
  await initDb();
  app.listen(PORT, () => {
    console.log("my1 platform running on port", PORT);
  });
  engineManager = new EngineManager({
    getSnapshots: getEngineSnapshots,
    intervalMs: ENGINE_INTERVAL_MS,
    hooks: {
      reportRuleIssue: async ({ userId, ruleId, code, message }) => {
        const result = await upsertRuleError({ userId, ruleId, code, message });
        if (result?.changed) {
          await triggerNotifications(userId, NOTIFICATION_EVENT_TYPES.RULE_ISSUE, { ruleId, code, message });
        }
      },
      clearRuleIssue: async ({ userId, ruleId }) => {
        await clearRuleError(userId, ruleId);
      },
      loadRuleState: async ({ userId, ruleId }) => {
        const state = await getRuleState(userId, ruleId);
        return state;
      },
      saveRuleState: async ({ userId, ruleId, state }) => {
        await saveRuleState(userId, ruleId, state);
        return true;
      },
      notifyRuleEvent: async ({ userId, eventType, payload }) => {
        await triggerNotifications(userId, eventType || NOTIFICATION_EVENT_TYPES.POSITION_OPENED, payload || {});
      }
    }
  });
  engineManager.start();
}

bootstrap().catch(err => {
  console.error("Failed to start server", err);
  process.exit(1);
});
