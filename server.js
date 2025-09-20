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
import {
  randomUUID,
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from "crypto";
import { runEngine } from "./strategy.js";
import { createBinanceClient } from "./binance.js";

const app = express();
app.use(express.json());

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

const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || "change-this-secret";
const CREDENTIALS_SECRET = process.env.CREDENTIALS_SECRET || JWT_SECRET;
const ENC_ALGO = "aes-256-gcm";

const DEFAULT_AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_AI_BUDGET = (() => {
  const raw = Number(process.env.DEFAULT_AI_BUDGET);
  return Number.isFinite(raw) && raw > 0 ? raw : 100;
})();

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

async function readRules(userId) {
  const [rows] = await pool.query(
    `SELECT r.*, e.message AS last_error, e.code AS last_error_code, e.created_at AS last_error_at
     FROM rules r
     LEFT JOIN rule_errors e ON e.rule_id = r.id AND e.user_id = r.user_id
     WHERE r.user_id = ?
     ORDER BY r.created_at ASC`,
    [userId]
  );
  return rows.map(mapRuleRow);
}

async function writeRules(userId, rules) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const ids = [];
    for (const rule of rules) {
      ids.push(rule.id);
      await connection.query(
        `INSERT INTO rules (id, user_id, type, symbol, dip_pct, tp_pct, entry_price, exit_price, budget_usdt, enabled, ai_summary, ai_model, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           type = VALUES(type),
           symbol = VALUES(symbol),
           dip_pct = VALUES(dip_pct),
           tp_pct = VALUES(tp_pct),
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
  if (!userId || !ruleId) return;
  const text = typeof message === "string" ? message.trim() : String(message || "").trim();
  if (!text) return;
  await pool.query(
    `INSERT INTO rule_errors (rule_id, user_id, code, message, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE code = VALUES(code), message = VALUES(message), created_at = VALUES(created_at)`,
    [ruleId, userId, code || null, text, Date.now()]
  );
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

app.post("/api/auth/login", handleAsync(async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPassword = typeof password === "string" ? password : "";

  if (!cleanEmail || !cleanPassword) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await findUserByEmail(cleanEmail);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const match = await bcrypt.compare(cleanPassword, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}));

app.get("/api/auth/me", authRequired(handleAsync(async (req, res) => {
  const hasKeys = await hasApiKeys(req.user.id);
  res.json({ user: req.user, hasApiKeys: hasKeys });
})));

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
  const rules = await readRules(req.user.id);
  res.json({ rules });
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
  await writeRules(req.user.id, normalized);
  const saved = await readRules(req.user.id);
  res.json({ ok: true, count: saved.length, rules: saved });
})));

app.delete("/api/rules/:id", authRequired(handleAsync(async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "id is required" });
  await removeRule(req.user.id, id);
  const saved = await readRules(req.user.id);
  res.json({ ok: true, count: saved.length, rules: saved });
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
  const client = createBinanceClient({ apiKey: creds.apiKey, apiSecret: creds.apiSecret, fallbackToFile: false });
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

  let marketSnapshot = [];
  try {
    const response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload)) {
        marketSnapshot = payload
          .filter(item => typeof item?.symbol === "string" && item.symbol.endsWith("USDT"))
          .map(item => ({
            symbol: item.symbol,
            lastPrice: Number(item.lastPrice || item.last || item.price || 0),
            priceChangePercent: Number(item.priceChangePercent || 0),
            highPrice: Number(item.highPrice || 0),
            lowPrice: Number(item.lowPrice || 0),
            volume: Number(item.volume || 0),
            quoteVolume: Number(item.quoteVolume || 0)
          }))
          .filter(item => Number.isFinite(item.lastPrice) && item.lastPrice > 0)
          .sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0))
          .slice(0, 12);
      }
    }
  } catch (err) {
    console.error("Failed to fetch Binance market snapshot", err);
    marketSnapshot = [];
  }

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

  const current = await readRules(req.user.id);
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

  const combined = [...current, aiRule];
  const { rules: normalized } = normalizeRules(combined);
  await writeRules(req.user.id, normalized);
  const saved = await readRules(req.user.id);
  const created = saved.find(r => r.id === aiRule.id) || aiRule;

  res.json({ ok: true, rule: created });
})));

app.get("/healthz", handleAsync(async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) as count FROM rules");
    res.json({ ok: true, rulesCount: rows[0]?.count || 0 });
  } catch {
    res.status(500).json({ ok: false });
  }
}));

app.use("/", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 8080;

async function getEngineSnapshots() {
  const [rows] = await pool.query(
    `SELECT u.id as user_id, k.api_key, k.api_secret
     FROM users u
     INNER JOIN user_api_keys k ON k.user_id = u.id`
  );
  const snapshots = [];
  for (const row of rows) {
    const apiKey = decryptSecret(row.api_key);
    const apiSecret = decryptSecret(row.api_secret);
    if (!apiKey || !apiSecret) continue;
    const rules = await readRules(row.user_id);
    const active = rules.filter(r => r.enabled);
    if (!active.length) continue;
    const binance = createBinanceClient({ apiKey, apiSecret, fallbackToFile: false });
    snapshots.push({ userId: row.user_id, binance, rules: active });
  }
  return snapshots;
}

async function bootstrap() {
  await initDb();
  app.listen(PORT, () => {
    console.log("my1 platform running on port", PORT);
  });
  runEngine(getEngineSnapshots, {
    reportRuleIssue: async ({ userId, ruleId, code, message }) => {
      await upsertRuleError({ userId, ruleId, code, message });
    },
    clearRuleIssue: async ({ userId, ruleId }) => {
      await clearRuleError(userId, ruleId);
    }
  });
}

bootstrap().catch(err => {
  console.error("Failed to start server", err);
  process.exit(1);
});
