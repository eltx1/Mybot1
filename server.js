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

function readRules() {
ensureDataFiles();
return safeReadJSON(rulesPath, []);
}

function writeRules(r) {
try {
ensureDataFiles();
const tmp = rulesPath + ".tmp";
fs.writeFileSync(tmp, JSON.stringify(r, null, 2));
fs.renameSync(tmp, rulesPath);
} catch (e) {
console.error("writeRules error:", e.message);
}
}

app.get("/api/rules", (req, res) => { res.json(readRules()); });

app.post("/api/rules", (req, res) => {
const rules = Array.isArray(req.body) ? req.body : [req.body];
writeRules(rules);
res.json({ ok: true, count: rules.length });
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
    const rules = readRules();
    const data = [];
    for (const r of rules) {
      const orders = await openOrders(r.symbol);
      data.push({ symbol: r.symbol, orders });
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use("/", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
console.log("my1 engine running on port", PORT);
});

runEngine(readRules);
