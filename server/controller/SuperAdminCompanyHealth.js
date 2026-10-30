const mongoose = require("mongoose");
const moment = require("moment");
const employees = require("../models/employees");
const companies = require("../models/CompanyModel");
const projects = require("../models/projects");
const tasks = require("../models/tasks");
const bugs = require("../models/bugs");
const timeLogs = require("../models/taskHoursLogs");
const smtpConfigs = require("../models/Smtp");
const { statusCode } = require("../helpers/constant");
const { LISTING, NOT_FOUND } = require("../helpers/messages");
const { successResponse, errorResponse, catchBlockErrorResponse } = require("../helpers/response");

const { ObjectId } = mongoose.Types;

const ALLOWED_DAYS = [7, 30, 90];
const DEFAULT_DAYS = 30;
const MAX_COMPANIES = 5000;
const MAX_INACTIVE_LISTED = 25;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const ACTIVE_EMP_MATCH = {
  isActivate: true,
  isDeleted: false,
  isSoftDeleted: false,
  isAdmin: { $ne: true },
};

const ASSIGNEE_USERS = [
  {
    $project: {
      date: "$createdAt",
      users: {
        $concatArrays: [
          { $cond: [{ $ifNull: ["$createdBy", false] }, ["$createdBy"], []] },
          { $ifNull: ["$assignees", []] },
        ],
      },
    },
  },
  { $unwind: "$users" },
  { $group: { _id: "$users", last: { $max: "$date" } } },
];

const TIME_USERS = [{ $group: { _id: "$employee_id", last: { $max: "$logged_date" } } }];

const MODULES = [
  { key: "projects", label: "Projects", group: "Project Delivery", optional: true, model: projects, dateField: "createdAt", users: ASSIGNEE_USERS },
  { key: "tasks", label: "Tasks", group: "Project Delivery", model: tasks, dateField: "createdAt", users: ASSIGNEE_USERS },
  { key: "bugs", label: "Bugs", group: "Project Delivery", optional: true, model: bugs, dateField: "createdAt", users: ASSIGNEE_USERS },
  { key: "time", label: "Time Tracking", group: "Time Tracking", model: timeLogs, dateField: "logged_date", users: TIME_USERS },
];

const resolveDays = (value) => {
  const days = Number(value);
  return ALLOWED_DAYS.includes(days) ? days : DEFAULT_DAYS;
};

const resolveWindow = (days) => {
  const start = moment.utc().startOf("day").subtract(days - 1, "days");
  const end = moment.utc().endOf("day");
  return { start: start.toDate(), end: end.toDate(), range: { $gte: start.toDate(), $lte: end.toDate() } };
};

const toIso = (date) => (date ? new Date(date).toISOString() : null);

const latest = (...dates) =>
  dates.filter(Boolean).reduce((max, d) => (!max || new Date(d) > new Date(max) ? d : max), null);

const dayExpr = (field) => ({ $dateToString: { format: "%Y-%m-%d", date: `$${field}` } });

const inWindowExpr = (field, range) => ({
  $and: [{ $gte: [`$${field}`, range.$gte] }, { $lte: [`$${field}`, range.$lte] }],
});

const countIf = (condition) => ({ $sum: { $cond: [condition, 1, 0] } });

const roundTo = (value, digits = 1) => Number(value.toFixed(digits));

const employeeName = (e) =>
  e.full_name || [e.first_name, e.last_name].filter(Boolean).join(" ") || e.email || "Unknown";

const activeEmpLookup = () => [
  {
    $lookup: {
      from: employees.collection.name,
      let: { u: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$_id", "$$u"] } } },
        { $match: ACTIVE_EMP_MATCH },
        { $project: { companyId: 1 } },
      ],
      as: "emp",
    },
  },
  { $unwind: "$emp" },
];

const activeByCompany = ({ model, dateField, users }, range) =>
  model.aggregate([
    { $match: { [dateField]: range, isDeleted: false } },
    ...users,
    ...activeEmpLookup(),
    { $group: { _id: "$emp.companyId", active: { $sum: 1 }, last: { $max: "$last" } } },
  ]);

const moduleFacet = (model, base, dateField, users, extraStats, range) =>
  model
    .aggregate([
      { $match: base },
      {
        $facet: {
          stats: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                inWindow: countIf(inWindowExpr(dateField, range)),
                ...extraStats,
              },
            },
          ],
          daily: [
            { $match: { [dateField]: range } },
            { $group: { _id: dayExpr(dateField), count: { $sum: 1 } } },
          ],
          users: [{ $match: { [dateField]: range } }, ...users],
        },
      },
    ])
    .then(([result]) => ({
      stats: result.stats[0] || {},
      daily: result.daily,
      users: result.users,
    }));

const toNumberExpr = (field) => ({ $convert: { input: `$${field}`, to: "double", onError: 0, onNull: 0 } });

const loggedSecondsExpr = {
  $add: [
    { $multiply: [toNumberExpr("logged_hours"), 3600] },
    { $multiply: [toNumberExpr("logged_minutes"), 60] },
    toNumberExpr("logged_seconds"),
  ],
};

const summarizeUsers = (rows, activeIds) => {
  const matched = rows.filter((r) => r._id && activeIds.has(r._id.toString()));
  return { active: matched.length, last: latest(...matched.map((r) => r.last)), matched };
};

const buildCompanyBase = (company) => ({
  companyId: company._id.toString(),
  companyName: company.companyName || "Unknown",
  createdAt: toIso(company.createdAt),
  planName: company.plan || null,
  planEndDate: null,
  isActive: company.isActive !== false,
  userLimit: company.maxUsers ?? null,
});

exports.getCompanyHealthOverview = async (req, res) => {
  try {
    const days = resolveDays(req.query.days);
    const { range } = resolveWindow(days);

    const [totalRows, companyDocs, ...moduleRows] = await Promise.all([
      employees.aggregate([
        { $match: ACTIVE_EMP_MATCH },
        { $group: { _id: "$companyId", total: { $sum: 1 } } },
      ]),
      companies
        .find({ isDeleted: false })
        .select("companyName createdAt plan maxUsers isActive")
        .sort({ createdAt: -1 })
        .limit(MAX_COMPANIES)
        .lean(),
      ...MODULES.map((m) => activeByCompany(m, range)),
    ]);

    const totals = new Map(totalRows.filter((r) => r._id).map((r) => [r._id.toString(), r.total]));
    const perModule = moduleRows.map(
      (rows) => new Map(rows.filter((r) => r._id).map((r) => [r._id.toString(), r]))
    );

    const result = companyDocs.map((company) => {
      const base = buildCompanyBase(company);
      const total = totals.get(base.companyId) || 0;
      const modules = MODULES.map((m, i) => {
        const row = perModule[i].get(base.companyId);
        return {
          key: m.key,
          label: m.label,
          group: m.group,
          active: Math.min(row?.active || 0, total),
          total,
          lastActivityAt: toIso(row?.last),
          ...(m.optional ? { optional: true } : {}),
        };
      });
      return {
        ...base,
        totalEmployees: total,
        lastActivityAt: latest(...modules.map((m) => m.lastActivityAt)),
        modules,
      };
    });

    return successResponse(res, statusCode.SUCCESS, LISTING, { days, companies: result });
  } catch (error) {
    return catchBlockErrorResponse(res, "Error fetching company health");
  }
};

const subscriptionStatus = (company) => (company.isActive === false ? "expired" : "active");

const buildHistory = (company) => {
  const planRow = (eventType, date, note) => ({
    eventType,
    date: toIso(date),
    planName: company.plan || null,
    planStartDate: toIso(company.createdAt),
    planEndDate: null,
    maxUsers: company.maxUsers ?? null,
    note,
  });
  return [
    planRow("current_plan", company.updatedAt || company.createdAt, "Current plan"),
    planRow("created", company.createdAt, "Company created"),
  ];
};

const buildConfiguration = (company, projectStats, hasSmtp, totalEmployees) => {
  const toMb = (value) => roundTo((value || 0) / (1024 * 1024), 2);
  return [
    { group: "Plan & Limits", label: "Plan", value: company.plan || null },
    { group: "Plan & Limits", label: "User limit", value: company.maxUsers ?? null },
    {
      group: "Plan & Limits",
      label: "Seat utilisation (%)",
      value: company.maxUsers > 0 ? roundTo((totalEmployees / company.maxUsers) * 100) : null,
    },
    { group: "Plan & Limits", label: "File upload size limit (MB)", value: roundTo((company.fileUploadSize || 0) / 1024, 2) },
    { group: "Storage", label: "Files stored (MB)", value: toMb(company.fileSize) },
    { group: "Storage", label: "Data stored (MB)", value: toMb(company.dataSize) },
    { group: "Features", label: "Custom SMTP configured", value: hasSmtp },
    { group: "Features", label: "Custom domain set", value: Boolean(company.companyDomain) },
    { group: "Features", label: "Projects with bug tracking enabled", value: projectStats.bugsEnabled || 0 },
    { group: "Features", label: "Billable projects", value: projectStats.billable || 0 },
    { group: "Regional", label: "Currency", value: company.currency || null },
  ];
};

const buildModuleDetails = (key, stats, active) => {
  const perUser = (value) => (active > 0 ? roundTo(value / active) : 0);
  switch (key) {
    case "projects":
      return [
        { label: "Created in period", value: stats.inWindow || 0 },
        { label: "Total projects", value: stats.total || 0 },
        { label: "Bug tracking enabled", value: stats.bugsEnabled || 0 },
        { label: "Billable", value: stats.billable || 0 },
      ];
    case "tasks":
      return [
        { label: "Created in period", value: stats.inWindow || 0 },
        { label: "Total tasks", value: stats.total || 0 },
        { label: "Archived tasks", value: stats.archived || 0 },
        { label: "Created per active user", value: perUser(stats.inWindow || 0) },
      ];
    case "bugs":
      return [
        { label: "Reported in period", value: stats.inWindow || 0 },
        { label: "Total bugs", value: stats.total || 0 },
        { label: "Archived bugs", value: stats.archived || 0 },
        { label: "Reported per active user", value: perUser(stats.inWindow || 0) },
      ];
    default: {
      const hours = (stats.seconds || 0) / 3600;
      return [
        { label: "Time entries in period", value: stats.inWindow || 0 },
        { label: "Hours logged", value: roundTo(hours) },
        { label: "Manually added entries", value: stats.manual || 0 },
        { label: "Hours per active user", value: perUser(hours) },
        { label: "Users logging time", value: active },
      ];
    }
  }
};

exports.getCompanyHealthDetail = async (req, res) => {
  const { companyId } = req.params;
  if (!OBJECT_ID_REGEX.test(companyId || "")) {
    return errorResponse(res, statusCode.NOT_FOUND, NOT_FOUND);
  }

  try {
    const days = resolveDays(req.query.days);
    const { start, range } = resolveWindow(days);
    const cId = new ObjectId(companyId);

    const [company, activeEmps, projectIds, hasSmtp] = await Promise.all([
      companies.findOne({ _id: cId, isDeleted: false }).lean(),
      employees.aggregate([
        { $match: { ...ACTIVE_EMP_MATCH, companyId: cId } },
        {
          $project: {
            first_name: 1,
            last_name: 1,
            full_name: 1,
            email: 1,
            lastLogin: { $max: "$loginActivity" },
          },
        },
      ]),
      projects.distinct("_id", { companyId: cId, isDeleted: false }),
      smtpConfigs.exists({ companyId: cId }).then(Boolean),
    ]);

    if (!company) {
      return errorResponse(res, statusCode.NOT_FOUND, NOT_FOUND);
    }

    const empIds = activeEmps.map((e) => e._id);
    const activeIds = new Set(empIds.map(String));
    const totalEmployees = empIds.length;

    const [projectFacet, taskFacet, bugFacet, timeFacet] = await Promise.all([
      moduleFacet(
        projects,
        { companyId: cId, isDeleted: false },
        "createdAt",
        ASSIGNEE_USERS,
        { bugsEnabled: countIf("$isBugsEnabled"), billable: countIf("$isBillable") },
        range
      ),
      moduleFacet(
        tasks,
        { project_id: { $in: projectIds }, isDeleted: false },
        "createdAt",
        ASSIGNEE_USERS,
        { archived: countIf({ $eq: ["$status", "archived"] }) },
        range
      ),
      moduleFacet(
        bugs,
        { project_id: { $in: projectIds }, isDeleted: false },
        "createdAt",
        ASSIGNEE_USERS,
        { archived: countIf({ $eq: ["$status", "archived"] }) },
        range
      ),
      moduleFacet(
        timeLogs,
        { employee_id: { $in: empIds }, isDeleted: false, logged_date: range },
        "logged_date",
        TIME_USERS,
        { seconds: { $sum: loggedSecondsExpr }, manual: countIf("$isManuallyAdded") },
        range
      ),
    ]);

    const facets = { projects: projectFacet, tasks: taskFacet, bugs: bugFacet, time: timeFacet };
    const lastActiveByUser = new Map();

    const modules = MODULES.map((m) => {
      const facet = facets[m.key];
      const { active, last, matched } = summarizeUsers(facet.users, activeIds);
      matched.forEach((r) => {
        const id = r._id.toString();
        lastActiveByUser.set(id, latest(lastActiveByUser.get(id), r.last));
      });
      return {
        key: m.key,
        label: m.label,
        group: m.group,
        active,
        total: totalEmployees,
        lastActivityAt: toIso(last),
        ...(m.optional ? { optional: true } : {}),
        details: buildModuleDetails(m.key, facet.stats, active),
      };
    });

    const dailyMaps = {
      tasks: new Map(taskFacet.daily.map((d) => [d._id, d.count])),
      bugs: new Map(bugFacet.daily.map((d) => [d._id, d.count])),
      time: new Map(timeFacet.daily.map((d) => [d._id, d.count])),
    };
    const points = Array.from({ length: days }, (_, i) => {
      const date = moment.utc(start).add(i, "days").format("YYYY-MM-DD");
      return {
        date,
        tasks: dailyMaps.tasks.get(date) || 0,
        bugs: dailyMaps.bugs.get(date) || 0,
        time: dailyMaps.time.get(date) || 0,
      };
    });

    const inactive = activeEmps
      .filter((e) => !lastActiveByUser.has(e._id.toString()))
      .map((e) => ({
        name: employeeName(e),
        email: e.email || null,
        designation: null,
        lastActiveAt: toIso(e.lastLogin),
      }))
      .sort((a, b) => {
        if (!a.lastActiveAt) return b.lastActiveAt ? -1 : 0;
        if (!b.lastActiveAt) return 1;
        return a.lastActiveAt.localeCompare(b.lastActiveAt);
      });

    return successResponse(res, statusCode.SUCCESS, LISTING, {
      days,
      company: {
        id: company._id.toString(),
        name: company.companyName || "Unknown",
        email: null,
        phone: null,
        location: null,
        industry: null,
        createdAt: toIso(company.createdAt),
        isActive: company.isActive !== false,
      },
      subscription: {
        planName: company.plan || null,
        planStartDate: toIso(company.createdAt),
        planEndDate: null,
        maxUsers: company.maxUsers ?? null,
        status: subscriptionStatus(company),
      },
      totals: { employees: totalEmployees, userLimit: company.maxUsers ?? null },
      modules,
      trends: {
        series: [
          { key: "tasks", label: "Tasks created" },
          { key: "bugs", label: "Bugs reported" },
          { key: "time", label: "Time entries" },
        ],
        points,
      },
      configuration: buildConfiguration(company, projectFacet.stats, hasSmtp, totalEmployees),
      adoption: {
        total: totalEmployees,
        active: lastActiveByUser.size,
        inactive: inactive.length,
        neverActive: inactive.filter((e) => !e.lastActiveAt).length,
        inactiveEmployees: inactive.slice(0, MAX_INACTIVE_LISTED),
        byDepartment: [],
      },
      history: buildHistory(company),
    });
  } catch (error) {
    return catchBlockErrorResponse(res, "Error fetching company health detail");
  }
};
