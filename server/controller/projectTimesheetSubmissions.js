const Joi = require("joi");
const moment = require("moment");
const mongoose = require("mongoose");
const { errorResponse, successResponse, catchBlockErrorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const { getRefModelFromLoginUser } = require("../helpers/common");

const Submission = () => mongoose.model("projecttimesheetsubmissions");
const Project = () => mongoose.model("projects");
const Employee = () => mongoose.model("employees");
const HourLogs = () => mongoose.model("projecttaskhourlogs");

const objectId = Joi.string().hex().length(24);

/** True when the caller's role holds one of the permission names (Admin always does). */
async function callerCan(req, names) {
  const { getUserAccessContext } = require("./authentication");
  const { roleName, permissions } = await getUserAccessContext(req.user._id, req.user.companyId);
  if (roleName === "Admin") return true;
  const rows = await mongoose.model("resource").find({ resource_name: { $in: names }, isDeleted: false }).select("_id").lean();
  const held = new Set(permissions);
  return rows.some((r) => held.has(String(r._id)));
}

const MANAGE = ["timesheet_manage"];

/** Day-aligned period bounds. */
const periodBounds = (start, end) => ({
  start: moment.utc(start).startOf("day").toDate(),
  end: moment.utc(end).endOf("day").toDate(),
});

const hoursStage = {
  $addFields: {
    _mins: {
      $add: [
        { $multiply: [{ $convert: { input: "$logged_hours", to: "int", onError: 0, onNull: 0 } }, 60] },
        { $convert: { input: "$logged_minutes", to: "int", onError: 0, onNull: 0 } },
        { $floor: { $divide: [{ $convert: { input: "$logged_seconds", to: "int", onError: 0, onNull: 0 } }, 60] } },
      ],
    },
  },
};

/** Logged minutes for (employee, project) inside a period. */
async function loggedMinutes(employeeId, projectId, start, end) {
  const [row] = await HourLogs().aggregate([
    {
      $match: {
        isDeleted: false,
        employee_id: new mongoose.Types.ObjectId(String(employeeId)),
        project_id: new mongoose.Types.ObjectId(String(projectId)),
        logged_date: { $gte: start, $lte: end },
      },
    },
    hoursStage,
    { $group: { _id: null, mins: { $sum: "$_mins" } } },
  ]);
  return row?.mins || 0;
}

async function resolveProject(req, { project, projectCode }) {
  const where = { isDeleted: false, companyId: req.user.companyId };
  if (projectCode) where.externalRef = String(projectCode).trim();
  else if (project) where._id = project;
  else return null;
  return Project().findOne(where).select("title externalRef").lean();
}

async function resolveEmployee(req, idOrEmail) {
  if (!idOrEmail) return null;
  const where = { companyId: req.user.companyId, isDeleted: false };
  if (String(idOrEmail).includes("@")) where.email = String(idOrEmail).toLowerCase();
  else if (mongoose.Types.ObjectId.isValid(idOrEmail)) where._id = idOrEmail;
  else return null;
  return Employee().findOne(where).select("full_name email").lean();
}

const keyBody = {
  id: objectId.optional(),
  employee: Joi.string().optional(), // _id or email
  project: objectId.optional(),
  projectCode: Joi.string().optional(),
  periodStart: Joi.date().optional(),
  periodEnd: Joi.date().optional(),
};

/** Find a submission from { id } or { employee, project, periodStart, periodEnd }, tenant scoped. */
async function locate(req, value) {
  if (value.id) {
    const doc = await Submission().findOne({ _id: value.id, companyId: req.user.companyId, isDeleted: false });
    return doc;
  }
  const project = await resolveProject(req, value);
  const employee = await resolveEmployee(req, value.employee);
  if (!project || !employee || !value.periodStart || !value.periodEnd) return null;
  const { start, end } = periodBounds(value.periodStart, value.periodEnd);
  return Submission().findOne({
    companyId: req.user.companyId,
    project_id: project._id,
    employee_id: employee._id,
    periodStart: start,
    periodEnd: end,
    isDeleted: false,
  });
}

// POST /projects/timesheet-submission/submit
exports.submit = async (req, res) => {
  try {
    const { error, value } = Joi.object({
      ...keyBody,
      note: Joi.string().allow("").max(2000).default(""),
      asDraft: Joi.boolean().default(false),
    }).validate(req.body || {});
    if (error) return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    if (!value.periodStart || !value.periodEnd) {
      return errorResponse(res, statusCode.BAD_REQUEST, "periodStart and periodEnd are required");
    }
    if (moment(value.periodEnd).isBefore(value.periodStart)) {
      return errorResponse(res, statusCode.BAD_REQUEST, "periodEnd must not be before periodStart");
    }

    const project = await resolveProject(req, value);
    if (!project) return errorResponse(res, statusCode.NOT_FOUND, "Project not found");

    // Default to the caller; submitting for someone else needs timesheet_manage.
    let employee = req.user;
    if (value.employee && String(value.employee) !== String(req.user._id) && String(value.employee).toLowerCase() !== String(req.user.email || "").toLowerCase()) {
      if (!(await callerCan(req, MANAGE))) {
        return errorResponse(res, statusCode.FORBIDDEN, "You can only submit your own timesheet");
      }
      employee = await resolveEmployee(req, value.employee);
      if (!employee) return errorResponse(res, statusCode.NOT_FOUND, "Employee not found");
    }

    const { start, end } = periodBounds(value.periodStart, value.periodEnd);
    const minutes = await loggedMinutes(employee._id, project._id, start, end);
    if (!value.asDraft && minutes === 0) {
      return errorResponse(res, statusCode.BAD_REQUEST, "No hours are logged on this project for the selected period");
    }

    let doc = await Submission().findOne({
      companyId: req.user.companyId,
      project_id: project._id,
      employee_id: employee._id,
      periodStart: start,
      periodEnd: end,
      isDeleted: false,
    });
    if (doc && ["Submitted", "Approved"].includes(doc.status) && !value.asDraft) {
      return errorResponse(res, statusCode.CONFLICT, `This timesheet is already ${doc.status}`);
    }
    if (doc && doc.status === "Approved") {
      return errorResponse(res, statusCode.CONFLICT, "This timesheet is already Approved");
    }
    if (!doc) {
      doc = new (Submission())({
        companyId: req.user.companyId,
        employee_id: employee._id,
        project_id: project._id,
        periodStart: start,
        periodEnd: end,
        createdBy: req.user._id,
        ...(await getRefModelFromLoginUser(req.user)),
      });
    }
    doc.status = value.asDraft ? "Draft" : "Submitted";
    doc.submittedMinutes = minutes;
    doc.note = value.note;
    doc.submittedAt = value.asDraft ? null : new Date();
    doc.reviewNote = "";
    doc.reviewedBy = null;
    doc.reviewedAt = null;
    doc.updatedBy = req.user._id;
    doc.updatedAt = new Date();
    await doc.save();
    return successResponse(res, statusCode.SUCCESS, value.asDraft ? "Timesheet saved as draft" : "Timesheet submitted", doc);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

async function review(req, res, nextStatus) {
  try {
    const { error, value } = Joi.object({
      ...keyBody,
      reviewNote: nextStatus === "Rejected" ? Joi.string().trim().min(1).max(2000).required() : Joi.string().allow("").max(2000).default(""),
    }).validate(req.body || {});
    if (error) return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);

    const doc = await locate(req, value);
    if (!doc) return errorResponse(res, statusCode.NOT_FOUND, "Timesheet submission not found");
    if (doc.status !== "Submitted") {
      return errorResponse(res, statusCode.CONFLICT, `Only a submitted timesheet can be ${nextStatus.toLowerCase()} (current: ${doc.status})`);
    }
    // Approve what is logged right now (late edits are part of the review).
    doc.submittedMinutes = await loggedMinutes(doc.employee_id, doc.project_id, doc.periodStart, doc.periodEnd);
    doc.status = nextStatus;
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
    doc.reviewNote = value.reviewNote || "";
    doc.updatedBy = req.user._id;
    doc.updatedAt = new Date();
    await doc.save();
    return successResponse(res, statusCode.SUCCESS, `Timesheet ${nextStatus.toLowerCase()}`, doc);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
}

exports.approve = (req, res) => review(req, res, "Approved");
exports.reject = (req, res) => review(req, res, "Rejected");

// POST /projects/timesheet-submission/list
exports.list = async (req, res) => {
  try {
    const { error, value } = Joi.object({
      project: objectId.optional(),
      projectCode: Joi.string().optional(),
      employee: Joi.string().optional(),
      status: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
      periodStart: Joi.date().optional(),
      periodEnd: Joi.date().optional(),
      mine: Joi.boolean().default(false),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(500).default(100),
    }).validate(req.body || {});
    if (error) return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);

    const where = { companyId: req.user.companyId, isDeleted: false };
    if (value.project || value.projectCode) {
      const project = await resolveProject(req, value);
      if (!project) return successResponse(res, statusCode.SUCCESS, "Timesheet submissions", [], { total: 0 });
      where.project_id = project._id;
    }
    const canManage = await callerCan(req, MANAGE);
    if (value.mine || !canManage) {
      where.employee_id = req.user._id;
    } else if (value.employee) {
      const employee = await resolveEmployee(req, value.employee);
      if (!employee) return successResponse(res, statusCode.SUCCESS, "Timesheet submissions", [], { total: 0 });
      where.employee_id = employee._id;
    }
    if (value.status) where.status = { $in: [].concat(value.status) };
    // Overlap filter: submission period intersects [periodStart, periodEnd]
    if (value.periodEnd) where.periodStart = { $lte: moment.utc(value.periodEnd).endOf("day").toDate() };
    if (value.periodStart) where.periodEnd = { $gte: moment.utc(value.periodStart).startOf("day").toDate() };

    const [total, rows] = await Promise.all([
      Submission().countDocuments(where),
      Submission()
        .find(where)
        .sort({ periodStart: -1, updatedAt: -1 })
        .skip((value.page - 1) * value.limit)
        .limit(value.limit)
        .populate("employee_id", "full_name email emp_img")
        .populate("project_id", "title externalRef")
        .populate("reviewedBy", "full_name")
        .lean(),
    ]);

    // Current logged minutes per row (one aggregate for the page).
    const hoursByKey = {};
    if (rows.length) {
      const logs = await HourLogs().aggregate([
        {
          $match: {
            isDeleted: false,
            employee_id: { $in: rows.map((r) => r.employee_id?._id) },
            project_id: { $in: rows.map((r) => r.project_id?._id) },
            logged_date: {
              $gte: new Date(Math.min(...rows.map((r) => +r.periodStart))),
              $lte: new Date(Math.max(...rows.map((r) => +r.periodEnd))),
            },
          },
        },
        hoursStage,
        {
          $group: {
            _id: { e: "$employee_id", p: "$project_id", d: { $dateToString: { format: "%Y-%m-%d", date: "$logged_date" } } },
            mins: { $sum: "$_mins" },
          },
        },
      ]);
      rows.forEach((r) => {
        const e = String(r.employee_id?._id);
        const p = String(r.project_id?._id);
        hoursByKey[r._id] = logs
          .filter((l) => String(l._id.e) === e && String(l._id.p) === p)
          .filter((l) => l._id.d >= moment.utc(r.periodStart).format("YYYY-MM-DD") && l._id.d <= moment.utc(r.periodEnd).format("YYYY-MM-DD"))
          .reduce((s, l) => s + l.mins, 0);
      });
    }

    const data = rows.map((r) => ({
      _id: r._id,
      employee: r.employee_id
        ? { _id: r.employee_id._id, full_name: r.employee_id.full_name, email: r.employee_id.email, emp_img: r.employee_id.emp_img }
        : null,
      project: r.project_id ? { _id: r.project_id._id, title: r.project_id.title, projectCode: r.project_id.externalRef || null } : null,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      status: r.status,
      note: r.note,
      submittedAt: r.submittedAt,
      submittedMinutes: r.submittedMinutes,
      loggedMinutes: hoursByKey[r._id] || 0,
      loggedHours: Math.round(((hoursByKey[r._id] || 0) / 60) * 100) / 100,
      reviewedBy: r.reviewedBy ? { _id: r.reviewedBy._id, full_name: r.reviewedBy.full_name } : null,
      reviewedAt: r.reviewedAt,
      reviewNote: r.reviewNote,
    }));
    // Logged-but-unsubmitted hours in the requested period count as Draft (not covered by any sheet; hours inside a Draft sheet are counted through that row).
    let unsubmittedMinutes = 0;
    if (value.periodStart && value.periodEnd && !value.status) {
      const from = moment.utc(value.periodStart).startOf("day").toDate();
      const to = moment.utc(value.periodEnd).endOf("day").toDate();
      const projWhere = where.project_id
        ? { _id: where.project_id }
        : { companyId: req.user.companyId, isDeleted: false };
      const projIds = (await mongoose.model("projects").find(projWhere).select("_id").lean()).map((p) => p._id);
      const logWhere = { isDeleted: false, project_id: { $in: projIds }, logged_date: { $gte: from, $lte: to } };
      if (where.employee_id) logWhere.employee_id = new mongoose.Types.ObjectId(String(where.employee_id));
      const sheetWhere = { companyId: req.user.companyId, isDeleted: false, status: { $in: ["Draft", "Submitted", "Approved"] }, project_id: { $in: projIds }, periodStart: { $lte: to }, periodEnd: { $gte: from } };
      if (where.employee_id) sheetWhere.employee_id = where.employee_id;
      const [logs, sheets] = await Promise.all([
        HourLogs().aggregate([
          { $match: logWhere },
          hoursStage,
          { $group: { _id: { e: "$employee_id", p: "$project_id", d: { $dateToString: { format: "%Y-%m-%d", date: "$logged_date" } } }, mins: { $sum: "$_mins" } } },
        ]),
        Submission().find(sheetWhere).select("employee_id project_id periodStart periodEnd").lean(),
      ]);
      unsubmittedMinutes = logs
        .filter((l) => !sheets.some((sh) => String(sh.employee_id) === String(l._id.e) && String(sh.project_id) === String(l._id.p) && l._id.d >= moment.utc(sh.periodStart).format("YYYY-MM-DD") && l._id.d <= moment.utc(sh.periodEnd).format("YYYY-MM-DD")))
        .reduce((sum, l) => sum + l.mins, 0);
    }
    return successResponse(res, statusCode.SUCCESS, "Timesheet submissions", data, {
      total,
      page: value.page,
      limit: value.limit,
      canManage,
      unsubmittedMinutes,
    });
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
