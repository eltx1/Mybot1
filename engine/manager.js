import { Worker } from "worker_threads";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class EngineManager {
  constructor({ getSnapshots, intervalMs = 5000, hooks = {} }) {
    if (typeof getSnapshots !== "function") {
      throw new Error("getSnapshots function is required");
    }
    this.getSnapshots = getSnapshots;
    this.intervalMs = intervalMs;
    this.hooks = hooks;
    this.state = {
      lastTickId: 0,
      lastDurationMs: 0,
      lastProcessedRules: 0,
      lastProcessedUsers: 0,
      lastError: null,
      lastStartedAt: null,
      workerReady: false
    };
    this.worker = null;
    this.timer = null;
    this.busy = false;
  }

  start() {
    if (this.worker) return;
    this.spawnWorker();
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  spawnWorker() {
    const workerPath = join(__dirname, "worker.js");
    this.worker = new Worker(workerPath, {
      workerData: { intervalMs: this.intervalMs },
      type: "module"
    });
    this.worker.on("message", message => this.handleWorkerMessage(message));
    this.worker.on("error", err => {
      console.error("[ENGINE] worker crashed", err);
      this.state.lastError = err.message;
      this.state.workerReady = false;
      this.restartWorker();
    });
    this.worker.on("exit", code => {
      if (code !== 0) {
        console.error("[ENGINE] worker exited with code", code);
        this.state.lastError = `worker exited (${code})`;
        this.restartWorker();
      }
    });
  }

  restartWorker() {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
    }
    this.worker = null;
    this.busy = false;
    this.state.workerReady = false;
    this.spawnWorker();
  }

  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.busy = false;
  }

  async tick() {
    if (!this.worker || !this.state.workerReady) return;
    if (this.busy) return;
    this.busy = true;
    const tickId = ++this.state.lastTickId;
    this.state.lastStartedAt = Date.now();
    try {
      const snapshots = await this.getSnapshots();
      this.worker.postMessage({ type: "process", tickId, snapshots });
    } catch (err) {
      this.state.lastError = err.message;
      this.busy = false;
    }
  }

  handleWorkerMessage(message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "ready") {
      this.state.workerReady = true;
      return;
    }
    if (message.type === "processed") {
      this.state.lastDurationMs = message.durationMs || 0;
      this.state.lastProcessedRules = message.processedRules || 0;
      this.state.lastProcessedUsers = message.processedUsers || 0;
      this.state.lastError = null;
      this.busy = false;
      return;
    }
    if (message.type === "engine-error") {
      this.state.lastError = message.error || "unknown";
      return;
    }
    if (message.type === "call") {
      this.handleHookCall(message).catch(err => {
        console.error("[ENGINE] hook handler failed", err);
      });
      return;
    }
  }

  async handleHookCall(message) {
    const { action, payload, callId } = message;
    const hook = this.hooks?.[action];
    let result;
    let error;
    if (typeof hook === "function") {
      try {
        result = await hook(payload || {});
      } catch (err) {
        error = err?.message || String(err);
      }
    } else {
      error = `Unknown hook ${action}`;
    }
    if (this.worker) {
      this.worker.postMessage({ type: "result", callId, result, error });
    }
  }

  getMetrics() {
    return { ...this.state, busy: this.busy };
  }
}

export default EngineManager;
