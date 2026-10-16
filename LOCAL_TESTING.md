# Local testing guide

Run this **before** deploying (see `DEPLOYMENT.md`). Everything runs on your machine against the dev
database (`server/env/.env.dev`, API on port **4849**, client on port 3000).

Open **two terminals** from the repo root: `T1` for the API, `T2` for the client. Always run the
commands from the folder shown.

---

## Step 0 – Clean start

Make sure nothing else uses the API port:

```bash
ss -ltnp | grep 4849           # should print nothing; if it does: stop that server (Ctrl+C in its terminal)
```

- `ss ...` printing **nothing** is the correct result (the port is free).

## Step 1 – Install

```bash
cd server && npm install
cd ../client && npm install
```

## Step 2 – Watchdog self-test (no DB, no app, 10 seconds)

```bash
cd server
npm run test:watchdog
```

Expected output (the last line means success):

```
healthy request -> ok
-> /hang requested: blocking the event loop now (endless loop)...
[watchdog] event loop has been blocked for 2s
[watchdog] event loop blocked for 5s (limit 5s) - the server is hung, killing it so it gets restarted
Killed
```

## Step 3 – Start the real API (T1)

```bash
cd server
npm start
```

Wait for `SERVER RUNNING ON PORT : 4849`. The database line must show `***:***@`, not a password.

## Step 4 – Crash-safety test (the bug that stopped the server)

Get a token: open the app in the browser, log in, DevTools → Application → Local Storage →
`accessToken`. Then in another terminal:

```bash
TOKEN=<paste accessToken>
curl -s -X POST http://localhost:4849/v1/projects/get \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"project_id":"undefined"}'
```

- **Expected:** `{"statusCode":400,"status":0,"message":"Bad request",...}` and T1 keeps running.
- **Before the fix:** T1 crashed with `CastError ... [nodemon] app crashed`.

Repeat it twice; the server must still answer.

## Step 5 – Compression and report cache

```bash
# gzip: header must contain "content-encoding: gzip"
curl -s -D - -o /dev/null -X POST http://localhost:4849/v1/projects/getprojectReports \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip" \
  -d '{"technologies":[],"types":[],"managers":[],"search":"","pageNo":1,"limit":50,"sort":"title","sortBy":"asc","isExport":false}' \
  | grep -i "content-encoding\|x-report-cache"
```

Run the same command twice within 45 seconds:

- 1st run: `x-report-cache: MISS`
- 2nd run: `x-report-cache: HIT` (answered instantly from the cache)

## Step 6 – Hang test on the real server (optional)

This freezes the real server on purpose and checks that the watchdog notices.

1. **Stop** the `npm start` server in T1 (Ctrl+C).
2. Start the server directly, with the Node inspector open (add `WATCHDOG_TIMEOUT_MS=8000` to also
   test the kill; leave it out to test only the warning):

   ```bash
   cd server
   NODE_ENV=development WATCHDOG_TIMEOUT_MS=8000 node --inspect bin/www
   ```
3. In Chrome open `chrome://inspect` → under *Remote Target* click **inspect** on the server.
   In its **Console** type `while(true){}` and press Enter.
4. In the server terminal you should see, within a few seconds:
   - `[watchdog] event loop has been blocked for 2s`
   - and, with `WATCHDOG_TIMEOUT_MS=8000`, `[watchdog] event loop blocked for 8s ... killing the process`
     followed by `Killed`.
5. The kill is **permanent** here: nothing restarts the server, so start it again with `npm start`.
   That is expected – the kill is optional and only useful when systemd/Docker restarts the process
   (see `DEPLOYMENT.md`, section 6).

## Step 7 – Client (T2)

```bash
cd client
npm start                         # http://localhost:3000, talks to http://localhost:4849
```

Check in the browser:

- [ ] Login goes straight to the dashboard behind a loader; no flash, no success popup.
- [ ] Browser tab title is "Welcome to TaskHub Portal" on every page.
- [ ] Notes: search, Filter popover, date range, Reset All.
- [ ] Project Expense: Filter (Status, Date Range, Need to Bill…) updates cards, charts and table.
- [ ] Feedback and Complaints: cards/charts follow the filters; delete a record → numbers update.
- [ ] Tasks (Kanban): an empty column shows the "no data" picture.
- [ ] Project → Overview: three equal cards, donut charts same size.
- [ ] Modals (Add Expense, Add Review, Complaint, Add Stage…): no icon in the title.
- [ ] Reports: open the page twice; the second open is instant (browser DevTools → Network shows the
      `x-report-cache` header on the API calls).

## Step 8 – Done

Stop the servers (Ctrl+C) and continue with `DEPLOYMENT.md`.

---

## If something fails

| What you see | What to do |
|---|---|
| `Port 4849 is already in use` | another server still runs: `ss -ltnp \| grep 4849`, stop it |
| Step 4 returns 401 / 403 | token expired – log in again and copy a new `accessToken` |
| `x-report-cache` header missing | you hit a different endpoint, or the request was not `200` |
| `chrome://inspect` lists nothing | the server was not started with `--inspect` (step 6.2) |
| Client cannot reach the API | `client/.env` must have `REACT_APP_API_URL=http://localhost:4849` |
