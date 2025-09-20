import { avgPrice, exchangeInfo, openOrders, myTrades, placeLimit, cancelOrder } from "./binance.js";

const MAKER_ONLY = String(process.env.MAKER_ONLY || "true").toLowerCase() === "true";

export function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function getFilters(symbol){
  const info = await exchangeInfo(symbol);
  const s = info.symbols[0];
  const lot = s.filters.find(f=>f.filterType==="LOT_SIZE");
  const price = s.filters.find(f=>f.filterType==="PRICE_FILTER");
  const notional = s.filters.find(f=>f.filterType==="NOTIONAL" || f.filterType==="MIN_NOTIONAL");
  return {
    stepSize: Number(lot.stepSize),
    minQty: Number(lot.minQty),
    tickSize: Number(price.tickSize),
    minNotional: notional ? Number(notional.minNotional) : 10
  };
}

function floorToStep(qty, step){
  const n = Math.floor(qty/step)*step;
  const s = step.toString();
  const decimals = s.includes(".") ? (s.length - s.indexOf(".") - 1) : 0;
  return Number(n.toFixed(decimals));
}

function roundToTick(p, tick){
  const n = Math.round(p/tick)*tick;
  const s = tick.toString();
  const decimals = s.includes(".") ? (s.length - s.indexOf(".") - 1) : 0;
  return Number(n.toFixed(decimals));
}

function makeClientOrderId(rule, side){
  const base = String(rule.id || `${rule.symbol}-${side}`)
    .replace(/[^a-z0-9]/gi, "")
    .slice(-20)
    .toUpperCase();
  const tag = side === "BUY" ? "B" : "S";
  return `MY1${tag}${base}`;
}

function pickOrderForRule(orders, rule, side){
  const targetId = makeClientOrderId(rule, side);
  let order = orders.find(o => o.clientOrderId === targetId);
  if (!order){
    const sameSide = orders.filter(o => o.side === side);
    if (sameSide.length === 1) order = sameSide[0];
  }
  return order;
}

function priceDriftPct(a, b){
  if (!(a>0) || !(b>0)) return Infinity;
  return Math.abs(a-b)/b*100;
}

export async function runEngine(getRules){
  const lastTradeId = {}; // rule.id -> last trade id we saw

  while (true){
    try{
      const rules = getRules();
      const priceCache = {};
      const filterCache = {};
      const openOrderCache = {};
      const tradeCache = {};

      for (const rawRule of rules){
        const rule = rawRule || {};
        const symbol = (rule.symbol || "").toUpperCase();
        const enabled = rule.enabled !== false;
        if (!symbol || !enabled) continue;

        const type = String(rule.type || "manual").toLowerCase() === "ai" ? "ai" : "manual";
        const ruleKey = rule.id || `${type}:${symbol}`;

        if (!filterCache[symbol]){
          try {
            filterCache[symbol] = await getFilters(symbol);
          } catch (err) {
            console.error(`[ENGINE] filters error for ${symbol}:`, err.message);
            continue;
          }
        }
        const filters = filterCache[symbol];

        if (!priceCache[symbol]){
          try {
            const { price } = await avgPrice(symbol);
            priceCache[symbol] = Number(price);
          } catch (err) {
            console.error(`[ENGINE] price error for ${symbol}:`, err.message);
            continue;
          }
        }
        const currentPrice = priceCache[symbol];

        const budget = Number(rule.budgetUSDT);
        if (!(budget > 0)) continue;

        let buyTarget = 0;
        let tpPct = Number(rule.tpPct);
        if (type === "manual"){
          const dipPct = Number(rule.dipPct);
          if (!(dipPct > 0) || !(tpPct > 0) || !(currentPrice > 0)) continue;
          buyTarget = roundToTick(currentPrice * (1 - dipPct/100), filters.tickSize);
        } else {
          buyTarget = roundToTick(Number(rule.entryPrice), filters.tickSize);
        }
        if (!(buyTarget > 0)) continue;

        let qty = floorToStep(budget / buyTarget, filters.stepSize);
        if (qty < filters.minQty || (qty * buyTarget) < filters.minNotional){
          continue; // budget too small for this symbol
        }

        let orders = openOrderCache[symbol];
        if (!orders){
          try {
            orders = await openOrders(symbol);
            openOrderCache[symbol] = orders;
          } catch (err) {
            console.error(`[ENGINE] openOrders error for ${symbol}:`, err.message);
            continue;
          }
        }
        orders = orders || [];

        const buyId = makeClientOrderId(rule, "BUY");
        const sellId = makeClientOrderId(rule, "SELL");

        let buyOrder = pickOrderForRule(orders, rule, "BUY");

        // place/refresh buy
        if (!buyOrder){
          try {
            await placeLimit(symbol, "BUY", qty, buyTarget, { makerOnly: MAKER_ONLY, clientOrderId: buyId });
            openOrderCache[symbol] = null; // force refresh on next iteration
          } catch (err) {
            console.error(`[ENGINE] place BUY failed for ${symbol}:`, err.message);
          }
          continue;
        }

        const drift = priceDriftPct(Number(buyOrder.price), buyTarget);
        if (drift > 0.3){
          try {
            await cancelOrder(symbol, buyOrder.orderId);
          } catch {}
          try {
            await placeLimit(symbol, "BUY", qty, buyTarget, { makerOnly: MAKER_ONLY, clientOrderId: buyId });
            openOrderCache[symbol] = null;
          } catch (err) {
            console.error(`[ENGINE] replace BUY failed for ${symbol}:`, err.message);
          }
          continue;
        }

        let trades = tradeCache[symbol];
        if (!trades){
          try {
            trades = await myTrades(symbol, 10);
            tradeCache[symbol] = trades;
          } catch (err) {
            console.error(`[ENGINE] trades error for ${symbol}:`, err.message);
            continue;
          }
        }
        if (!Array.isArray(trades) || !trades.length) continue;

        const recentBuy = [...trades].reverse().find(t => t.isBuyer);
        if (!recentBuy) continue;
        if (recentBuy.id === lastTradeId[ruleKey]) continue;

        const filledPrice = Number(recentBuy.price);
        if (!(filledPrice > 0)) continue;
        const fillDrift = priceDriftPct(filledPrice, buyTarget);
        if (fillDrift > 1.5) continue; // ignore fills too far from target

        const filledQty = floorToStep(Number(recentBuy.qty), filters.stepSize);
        if (!(filledQty > 0)) continue;

        lastTradeId[ruleKey] = recentBuy.id;

        let sellPrice = 0;
        if (type === "manual"){
          sellPrice = roundToTick(filledPrice * (1 + tpPct/100), filters.tickSize);
        } else {
          sellPrice = roundToTick(Number(rule.exitPrice), filters.tickSize);
        }
        if (!(sellPrice > 0)) continue;

        const sellOrder = pickOrderForRule(orders, rule, "SELL");
        if (!sellOrder){
          try {
            await placeLimit(symbol, "SELL", filledQty, sellPrice, { makerOnly: MAKER_ONLY, clientOrderId: sellId });
            openOrderCache[symbol] = null;
          } catch (err) {
            console.error(`[ENGINE] place SELL failed for ${symbol}:`, err.message);
          }
        }
      }
    }catch(e){
      console.error("[ENGINE]", e.message);
    }
    await sleep(5000);
  }
}
