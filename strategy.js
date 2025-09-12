import { avgPrice, exchangeInfo, openOrders, myTrades, placeLimit, cancelOrder } from "./binance.js";

const MAKER_ONLY = String(process.env.MAKER_ONLY || "true").toLowerCase() === "true";
const MAX_ALLOC_USDT = Number(process.env.MAX_SYMBOL_ALLOCATION_USDT || 200);

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

export async function runEngine(getRules){
  const lastTradeId = {}; // symbol -> last trade id we saw

  while (true){
    try{
      const rules = getRules();
      for (const rule of rules){
        const { symbol, dipPct, tpPct, budgetUSDT, enabled=true } = rule;
        if (!enabled) continue;

        // price & filters
        const { price } = await avgPrice(symbol);
        const p = Number(price);
        const filters = await getFilters(symbol);

        // target buy price at dip
        const buyTarget = roundToTick(p * (1 - dipPct/100), filters.tickSize);

        // qty from budget
        let qty = floorToStep(budgetUSDT / buyTarget, filters.stepSize);
        if (qty < filters.minQty || (qty * buyTarget) < filters.minNotional){
          continue; // budget too small for this symbol
        }

        // open orders
        const opens = await openOrders(symbol);
        const hasBuy = opens.find(o => o.side === "BUY");

        // place/refresh buy
        if (!hasBuy){
          await placeLimit(symbol, "BUY", qty, buyTarget, MAKER_ONLY);
        } else {
          const oPrice = Number(hasBuy.price);
          const drift = Math.abs(oPrice - buyTarget)/buyTarget * 100;
          if (drift > 0.3){
            try { await cancelOrder(symbol, hasBuy.orderId); } catch {}
            await placeLimit(symbol, "BUY", qty, buyTarget, MAKER_ONLY);
          }
        }

        // detect fills via trades (simple heuristic)
        const trades = await myTrades(symbol, 5);
        const last = trades[trades.length-1];
        if (last && last.isBuyer && last.id !== lastTradeId[symbol]){
          lastTradeId[symbol] = last.id;
          const filledPrice = Number(last.price);
          const tpPrice = roundToTick(filledPrice * (1 + tpPct/100), filters.tickSize);
          const filledQty = Number(last.qty);
          await placeLimit(symbol, "SELL", floorToStep(filledQty, filters.stepSize), tpPrice, MAKER_ONLY);
        }
      }
    }catch(e){
      console.error("[ENGINE]", e.message);
    }
    await sleep(5000);
  }
}
