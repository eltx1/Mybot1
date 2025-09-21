const MAKER_ONLY = String(process.env.MAKER_ONLY || "true").toLowerCase() === "true";

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function floorToStep(qty, step) {
  const n = Math.floor(qty / step) * step;
  const s = step.toString();
  const decimals = s.includes(".") ? (s.length - s.indexOf(".") - 1) : 0;
  return Number(n.toFixed(decimals));
}

function roundToTick(price, tick) {
  const n = Math.round(price / tick) * tick;
  const s = tick.toString();
  const decimals = s.includes(".") ? (s.length - s.indexOf(".") - 1) : 0;
  return Number(n.toFixed(decimals));
}

function makeClientOrderId(rule, side) {
  const base = String(rule.id || `${rule.symbol}-${side}`)
    .replace(/[^a-z0-9]/gi, "")
    .slice(-20)
    .toUpperCase();
  const tag = side === "BUY" ? "B" : "S";
  return `MY1${tag}${base}`;
}

function parseBinanceError(err) {
  if (!err) return { code: undefined, message: "" };
  const raw = typeof err.message === "string" ? err.message : String(err);
  let message = raw;
  let code;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (parsed.msg) message = String(parsed.msg);
      if (parsed.code !== undefined) code = parsed.code;
    }
  } catch {}
  return { code, message: typeof message === "string" ? message.trim() : "" };
}

function pickOrderForRule(orders, rule, side) {
  const targetId = makeClientOrderId(rule, side);
  let order = orders.find(o => o.clientOrderId === targetId);
  if (!order) {
    const sameSide = orders.filter(o => o.side === side);
    if (sameSide.length === 1) order = sameSide[0];
  }
  return order;
}

function priceDriftPct(a, b) {
  if (!(a > 0) || !(b > 0)) return Infinity;
  return Math.abs(a - b) / b * 100;
}

async function getFilters(binance, symbol) {
  const info = await binance.exchangeInfo(symbol);
  const market = info.symbols?.find(s => s.symbol === symbol) || info.symbols?.[0];
  if (!market) throw new Error(`Symbol ${symbol} not found in exchangeInfo response`);
  const lot = market.filters.find(f => f.filterType === "LOT_SIZE");
  const price = market.filters.find(f => f.filterType === "PRICE_FILTER");
  const notional = market.filters.find(f => f.filterType === "NOTIONAL" || f.filterType === "MIN_NOTIONAL");
  return {
    stepSize: Number(lot?.stepSize || 0),
    minQty: Number(lot?.minQty || 0),
    tickSize: Number(price?.tickSize || 0),
    minNotional: notional ? Number(notional.minNotional) : 10
  };
}

async function processRule({ binance, rule, caches, lastTradeId, userKey, hooks }) {
  const symbol = (rule.symbol || "").toUpperCase();
  if (!symbol) return;
  const enabled = rule.enabled !== false;
  if (!enabled) return;

  const type = String(rule.type || "manual").toLowerCase() === "ai" ? "ai" : "manual";
  const ruleKey = `${userKey}:${rule.id || `${type}:${symbol}`}`;

  const numericUserId = Number(userKey);
  const reportIssue = async (code, message) => {
    if (!hooks?.reportRuleIssue || !rule?.id || !Number.isFinite(numericUserId) || !message) return;
    try {
      await hooks.reportRuleIssue({ userId: numericUserId, ruleId: rule.id, code, message });
    } catch (err) {
      console.error(`[ENGINE] failed to report issue for ${symbol}:`, err.message);
    }
  };
  const clearIssue = async () => {
    if (!hooks?.clearRuleIssue || !rule?.id || !Number.isFinite(numericUserId)) return;
    try {
      await hooks.clearRuleIssue({ userId: numericUserId, ruleId: rule.id });
    } catch (err) {
      console.error(`[ENGINE] failed to clear issue for ${symbol}:`, err.message);
    }
  };

  if (!caches.filter[symbol]) {
    try {
      caches.filter[symbol] = await getFilters(binance, symbol);
    } catch (err) {
      console.error(`[ENGINE] filters error for ${symbol}:`, err.message);
      return;
    }
  }
  const filters = caches.filter[symbol];
  if (!filters || !(filters.stepSize > 0) || !(filters.tickSize > 0)) return;

  if (!caches.price[symbol]) {
    try {
      const { price } = await binance.avgPrice(symbol);
      caches.price[symbol] = Number(price);
    } catch (err) {
      console.error(`[ENGINE] price error for ${symbol}:`, err.message);
      return;
    }
  }
  const currentPrice = caches.price[symbol];
  if (!(currentPrice > 0)) return;

  const budget = Number(rule.budgetUSDT);
  if (!(budget > 0)) return;

  let buyTarget = 0;
  let tpPct = Number(rule.tpPct);
  if (type === "manual") {
    const dipPct = Number(rule.dipPct);
    if (!(dipPct > 0) || !(tpPct > 0)) return;
    buyTarget = roundToTick(currentPrice * (1 - dipPct / 100), filters.tickSize);
  } else {
    buyTarget = roundToTick(Number(rule.entryPrice), filters.tickSize);
  }
  if (!(buyTarget > 0)) return;

  let qty = floorToStep(budget / buyTarget, filters.stepSize);
  if (qty < filters.minQty || (qty * buyTarget) < filters.minNotional) {
    return;
  }

  if (!caches.orders[symbol]) {
    try {
      caches.orders[symbol] = await binance.openOrders(symbol);
    } catch (err) {
      console.error(`[ENGINE] openOrders error for ${symbol}:`, err.message);
      return;
    }
  }
  let orders = caches.orders[symbol] || [];

  const buyId = makeClientOrderId(rule, "BUY");
  const sellId = makeClientOrderId(rule, "SELL");

  const getRecentBuy = async () => {
    if (!caches.trades[symbol]) {
      try {
        caches.trades[symbol] = await binance.myTrades(symbol, 10);
      } catch (err) {
        console.error(`[ENGINE] trades error for ${symbol}:`, err.message);
        caches.trades[symbol] = [];
      }
    }
    const trades = caches.trades[symbol];
    if (!Array.isArray(trades) || !trades.length) return null;
    return [...trades].reverse().find(t => t.isBuyer) || null;
  };

  const tryHandleFilledBuy = async () => {
    const recentBuy = await getRecentBuy();
    if (!recentBuy) return false;

    const tradeId = recentBuy.id ?? recentBuy.tradeId;
    if (tradeId === undefined || tradeId === lastTradeId.get(ruleKey)) return false;

    const tradeTime = Number(recentBuy.time ?? recentBuy.T ?? recentBuy.transactTime ?? recentBuy.updateTime);
    const ruleCreatedAt = Number(rule.createdAt);
    if (Number.isFinite(tradeTime) && Number.isFinite(ruleCreatedAt) && tradeTime + 60000 < ruleCreatedAt) {
      return false;
    }

    const filledPrice = Number(recentBuy.price);
    if (!(filledPrice > 0)) return false;
    const fillDrift = priceDriftPct(filledPrice, buyTarget);
    if (fillDrift > 1.5) return false;

    const filledQty = floorToStep(Number(recentBuy.qty), filters.stepSize);
    if (!(filledQty > 0)) return false;

    lastTradeId.set(ruleKey, tradeId);

    let sellPrice = 0;
    if (type === "manual") {
      sellPrice = roundToTick(filledPrice * (1 + tpPct / 100), filters.tickSize);
    } else {
      sellPrice = roundToTick(Number(rule.exitPrice), filters.tickSize);
    }
    if (!(sellPrice > 0)) return false;

    const sellOrder = pickOrderForRule(orders, rule, "SELL");
    if (sellOrder) return true;

    try {
      await binance.placeLimit(symbol, "SELL", filledQty, sellPrice, { makerOnly: MAKER_ONLY, clientOrderId: sellId });
      caches.orders[symbol] = null;
      await clearIssue();
    } catch (err) {
      console.error(`[ENGINE] place SELL failed for ${symbol}:`, err.message);
    }
    return true;
  };

  let buyOrder = pickOrderForRule(orders, rule, "BUY");
  if (buyOrder) {
    await clearIssue();
  }

  if (await tryHandleFilledBuy()) {
    return;
  }

  if (!buyOrder) {
    try {
      await binance.placeLimit(symbol, "BUY", qty, buyTarget, { makerOnly: MAKER_ONLY, clientOrderId: buyId });
      caches.orders[symbol] = null;
      await clearIssue();
    } catch (err) {
      console.error(`[ENGINE] place BUY failed for ${symbol}:`, err.message);
      const details = parseBinanceError(err);
      const lower = (details.message || "").toLowerCase();
      if (lower.includes("not whitelisted")) {
        const friendly = `Binance rejected ${symbol} because it is not enabled for your API key. Enable the pair in your Binance API restrictions and try again.`;
        await reportIssue("symbol_not_whitelisted", friendly);
      }
    }
    return;
  }

  const drift = priceDriftPct(Number(buyOrder.price), buyTarget);
  if (drift > 0.3) {
    try {
      await binance.cancelOrder(symbol, buyOrder.orderId);
    } catch {}
    try {
      await binance.placeLimit(symbol, "BUY", qty, buyTarget, { makerOnly: MAKER_ONLY, clientOrderId: buyId });
      caches.orders[symbol] = null;
      await clearIssue();
    } catch (err) {
      console.error(`[ENGINE] replace BUY failed for ${symbol}:`, err.message);
    }
    return;
  }

  await tryHandleFilledBuy();
}

async function processSnapshot(snapshot, lastTradeId, hooks) {
  const { userId, binance, rules } = snapshot;
  if (!binance || !Array.isArray(rules) || !rules.length) return;

  const caches = {
    price: {},
    filter: {},
    orders: {},
    trades: {}
  };
  const userKey = String(userId);

  for (const rule of rules) {
    try {
      await processRule({ binance, rule: rule || {}, caches, lastTradeId, userKey, hooks });
    } catch (err) {
      console.error(`[ENGINE] unexpected error for rule ${rule?.id || "unknown"}:`, err.message);
    }
  }
}

export function runEngine(getSnapshots, hooks = {}) {
  const lastTradeId = new Map();

  async function loop() {
    while (true) {
      try {
        const snapshots = await getSnapshots();
        if (Array.isArray(snapshots)) {
          for (const snapshot of snapshots) {
            await processSnapshot(snapshot || {}, lastTradeId, hooks);
          }
        }
      } catch (err) {
        console.error("[ENGINE]", err.message);
      }
      await sleep(5000);
    }
  }

  loop();
}
