const mongoose = require("mongoose");
const { errorResponse, successResponse, catchBlockErrorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");

const CACHE_TTL_MS = 30 * 1000;
const REQUEST_TIMEOUT_MS = 6000;
const cache = new Map(); // key -> { at, value }
const tokens = new Map(); // `${slug}:${system}` -> token (per company, never shared across tenants)

const isDev = () => process.env.NODE_ENV === "development";
const crmUrl = () => (process.env.CRM_API_URL || "http://localhost:5103").replace(/\/+$/, "");
const hrmsUrl = () => (process.env.HRMS_API_URL || "http://localhost:5102").replace(/\/+$/, "");
const crmWebUrl = () => (process.env.CRM_WEB_URL || "http://localhost:5203").replace(/\/+$/, "");
// Service login is derived per company (same rule as Payroll LinkedProjectCostService): admin@<company email domain>
// with the demo password. AARAV_LINK_* env only applies to the aaravent tenant (or when no company is known).
const credentials = (co = {}) => {
  const slug = String(co.slug || "").toLowerCase();
  const isAarav = !slug || slug === "aaravent";
  if (isAarav) {
    return {
      email: process.env.AARAV_LINK_EMAIL || (isDev() ? "admin@aaravent.com" : ""),
      password: process.env.AARAV_LINK_PASSWORD || (isDev() ? "Aarav@2026" : ""),
    };
  }
  const domain = String(co.email || "").split("@")[1] || `${slug}.com`;
  return { email: `admin@${domain}`, password: process.env.COMPANY_LINK_PASSWORD || "Demo@2026" };
};
const slugOf = (co) => String(co?.slug || "aaravent").toLowerCase();

/** Company context of the signed-in user: slug (companyDomain) and email domain. */
async function companyOf(req) {
  const c = await mongoose.model("companies").findById(req.user.companyId).select("companyDomain").lean().catch(() => null);
  return { id: String(req.user.companyId), slug: String(c?.companyDomain || "").toLowerCase(), email: req.user.email || "" };
}

async function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const value = await loader();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function http(method, url, { token, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function login(system, co) {
  const { email, password } = credentials(co);
  if (!email || !password) throw new Error("Service login not configured");
  if (system === "crm") {
    const r = await http("POST", `${crmUrl()}/api/auth/login`, { body: { email, password, slug: co?.slug || undefined } });
    if (!r.json?.token) throw new Error("CRM login failed");
    return r.json.token;
  }
  const r = await http("POST", `${hrmsUrl()}/api/admin/login`, { body: { email, password } });
  const t = r.json?.tokenForSSO?.accessToken || r.json?.authToken?.accessToken;
  if (!t) throw new Error("HRMS login failed");
  return t;
}

/** Call a product API with the cached service token; re-login once on 401/403. */
async function callWithLogin(co, system, method, url, body) {
  const tk = `${slugOf(co)}:${system}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!tokens.get(tk)) tokens.set(tk, await login(system, co));
    const r = await http(method, url, { token: tokens.get(tk), body });
    if ((r.status === 401 || r.json?.status === 401) && attempt === 0) {
      tokens.delete(tk);
      continue;
    }
    return r;
  }
  throw new Error(`${system} authentication failed`);
}

const unavailable = (reason) => ({ available: false, reason });

async function loadBilling(co, code, taskhubMilestones) {
  try {
    const r = await callWithLogin(co, "crm", "GET", `${crmUrl()}/api/billing/projects?projectCode=${encodeURIComponent(code)}`);
    if (r.status >= 400) throw new Error(`CRM responded ${r.status}`);
    const p = (r.json?.data || []).find((x) => x.projectCode === code);
    if (!p) return unavailable("No CRM billing record found for this project code");
    const invoices = p.invoices || [];
    const byKey = new Map(taskhubMilestones.map((m) => [m.key, m]));
    const milestones = (p.milestones || []).map((m) => {
      const th = byKey.get(m.key) || {};
      const inv = invoices.find((i) => i.invoiceNo && i.invoiceNo === m.invoiceNo);
      return {
        key: m.key,
        title: m.title,
        billingPercent: th.billingPercent ?? null,
        invoiceNo: m.invoiceNo || null,
        invoiceStatus: m.invoiceStatus || null,
        milestoneStatus: m.status || null,
        amount: m.amount || 0,
        dueDate: inv?.dueDate || th.dueDate || null,
      };
    });
    return {
      available: true,
      projectCode: p.projectCode,
      customer: p.customer?.name || null,
      currency: p.currency || "INR",
      value: p.value || 0,
      invoiced: p.invoiced || 0,
      received: p.received || 0,
      outstanding: p.outstanding || 0,
      overdue: p.overdue || 0,
      nextAction: formatDatesInText(formatMoneyInText(p.nextAction)) || null,
      milestones,
    };
  } catch (e) {
    return unavailable(`CRM unavailable: ${e.message}`);
  }
}

// CRM builds nextAction with raw numbers ("balance 404900 overdue"); show amounts like the tiles: Rs 4,04,900.
// Only bare numbers of 5+ digits are treated as money (years, codes like PRJ-2026-003 and already formatted amounts are left alone).
function formatMoneyInText(text) {
  if (!text) return text;
  return String(text).replace(/(?<![\w.,\u20B9-])(\d{5,9})(?![\w,.-]*\d)/g, (m) => `\u20B9${Number(m).toLocaleString("en-IN")}`);
}

// ISO dates (2026-11-18 or 2026-11-18T00:00:00.000Z) -> 18 Nov 2026, shown as the calendar day in IST.
function formatDatesInText(text) {
  if (!text) return text;
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return String(text).replace(/\b(\d{4})-(\d{2})-(\d{2})(?:T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?(?!\d)/g, (m, y, mo, d) => {
    const mi = Number(mo) - 1;
    return mi >= 0 && mi < 12 ? `${d} ${MON[mi]} ${y}` : m;
  });
}

async function loadTeam(co, assignees) {
  try {
    const emails = assignees.map((a) => (a.email || "").toLowerCase()).filter(Boolean);
    if (!emails.length) return { available: true, members: [] };
    const directory = await cached(`hrms:employees:${co.id}`, async () => {
      const map = new Map();
      for (let page = 1; page <= 20; page += 1) {
        const r = await callWithLogin(co, "hrms", "POST", `${hrmsUrl()}/api/emp/hub/employees`, { pageNum: page, pageLimit: 500 });
        if (r.json?.status !== 200 || !Array.isArray(r.json.data)) throw new Error(r.json?.message || `HRMS responded ${r.status}`);
        r.json.data.forEach((e) => e.email && map.set(e.email.toLowerCase(), e));
        if (page >= (r.json.metaData?.totalFilteredPage || 1)) break;
      }
      return map;
    });
    const from = new Date();
    const to = new Date(from.getTime() + 30 * 86400000);
    const day = (d) => d.toISOString().slice(0, 10);
    const leaveKey = `hrms:leave:${co.id}:${day(from)}:${[...emails].sort().join(",")}`;
    const leaves = await cached(leaveKey, async () => {
      const r = await callWithLogin(co, "hrms", "POST", `${hrmsUrl()}/api/emp/hub/leave-calendar`, { from: day(from), to: day(to), emails });
      if (r.json?.status !== 200) throw new Error(r.json?.message || `HRMS responded ${r.status}`);
      return r.json.data?.leaves || [];
    });
    const members = assignees.map((a) => {
      const email = (a.email || "").toLowerCase();
      const emp = directory.get(email);
      return {
        name: emp?.full_name || a.name || email,
        email,
        inHrms: !!emp,
        designation: emp?.designation || null,
        department: emp?.department || null,
        skills: (emp?.skills || [])
          .slice()
          .sort((x, y) => (y.proficiencyOrder || 0) - (x.proficiencyOrder || 0))
          .slice(0, 4)
          .map((s) => ({ skill: s.skill, level: s.level })),
        leaves: leaves
          .filter((l) => (l.email || "").toLowerCase() === email)
          .map((l) => ({ from: l.from, to: l.to, days: l.days, type: l.leave, duration: l.leave_type })),
      };
    });
    return { available: true, members };
  } catch (e) {
    return unavailable(`HRMS unavailable: ${e.message}`);
  }
}

// GET /projects/linked-business/:id   (route runs `verification`: admin / manager / assignee / creator / client of the project)
exports.getLinkedBusiness = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(String(id))) return errorResponse(res, statusCode.BAD_REQUEST, "Invalid project id");
    const project = await mongoose
      .model("projects")
      .findOne({ _id: id, isDeleted: false, companyId: req.user.companyId })
      .select("title externalRef assignees")
      .populate("assignees", "full_name email")
      .lean();
    if (!project) return errorResponse(res, statusCode.NOT_FOUND, "Project not found");

    const co = await companyOf(req);
    const code = project.externalRef ? String(project.externalRef).trim() : "";
    const assignees = (project.assignees || []).map((a) => ({ name: a.full_name || "", email: a.email || "" }));
    const payload = await cached(`project:${co.id}:${id}`, async () => {
      if (!code) return { linked: false, projectCode: null, billing: unavailable("Not linked to a CRM deal"), team: await loadTeam(co, assignees) };
      const milestones = await mongoose
        .model("projectmilestones")
        .find({ project_id: id, isDeleted: false })
        .select("key billingPercent dueDate")
        .lean();
      const [billing, team] = await Promise.all([loadBilling(co, code, milestones), loadTeam(co, assignees)]);
      return { linked: true, projectCode: code, billing, team };
    });
    return successResponse(res, statusCode.SUCCESS, "Linked business data", {
      ...payload,
      projectTitle: project.title,
      crmLink: code ? `${crmWebUrl()}/${slugOf(co)}/handovers?projectCode=${encodeURIComponent(code)}` : null,
    });
  } catch (error) {
    return catchBlockErrorResponse(res, error);
  }
};
