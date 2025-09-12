import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runEngine } from "./strategy.js";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// CORS allowlist
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

// Rules storage (JSON file)
const rulesPath = path.join(__dirname, "data", "rules.json");
function readRules(){ if (!fs.existsSync(rulesPath)) return []; try{ return JSON.parse(fs.readFileSync(rulesPath, "utf8")); } catch{ return []; } }
function writeRules(r){ fs.writeFileSync(rulesPath, JSON.stringify(r, null, 2)); }

app.get("/api/rules", (req,res)=>{ res.json(readRules()); });
app.post("/api/rules", (req,res)=>{
  const rules = Array.isArray(req.body) ? req.body : [req.body];
  writeRules(rules);
  res.json({ ok:true, count: rules.length });
});

// Static UI
app.use("/", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=>{ console.log("my1 engine running on port", PORT); });

// Start engine
runEngine(readRules);
