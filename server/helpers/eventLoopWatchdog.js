/**
 * Event-loop watchdog.
 *
 * An endless loop or a long synchronous calculation blocks Node's single JS thread: the process
 * stays "alive" but answers nothing, and no in-process error handler can run (they are on the
 * same blocked thread). The only thing that can notice is something running OUTSIDE that thread.
 *
 *  - The main thread bumps a timestamp in shared memory every second.
 *  - A worker thread (its own event loop, so it is unaffected by the block) checks it. A stall
 *    longer than WATCHDOG_WARN_MS is logged, so the slow code can be found and fixed.
 *  - OPTIONAL: if WATCHDOG_TIMEOUT_MS is set (> 0) and the stall lasts that long, the worker kills
 *    the whole process (SIGKILL). Only enable this when something restarts the server afterwards
 *    (systemd `Restart=always`, Docker `restart: always`, a cron/`while true` loop...). On its own
 *    `node` / `nodemon` do NOT restart a killed process, so the server would simply stay down.
 *
 * Env: WATCHDOG_TIMEOUT_MS (default 0 = never kill, only log), WATCHDOG_WARN_MS (default 1000).
 */
const { Worker, isMainThread, workerData } = require("worker_threads");
const { monitorEventLoopDelay } = require("perf_hooks");
const fs = require("fs");

const TIMEOUT_MS = Number(process.env.WATCHDOG_TIMEOUT_MS ?? 0);
const WARN_MS = Number(process.env.WATCHDOG_WARN_MS ?? 1000);
const TICK_MS = 1000;

if (!isMainThread) {
  // ── watchdog thread ──
  const beat = new Float64Array(workerData.buffer);
  let warned = false;
  setInterval(() => {
    const stalled = Date.now() - beat[0];
    if (TIMEOUT_MS > 0 && stalled > TIMEOUT_MS) {
      // fs.writeSync, not console.error: a worker's console output is relayed through the main
      // thread, which is exactly the thing that is blocked, so it would never appear.
      fs.writeSync(
        2,
        `[watchdog] event loop blocked for ${Math.round(stalled / 1000)}s ` +
          `(limit ${TIMEOUT_MS / 1000}s) - the server is hung, killing the process (WATCHDOG_TIMEOUT_MS)\n`
      );
      // process.exit() inside a worker thread only ends that thread, so signal the whole
      // process. SIGKILL because the blocked main thread could never run a SIGTERM handler.
      process.kill(process.pid, "SIGKILL");
    }
    if (stalled > WARN_MS + TICK_MS && !warned) {
      warned = true;
      fs.writeSync(2, `[watchdog] event loop has been blocked for ${Math.round(stalled / 1000)}s\n`);
    } else if (stalled <= WARN_MS + TICK_MS) {
      warned = false;
    }
  }, TICK_MS); // not unref'd: this interval is what keeps the watchdog thread alive
}

function startEventLoopWatchdog() {
  if (!isMainThread) return;

  const buffer = new SharedArrayBuffer(8);
  const beat = new Float64Array(buffer);
  beat[0] = Date.now();
  setInterval(() => {
    beat[0] = Date.now();
  }, TICK_MS).unref();

  const worker = new Worker(__filename, { workerData: { buffer } });
  worker.unref();
  worker.on("error", (err) => console.error("[watchdog] stopped:", err));

  // Lag report: shows how long the loop was blocked once it frees up again (p99 / max of the
  // last minute), which points at the slow endpoint/job even when it never reaches the kill limit.
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  setInterval(() => {
    const maxMs = histogram.max / 1e6;
    if (maxMs > WARN_MS) {
      console.warn(
        `[watchdog] event loop lag in the last minute: max ${Math.round(maxMs)}ms, p99 ${Math.round(histogram.percentile(99) / 1e6)}ms`
      );
    }
    histogram.reset();
  }, 60000).unref();
}

module.exports = { startEventLoopWatchdog };
