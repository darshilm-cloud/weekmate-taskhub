const Joi = require("joi");
const mongoose = require("mongoose");
const { errorResponse, successResponse, catchBlockErrorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const { getRefModelFromLoginUser } = require("../helpers/common");
const { enqueueMilestoneApproved } = require("../jobs/CrmSyncQueueService");

const Milestone = () => mongoose.model("projectmilestones");
const Project = () => mongoose.model("projects");

const objectId = Joi.string().hex().length(24);
const evidenceItem = Joi.alternatives().try(
  Joi.string().trim().min(1),
  Joi.object({
    name: Joi.string().allow("").default(""),
    url: Joi.string().allow("").default(""),
    type: Joi.string().allow("").default("link"),
  })
);

const normaliseEvidence = (list = []) =>
  list
    .map((item) =>
      typeof item === "string"
        ? { name: item.split("/").pop() || item, url: item, type: "link" }
        : { name: item.name || item.url, url: item.url || "", type: item.type || "link" }
    )
    .filter((e) => e.url || e.name);

/** Project of the caller's company by `project_id` or `projectCode`. */
async function findProject(req, { project_id, projectCode }) {
  const where = { isDeleted: false, companyId: req.user.companyId };
  if (project_id) where._id = project_id;
  else if (projectCode) where.externalRef = String(projectCode).trim();
  else return null;
  return Project().findOne(where).select("title externalRef projectValue manager team_manager").lean();
}

/** Milestone (tenant-scoped through its project's company). */
async function findMilestone(req, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return {};
  const milestone = await Milestone().findOne({ _id: id, isDeleted: false });
  if (!milestone) return {};
  const project = await Project()
    .findOne({ _id: milestone.project_id, companyId: req.user.companyId, isDeleted: false })
    .select("title externalRef projectValue")
    .lean();
  return project ? { milestone, project } : {};
}

const present = (m, project) => {
  const o = typeof m.toObject === "function" ? m.toObject() : m;
  const value = Math.round(((project?.projectValue || 0) * (o.weight || 0)) / 100);
  const billingAmount = Math.round(((project?.projectValue || 0) * (o.billingPercent || 0)) / 100);
  return { ...o, value, billingAmount, projectCode: project?.externalRef || null };
};

const pushHistory = (milestone, req, action, note = "") => {
  milestone.history.push({ action, status: milestone.status, by: req.user._id, at: new Date(), note });
};

// POST /projects/milestone/get  { project_id | projectCode }
exports.getMilestones = async (req, res) => {
  try {
    const { error, value } = Joi.object({
      project_id: objectId.optional(),
      projectCode: Joi.string().optional(),
    })
      .or("project_id", "projectCode")
      .validate(req.body);
    if (error) return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);

    const project = await findProject(req, value);
    if (!project) return errorResponse(res, statusCode.NOT_FOUND, "Project not found");

    const rows = await Milestone().find({ project_id: project._id, isDeleted: false }).sort({ sequence: 1, createdAt: 1 });
    const data = rows.map((m) => present(m, project));
    return successResponse(res, statusCode.SUCCESS, "Milestones", data, {
      project: { _id: project._id, title: project.title, projectCode: project.externalRef || null, projectValue: project.projectValue || 0 },
      total: data.length,
      totalWeight: data.reduce((s, m) => s + (m.weight || 0), 0),
      approved: data.filter((m) => m.status === "Approved").length,
      isTeamManager: !!project.team_manager && String(project.team_manager) === String(req.user._id),
    });
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

const baseFields = {
  key: Joi.string().trim().max(20),
  title: Joi.string().trim().max(200),
  description: Joi.string().allow("").max(2000),
  weight: Joi.number().min(0).max(100),
  billingPercent: Joi.number().min(0).max(100),
  dueDate: Joi.date().allow(null, ""),
  sequence: Joi.number().integer().min(0),
};

// POST /projects/milestone/add
exports.addMilestone = async (req, res) => {
  try {
    const { error, value } = Joi.object({
      project_id: objectId.optional(),
      projectCode: Joi.string().optional(),
      ...baseFields,
      key: baseFields.key.required(),
      title: baseFields.title.required(),
    })
      .or("project_id", "projectCode")
      .validate(req.body);
    if (error) return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);

    const project = await findProject(req, value);
    if (!project) return errorResponse(res, statusCode.NOT_FOUND, "Project not found");

    if (await Milestone().exists({ project_id: project._id, key: value.key, isDeleted: false })) {
      return errorResponse(res, statusCode.CONFLICT, `Milestone ${value.key} already exists for this project`);
    }
    const count = await Milestone().countDocuments({ project_id: project._id, isDeleted: false });
    const doc = new (Milestone())({
      companyId: req.user.companyId,
      project_id: project._id,
      key: value.key,
      title: value.title,
      description: value.description || "",
      weight: value.weight || 0,
      billingPercent: value.billingPercent || 0,
      dueDate: value.dueDate || null,
      sequence: value.sequence ?? count + 1,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req.user)),
    });
    pushHistory(doc, req, "created");
    await doc.save();
    return successResponse(res, statusCode.CREATED, "Milestone added", present(doc, project));
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// PUT /projects/milestone/update/:id
exports.updateMilestone = async (req, res) => {
  try {
    const { error, value } = Joi.object({
      ...baseFields,
      status: Joi.string().valid("Not Started", "In Progress"),
    }).validate(req.body);
    if (error) return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);

    const { milestone, project } = await findMilestone(req, req.params.id);
    if (!milestone) return errorResponse(res, statusCode.NOT_FOUND, "Milestone not found");
    if (milestone.status === "Approved" && (value.weight !== undefined || value.billingPercent !== undefined)) {
      return errorResponse(res, statusCode.CONFLICT, "An approved milestone's weight / billing cannot be changed");
    }
    // Status can only be moved between the two open states here; submit/approve/reject own the rest.
    if (value.status && !["Not Started", "In Progress"].includes(milestone.status)) delete value.status;
    Object.assign(milestone, value, { updatedBy: req.user._id, updatedAt: new Date() });
    pushHistory(milestone, req, "updated");
    await milestone.save();
    return successResponse(res, statusCode.SUCCESS, "Milestone updated", present(milestone, project));
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// POST /projects/milestone/submit/:id  { evidence: [], note }
exports.submitMilestone = async (req, res) => {
  try {
    const { error, value } = Joi.object({
      evidence: Joi.array().items(evidenceItem).default([]),
      note: Joi.string().allow("").max(2000).default(""),
    }).validate(req.body || {});
    if (error) return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);

    const { milestone, project } = await findMilestone(req, req.params.id);
    if (!milestone) return errorResponse(res, statusCode.NOT_FOUND, "Milestone not found");
    if (!["Not Started", "In Progress", "Rework Required"].includes(milestone.status)) {
      return errorResponse(res, statusCode.CONFLICT, `A milestone in status "${milestone.status}" cannot be submitted`);
    }
    const evidence = normaliseEvidence(value.evidence);
    if (!evidence.length && !(milestone.evidence || []).length) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Attach at least one piece of evidence");
    }
    if (evidence.length) milestone.evidence = evidence;
    milestone.status = "Submitted";
    milestone.submitNote = value.note;
    milestone.submittedBy = req.user._id;
    milestone.submittedAt = new Date();
    milestone.reviewNote = "";
    milestone.updatedBy = req.user._id;
    milestone.updatedAt = new Date();
    pushHistory(milestone, req, "submitted", value.note);
    await milestone.save();
    return successResponse(res, statusCode.SUCCESS, "Milestone submitted for review", present(milestone, project));
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// POST /projects/milestone/approve/:id  { note? }
exports.approveMilestone = async (req, res) => {
  try {
    const { error, value } = Joi.object({ note: Joi.string().allow("").max(2000).default("") }).validate(req.body || {});
    if (error) return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);

    const { milestone, project } = await findMilestone(req, req.params.id);
    if (!milestone) return errorResponse(res, statusCode.NOT_FOUND, "Milestone not found");
    if (milestone.status !== "Submitted") {
      return errorResponse(res, statusCode.CONFLICT, `Only a submitted milestone can be approved (current: ${milestone.status})`);
    }
    // Maker-checker: whoever submitted a milestone cannot approve it (Admin is exempt).
    const isAdminUser = String(req.user?.pms_role_id?.role_name || "").toLowerCase() === "admin";
    if (!isAdminUser && milestone.submittedBy && String(milestone.submittedBy) === String(req.user._id)) {
      return errorResponse(res, statusCode.CONFLICT, "You submitted this milestone, so you cannot approve it. Another approver (or an Admin) must review it.");
    }
    const now = new Date();
    milestone.status = "Approved";
    milestone.approvedBy = req.user._id;
    milestone.approvedAt = now;
    milestone.reviewedBy = req.user._id;
    milestone.reviewedAt = now;
    milestone.reviewNote = value.note;
    milestone.updatedBy = req.user._id;
    milestone.updatedAt = now;
    pushHistory(milestone, req, "approved", value.note);
    await milestone.save();

    // Outbox: resolves without throwing; status becomes pending -> synced/failed in the background.
    const sync = await enqueueMilestoneApproved(milestone._id);
    const fresh = await Milestone().findById(milestone._id);
    return successResponse(res, statusCode.SUCCESS, "Milestone approved", { ...present(fresh, project), syncMode: sync.mode });
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// POST /projects/milestone/reject/:id  { reviewNote }
exports.rejectMilestone = async (req, res) => {
  try {
    const { error, value } = Joi.object({
      reviewNote: Joi.string().trim().min(1).max(2000).required(),
    }).validate(req.body || {});
    if (error) return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);

    const { milestone, project } = await findMilestone(req, req.params.id);
    if (!milestone) return errorResponse(res, statusCode.NOT_FOUND, "Milestone not found");
    if (milestone.status !== "Submitted") {
      return errorResponse(res, statusCode.CONFLICT, `Only a submitted milestone can be returned (current: ${milestone.status})`);
    }
    const now = new Date();
    milestone.status = "Rework Required";
    milestone.reviewNote = value.reviewNote;
    milestone.reviewedBy = req.user._id;
    milestone.reviewedAt = now;
    milestone.reworkCount = (milestone.reworkCount || 0) + 1;
    milestone.updatedBy = req.user._id;
    milestone.updatedAt = now;
    pushHistory(milestone, req, "returned", value.reviewNote);
    await milestone.save();
    return successResponse(res, statusCode.SUCCESS, "Milestone returned for rework", present(milestone, project));
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// POST /projects/milestone/crm-resync/:id  - retry a failed CRM push
exports.resyncMilestone = async (req, res) => {
  try {
    const { milestone, project } = await findMilestone(req, req.params.id);
    if (!milestone) return errorResponse(res, statusCode.NOT_FOUND, "Milestone not found");
    if (milestone.status !== "Approved") {
      return errorResponse(res, statusCode.CONFLICT, "Only approved milestones are synced to the CRM");
    }
    const sync = await enqueueMilestoneApproved(milestone._id);
    const fresh = await Milestone().findById(milestone._id);
    return successResponse(res, statusCode.SUCCESS, "CRM sync queued", { ...present(fresh, project), syncMode: sync.mode });
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// requirePermission `allow` hook: the project's Team Manager (project.team_manager) may submit its milestones.
exports.isProjectTeamManager = async (req) => {
  try {
    const milestone = await Milestone().findOne({ _id: req.params.id, isDeleted: false }).select("project_id").lean();
    if (!milestone) return false;
    const p = await Project().findOne({ _id: milestone.project_id, companyId: req.user.companyId, isDeleted: false }).select("team_manager").lean();
    return !!p?.team_manager && String(p.team_manager) === String(req.user._id);
  } catch (e) {
    return false;
  }
};
exports.normaliseEvidence = normaliseEvidence;
