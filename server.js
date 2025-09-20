// --- ESM dirname + dotenv (must be first lines) ---
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Load .env from the app directory explicitly
dotenv.config({ path: path.join(__dirname, ".env") });
// --- end bootstrap ---

// (keep the rest of your imports and code below)
import express from "express";
import fs from "fs";
import fetch from "node-fetch";
import { randomUUID } from "crypto";
import { runEngine } from "./strategy.js";
import { openOrders } from "./binance.js";

const app = express();
app.use(express.json());

const allowList = (process.env.ALLOWED_ORIGINS || "").split(",").map(s=>s.trim()).filter(Boolean);
app.use((req,res,next)=>{
const origin = req.headers.origin || "";
if (allowList.includes(origin)) {
res.setHeader("Access-Control-Allow-Origin", origin);
res.setHeader("Vary", "Origin");
res.setHeader("Access-Control-Allow-Credentials", "true");
res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
}
if (req.method === "OPTIONS") return res.sendStatus(200);
next();
});

const dataDir = path.join(__dirname, "data");
const rulesPath = path.join(dataDir, "rules.json");
const DEFAULT_AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_AI_BUDGET = (() => {
  const raw = Number(process.env.DEFAULT_AI_BUDGET);
  return Number.isFinite(raw) && raw > 0 ? raw : 100;
})();

function ensureDataFiles() {
try {
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(rulesPath)) fs.writeFileSync(rulesPath, "[]\n", { encoding: "utf8" });
} catch (e) {
console.error("ensureDataFiles error:", e.message);
}
}
ensureDataFiles();

function safeReadJSON(file, fallback) {
try {
const raw = fs.readFileSync(file, "utf8");
return JSON.parse(raw || "[]");
} catch (e) {
console.warn("safeReadJSON fallback:", e.message);
return fallback;
}
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

function readRules() {
  ensureDataFiles();
  const raw = safeReadJSON(rulesPath, []);
  const { rules, mutated } = normalizeRules(raw);
  if (mutated) {
    writeRules(rules);
    return rules;
  }
  return rules;
}

function writeRules(r) {
  try {
    const { rules } = normalizeRules(r);
    ensureDataFiles();
    const tmp = rulesPath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(rules, null, 2));
    fs.renameSync(tmp, rulesPath);
  } catch (e) {
    console.error("writeRules error:", e.message);
  }
}

app.get("/api/rules", (req, res) => { res.json(readRules()); });

app.post("/api/rules", (req, res) => {
  const rules = Array.isArray(req.body) ? req.body : [req.body];
  const { rules: normalized } = normalizeRules(rules);
  writeRules(normalized);
  res.json({ ok: true, count: normalized.length, rules: normalized });
});

app.delete("/api/rules/:id", (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "id is required" });
  const rules = readRules();
  const next = rules.filter(r => r.id !== id);
  if (next.length === rules.length) {
    return res.status(404).json({ error: "Rule not found" });
  }
  writeRules(next);
  res.json({ ok: true, count: next.length, rules: next });
});

app.get("/healthz", (req, res) => {
try {
ensureDataFiles();
res.json({ ok: true, rulesCount: readRules().length });
} catch {
res.status(500).json({ ok: false });
}
});

app.get("/api/orders", async (req, res) => {
  try {
    const symbols = Array.from(new Set(readRules().map(r => r.symbol).filter(Boolean)));
    const data = [];
    for (const symbol of symbols) {
      const orders = await openOrders(symbol);
      data.push({ symbol, orders });
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function parseAiRoleResponse(text) {
  if (!text) throw new Error("Empty response from AI");
  const cleaned = text.replace(/\r/g, "").trim();
  const lines = cleaned.split(/\n+/).map(l => l.trim()).filter(Boolean);
  let symbol = "";
  let entryPrice = null;
  let exitPrice = null;

  const parseNumberToken = token => {
    if (!token) return NaN;
    let str = String(token).trim();
    str = str.replace(/\s+/g, "");
    str = str.replace(/[\u066c]/g, ".");
    const hasComma = str.includes(",");
    const hasDot = str.includes(".");
    if (hasComma && hasDot) {
      str = str.replace(/,/g, "");
    } else if (hasComma && !hasDot) {
      str = str.replace(/,/g, ".");
    } else {
      str = str.replace(/,/g, "");
    }
    str = str.replace(/[^0-9.]/g, "");
    const num = Number(str);
    return Number.isFinite(num) ? num : NaN;
  };
  const numberFromLine = line => {
    const match = line.match(/([0-9]+(?:[.,\u066c][0-9]+)?)/);
    if (!match) return null;
    const n = parseNumberToken(match[1]);
    return Number.isFinite(n) ? n : null;
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!symbol && (lower.includes("زوج") || lower.includes("pair") || lower.includes("symbol"))) {
      const symMatch = line.match(/([A-Z]{3,}(?:USDT|USDC|BUSD|BTC|ETH)?)/);
      if (symMatch) symbol = symMatch[1].replace(/[^A-Z0-9]/gi, "").toUpperCase();
    }
    if (!entryPrice && (lower.includes("دخول") || lower.includes("entry") || lower.includes("limit"))) {
      const num = numberFromLine(line);
      if (num) entryPrice = num;
    }
    if (!exitPrice && (lower.includes("خروج") || lower.includes("take") || lower.includes("ربح") || lower.includes("هدف"))) {
      const num = numberFromLine(line);
      if (num) exitPrice = num;
    }
  }

  if (!symbol) {
    const fallback = cleaned.match(/([A-Z]{3,}(?:USDT|USDC|BUSD|BTC|ETH)?)/);
    if (fallback) symbol = fallback[1].replace(/[^A-Z0-9]/gi, "").toUpperCase();
  }

  const numbers = cleaned.match(/([0-9]+(?:[.,\u066c][0-9]+)?)/g) || [];
  if (!entryPrice && numbers.length >= 1) {
    const parsed = parseNumberToken(numbers[0]);
    if (Number.isFinite(parsed)) entryPrice = parsed;
  }
  if (!exitPrice && numbers.length >= 2) {
    const parsed = parseNumberToken(numbers[numbers.length - 1]);
    if (Number.isFinite(parsed)) exitPrice = parsed;
  }

  if (!symbol || !(entryPrice > 0) || !(exitPrice > 0)) {
    throw new Error("تعذر قراءة الزوج أو نقاط الدخول/الخروج من رد الذكاء الاصطناعي.");
  }

  if (!symbol.endsWith("USDT") && symbol.includes("/")) {
    symbol = symbol.replace("/", "");
  }

  if (symbol.length < 6) {
    throw new Error("الزوج العائد من الذكاء الاصطناعي غير صالح للتداول.");
  }

  return { symbol, entryPrice, exitPrice, raw: cleaned };
}

app.post("/api/ai-role", async (req, res) => {
  try {
    const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
    if (!key) {
      return res.status(400).json({ error: "OPENAI_API_KEY is required" });
    }

    const model = (req.body && req.body.model) || DEFAULT_AI_MODEL;
    const budget = Number(req.body && req.body.budgetUSDT !== undefined ? req.body.budgetUSDT : DEFAULT_AI_BUDGET);
    if (!(budget > 0)) {
      return res.status(400).json({ error: "budgetUSDT must be a positive number" });
    }

    const prompt = "شات جي بي تي قم بتحليل سوق الكريبتو اليوم و الان وتحليل اهم ٧ عملات كريبتو سيوله اليوم والان وتحليل اخبار الكريبتو والاخبار الموثره علي الكريبتو اليوم والان - ثم قم بصنع قاعده شراء وبيع علي بينانس اسبوت بعد تفكير عميق جدا في كل المعطيات التي قمت بتحليلها اليوم علي ان ترسل الرد للبوت يحتوي مباشره وفقط علي :\nالزوج للتداول مثال BTCUSDT\nنقطه الدخول ليميت ميكر\nنقطه الخروج لاخذ الربح ليميت ميكر \nبدون إيقاف خساره";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You are a crypto trading analyst. Reply only with the trading pair, entry limit maker price, and take-profit limit maker price as requested. Do not include stop losses or extra commentary."
          },
          {
            role: "user",
            content: prompt
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

    const current = readRules();
    const aiRule = {
      id: randomUUID(),
      type: "ai",
      symbol: parsed.symbol,
      entryPrice: parsed.entryPrice,
      exitPrice: parsed.exitPrice,
      budgetUSDT: budget,
      enabled: true,
      createdAt: Date.now(),
      aiSummary: parsed.raw,
      aiModel: model
    };

    const combined = [...current, aiRule];
    const { rules: normalized } = normalizeRules(combined);
    writeRules(normalized);
    const saved = normalized.find(r => r.id === aiRule.id) || aiRule;

    res.json({ ok: true, rule: saved });
  } catch (e) {
    console.error("/api/ai-role error", e);
    res.status(500).json({ error: e.message });
  }
});

app.use("/", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
console.log("my1 engine running on port", PORT);
});

runEngine(readRules);
