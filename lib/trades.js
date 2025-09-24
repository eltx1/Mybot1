const KNOWN_QUOTES = [
  'USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'USDP', 'DAI',
  'BIDR', 'TRY', 'EUR', 'BTC', 'ETH', 'BNB'
];

export function splitSymbolPair(symbol) {
  if (!symbol) return { base: '', quote: '' };
  const upper = String(symbol).toUpperCase();
  for (const quote of KNOWN_QUOTES) {
    if (upper.endsWith(quote) && upper.length > quote.length) {
      return { base: upper.slice(0, upper.length - quote.length), quote };
    }
  }
  const fallbackIndex = Math.max(3, upper.length - 4);
  return {
    base: upper.slice(0, fallbackIndex),
    quote: upper.slice(fallbackIndex)
  };
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function summariseCompletedTrades(trades, symbol) {
  if (!Array.isArray(trades) || !trades.length) return [];
  const { base, quote } = splitSymbolPair(symbol || '');
  const sorted = [...trades].sort((a, b) => Number(a?.time || 0) - Number(b?.time || 0));
  const results = [];
  const EPSILON = 1e-8;
  let position = null;

  for (const trade of sorted) {
    const isBuyer = Boolean(trade?.isBuyer);
    const price = toFiniteNumber(trade?.price);
    const qty = toFiniteNumber(trade?.qty ?? trade?.executedQty);
    const quoteQty = toFiniteNumber(trade?.quoteQty ?? price * qty);
    const commission = toFiniteNumber(trade?.commission);
    const commissionAsset = typeof trade?.commissionAsset === 'string' ? trade.commissionAsset.toUpperCase() : '';
    const timestamp = Number(trade?.time || trade?.transactTime || Date.now());
    const tradePrice = qty > 0
      ? (price > 0 ? price : (quoteQty > 0 ? quoteQty / qty : 0))
      : 0;

    if (!(qty > 0) || !(quoteQty >= 0)) {
      continue;
    }

    if (isBuyer) {
      if (!position) {
        position = {
          baseBought: 0,
          baseSold: 0,
          quoteSpent: 0,
          quoteReceived: 0,
          firstBuyTime: timestamp,
          lastTradeTime: timestamp
        };
      }
      position.baseBought += qty;
      position.quoteSpent += quoteQty;
      if (commission && commissionAsset === quote) {
        position.quoteSpent += commission;
      } else if (commission && commissionAsset === base) {
        position.baseBought -= commission;
      }
      if (position.baseBought < 0) position.baseBought = 0;
      if (!position.firstBuyTime) position.firstBuyTime = timestamp;
      position.lastTradeTime = timestamp;
      continue;
    }

    if (!position) {
      continue;
    }

    position.baseSold += qty;
    position.quoteReceived += quoteQty;
    if (commission && commissionAsset === quote) {
      position.quoteReceived -= commission;
    } else if (commission && commissionAsset === base) {
      const conversionPrice = tradePrice > 0
        ? tradePrice
        : (position.baseSold > EPSILON && position.quoteReceived > 0
            ? position.quoteReceived / position.baseSold
            : 0);
      if (conversionPrice > 0) {
        position.quoteReceived -= commission * conversionPrice;
      }
    }
    if (position.baseSold < 0) position.baseSold = 0;
    if (position.quoteReceived < 0) position.quoteReceived = 0;
    position.lastTradeTime = timestamp;

    if (position.baseBought > EPSILON && position.baseSold >= position.baseBought - EPSILON) {
      const baseBought = position.baseBought;
      const baseSold = position.baseSold;
      const quoteSpent = position.quoteSpent;
      const quoteReceived = position.quoteReceived;

      if (baseBought > EPSILON && baseSold > EPSILON && Number.isFinite(quoteSpent) && Number.isFinite(quoteReceived)) {
        const quantity = Math.max(0, Math.min(baseBought, baseSold));
        if (quantity > EPSILON) {
          const buyDenominator = baseBought > EPSILON ? baseBought : quantity;
          const sellDenominator = quantity > EPSILON ? quantity : baseSold;
          const buyPrice = buyDenominator > EPSILON ? quoteSpent / buyDenominator : 0;
          const sellPrice = sellDenominator > EPSILON ? quoteReceived / sellDenominator : 0;
          const profit = quoteReceived - quoteSpent;
          const profitPct = quoteSpent !== 0 ? (profit / quoteSpent) * 100 : 0;
          const openedAt = position.firstBuyTime || timestamp;
          const closedAt = position.lastTradeTime || timestamp;
          results.push({
            symbol: String(symbol || '').toUpperCase(),
            baseAsset: base,
            quoteAsset: quote,
            quantity,
            buyPrice,
            sellPrice,
            profit,
            profitPct,
            openedAt,
            closedAt,
            durationMs: Math.max(0, closedAt - openedAt)
          });
        }
      }

      position = null;
    }
  }

  return results;
}

export function calculatePerformanceMetrics(completedTrades = []) {
  const stats = {
    totalTrades: Array.isArray(completedTrades) ? completedTrades.length : 0,
    totalProfit: 0,
    averageProfitPct: 0,
    winRate: 0,
    bestTrade: null,
    worstTrade: null,
    averageHoldMs: 0,
    bySymbol: []
  };
  if (!Array.isArray(completedTrades) || !completedTrades.length) {
    return stats;
  }
  let winCount = 0;
  let profitPctSum = 0;
  let durationSum = 0;
  const symbolMap = new Map();
  for (const trade of completedTrades) {
    if (!trade || typeof trade !== 'object') continue;
    const profit = Number(trade.profit || 0);
    const profitPct = Number(trade.profitPct || 0);
    const duration = Number(trade.durationMs || 0);
    stats.totalProfit += profit;
    profitPctSum += profitPct;
    durationSum += Number.isFinite(duration) ? duration : 0;
    if (profit > 0) winCount += 1;
    if (!stats.bestTrade || profit > Number(stats.bestTrade?.profit || -Infinity)) {
      stats.bestTrade = trade;
    }
    if (!stats.worstTrade || profit < Number(stats.worstTrade?.profit || Infinity)) {
      stats.worstTrade = trade;
    }
    const key = String(trade.symbol || '').toUpperCase();
    const entry = symbolMap.get(key) || { symbol: key, trades: 0, totalProfit: 0, totalProfitPct: 0 };
    entry.trades += 1;
    entry.totalProfit += profit;
    entry.totalProfitPct += profitPct;
    symbolMap.set(key, entry);
  }
  stats.averageProfitPct = completedTrades.length ? profitPctSum / completedTrades.length : 0;
  stats.winRate = completedTrades.length ? (winCount / completedTrades.length) * 100 : 0;
  stats.averageHoldMs = completedTrades.length ? durationSum / completedTrades.length : 0;
  stats.bySymbol = Array.from(symbolMap.values()).map(item => ({
    symbol: item.symbol,
    trades: item.trades,
    totalProfit: item.totalProfit,
    averageProfitPct: item.trades ? item.totalProfitPct / item.trades : 0
  })).sort((a, b) => Number(b.totalProfit) - Number(a.totalProfit));
  return stats;
}
