# TaskHub – Production Deployment Guide

Covers deploying the API (`server/`) and the web app (`client/`) to the production server, with the
stability changes (crash safety, hang watchdog) and the speed changes (gzip, report cache).

> Replace `<APP_DIR>` with the folder the app lives in on the server
> (e.g. `/home/weekmate_apps/task.weekmate.in`). Run every command as the user that owns the app.

---

## 0. What this release changes

| Area | Change | Needs on the server |
|---|---|---|
| API stability | Async errors no longer crash the process (`express-async-errors`), bad ids return 400 | `npm install` |
| API stability | Event-loop watchdog logs a blocked server (killing it is optional, see section 6) | nothing |
| API speed | gzip responses (`compression`), 45 s per-user cache on report endpoints | `npm install` |
| API data | Notes filters; summary numbers for Expense / Feedback / Complaints in the listing APIs | nothing extra |
| Security | Notes search no longer bypasses the permission filter; DB password no longer printed in logs | nothing extra |
| Web app | UI changes (login redirect, filters, layouts, titles) | rebuild the client |

New server dependencies: `compression`, `express-async-errors` (both are in `server/package.json`).

---

## 1. Before you start (checklist)

- [ ] Everything is committed and merged into the branch you deploy from (`production`).
- [ ] You tested locally (see `LOCAL_TESTING.md` or the guide you were given) and it all passed.
- [ ] You have SSH access to the server and know how the API is started **today**
      (systemd? Docker? `nodemon` / `node` in a terminal?). Run `ps aux | grep -E "node|nodemon"`.
- [ ] `server/env/.env.prod` exists on the server (it is **not** in git). Keep a copy of it.
- [ ] Node.js **18 or newer** on the server (`node -v`). The app uses `fetch` and worker threads.
- [ ] **Rotate the database password** if it was ever pasted in a chat, screenshot or log
      (older versions of the API printed the full DB URL in the logs).
- [ ] Pick a quiet time. The API restarts (a few seconds of downtime).

### Backup

```bash
cd <APP_DIR>
cp server/env/.env.prod ~/env.prod.backup.$(date +%F)
git rev-parse HEAD > ~/previous_release.txt          # the commit you can roll back to
```

---

## 2. Environment variables (`server/env/.env.prod`)

Existing variables stay as they are. Add the ones below if you want to change the defaults.

```env
# --- Hang watchdog (optional; defaults shown) ---
WATCHDOG_WARN_MS=1000          # log a warning when the server is blocked longer than this
WATCHDOG_TIMEOUT_MS=0          # 0 = only log (default). >0 = kill the process after this many ms
                               # blocked - ONLY set it if something restarts the server (section 6)

# --- Connected products button (optional; button is hidden without these) ---
REGISTRATION_API_URL=https://<registration-host>
REGISTRATION_API_KEY=<must equal the Registration service API_KEY>
CURRENT_PRODUCT_NAME=TaskHub   # must match the name TaskHub is registered under
```

Never commit `.env.prod` and never paste it in chats.

---

## 3. Deploy the API

### 3.1 Get the code and install

```bash
cd <APP_DIR>
git fetch --all
git checkout production
git pull
cd server
npm install --omit=dev        # installs compression + express-async-errors
```

### 3.2 Stop the old process

Only one process can use the API port. Stop the running API first, or the new one fails with
`Port <n> is already in use`.

```bash
# started by hand in a terminal: Ctrl+C in that terminal, or
pkill -f "nodemon" ; pkill -f "bin/www"
# managed by systemd:  sudo systemctl stop <service-name>
```

### 3.3 Start the API

Start it **the same way you start it today**, in production mode, for example:

```bash
cd <APP_DIR>/server
npm run start:prod             # = NODE_ENV=production node ./bin/www
```

Run **one** instance only: in production `app.js` starts the cron scheduler inside the API process,
so several instances would run every scheduled job several times.

### 3.4 Check it is healthy

Watch the start-up output (or your log file). You should see `SERVER RUNNING ON PORT : <port>` and a
database line **without** a password (`mongodb://***:***@host/...`). `Port ... is already in use`
means the old process is still running – go back to 3.2.

---

## 4. Deploy the web app (client)

```bash
cd <APP_DIR>/client
npm install
npm run build                  # creates client/build
```

Then publish `client/build` the way you do today:

- **nginx / static hosting:** copy or point the web root at `client/build`.
- **`npm run start:prod`** (builds, then serves `build` on port 3008 with `serve`):
  ```bash
  cd <APP_DIR>/client && npm run start:prod
  ```

After deploying, users should hard-refresh (Ctrl+Shift+R) once so the browser drops old JS.

### nginx note (only if nginx sits in front of the API)

The API now compresses its own JSON responses. Keep `gzip on;` in nginx for the static client files;
nginx will not compress a response twice. If you proxy with `proxy_set_header Accept-Encoding "";`
remove that line, otherwise the API never sees that the browser accepts gzip.

---

## 5. Verify after deploying

1. **Login** → lands directly on the dashboard with a loader (no blank frame, no "login successful" toast).
2. **Tab title** is always "Welcome to TaskHub Portal".
3. **Reports speed** – open Reports; in the browser DevTools → Network:
   - the API responses show `content-encoding: gzip`;
   - the report requests show `x-report-cache: MISS` the first time and `HIT` on a repeat within 45 s.
4. **Notes** → Filter (project / created by / subscribers / colour) and the date range work.
5. **Project Expense / Feedback / Complaints** → stat cards and charts match the filters.
6. **Crash safety** (optional, from the server):
   ```bash
   curl -s -X POST https://<api-host>/v1/projects/get \
     -H "Authorization: Bearer <a valid token>" -H "Content-Type: application/json" \
     -d '{"project_id":"undefined"}'
   ```
   Expect a JSON `400 Bad request` and the server still running (before this release the process
   crashed on this request).

---

## 6. Watching for problems

Log lines to watch for in the server output:

| Log text | Meaning |
|---|---|
| `[watchdog] event loop has been blocked for Ns` | something ran heavy synchronous code and froze the server for N seconds – find and fix that endpoint/job |
| `[uncaughtException]` / `[unhandledRejection]` | a bug that was caught instead of crashing – still needs fixing |
| `<METHOD> <url> -> 500` with a stack | an error inside a request, with the exact URL |

**Killing a hung server (optional).** If the API ever freezes completely, it stays frozen until
someone restarts it. Setting `WATCHDOG_TIMEOUT_MS` (e.g. `30000`) makes the process kill itself after
that long, but a killed process only helps if something starts it again – `node` and `nodemon` do
**not**. Enable it only together with a restarter such as systemd (`Restart=always`) or Docker
(`restart: always`). Otherwise leave it at `0`.

---

## 7. Rollback

```bash
cd <APP_DIR>
git checkout $(cat ~/previous_release.txt)
cd server && npm install --omit=dev
# then stop and start the API again as in section 3.2 / 3.3
# client: rebuild the previous version and publish it again
cd ../client && npm install && npm run build
```

Restore `env.prod` from the backup if you changed it.

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Port <n> is already in use` | the old process (nodemon/node) still runs → step 3.2 |
| `Cannot find module 'compression'` or `'express-async-errors'` | `npm install` was not run in `server/` |
| API starts but nothing connects to the DB | wrong / missing `server/env/.env.prod`, or `NODE_ENV` not `production` |
| Connected-products button missing | `REGISTRATION_*` variables missing or Registration unreachable (check `/v1/linked-products` response message) |
| Reports still show old numbers | report endpoints are cached for 45 s per user – wait or reload |
| Server stops answering but the process is alive | the event loop is blocked – look for `[watchdog] ... blocked` in the logs, restart, and fix the slow endpoint |
| Process dies and does not come back | nothing restarts it – use systemd/Docker with a restart policy, or restart by hand |

---

## 9. Limits to be aware of

- The watchdog and error handlers keep the API alive through code errors and tell you about hangs.
  They cannot help when the server runs out of memory or the host itself goes down.
- Without a restarter (systemd/Docker), a crash or an optional watchdog kill leaves the API down until
  someone starts it again.
- One API instance only (see 3.3).
