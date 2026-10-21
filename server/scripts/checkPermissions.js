/**
 * Permission Management check - read-only, changes no data.
 *
 *  1. Lists every write route (POST/PUT/PATCH/DELETE) under /v1 with the
 *     permission it needs, and the ones with no permission check.
 *  2. For every role of one company, runs each route's permission check
 *     in-process against a real user of that role and compares the result
 *     with what the role holds in Permission Management.
 *  3. Over HTTP (API server must be running), calls every route a role is NOT
 *     allowed to use, as a real user of that role, and expects a 403. Allowed
 *     routes are never called over HTTP, so nothing is created or changed.
 *
 * Usage: node server/scripts/checkPermissions.js [companyId] [--no-http]
 *   companyId defaults to the company with the most users.
 *   API_URL defaults to http://localhost:<PORT from env/.env.dev>/v1.
 */

"use strict";

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../env/.env.dev") });
global.moment = require("moment");
global.chalk = require("chalk");

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

require("../models");

const args = process.argv.slice(2);
const companyArg = args.find((arg) => mongoose.Types.ObjectId.isValid(arg));
const skipHttp = args.includes("--no-http");
const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 4849}/v1`;
const DUMMY_ID = "000000000000000000000000";
const WRITE_METHODS = ["post", "put", "patch", "delete"];
// Same filter as login - only test with accounts that can actually sign in.
const CAN_LOG_IN = { isDeleted: false, isSoftDeleted: false, isActivate: true };

/* ── 1. Route map ─────────────────────────────────────────── */

// Express 4 keeps a mounted router's path only as a regexp: /^\/projects\/?(?=\/|$)/i
const mountPath = (layer) =>
  layer.regexp.source
    .replace(/^\^/, "")
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, "")
    .replace(/\\\//g, "/");

const collectRoutes = (router, prefix = "") =>
  router.stack.flatMap((layer) => {
    if (layer.route) {
      const guard = layer.route.stack.find((s) => s.handle.permissionNames);
      const roleGuard = layer.route.stack.find((s) => s.handle.requiredRole);
      return Object.keys(layer.route.methods).map((method) => ({
        method,
        path: prefix + layer.route.path,
        permissions: guard ? guard.handle.permissionNames : null,
        requiredRole: roleGuard?.handle.requiredRole || null,
        roleGuard: roleGuard?.handle || null,
        hasAllowOverride: Boolean(guard?.handle.hasAllowOverride),
        guard: guard?.handle || null,
      }));
    }
    if (layer.handle?.stack) return collectRoutes(layer.handle, prefix + mountPath(layer));
    return [];
  });

// POST is also used for list/search endpoints; flag those so the "no check"
// list is easy to scan.
const looksLikeRead = (routePath) =>
  /(get|list|search|history|export|count|detail|filter|report|check|view|fetch|download|stat)/i.test(
    routePath.split("/").slice(-2).join("/")
  );

/* ── helpers ──────────────────────────────────────────────── */

const runGuard = (guard, user) =>
  new Promise((resolve) => {
    const req = { user, params: { userId: DUMMY_ID, id: DUMMY_ID }, body: {}, query: {} };
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      send(body) {
        resolve({ allowed: false, code: this.code, body });
      },
      json(body) {
        resolve({ allowed: false, code: this.code, body });
      },
    };
    guard(req, res, () => resolve({ allowed: true }));
  });

const fillParams = (routePath) => routePath.replace(/:[A-Za-z_]+\??/g, DUMMY_ID);

async function main() {
  await mongoose.connect(process.env.DB_URL);
  const v1 = require("../routes/v1");
  const { dataForJWT } = require("../controller/authentication");

  const routes = collectRoutes(v1, "").filter((route) => WRITE_METHODS.includes(route.method));
  const guarded = routes.filter((route) => route.permissions);
  const superAdminOnly = routes.filter((route) => !route.permissions && route.requiredRole);
  const unguarded = routes.filter((route) => !route.permissions && !route.requiredRole);

  console.log(
    chalk.bold(
      `\nWrite routes: ${routes.length} - with a permission check: ${guarded.length}, Super Admin only: ${superAdminOnly.length}, without: ${unguarded.length}`
    )
  );
  console.log(chalk.gray("Without a permission check (review these):"));
  unguarded.forEach((route) =>
    console.log(
      `  ${route.method.toUpperCase().padEnd(6)} ${route.path}${looksLikeRead(route.path) ? chalk.gray("  (looks like a read)") : ""}`
    )
  );

  /* ── 2. In-process matrix ───────────────────────────────── */

  const db = mongoose.connection.db;
  let companyId = companyArg && new mongoose.Types.ObjectId(companyArg);
  if (!companyId) {
    const [top] = await db
      .collection("employees")
      .aggregate([{ $match: { isDeleted: false } }, { $group: { _id: "$companyId", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 1 }])
      .toArray();
    companyId = top._id;
  }
  const company = await db.collection("companies").findOne({ _id: companyId });
  console.log(chalk.bold(`\nCompany: ${company?.companyName || ""} (${companyId})`));

  const resources = await db.collection("resources").find({ isDeleted: false }).toArray();
  const nameOf = Object.fromEntries(resources.map((row) => [String(row._id), row.resource_name]));
  const roles = await db.collection("pms_roles").find({ isDeleted: false }).toArray();

  const failures = [];
  const summary = [];

  for (const role of roles) {
    const userDoc =
      (await db.collection("employees").findOne({ ...CAN_LOG_IN, companyId, pms_role_id: role._id })) ||
      (await db.collection("pmsclients").findOne({ ...CAN_LOG_IN, companyId, pms_role_id: role._id }));
    if (!userDoc) {
      summary.push({ role: role.role_name, user: "(no user - skipped)" });
      continue;
    }

    const rows = await db.collection("role_permissions").find({ companyId, pms_role_id: role._id, isDeleted: false }).toArray();
    const held = new Set(rows.map((row) => nameOf[String(row.resource_id)]).filter(Boolean));
    const isAdmin = role.role_name === "Admin";
    const user = { _id: String(userDoc._id), companyId: String(companyId), pms_role_id: { _id: role._id, role_name: role.role_name } };

    let allowedCount = 0;
    const deniedRoutes = [...superAdminOnly];
    for (const route of superAdminOnly) {
      const actual = await runGuard(route.roleGuard, user);
      if (actual.allowed) failures.push(`${role.role_name}: ${route.method.toUpperCase()} ${route.path} - Super Admin only, but was allowed`);
    }
    for (const route of guarded) {
      const expected = isAdmin || route.permissions.some((name) => held.has(name));
      const actual = await runGuard(route.guard, user);
      if (actual.allowed !== expected) {
        failures.push(`${role.role_name}: ${route.method.toUpperCase()} ${route.path} - expected ${expected ? "allowed" : "denied"}, got ${actual.allowed ? "allowed" : `denied (${actual.code})`}`);
      } else if (!actual.allowed && !actual.body?.permissionDenied) {
        failures.push(`${role.role_name}: ${route.method.toUpperCase()} ${route.path} - denied without the permissionDenied flag (client would log the user out)`);
      }
      if (expected) allowedCount += 1;
      else if (!route.hasAllowOverride) deniedRoutes.push(route);
    }

    /* ── 3. HTTP: denied routes must answer 403 ───────────── */
    let httpChecked = 0;
    if (!skipHttp && deniedRoutes.length) {
      const payload = await dataForJWT({ _id: userDoc._id, email: userDoc.email, pms_role_id: { role_name: role.role_name } });
      const token = jwt.sign(JSON.parse(JSON.stringify(payload)), process.env.ACCESS_TOKEN_SECRET, { expiresIn: "10m" });
      for (const route of deniedRoutes) {
        let status;
        let body;
        try {
          const response = await fetch(API_URL + fillParams(route.path), {
            method: route.method.toUpperCase(),
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: "{}",
            signal: AbortSignal.timeout(15000),
          });
          status = response.status;
          body = await response.json().catch(() => null);
        } catch (error) {
          failures.push(`${role.role_name}: ${route.method.toUpperCase()} ${route.path} - HTTP error: ${error.message}`);
          continue;
        }
        httpChecked += 1;
        if (status !== 403 || !body?.permissionDenied) {
          failures.push(`${role.role_name}: ${route.method.toUpperCase()} ${route.path} - HTTP ${status}, expected 403 permission denied`);
        }
      }
    }

    summary.push({
      role: role.role_name,
      user: userDoc.email,
      permissions: held.size,
      allowed: allowedCount,
      denied: guarded.length - allowedCount + superAdminOnly.length,
      "denied, checked over HTTP": skipHttp ? "skipped" : httpChecked,
    });
  }

  console.table(summary);

  if (failures.length) {
    console.log(chalk.red.bold(`\n${failures.length} problem(s):`));
    failures.forEach((line) => console.log(chalk.red(`  ✗ ${line}`)));
  } else {
    console.log(chalk.green.bold("\n✓ Every role is allowed / refused exactly as Permission Management says."));
  }

  await mongoose.disconnect();
  process.exit(failures.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
