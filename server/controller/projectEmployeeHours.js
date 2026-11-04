const Joi = require("joi");
const moment = require("moment");
const mongoose = require("mongoose");
const { errorResponse, successResponse, catchBlockErrorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");

const toInt = (field) => ({ $convert: { input: field, to: "int", onError: 0, onNull: 0 } });

const minutesExpr = {
  $add: [
    { $multiply: [toInt("$logged_hours"), 60] },
    toInt("$logged_minutes"),
    { $floor: { $divide: [toInt("$logged_seconds"), 60] } },
  ],
};

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * POST /projects/task-logged-hours/projectEmployeeHours  { projectCode?, from, to }
 * -> [{ employeeEmail, projectCode, plannedHours, loggedHours, approvedHours }]
 *
 * loggedHours   : hours logged in [from, to]
 * approvedHours : the part of loggedHours that lies inside an Approved project timesheet submission
 * plannedHours  : estimated hours of the project's tasks, split across each task's assignees
 *                 (not date bound: it is the employee's planned load on the project)
 * Without projectCode every project that has a projectCode (externalRef) is returned.
 */
exports.projectEmployeeHours = async (req, res) => {
  try {
    const { error, value } = Joi.object({
      projectCode: Joi.string().optional().allow(""),
      from: Joi.date().required(),
      to: Joi.date().required(),
    }).validate(req.body || {});
    if (error) return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);

    const companyId = new mongoose.Types.ObjectId(String(req.user.companyId));
    const from = moment.utc(value.from).startOf("day").toDate();
    const to = moment.utc(value.to).endOf("day").toDate();

    const projectWhere = { companyId, isDeleted: false };
    if (value.projectCode) projectWhere.externalRef = value.projectCode.trim();
    else projectWhere.externalRef = { $type: "string" };
    const projects = await mongoose.model("projects").find(projectWhere).select("_id externalRef").lean();
    if (!projects.length) return successResponse(res, statusCode.SUCCESS, "Project employee hours", []);
    const projectIds = projects.map((p) => p._id);
    const codeById = Object.fromEntries(projects.map((p) => [String(p._id), p.externalRef]));

    const HourLogs = mongoose.model("projecttaskhourlogs");
    const [logged, approvedSheets] = await Promise.all([
      HourLogs.aggregate([
        { $match: { isDeleted: false, project_id: { $in: projectIds }, logged_date: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { e: "$employee_id", p: "$project_id", d: { $dateToString: { format: "%Y-%m-%d", date: "$logged_date" } } },
            mins: { $sum: minutesExpr },
          },
        },
      ]),
      mongoose.model("projecttimesheetsubmissions").find({
        companyId,
        isDeleted: false,
        status: "Approved",
        project_id: { $in: projectIds },
        periodStart: { $lte: to },
        periodEnd: { $gte: from },
      }).select("employee_id project_id periodStart periodEnd").lean(),
    ]);

    // Planned hours: each task's estimate split evenly across its assignees.
    const taskRows = await mongoose.model("projecttasks")
      .find({ isDeleted: false, project_id: { $in: projectIds }, "assignees.0": { $exists: true } })
      .select("project_id assignees estimated_hours estimated_minutes")
      .lean();
    const plannedMap = {};
    for (const t of taskRows) {
      const hrs = (parseFloat(t.estimated_hours) || 0) + (parseFloat(t.estimated_minutes) || 0) / 60;
      const share = hrs / t.assignees.length;
      for (const a of t.assignees) {
        const k = `${a}|${t.project_id}`;
        plannedMap[k] = (plannedMap[k] || 0) + share;
      }
    }

    const rows = {};
    const row = (e, p) => {
      const k = `${e}|${p}`;
      return (rows[k] = rows[k] || { e: String(e), p: String(p), logged: 0, approved: 0, planned: plannedMap[k] || 0 });
    };
    Object.keys(plannedMap).forEach((k) => {
      const [e, p] = k.split("|");
      row(e, p);
    });
    for (const l of logged) {
      const r = row(l._id.e, l._id.p);
      r.logged += l.mins;
      const inApproved = approvedSheets.some(
        (s) =>
          String(s.employee_id) === String(l._id.e) &&
          String(s.project_id) === String(l._id.p) &&
          l._id.d >= moment.utc(s.periodStart).format("YYYY-MM-DD") &&
          l._id.d <= moment.utc(s.periodEnd).format("YYYY-MM-DD")
      );
      if (inApproved) r.approved += l.mins;
    }

    const empIds = [...new Set(Object.values(rows).map((r) => r.e))];
    const employees = await mongoose
      .model("employees")
      .find({ _id: { $in: empIds }, companyId })
      .select("email")
      .lean();
    const emailById = Object.fromEntries(employees.map((e) => [String(e._id), e.email]));

    const data = Object.values(rows)
      .filter((r) => emailById[r.e])
      .map((r) => ({
        employeeEmail: emailById[r.e],
        projectCode: codeById[r.p] || null,
        plannedHours: round2(r.planned),
        loggedHours: round2(r.logged / 60),
        approvedHours: round2(r.approved / 60),
      }))
      .sort((a, b) => (a.projectCode + a.employeeEmail).localeCompare(b.projectCode + b.employeeEmail));

    return successResponse(res, statusCode.SUCCESS, "Project employee hours", data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
