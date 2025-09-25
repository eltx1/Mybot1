import { ensureTicker, getTickerPrice } from "./lib/market-data.js";
import { splitSymbolPair } from "./lib/trades.js";

const MAKER_ONLY = String(process.env.MAKER_ONLY || "true").toLowerCase() === "true";
const STATE_VERSION = 1;
const STOP_SUFFIX = "STP";
const TP_ID_PREFIX = "TP";
const MAX_PROCESSED_TRADE_IDS = 50;
const BUY_PRICE_DRIFT_THRESHOLD = 0.35;
const SELL_PRICE_DRIFT_THRESHOLD = 0.5;
const TRAILING_UPDATE_THRESHOLD = 0.1;
const DEFAULT_INDICATOR_INTERVAL = "15m";
const DEFAULT_RSI_PERIOD = 14;
const DEFAULT_MACD_FAST = 12;
const DEFAULT_MACD_SLOW = 26;
const DEFAULT_MACD_SIGNAL = 9;
const INDICATOR_INTERVALS = new Set([
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1d"
]);

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

function clampNumber(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const bounded = Math.max(min, Math.min(max, num));
  return bounded;
}

function clampInteger(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num);
  const bounded = Math.max(min, Math.min(max, rounded));
  return bounded;
}

function parseIndicatorSettings(rule) {
  const raw = rule?.indicatorSettings;
  if (!raw || typeof raw !== "object") return null;
  const interval = INDICATOR_INTERVALS.has(String(raw.interval || "").toLowerCase())
    ? String(raw.interval).toLowerCase()
    : DEFAULT_INDICATOR_INTERVAL;
  const rsiPeriod = clampInteger(raw.rsiPeriod, 2, 100) ?? DEFAULT_RSI_PERIOD;
  const macdFast = clampInteger(raw.macdFast, 1, 200) ?? DEFAULT_MACD_FAST;
  let macdSlow = clampInteger(raw.macdSlow, macdFast + 1, 300) ?? DEFAULT_MACD_SLOW;
  if (macdSlow <= macdFast) macdSlow = macdFast + 1;
  const macdSignal = clampInteger(raw.macdSignal, 1, 100) ?? DEFAULT_MACD_SIGNAL;
  const settings = {
    interval,
    rsiPeriod,
    macdFast,
    macdSlow,
    macdSignal
  };
  const entryMax = clampNumber(raw.rsiEntryMax, 0, 100);
  if (entryMax !== null && entryMax > 0) {
    settings.rsiEntryMax = Number(entryMax.toFixed(2));
  }
  const exitMin = clampNumber(raw.rsiExitMin, 0, 100);
  if (exitMin !== null && exitMin > 0) {
    settings.rsiExitMin = Number(exitMin.toFixed(2));
  }
  const entryTrendRaw = typeof raw.macdEntry === "string" ? raw.macdEntry.toLowerCase() : "";
  if (entryTrendRaw === "bullish" || entryTrendRaw === "bearish") {
    settings.macdEntry = entryTrendRaw;
  }
  const exitTrendRaw = typeof raw.macdExit === "string" ? raw.macdExit.toLowerCase() : "";
  if (exitTrendRaw === "bullish" || exitTrendRaw === "bearish") {
    settings.macdExit = exitTrendRaw;
  }
  const hasConditions = settings.rsiEntryMax !== undefined
    || settings.rsiExitMin !== undefined
    || settings.macdEntry !== undefined
    || settings.macdExit !== undefined;
  return hasConditions ? settings : null;
}

function requiresEntryIndicators(settings) {
  return Boolean(settings && (settings.rsiEntryMax !== undefined || settings.macdEntry));
}

function requiresExitIndicators(settings) {
  return Boolean(settings && (settings.rsiExitMin !== undefined || settings.macdExit));
}

function calculateRsi(values, period) {
  if (!Array.isArray(values) || values.length <= period) return null;
  const closes = values.map(Number).filter(v => Number.isFinite(v));
  if (closes.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let averageGain = gains / period;
  let averageLoss = losses / period;
  for (let i = period + 1; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    averageGain = ((averageGain * (period - 1)) + gain) / period;
    averageLoss = ((averageLoss * (period - 1)) + loss) / period;
  }
  if (averageLoss === 0) return 100;
  const rs = averageGain / averageLoss;
  if (!Number.isFinite(rs)) return null;
  const rsi = 100 - (100 / (1 + rs));
  return Number(rsi.toFixed(2));
}

function calculateMacd(values, fastPeriod, slowPeriod, signalPeriod) {
  if (!Array.isArray(values) || values.length < slowPeriod + signalPeriod) return null;
  const closes = values.map(Number).filter(v => Number.isFinite(v));
  if (closes.length < slowPeriod + signalPeriod) return null;
  const fastK = 2 / (fastPeriod + 1);
  const slowK = 2 / (slowPeriod + 1);
  const signalK = 2 / (signalPeriod + 1);
  let fastEma = closes.slice(0, fastPeriod).reduce((sum, v) => sum + v, 0) / fastPeriod;
  let slowEma = closes.slice(0, slowPeriod).reduce((sum, v) => sum + v, 0) / slowPeriod;
  for (let i = fastPeriod; i < slowPeriod; i += 1) {
    fastEma = closes[i] * fastK + fastEma * (1 - fastK);
  }
  const macdValues = [];
  for (let i = slowPeriod; i < closes.length; i += 1) {
    fastEma = closes[i] * fastK + fastEma * (1 - fastK);
    slowEma = closes[i] * slowK + slowEma * (1 - slowK);
    macdValues.push(fastEma - slowEma);
  }
  if (macdValues.length < signalPeriod) return null;
  let signalEma = macdValues.slice(0, signalPeriod).reduce((sum, v) => sum + v, 0) / signalPeriod;
  for (let i = signalPeriod; i < macdValues.length; i += 1) {
    signalEma = macdValues[i] * signalK + signalEma * (1 - signalK);
  }
  const macdLine = macdValues[macdValues.length - 1];
  const histogram = macdLine - signalEma;
  return {
    macd: Number(macdLine.toFixed(6)),
    signal: Number(signalEma.toFixed(6)),
    histogram: Number(histogram.toFixed(6))
  };
}

async function loadIndicatorSnapshot(binance, caches, symbol, settings) {
  if (!settings) return null;
  const interval = settings.interval || DEFAULT_INDICATOR_INTERVAL;
  const limit = Math.max(100, settings.macdSlow + settings.macdSignal + 5, settings.rsiPeriod + 5);
  const key = `${symbol}:${interval}:${limit}`;
  if (!Object.prototype.hasOwnProperty.call(caches.candles, key)) {
    try {
      caches.candles[key] = await binance.klines(symbol, interval, limit);
    } catch (err) {
      console.error(`[ENGINE] klines error for ${symbol} ${interval}:`, err?.message || err);
      caches.candles[key] = null;
    }
  }
  const rows = caches.candles[key];
  if (!Array.isArray(rows)) return null;
  const closes = rows
    .map(row => (Array.isArray(row) ? Number(row[4]) : Number(row?.close)))
    .filter(v => Number.isFinite(v) && v > 0);
  if (closes.length < 5) return null;
  const snapshot = {};
  if (settings.rsiEntryMax !== undefined || settings.rsiExitMin !== undefined) {
    const rsi = calculateRsi(closes, settings.rsiPeriod);
    if (rsi !== null) snapshot.rsi = rsi;
  }
  if (settings.macdEntry || settings.macdExit) {
    const macd = calculateMacd(closes, settings.macdFast, settings.macdSlow, settings.macdSignal);
    if (macd) snapshot.macd = macd;
  }
  return Object.keys(snapshot).length ? snapshot : null;
}

function entryIndicatorsAllow(settings, snapshot) {
  if (!settings) return true;
  if (settings.rsiEntryMax !== undefined) {
    if (!snapshot || !Number.isFinite(snapshot?.rsi)) return false;
    if (!(snapshot.rsi <= settings.rsiEntryMax + 1e-8)) return false;
  }
  if (settings.macdEntry) {
    if (!snapshot?.macd) return false;
    const { macd, signal } = snapshot.macd;
    if (!Number.isFinite(macd) || !Number.isFinite(signal)) return false;
    if (settings.macdEntry === "bullish" && !(macd > signal)) return false;
    if (settings.macdEntry === "bearish" && !(macd < signal)) return false;
  }
  return true;
}

function exitIndicatorsAllow(settings, snapshot) {
  if (!settings) return true;
  if (settings.rsiExitMin !== undefined) {
    if (!snapshot || !Number.isFinite(snapshot?.rsi)) return false;
    if (!(snapshot.rsi >= settings.rsiExitMin - 1e-8)) return false;
  }
  if (settings.macdExit) {
    if (!snapshot?.macd) return false;
    const { macd, signal } = snapshot.macd;
    if (!Number.isFinite(macd) || !Number.isFinite(signal)) return false;
    if (settings.macdExit === "bullish" && !(macd > signal)) return false;
    if (settings.macdExit === "bearish" && !(macd < signal)) return false;
  }
  return true;
}

function makeClientOrderId(rule, side, suffix = "") {
  const base = String(rule.id || `${rule.symbol}-${side}`)
    .replace(/[^a-z0-9]/gi, "")
    .slice(-20)
    .toUpperCase();
  const tag = side === "BUY" ? "B" : "S";
  const cleanedSuffix = suffix ? String(suffix).replace(/[^A-Z0-9]/gi, "").toUpperCase() : "";
  return `MY1${tag}${base}${cleanedSuffix}`.slice(0, 32);
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

function priceDriftPct(a, b) {
  if (!(a > 0) || !(b > 0)) return Infinity;
  return Math.abs(a - b) / b * 100;
}

function cloneState(state) {
  if (!state) return null;
  return JSON.parse(JSON.stringify(state));
}

function normaliseTradeId(trade) {
  const id = trade?.id ?? trade?.tradeId;
  if (id === undefined || id === null) return null;
  return String(id);
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

async function getCurrentPrice(symbol, binance, caches) {
  await ensureTicker(symbol);
  const live = getTickerPrice(symbol);
  if (live && live > 0) {
    caches.price[symbol] = live;
    return live;
  }
  if (!caches.price[symbol]) {
    const { price } = await binance.avgPrice(symbol);
    caches.price[symbol] = Number(price);
  }
  return caches.price[symbol];
}

async function getOrders(caches, binance, symbol) {
  if (!Array.isArray(caches.orders[symbol])) {
    caches.orders[symbol] = await binance.openOrders(symbol);
  }
  return Array.isArray(caches.orders[symbol]) ? caches.orders[symbol] : [];
}

async function getTrades(caches, binance, symbol, limit = 50) {
  if (!Array.isArray(caches.trades[symbol])) {
    caches.trades[symbol] = await binance.myTrades(symbol, limit);
  }
  return Array.isArray(caches.trades[symbol]) ? caches.trades[symbol] : [];
}

function buildTakeProfitPlan(rule, quantity, entryPrice, filters) {
  const baseSteps = Array.isArray(rule.takeProfitSteps) ? rule.takeProfitSteps : [];
  const steps = baseSteps.length ? baseSteps : (() => {
    const type = String(rule.type || "manual").toLowerCase();
    if (type === "ai" && Number(rule.exitPrice) > 0) {
      const target = Number(rule.exitPrice);
      const pct = entryPrice > 0 ? ((target - entryPrice) / entryPrice) * 100 : 0;
      return [{ profitPct: pct, portionPct: 100, absolutePrice: target }];
    }
    const tp = Number(rule.tpPct);
    if (tp > 0) {
      return [{ profitPct: tp, portionPct: 100 }];
    }
    return [];
  })();

  const result = [];
  let allocated = 0;
  const { base: baseAsset, quote: quoteAsset } = splitSymbolPair(rule.symbol || "");

  steps.forEach((step, index) => {
    const portion = Math.max(0, Number(step.portionPct) || 0);
    let targetPrice;
    if (Number(step.absolutePrice) > 0) {
      targetPrice = roundToTick(Number(step.absolutePrice), filters.tickSize);
    } else {
      const pct = Number(step.profitPct) || 0;
      targetPrice = roundToTick(entryPrice * (1 + pct / 100), filters.tickSize);
    }
    if (!(targetPrice > 0)) {
      targetPrice = roundToTick(entryPrice * 1.01, filters.tickSize);
    }
    targetPrice = Math.max(targetPrice, roundToTick(entryPrice * 1.0001, filters.tickSize));
    let qty = floorToStep(quantity * portion / 100, filters.stepSize);
    if (!(qty > 0)) qty = 0;
    result.push({
      id: index + 1,
      profitPct: Number(step.profitPct) || ((targetPrice - entryPrice) / entryPrice) * 100,
      portionPct: portion,
      targetPrice,
      quantity: qty,
      filledQuantity: 0,
      clientOrderId: makeClientOrderId(rule, "SELL", `${TP_ID_PREFIX}${index + 1}`),
      baseAsset,
      quoteAsset
    });
    allocated += qty;
  });

  const remainder = floorToStep(quantity - allocated, filters.stepSize);
  if (remainder > 0) {
    if (result.length) {
      result[result.length - 1].quantity = floorToStep(result[result.length - 1].quantity + remainder, filters.stepSize);
    } else {
      const fallback = roundToTick(entryPrice * 1.02, filters.tickSize);
      result.push({
        id: 1,
        profitPct: ((fallback - entryPrice) / entryPrice) * 100,
        portionPct: 100,
        targetPrice: fallback,
        quantity: remainder,
        filledQuantity: 0,
        clientOrderId: makeClientOrderId(rule, "SELL", `${TP_ID_PREFIX}1`),
        baseAsset,
        quoteAsset
      });
    }
  }

  return result.filter(step => step.quantity >= filters.stepSize && step.targetPrice > 0);
}

function recordProcessedTrade(state, tradeId) {
  if (!state.processedTradeIds) state.processedTradeIds = [];
  if (state.processedTradeIds.includes(tradeId)) return;
  state.processedTradeIds.push(tradeId);
  while (state.processedTradeIds.length > MAX_PROCESSED_TRADE_IDS) {
    state.processedTradeIds.shift();
  }
}

function applySellTrade(state, trade, filters, symbol) {
  const tradeId = normaliseTradeId(trade);
  if (!tradeId || (state.processedTradeIds || []).includes(tradeId)) return false;
  const qty = floorToStep(Number(trade?.qty ?? trade?.executedQty), filters.stepSize);
  if (!(qty > 0)) return false;
  const price = Number(trade?.price) > 0 ? Number(trade.price) : (Number(trade?.quoteQty) || 0) / qty;
  const quoteQty = Number(trade?.quoteQty ?? price * qty);
  let adjustedQuote = quoteQty;
  const commission = Number(trade?.commission);
  const commissionAsset = typeof trade?.commissionAsset === "string" ? trade.commissionAsset.toUpperCase() : "";
  const { base: baseAsset, quote: quoteAsset } = splitSymbolPair(symbol || "");
  if (commission && commissionAsset === quoteAsset) {
    adjustedQuote -= commission;
  } else if (commission && commissionAsset === baseAsset && price > 0) {
    adjustedQuote -= commission * price;
  }
  state.realizedQuote = Number(state.realizedQuote || 0) + adjustedQuote;
  state.remainingQty = Math.max(0, floorToStep(Number(state.remainingQty || 0) - qty, filters.stepSize));
  if (Array.isArray(state.takeProfitPlan)) {
    let remaining = qty;
    for (const step of state.takeProfitPlan) {
      if (!(remaining > 0)) break;
      const filled = Number(step.filledQuantity || 0);
      const stepRemaining = Math.max(0, floorToStep(Number(step.quantity || 0) - filled, filters.stepSize));
      if (!(stepRemaining > 0)) continue;
      const applied = Math.min(stepRemaining, remaining);
      step.filledQuantity = floorToStep(filled + applied, filters.stepSize);
      remaining = floorToStep(remaining - applied, filters.stepSize);
    }
  }
  recordProcessedTrade(state, tradeId);
  state.lastUpdated = Date.now();
  if (!state.closedAt && state.remainingQty <= filters.stepSize / 2) {
    state.remainingQty = 0;
    state.active = false;
    state.closedAt = Date.now();
  }
  return true;
}

function buildInitialStateFromTrade(rule, trade, filters) {
  const qty = floorToStep(Number(trade?.qty ?? trade?.executedQty), filters.stepSize);
  if (!(qty > 0)) return null;
  const rawPrice = Number(trade?.price);
  const quoteQty = Number(trade?.quoteQty);
  const price = rawPrice > 0 ? rawPrice : (quoteQty > 0 ? quoteQty / qty : 0);
  if (!(price > 0)) return null;
  const plan = buildTakeProfitPlan(rule, qty, price, filters);
  const stopLossPct = Number(rule.stopLossPct) > 0 ? Number(rule.stopLossPct) : 0;
  const trailingStopPct = Number(rule.trailingStopPct) > 0 ? Number(rule.trailingStopPct) : 0;
  const baseStop = stopLossPct > 0 ? roundToTick(price * (1 - stopLossPct / 100), filters.tickSize) : null;
  const clientId = makeClientOrderId(rule, "SELL", STOP_SUFFIX);
  return {
    version: STATE_VERSION,
    ruleId: rule.id,
    symbol: rule.symbol,
    active: true,
    lastBuyTradeId: normaliseTradeId(trade),
    entryPrice: price,
    baseQty: qty,
    quoteSpent: quoteQty || price * qty,
    remainingQty: qty,
    stopLossPct,
    trailingStopPct,
    trailingPeakPrice: price,
    trailingStopPrice: baseStop,
    takeProfitPlan: plan,
    stopOrder: baseStop ? { clientOrderId: clientId, stopPrice: baseStop, limitPrice: baseStop } : null,
    processedTradeIds: [normaliseTradeId(trade)].filter(Boolean),
    openedAt: Number(trade?.time ?? trade?.transactTime ?? Date.now()),
    closedAt: null,
    realizedQuote: 0,
    lastUpdated: Date.now()
  };
}

async function cancelOrder(binance, symbol, order) {
  if (!order) return;
  try {
    await binance.cancelOrder(symbol, order.orderId);
  } catch (err) {
    console.error(`[ENGINE] cancel order failed for ${symbol}`, err?.message || err);
  }
}

async function ensureTakeProfitOrders({ binance, symbol, rule, state, orders, filters, caches, clearIssue, allowPlacement = true }) {
  if (!Array.isArray(state.takeProfitPlan)) return;
  const minQty = Math.max(filters.minQty, filters.stepSize);
  const prefix = makeClientOrderId(rule, "SELL");
  if (!allowPlacement) {
    for (const order of orders) {
      if (order.side !== "SELL") continue;
      if (typeof order.clientOrderId !== "string") continue;
      if (!order.clientOrderId.startsWith(prefix)) continue;
      await cancelOrder(binance, symbol, order);
      caches.orders[symbol] = null;
    }
    return;
  }
  for (const step of state.takeProfitPlan) {
    const clientId = step.clientOrderId || makeClientOrderId(rule, "SELL", `${TP_ID_PREFIX}${step.id || 1}`);
    step.clientOrderId = clientId;
    const totalQty = floorToStep(Number(step.quantity || 0), filters.stepSize);
    const filled = floorToStep(Number(step.filledQuantity || 0), filters.stepSize);
    const remaining = Math.max(0, floorToStep(totalQty - filled, filters.stepSize));
    const existing = orders.find(o => o.clientOrderId === clientId);
    if (remaining < minQty) {
      if (existing) {
        await cancelOrder(binance, symbol, existing);
        caches.orders[symbol] = null;
      }
      continue;
    }
    if (!existing) {
      try {
        await binance.placeLimit(symbol, "SELL", remaining, step.targetPrice, { makerOnly: MAKER_ONLY, clientOrderId: clientId });
        caches.orders[symbol] = null;
        await clearIssue();
      } catch (err) {
        console.error(`[ENGINE] place SELL failed for ${symbol}:`, err?.message || err);
      }
      continue;
    }
    const drift = priceDriftPct(Number(existing.price || existing.stopPrice || 0), step.targetPrice);
    const qtyDiff = Math.abs(Number(existing.origQty || existing.quantity || existing.qty || 0) - remaining);
    if (drift > SELL_PRICE_DRIFT_THRESHOLD || qtyDiff > filters.stepSize / 2) {
      await cancelOrder(binance, symbol, existing);
      caches.orders[symbol] = null;
      try {
        await binance.placeLimit(symbol, "SELL", remaining, step.targetPrice, { makerOnly: MAKER_ONLY, clientOrderId: clientId });
        caches.orders[symbol] = null;
        await clearIssue();
      } catch (err) {
        console.error(`[ENGINE] replace SELL failed for ${symbol}:`, err?.message || err);
      }
    }
  }

  for (const order of orders) {
    if (order.side !== "SELL") continue;
    if (typeof order.clientOrderId !== "string") continue;
    if (!order.clientOrderId.startsWith(prefix)) continue;
    const matched = state.takeProfitPlan.some(step => step.clientOrderId === order.clientOrderId);
    if (!matched) {
      await cancelOrder(binance, symbol, order);
      caches.orders[symbol] = null;
    }
  }
}

async function ensureStopOrder({ binance, symbol, rule, state, orders, filters, caches }) {
  if (!state.stopLossPct && !state.trailingStopPct) {
    if (state.stopOrder) {
      const existing = orders.find(o => o.clientOrderId === state.stopOrder.clientOrderId);
      if (existing) {
        await cancelOrder(binance, symbol, existing);
        caches.orders[symbol] = null;
      }
    }
    state.stopOrder = null;
    return;
  }

  const minQty = Math.max(filters.minQty, filters.stepSize);
  if (!(state.remainingQty > minQty)) {
    if (state.stopOrder) {
      const existing = orders.find(o => o.clientOrderId === state.stopOrder.clientOrderId);
      if (existing) {
        await cancelOrder(binance, symbol, existing);
        caches.orders[symbol] = null;
      }
    }
    state.stopOrder = null;
    return;
  }

  const baseStop = state.stopLossPct > 0
    ? roundToTick(state.entryPrice * (1 - state.stopLossPct / 100), filters.tickSize)
    : 0;
  const trailingStop = state.trailingStopPct > 0 && state.trailingPeakPrice > 0
    ? roundToTick(state.trailingPeakPrice * (1 - state.trailingStopPct / 100), filters.tickSize)
    : 0;
  let desiredStop = Math.max(baseStop || 0, trailingStop || 0);
  if (!(desiredStop > 0)) {
    desiredStop = baseStop || trailingStop;
  }

  if (!state.stopOrder) {
    state.stopOrder = {
      clientOrderId: makeClientOrderId(rule, "SELL", STOP_SUFFIX),
      stopPrice: desiredStop,
      limitPrice: desiredStop
    };
  } else {
    state.stopOrder.stopPrice = desiredStop;
    state.stopOrder.limitPrice = desiredStop;
  }

  if (!(desiredStop > 0)) {
    const existing = orders.find(o => o.clientOrderId === state.stopOrder.clientOrderId);
    if (existing) {
      await cancelOrder(binance, symbol, existing);
      caches.orders[symbol] = null;
    }
    state.stopOrder = null;
    return;
  }

  const existing = orders.find(o => o.clientOrderId === state.stopOrder.clientOrderId);
  if (!existing) {
    try {
      await binance.placeStopLossLimit(symbol, "SELL", state.remainingQty, desiredStop, desiredStop, { clientOrderId: state.stopOrder.clientOrderId });
      caches.orders[symbol] = null;
    } catch (err) {
      console.error(`[ENGINE] place stop failed for ${symbol}:`, err?.message || err);
    }
    return;
  }

  const existingStop = Number(existing.stopPrice || existing.price || 0);
  const drift = priceDriftPct(existingStop, desiredStop);
  const qtyDiff = Math.abs(Number(existing.origQty || existing.quantity || existing.qty || 0) - state.remainingQty);
  if (drift > SELL_PRICE_DRIFT_THRESHOLD || qtyDiff > filters.stepSize / 2) {
    await cancelOrder(binance, symbol, existing);
    caches.orders[symbol] = null;
    try {
      await binance.placeStopLossLimit(symbol, "SELL", state.remainingQty, desiredStop, desiredStop, { clientOrderId: state.stopOrder.clientOrderId });
      caches.orders[symbol] = null;
    } catch (err) {
      console.error(`[ENGINE] replace stop failed for ${symbol}:`, err?.message || err);
    }
  }
}

function findRecentBuy(trades, state, rule, targetPrice, filters) {
  const sorted = [...trades].sort((a, b) => Number(b?.time || b?.transactTime || 0) - Number(a?.time || a?.transactTime || 0));
  const createdAt = Number(rule.createdAt) || 0;
  for (const trade of sorted) {
    if (!trade || !trade.isBuyer) continue;
    const tradeId = normaliseTradeId(trade);
    if (!tradeId) continue;
    if (state?.lastBuyTradeId && String(state.lastBuyTradeId) === tradeId) continue;
    const timestamp = Number(trade?.time ?? trade?.transactTime ?? Date.now());
    if (createdAt && timestamp + 60000 < createdAt) continue;
    const qty = floorToStep(Number(trade?.qty ?? trade?.executedQty), filters.stepSize);
    if (!(qty > 0)) continue;
    const rawPrice = Number(trade?.price);
    const quoteQty = Number(trade?.quoteQty);
    const price = rawPrice > 0 ? rawPrice : (quoteQty > 0 ? quoteQty / qty : 0);
    if (!(price > 0)) continue;
    if (targetPrice > 0) {
      const drift = priceDriftPct(price, targetPrice);
      if (drift > 1.5) continue;
    }
    return trade;
  }
  return null;
}

async function processRule({ binance, rule, caches, userId, hooks, stateManager }) {
  const symbol = (rule.symbol || "").toUpperCase();
  if (!symbol || rule.enabled === false) return;

  const type = String(rule.type || "manual").toLowerCase() === "ai" ? "ai" : "manual";
  const budget = Number(rule.budgetUSDT);
  if (!(budget > 0)) return;

  const indicatorSettings = type === "manual" ? parseIndicatorSettings(rule) : null;
  let indicatorSnapshot = null;
  const getIndicatorSnapshot = async () => {
    if (!indicatorSettings) return null;
    if (!indicatorSnapshot) {
      indicatorSnapshot = await loadIndicatorSnapshot(binance, caches, symbol, indicatorSettings);
    }
    return indicatorSnapshot;
  };

  if (!caches.filter[symbol]) {
    try {
      caches.filter[symbol] = await getFilters(binance, symbol);
    } catch (err) {
      console.error(`[ENGINE] filters error for ${symbol}:`, err?.message || err);
      return;
    }
  }
  const filters = caches.filter[symbol];
  if (!filters || !(filters.stepSize > 0) || !(filters.tickSize > 0)) return;

  let buyTarget = 0;
  if (type === "manual") {
    const dipPct = Number(rule.dipPct);
    if (!(dipPct > 0)) return;
    const currentPrice = await getCurrentPrice(symbol, binance, caches);
    if (!(currentPrice > 0)) return;
    buyTarget = roundToTick(currentPrice * (1 - dipPct / 100), filters.tickSize);
  } else {
    buyTarget = roundToTick(Number(rule.entryPrice), filters.tickSize);
  }
  if (!(buyTarget > 0)) return;

  let qty = floorToStep(budget / buyTarget, filters.stepSize);
  if (qty < filters.minQty || qty * buyTarget < filters.minNotional) {
    return;
  }

  const reportIssue = async (code, message) => {
    if (hooks?.reportRuleIssue) {
      await hooks.reportRuleIssue({ userId, ruleId: rule.id, code, message });
    }
  };
  const clearIssue = async () => {
    if (hooks?.clearRuleIssue) {
      await hooks.clearRuleIssue({ userId, ruleId: rule.id });
    }
  };

  const orders = await getOrders(caches, binance, symbol);
  const trades = await getTrades(caches, binance, symbol, 50);

  let state = await stateManager.get(rule.id);
  if (state && state.version !== STATE_VERSION) {
    state = null;
  }

  const buyClientId = makeClientOrderId(rule, "BUY");
  let buyOrder = orders.find(o => o.clientOrderId === buyClientId);

  if (state?.active) {
    if (buyOrder) {
      await cancelOrder(binance, symbol, buyOrder);
      caches.orders[symbol] = null;
      buyOrder = null;
    }
  } else {
    if (indicatorSettings && requiresEntryIndicators(indicatorSettings)) {
      const snapshot = await getIndicatorSnapshot();
      if (!entryIndicatorsAllow(indicatorSettings, snapshot)) {
        if (buyOrder) {
          await cancelOrder(binance, symbol, buyOrder);
          caches.orders[symbol] = null;
          buyOrder = null;
        }
        return;
      }
    }
    if (!buyOrder) {
      try {
        await binance.placeLimit(symbol, "BUY", qty, buyTarget, { makerOnly: MAKER_ONLY, clientOrderId: buyClientId });
        caches.orders[symbol] = null;
        await clearIssue();
      } catch (err) {
        console.error(`[ENGINE] place BUY failed for ${symbol}:`, err?.message || err);
        const details = parseBinanceError(err);
        if (String(details.message || "").toLowerCase().includes("not whitelisted")) {
          await reportIssue("symbol_not_whitelisted", `Enable ${symbol} for your Binance API key to trade this pair.`);
        }
        return;
      }
    } else {
      const drift = priceDriftPct(Number(buyOrder.price), buyTarget);
      if (drift > BUY_PRICE_DRIFT_THRESHOLD) {
        await cancelOrder(binance, symbol, buyOrder);
        caches.orders[symbol] = null;
        try {
          await binance.placeLimit(symbol, "BUY", qty, buyTarget, { makerOnly: MAKER_ONLY, clientOrderId: buyClientId });
          caches.orders[symbol] = null;
          await clearIssue();
        } catch (err) {
          console.error(`[ENGINE] replace BUY failed for ${symbol}:`, err?.message || err);
        }
      }
    }
  }

  const newBuyTrade = findRecentBuy(trades, state, rule, buyTarget, filters);
  if (newBuyTrade) {
    const nextState = buildInitialStateFromTrade(rule, newBuyTrade, filters);
    if (nextState) {
      state = nextState;
      await stateManager.save(rule.id, state);
      await clearIssue();
      caches.orders[symbol] = null;
      if (hooks?.notifyRuleEvent) {
        await hooks.notifyRuleEvent({
          userId,
          eventType: "position_opened",
          payload: {
            ruleId: rule.id,
            symbol,
            entryPrice: state.entryPrice,
            quantity: state.baseQty
          }
        });
      }
    }
  }

  if (!state || !state.active) {
    return;
  }

  const currentPrice = await getCurrentPrice(symbol, binance, caches);
  if (state.trailingStopPct > 0 && currentPrice > 0) {
    const threshold = state.trailingPeakPrice * (1 + TRAILING_UPDATE_THRESHOLD / 100);
    if (currentPrice > Math.max(state.trailingPeakPrice, threshold)) {
      state.trailingPeakPrice = currentPrice;
      state.lastUpdated = Date.now();
      await stateManager.save(rule.id, state);
    }
  }

  let sellsApplied = false;
  for (const trade of trades) {
    if (!trade || trade.isBuyer) continue;
    if (applySellTrade(state, trade, filters, symbol)) {
      sellsApplied = true;
    }
  }
  if (sellsApplied) {
    await stateManager.save(rule.id, state);
  }

  if (!state.active) {
    if (hooks?.notifyRuleEvent) {
      await hooks.notifyRuleEvent({
        userId,
        eventType: "position_closed",
        payload: {
          ruleId: rule.id,
          symbol,
          entryPrice: state.entryPrice,
          realizedQuote: state.realizedQuote,
          openedAt: state.openedAt,
          closedAt: state.closedAt
        }
      });
    }
    await stateManager.save(rule.id, state);
    caches.orders[symbol] = null;
    return;
  }

  const refreshedOrders = await getOrders(caches, binance, symbol);
  let exitIndicatorsOk = true;
  if (state?.active && indicatorSettings && requiresExitIndicators(indicatorSettings)) {
    const snapshot = indicatorSnapshot || await getIndicatorSnapshot();
    exitIndicatorsOk = snapshot ? exitIndicatorsAllow(indicatorSettings, snapshot) : true;
  }
  await ensureTakeProfitOrders({
    binance,
    symbol,
    rule,
    state,
    orders: refreshedOrders,
    filters,
    caches,
    clearIssue,
    allowPlacement: exitIndicatorsOk
  });
  await ensureStopOrder({ binance, symbol, rule, state, orders: refreshedOrders, filters, caches });
  await stateManager.save(rule.id, state);
}

async function processSnapshot(snapshot, context) {
  const { userId, binance, rules } = snapshot;
  if (!binance || !Array.isArray(rules) || !rules.length) return;

  const caches = {
    price: {},
    filter: {},
    orders: {},
    trades: {},
    candles: {}
  };

  for (const rawRule of rules) {
    const rule = rawRule || {};
    try {
      await processRule({
        binance,
        rule,
        caches,
        userId,
        hooks: context.hooks,
        stateManager: context.stateManager
      });
    } catch (err) {
      console.error(`[ENGINE] unexpected error for rule ${rule?.id || "unknown"}:`, err?.message || err);
    }
  }
}

export function createEngineProcessor(hooks = {}) {
  const cache = new Map();

  const stateManagerFactory = userId => ({
    async get(ruleId) {
      const key = `${userId}:${ruleId}`;
      if (!cache.has(key)) {
        let stored = null;
        if (hooks.loadRuleState) {
          stored = await hooks.loadRuleState({ userId, ruleId });
        }
        if (stored && typeof stored === "object" && stored.version === STATE_VERSION) {
          cache.set(key, stored);
        } else {
          cache.set(key, null);
        }
      }
      return cloneState(cache.get(key));
    },
    async save(ruleId, state) {
      const key = `${userId}:${ruleId}`;
      const copy = state ? cloneState({ ...state, version: STATE_VERSION }) : null;
      cache.set(key, copy);
      if (hooks.saveRuleState) {
        await hooks.saveRuleState({ userId, ruleId, state: copy });
      }
    },
    async clear(ruleId) {
      const key = `${userId}:${ruleId}`;
      cache.set(key, null);
      if (hooks.saveRuleState) {
        await hooks.saveRuleState({ userId, ruleId, state: null });
      }
    }
  });

  async function processSnapshotWrapper(snapshot = {}) {
    const userId = Number(snapshot.userId);
    const stateManager = stateManagerFactory(userId);
    await processSnapshot(snapshot, { hooks, stateManager });
  }

  async function processBatch(snapshots = []) {
    for (const snapshot of Array.isArray(snapshots) ? snapshots : []) {
      try {
        await processSnapshotWrapper(snapshot || {});
      } catch (err) {
        console.error("[ENGINE] batch error", err?.message || err);
      }
    }
  }

  function reset() {
    cache.clear();
  }

  return {
    processSnapshot: processSnapshotWrapper,
    processBatch,
    reset
  };
}

export function runEngine(getSnapshots, hooks = {}) {
  const processor = createEngineProcessor(hooks);
  let running = true;

  async function loop() {
    while (running) {
      try {
        const snapshots = await getSnapshots();
        if (Array.isArray(snapshots)) {
          await processor.processBatch(snapshots);
        }
      } catch (err) {
        console.error("[ENGINE]", err?.message || err);
      }
      await sleep(5000);
    }
  }

  loop();

  return {
    stop() {
      running = false;
      processor.reset();
    }
  };
}

export { processSnapshot };
