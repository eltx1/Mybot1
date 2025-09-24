import { parentPort, workerData } from "worker_threads";
import { createEngineProcessor } from "../strategy.js";
import { createBinanceClient } from "../binance.js";

const intervalMs = Number(workerData?.intervalMs) || 5000;
const processor = createEngineProcessor({
  reportRuleIssue: payload => callParent("reportRuleIssue", payload),
  clearRuleIssue: payload => callParent("clearRuleIssue", payload),
  loadRuleState: payload => callParent("loadRuleState", payload),
  saveRuleState: payload => callParent("saveRuleState", payload),
  notifyRuleEvent: payload => callParent("notifyRuleEvent", payload)
});

const pendingCalls = new Map();
let callCounter = 0;
let running = true;

function callParent(type, payload) {
  return new Promise((resolve, reject) => {
    const callId = `${Date.now()}-${++callCounter}`;
    pendingCalls.set(callId, { resolve, reject, type });
    parentPort.postMessage({ type: "call", callId, action: type, payload });
    const timeout = setTimeout(() => {
      if (pendingCalls.has(callId)) {
        pendingCalls.delete(callId);
        reject(new Error(`Timed out waiting for ${type} acknowledgement`));
      }
    }, intervalMs * 2);
    pendingCalls.get(callId).timeout = timeout;
  });
}

const binanceCache = new Map();

function ensureBinanceClient(userId, credentials = {}) {
  const key = String(userId);
  if (!credentials || !credentials.apiKey || !credentials.apiSecret) {
    binanceCache.delete(key);
    return null;
  }
  const existing = binanceCache.get(key);
  const fingerprint = `${credentials.apiKey}:${credentials.apiSecret}`;
  if (existing && existing.fingerprint === fingerprint) {
    return existing.client;
  }
  const client = createBinanceClient({
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret
  });
  binanceCache.set(key, { client, fingerprint });
  return client;
}

async function processBatchMessage(message) {
  const startedAt = Date.now();
  let processedRules = 0;
  let processedUsers = 0;
  for (const snapshot of Array.isArray(message.snapshots) ? message.snapshots : []) {
    const client = ensureBinanceClient(snapshot.userId, snapshot.credentials);
    if (!client) continue;
    processedUsers += 1;
    try {
      await processor.processSnapshot({
        userId: snapshot.userId,
        binance: client,
        rules: snapshot.rules || []
      });
      processedRules += Array.isArray(snapshot.rules) ? snapshot.rules.length : 0;
    } catch (err) {
      parentPort.postMessage({
        type: "engine-error",
        tickId: message.tickId,
        error: err?.message || String(err)
      });
    }
  }
  const durationMs = Date.now() - startedAt;
  parentPort.postMessage({
    type: "processed",
    tickId: message.tickId,
    durationMs,
    processedUsers,
    processedRules
  });
}

parentPort.on("message", async message => {
  if (!message || typeof message !== "object") return;
  if (message.type === "stop") {
    running = false;
    processor.reset();
    binanceCache.clear();
    parentPort.postMessage({ type: "stopped" });
    return;
  }
  if (message.type === "process") {
    await processBatchMessage(message);
    return;
  }
  if (message.type === "result" && message.callId) {
    const pending = pendingCalls.get(message.callId);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingCalls.delete(message.callId);
      if (message.error) {
        pending.reject(new Error(message.error));
      } else {
        pending.resolve(message.result);
      }
    }
    return;
  }
});

parentPort.postMessage({ type: "ready" });
