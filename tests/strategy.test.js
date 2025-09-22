import test from 'node:test';
import assert from 'node:assert/strict';
import { summariseCompletedTrades } from '../lib/trades.js';

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
