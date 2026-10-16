/**
 * Local check of the event-loop watchdog (helpers/eventLoopWatchdog.js) - no database or app needed.
 *
 *   node scripts/test-watchdog.js          (or: npm run test:watchdog)
 *
 * Starts a tiny HTTP server with the watchdog on a 5s limit, shows that it answers, then
 * requests an endpoint that loops forever. Expected output: "[watchdog] ... blocked" lines and
 * the process dying with exit code 137 (SIGKILL) - that is the watchdog doing its job.
 */
process.env.WATCHDOG_TIMEOUT_MS = process.env.WATCHDOG_TIMEOUT_MS || "5000";
process.env.WATCHDOG_WARN_MS = process.env.WATCHDOG_WARN_MS || "500";

const http = require("http");
const { startEventLoopWatchdog } = require("../helpers/eventLoopWatchdog");

startEventLoopWatchdog();

const server = http.createServer((req, res) => {
  if (req.url === "/hang") {
    console.log("-> /hang requested: blocking the event loop now (endless loop)...");
    // eslint-disable-next-line no-empty
    while (true) {}
  }
  res.end("ok");
});

server.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  console.log(`watchdog limit: ${process.env.WATCHDOG_TIMEOUT_MS}ms`);
  console.log("healthy request ->", await (await fetch(base)).text());
  fetch(`${base}/hang`).catch(() => {});
});
