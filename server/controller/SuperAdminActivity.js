const mongoose = require("mongoose");
const moment = require("moment");
const employees = require("../models/employees");
const companies = require("../models/CompanyModel");
const projects = require("../models/projects");
const tasks = require("../models/tasks");
const bugs = require("../models/bugs");
const timeLogs = require("../models/taskHoursLogs");

const { ObjectId } = mongoose.Types;

// Real collection names (used for $unionWith) resolved from the models.
const EMP_COLL = employees.collection.name; // employees
const PROJECT_COLL = projects.collection.name; // projects
const TASK_COLL = tasks.collection.name; // projecttasks
const BUG_COLL = bugs.collection.name; // projecttaskbugs

// A currently-active, non-platform-admin staff member. The adoption numerator
// is restricted to this same population (via lookup) so % never exceeds 100,
// and each module's company is derived from the employee — no project join
// needed for tasks/bugs/time-logs which carry no companyId.
const ACTIVE_EMP_MATCH = {
  isActivate: true,
  isDeleted: false,
  isSoftDeleted: false,
  isAdmin: { $ne: true },
};

const resolvePeriod = (startDate, endDate) => {
  const start = startDate
    ? moment(startDate).startOf("day").toDate()
    : moment().startOf("month").toDate();
  const end = endDate
    ? moment(endDate).endOf("day").toDate()
    : moment().endOf("day").toDate();
  return { start, end };
};

const pct = (active, total) =>
  total > 0 ? Math.min(100, Math.round((active / total) * 100)) : 0;

const dayExpr = (field) => ({ $dateToString: { format: "%Y-%m-%d", date: `$${field}` } });

const toMap = (rows, key) =>
  rows.reduce((acc, r) => {
    if (r._id) acc[r._id.toString()] = r[key];
    return acc;
  }, {});

/**
 * Lookup stage keeping only distinct user ids that belong to a currently-active
 * employee (optionally scoped to one company), projecting the employee's
 * companyId so downstream stages can group by company.
 */
const activeEmpLookup = (scopedCompany) => {
  const and = [
    { $eq: ["$_id", "$$u"] },
    { $eq: ["$isActivate", true] },
    { $eq: ["$isDeleted", false] },
    { $eq: ["$isSoftDeleted", false] },
    { $ne: ["$isAdmin", true] },
  ];
  if (scopedCompany) and.push({ $eq: ["$companyId", scopedCompany] });
  return [
    {
      $lookup: {
        from: EMP_COLL,
        let: { u: "$_id" },
        pipeline: [{ $match: { $expr: { $and: and } } }, { $project: { companyId: 1 } }],
        as: "emp",
      },
    },
    { $unwind: "$emp" },
  ];
};

/**
 * Stages producing distinct user ids who "used" a module in the period.
 * - time-logs: the employee who logged hours (`employee_id`, by `logged_date`).
 * - projects/tasks/bugs: creator + assignees (by `createdAt`).
 */
const distinctUsersPipeline = (dateField, dateMatch, withAssignees) => {
  const stages = [{ $match: { [dateField]: dateMatch, isDeleted: false } }];
  if (withAssignees) {
    stages.push(
      {
        $project: {
          users: {
            $concatArrays: [
              { $cond: [{ $ifNull: ["$createdBy", false] }, ["$createdBy"], []] },
              { $ifNull: ["$assignees", []] },
            ],
          },
        },
      },
      { $unwind: "$users" },
      { $group: { _id: "$users" } }
    );
  } else {
    stages.push({ $group: { _id: "$employee_id" } });
  }
  return stages;
};

// Distinct active users per company for one module.
const moduleActiveByCompany = (Model, dateField, dateMatch, withAssignees, scoped) =>
  Model.aggregate([
    ...distinctUsersPipeline(dateField, dateMatch, withAssignees),
    ...activeEmpLookup(scoped),
    { $group: { _id: "$emp.companyId", active: { $sum: 1 } } },
  ]);

// Run all module + overall + denominator aggregations for a given company scope.
const adoptionAggregations = (dateMatch, scoped) =>
  Promise.all([
    employees.aggregate([
      { $match: { ...ACTIVE_EMP_MATCH, ...(scoped ? { companyId: scoped } : {}) } },
      { $group: { _id: "$companyId", total: { $sum: 1 } } },
    ]),
    moduleActiveByCompany(timeLogs, "logged_date", dateMatch, false, scoped),
    moduleActiveByCompany(projects, "createdAt", dateMatch, true, scoped),
    moduleActiveByCompany(tasks, "createdAt", dateMatch, true, scoped),
    moduleActiveByCompany(bugs, "createdAt", dateMatch, true, scoped),
    // Overall: distinct active users active in ANY module (union of the 4).
    timeLogs.aggregate([
      ...distinctUsersPipeline("logged_date", dateMatch, false),
      { $unionWith: { coll: PROJECT_COLL, pipeline: distinctUsersPipeline("createdAt", dateMatch, true) } },
      { $unionWith: { coll: TASK_COLL, pipeline: distinctUsersPipeline("createdAt", dateMatch, true) } },
      { $unionWith: { coll: BUG_COLL, pipeline: distinctUsersPipeline("createdAt", dateMatch, true) } },
      { $group: { _id: "$_id" } },
      ...activeEmpLookup(scoped),
      { $group: { _id: "$emp.companyId", active: { $sum: 1 } } },
    ]),
    companies.find({ isDeleted: false, ...(scoped ? { _id: scoped } : {}) }).select("companyName").lean(),
  ]);

const buildModules = (id, total, maps) => {
  const get = (m) => m[id] || 0;
  return {
    modules: {
      time: { active: get(maps.time), percent: pct(get(maps.time), total) },
      tasks: { active: get(maps.tasks), percent: pct(get(maps.tasks), total) },
      bugs: { active: get(maps.bugs), percent: pct(get(maps.bugs), total) },
      projects: { active: get(maps.projects), percent: pct(get(maps.projects), total) },
    },
    overall: { active: get(maps.any), percent: pct(get(maps.any), total) },
  };
};

/**
 * Task (Taskhub) module-adoption overview: for every company, the % of active
 * users who used each module — time logging, tasks, bugs, projects — in the
 * period (creator or assignee for tasks/bugs/projects; logger for time).
 */
exports.getActivityOverview = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const { companyId } = req.query;
    const scoped =
      companyId && mongoose.Types.ObjectId.isValid(companyId) ? new ObjectId(companyId) : null;

    const { start, end } = resolvePeriod(req.query.startDate, req.query.endDate);
    const dateMatch = { $gte: start, $lte: end };

    const [usersByCompany, timeA, projectsA, tasksA, bugsA, anyA, companyDocs] =
      await adoptionAggregations(dateMatch, scoped);

    const maps = {
      time: toMap(timeA, "active"),
      tasks: toMap(tasksA, "active"),
      bugs: toMap(bugsA, "active"),
      projects: toMap(projectsA, "active"),
      any: toMap(anyA, "active"),
    };
    const totalMap = toMap(usersByCompany, "total");

    const rows = companyDocs
      .map((c) => {
        const id = c._id.toString();
        const total = totalMap[id] || 0;
        if (total === 0) return null;
        return {
          companyId: id,
          companyName: c.companyName || "Unknown",
          totalEmployees: total,
          ...buildModules(id, total, maps),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.overall.percent - a.overall.percent || b.totalEmployees - a.totalEmployees);

    const total = rows.length;
    const pagedRows = rows.slice((page - 1) * limit, page * limit);

    return res.json({
      status: 200,
      message: "Data fetched successfully",
      data: {
        product: "pms",
        period: { from: moment(start).format("YYYY-MM-DD"), to: moment(end).format("YYYY-MM-DD") },
        companies: pagedRows,
      },
      metaData: {
        total,
        limit,
        pageNo: page,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
        currentPage: page,
      },
    });
  } catch (error) {
    console.error("Task activity overview error:", error);
    return res.status(500).json({ status: 500, message: "Error fetching activity overview" });
  }
};

/**
 * Per-company Task adoption detail: module-wise usage % and a day-wise activity
 * trend (time / tasks / bugs / projects). Drill-down for the overview table.
 */
exports.getActivityReport = async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ status: 400, message: "Valid companyId is required" });
    }

    const cId = new ObjectId(companyId);
    const company = await companies.findById(cId).select("companyName").lean();
    if (!company) {
      return res.status(404).json({ status: 404, message: "Company not found" });
    }

    const { start, end } = resolvePeriod(req.query.startDate, req.query.endDate);
    const dateMatch = { $gte: start, $lte: end };
    const id = cId.toString();

    const [usersByCompany, timeA, projectsA, tasksA, bugsA, anyA] = await adoptionAggregations(
      dateMatch,
      cId
    );

    const total = (toMap(usersByCompany, "total")[id]) || 0;
    const maps = {
      time: toMap(timeA, "active"),
      tasks: toMap(tasksA, "active"),
      bugs: toMap(bugsA, "active"),
      projects: toMap(projectsA, "active"),
      any: toMap(anyA, "active"),
    };

    // Day-wise trend, scoped to this company. Time-logs scope by the company's
    // active employees; tasks/bugs scope by the company's project ids.
    const [activeEmpIds, projectIds] = await Promise.all([
      employees.distinct("_id", { ...ACTIVE_EMP_MATCH, companyId: cId }),
      projects.distinct("_id", { companyId: cId, isDeleted: false }),
    ]);

    const [timeByDay, projectsByDay, tasksByDay, bugsByDay] = await Promise.all([
      timeLogs.aggregate([
        { $match: { employee_id: { $in: activeEmpIds }, logged_date: dateMatch, isDeleted: false } },
        { $group: { _id: dayExpr("logged_date"), count: { $sum: 1 } } },
      ]),
      projects.aggregate([
        { $match: { companyId: cId, createdAt: dateMatch, isDeleted: false } },
        { $group: { _id: dayExpr("createdAt"), count: { $sum: 1 } } },
      ]),
      tasks.aggregate([
        { $match: { project_id: { $in: projectIds }, createdAt: dateMatch, isDeleted: false } },
        { $group: { _id: dayExpr("createdAt"), count: { $sum: 1 } } },
      ]),
      bugs.aggregate([
        { $match: { project_id: { $in: projectIds }, createdAt: dateMatch, isDeleted: false } },
        { $group: { _id: dayExpr("createdAt"), count: { $sum: 1 } } },
      ]),
    ]);

    const trendMap = new Map();
    const ensureDay = (d) => {
      if (!trendMap.has(d)) trendMap.set(d, { date: d, time: 0, tasks: 0, bugs: 0, projects: 0 });
      return trendMap.get(d);
    };
    timeByDay.forEach((d) => (ensureDay(d._id).time = d.count));
    projectsByDay.forEach((d) => (ensureDay(d._id).projects = d.count));
    tasksByDay.forEach((d) => (ensureDay(d._id).tasks = d.count));
    bugsByDay.forEach((d) => (ensureDay(d._id).bugs = d.count));
    const trend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      status: 200,
      message: "Data fetched successfully",
      data: {
        product: "pms",
        company: { id: companyId, name: company.companyName },
        period: { from: moment(start).format("YYYY-MM-DD"), to: moment(end).format("YYYY-MM-DD") },
        summary: { totalEmployees: total, ...buildModules(id, total, maps) },
        trend,
      },
    });
  } catch (error) {
    console.error("Task activity detail error:", error);
    return res.status(500).json({ status: 500, message: "Error fetching activity report" });
  }
};
