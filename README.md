my1 — Binance Spot Dip-Buy / Take-Profit Engine

Single-user, lightweight engine that places limit buy orders on dips and limit sell take-profits automatically.
Server keeps your Binance API keys safe; rules are stored in a local JSON file (no DB required).

Use at your own risk. Start with tiny budgets. Enable Binance API IP whitelist. Grant Read + Spot Trade only.

⸻

Features
	•	Add simple rules per symbol: buy on dip %, take-profit %, budget (USDT).
	•	Places/refreshes LIMIT / LIMIT_MAKER orders (maker-only optional to minimize fees).
	•	Auto TP: on a filled BUY, engine places a SELL at filledPrice × (1 + tp%).
	•	Respects tickSize, stepSize, minNotional from exchange info.
	•	Pure JSON storage (data/rules.json) — easy to start, no database ops.
	•	CORS allow-list (subdomain only), keys in .env, no secrets in frontend.

my1-app/
  package.json
  .env.example
  server.js          # Express server + API + engine bootstrap
  binance.js         # Signed REST helpers (HMAC)
  strategy.js        # Dip-buy/TP logic (polling loop)
  public/
    index.html       # Minimal UI to manage rules (English)
  data/
    rules.json       # Rules storage (JSON, single user)

    Requirements
	•	Node.js 18+
	•	PM2 (recommended for persistent run): npm i -g pm2
	•	A VPS/cPanel where you can run Node
	•	Binance API key with Read + Spot Trade only, IP whitelisted


Quick Start (Server)
git clone https://github.com/<YOUR_USERNAME>/my1-app.git
cd my1-app
cp .env.example .env
# edit .env with your keys and domain:
# BINANCE_KEY=...
# BINANCE_SECRET=...
# ALLOWED_ORIGINS=https://my1.eltx.online

npm install
pm2 start server.js --name my1
pm2 save

Reverse Proxy (Apache, Subdomain)

Create subdomain my1.eltx.online (Document Root e.g. public_html/my1) and put .htaccess:
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"


Environment Variables (.env)
# Binance
BINANCE_KEY=YOUR_BINANCE_API_KEY
BINANCE_SECRET=YOUR_BINANCE_SECRET
BINANCE_BASE=https://api.binance.com

# App
PORT=8080
ALLOWED_ORIGINS=https://my1.eltx.online
MAKER_ONLY=true                  # true = use LIMIT_MAKER
MAX_SYMBOL_ALLOCATION_USDT=200   # safety cap per symbol


Frontend (Rules UI)

Open https://my1.eltx.online and add rules:
	•	Symbol: e.g., SOLUSDT
	•	Buy on dip %: e.g., 2
	•	Take-profit %: e.g., 2
	•	Budget (USDT): e.g., 50

Click Save & run.
Rules are saved to data/rules.json. Engine polls every ~5s.

⸻

How It Works

For each rule:
	1.	Fetch current avg price (/api/v3/avgPrice).
	2.	Compute buy target: price × (1 − dipPct%), rounded to tick.
	3.	Compute quantity from budget and respect stepSize/minNotional.
	4.	If no open BUY, place LIMIT (or LIMIT_MAKER).
	5.	If an open BUY drifts > 0.3% from target, cancel & replace.
	6.	Detect BUY fills via recent myTrades and place SELL TP at filled × (1 + tp%).

⸻

API (internal)
	•	GET /api/rules → returns current rules array.
	•	POST /api/rules → body: array of rules
 [
  { "symbol":"SOLUSDT", "dipPct":2, "tpPct":2, "budgetUSDT":50, "enabled":true }
]


Engine starts automatically with the current rules when server.js boots.

# First time
pm2 start server.js --name my1 && pm2 save

# Subsequent updates
git pull
pm2 restart my1

Security Checklist
	•	✅ API keys not exposed to frontend.
	•	✅ Use Read + Spot Trade only; no withdrawals.
	•	✅ IP whitelist your server in Binance.
	•	✅ Keep repo private; never commit .env.
	•	✅ Start with very small budgets per rule.

⸻

Known Limits / Notes
	•	Single-user, single-process. JSON storage suitable for personal use.
For multi-user or audit logs, migrate to SQLite/MySQL.
	•	Fill detection uses latest trades; for partial fills, engine places TP per last fill size (simple heuristic).
	•	Network errors are retried on the next loop; see server logs for details.

⸻

Roadmap (suggested next steps)
	•	Break-even + fixed target (auto add fee-aware TP).
	•	Cooldown per symbol after fill.
	•	Telegram alerts (fill / error / restart).
	•	Persistent trade logs (SQLite) & simple dashboard.
	•	Optional stop-loss per rule.

⸻

Troubleshooting
	•	Nothing happens: check pm2 logs my1. Ensure ALLOWED_ORIGINS matches your domain.
	•	Orders rejected: symbol filters (tick/step/minNotional) may block too-small budgets. Increase budget or choose another symbol.
	•	403/401: wrong API key/secret or missing IP whitelist.
	•	Frontend blocked: CORS — add your exact origin to ALLOWED_ORIGINS.

⸻

License

Private, personal use. Do not distribute without permission.
