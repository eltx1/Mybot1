import test from 'node:test';
import assert from 'node:assert/strict';
import { summariseCompletedTrades, calculatePerformanceMetrics } from '../lib/trades.js';

process.env.MARKET_FEED_DISABLED = 'true';
const strategyModulePromise = import('../strategy.js');

test('summariseCompletedTrades aggregates filled round trips', () => {
  const trades = [
    { id: 1, isBuyer: true, price: '10', qty: '2', quoteQty: '20', commission: '0.02', commissionAsset: 'USDT', time: 1000 },
    { id: 2, isBuyer: false, price: '11', qty: '2', quoteQty: '22', commission: '0.002', commissionAsset: 'BTC', time: 2000 }
  ];
  const result = summariseCompletedTrades(trades, 'BTCUSDT');
  assert.equal(result.length, 1);
  const [trade] = result;
  assert.equal(trade.quantity, 2);
  assert.ok(trade.buyPrice < trade.sellPrice);
  assert.equal(trade.baseAsset, 'BTC');
  assert.equal(trade.quoteAsset, 'USDT');
});

test('summariseCompletedTrades returns empty when no round trip', () => {
  const trades = [{ id: 1, isBuyer: true, price: '10', qty: '1', quoteQty: '10', time: 1000 }];
  const result = summariseCompletedTrades(trades, 'ETHUSDT');
  assert.equal(result.length, 0);
});

test('calculatePerformanceMetrics aggregates trade outcomes', () => {
  const trades = [
    { symbol: 'BTCUSDT', profit: 10, profitPct: 5, durationMs: 60000, quoteAsset: 'USDT' },
    { symbol: 'ETHUSDT', profit: -2, profitPct: -1, durationMs: 120000, quoteAsset: 'USDT' }
  ];
  const metrics = calculatePerformanceMetrics(trades);
  assert.equal(metrics.totalTrades, 2);
  assert.equal(metrics.totalProfit, 8);
  assert.equal(Math.round(metrics.averageProfitPct), 2);
  assert.equal(metrics.winRate, 50);
  assert.equal(metrics.bestTrade.symbol, 'BTCUSDT');
  assert.equal(metrics.worstTrade.symbol, 'ETHUSDT');
  assert.equal(metrics.averageHoldMs, 90000);
  assert.equal(metrics.bySymbol[0].symbol, 'BTCUSDT');
});

test('engine persists rule state with stops and closures', async () => {
  const { createEngineProcessor } = await strategyModulePromise;
  const savedStates = new Map();
  const processor = createEngineProcessor({
    loadRuleState: async ({ ruleId }) => savedStates.get(ruleId) || null,
    saveRuleState: async ({ ruleId, state }) => {
      savedStates.set(ruleId, state ? JSON.parse(JSON.stringify(state)) : null);
    }
  });

  const now = Date.now();
  const buyTrade = { id: 1, isBuyer: true, qty: '0.003', price: '29700', time: now };
  const sellTrade = { id: 2, isBuyer: false, qty: '0.003', price: '30300', time: now + 60000 };
  let tradeCalls = 0;
  let stopOrdersPlaced = 0;
  const fakeBinance = {
    exchangeInfo: async () => ({
      symbols: [{
        symbol: 'BTCUSDT',
        filters: [
          { filterType: 'LOT_SIZE', stepSize: '0.001', minQty: '0.001' },
          { filterType: 'PRICE_FILTER', tickSize: '0.01' },
          { filterType: 'MIN_NOTIONAL', minNotional: '10' }
        ]
      }]
    }),
    avgPrice: async () => ({ price: '30000' }),
    openOrders: async () => [],
    myTrades: async () => {
      tradeCalls += 1;
      return tradeCalls >= 2 ? [buyTrade, sellTrade] : [buyTrade];
    },
    placeLimit: async () => {},
    cancelOrder: async () => {},
    placeStopLossLimit: async () => { stopOrdersPlaced += 1; }
  };

  const snapshot = {
    userId: 42,
    binance: fakeBinance,
    rules: [{
      id: 'rule-1',
      type: 'manual',
      symbol: 'BTCUSDT',
      dipPct: 1,
      tpPct: 2,
      stopLossPct: 1.5,
      budgetUSDT: 100,
      enabled: true,
      createdAt: now - 1000,
      takeProfitSteps: [{ profitPct: 2, portionPct: 100 }]
    }]
  };

  await processor.processSnapshot(snapshot);
  const openState = savedStates.get('rule-1');
  assert.ok(openState);
  assert.equal(openState.active, true);
  assert.ok(openState.remainingQty > 0);
  assert.equal(openState.stopLossPct, 1.5);

  await processor.processSnapshot(snapshot);
  const closedState = savedStates.get('rule-1');
  assert.ok(closedState);
  assert.equal(closedState.active, false);
  assert.equal(closedState.remainingQty, 0);
  assert.ok(closedState.closedAt >= closedState.openedAt);
  assert.ok(closedState.realizedQuote > 0);
  assert.ok(stopOrdersPlaced > 0);
});

test('manual rules honour indicator entry and exit filters', async () => {
  const { createEngineProcessor } = await strategyModulePromise;
  const savedStates = new Map();
  const processor = createEngineProcessor({
    loadRuleState: async ({ ruleId }) => savedStates.get(ruleId) || null,
    saveRuleState: async ({ ruleId, state }) => {
      savedStates.set(ruleId, state ? JSON.parse(JSON.stringify(state)) : null);
    }
  });

  const now = Date.now();
  const buyTrade = { id: 42, isBuyer: true, qty: '0.004', price: '29700', time: now };
  const buildKlines = () => {
    const rows = [];
    let price = 30000;
    for (let i = 0; i < 200; i += 1) {
      price *= 1.01;
      const close = price;
      const open = close / 1.01;
      const high = close * 1.005;
      const low = close / 1.005;
      const openTime = now - (200 - i) * 60000;
      const closeTime = openTime + 60000;
      rows.push([
        String(openTime),
        open.toFixed(2),
        high.toFixed(2),
        low.toFixed(2),
        close.toFixed(2),
        '12.5',
        String(closeTime),
        (close * 12.5).toFixed(2),
        '100',
        '6.1',
        (close * 6.1).toFixed(2),
        '0'
      ]);
    }
    return rows;
  };

  const placeLimitCalls = [];
  const openOrdersStore = [];
  let nextOrderId = 1;
  let tradeCalls = 0;
  const fakeBinance = {
    exchangeInfo: async () => ({
      symbols: [{
        symbol: 'BTCUSDT',
        filters: [
          { filterType: 'LOT_SIZE', stepSize: '0.001', minQty: '0.001' },
          { filterType: 'PRICE_FILTER', tickSize: '0.01' },
          { filterType: 'MIN_NOTIONAL', minNotional: '10' }
        ]
      }]
    }),
    avgPrice: async () => ({ price: '30000' }),
    klines: async () => buildKlines(),
    openOrders: async () => openOrdersStore.map(order => ({ ...order })),
    myTrades: async () => {
      tradeCalls += 1;
      if (tradeCalls >= 3) {
        for (let i = openOrdersStore.length - 1; i >= 0; i -= 1) {
          if (openOrdersStore[i].side === 'BUY') openOrdersStore.splice(i, 1);
        }
        return [buyTrade];
      }
      return [];
    },
    placeLimit: async (symbol, side, qty, price, options = {}) => {
      placeLimitCalls.push({ symbol, side, qty, price });
      const order = {
        clientOrderId: options?.clientOrderId || `ID${nextOrderId}`,
        orderId: String(nextOrderId),
        side,
        price: String(price),
        origQty: String(qty),
        quantity: String(qty)
      };
      nextOrderId += 1;
      openOrdersStore.push(order);
    },
    cancelOrder: async (symbol, orderId) => {
      const index = openOrdersStore.findIndex(order => order.orderId === String(orderId));
      if (index >= 0) openOrdersStore.splice(index, 1);
    },
    placeStopLossLimit: async (symbol, side, qty, stopPrice) => {
      openOrdersStore.push({
        clientOrderId: `STOP${nextOrderId}`,
        orderId: String(nextOrderId),
        side,
        price: String(stopPrice),
        origQty: String(qty),
        quantity: String(qty)
      });
      nextOrderId += 1;
    }
  };

  const rule = {
    id: 'ind-rule-1',
    type: 'manual',
    symbol: 'BTCUSDT',
    dipPct: 1,
    tpPct: 2,
    budgetUSDT: 120,
    enabled: true,
    createdAt: now,
    takeProfitSteps: [{ profitPct: 2, portionPct: 100 }],
    indicatorSettings: {
      interval: '1m',
      rsiPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      rsiEntryMax: 10,
      macdExit: 'bearish'
    }
  };

  const snapshot = { userId: 7, binance: fakeBinance, rules: [rule] };

  await processor.processSnapshot(snapshot);
  assert.equal(placeLimitCalls.filter(c => c.side === 'BUY').length, 0, 'buy should be blocked by RSI');

  rule.indicatorSettings.rsiEntryMax = 100;
  await processor.processSnapshot(snapshot);
  assert.equal(placeLimitCalls.filter(c => c.side === 'BUY').length, 1, 'buy should be placed after RSI passes');

  await processor.processSnapshot(snapshot);
  assert.equal(placeLimitCalls.filter(c => c.side === 'SELL').length, 0, 'sell should be blocked by MACD exit filter');

  rule.indicatorSettings.macdExit = 'bullish';
  await processor.processSnapshot(snapshot);
  assert.equal(placeLimitCalls.filter(c => c.side === 'SELL').length, 1, 'sell should be placed once MACD exit passes');
});
