const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const ProjectWorkFlow = mongoose.model("projectworkflows");
const ProjectWorkFlowStatus = mongoose.model("workflowstatus");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");

const getCompanyObjectId = (req) => {
  const companyId = req?.user?.companyId;
  if (!companyId || !mongoose.Types.ObjectId.isValid(String(companyId))) return null;
  return new mongoose.Types.ObjectId(companyId);
};

const getCompanyWorkflowById = async (workflowId, companyObjectId) => {
  if (!workflowId || !companyObjectId) return null;
  if (!mongoose.Types.ObjectId.isValid(String(workflowId))) return null;
  return ProjectWorkFlow.findOne({
    _id: new mongoose.Types.ObjectId(workflowId),
    isDeleted: false,
    companyId: companyObjectId,
  }).lean();
};

//Add Project Work Flow status:
exports.addProjectWorkFlowStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      workflow_id: Joi.string().required(),
      title: Joi.string().required(),
      color: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const companyObjectId = getCompanyObjectId(req);
    const workflow = await getCompanyWorkflowById(value.workflow_id, companyObjectId);
    if (!workflow) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Invalid workflow for this company.");
    }

    if (
      !(await this.projectWorkFlowStatusExists(value.title, companyObjectId))
    ) {
      // Get last sequence for ..
      const getWorkFlowLastData = await ProjectWorkFlowStatus.find({
        isDeleted: false,
        workflow_id: new mongoose.Types.ObjectId(value.workflow_id),
      })
        .sort({ sequence: -1 })
        .limit(1);
      const nextSequence =
        Array.isArray(getWorkFlowLastData) && getWorkFlowLastData.length > 0
          ? Number(getWorkFlowLastData[0]?.sequence || 0) + 1
          : 1;

      // save new data..
      let data = new ProjectWorkFlowStatus({
        workflow_id: value.workflow_id,
        title: value.title,
        color: value.color,
        sequence: nextSequence,
        createdBy: req.user._id,
        updatedBy: req.user._id,
      });
      await data.save();

      return successResponse(res, statusCode.CREATED, messages.CREATED, data);
    } else {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        messages.ALREADY_EXISTS,
        []
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project Work Flow:
exports.getProjectWorkFlowStatus = async (req, res) => {
  try {
    const companyObjectId = getCompanyObjectId(req);
    const workflow = await getCompanyWorkflowById(req.params.workFlowId, companyObjectId);
    if (!workflow) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Invalid workflow for this company.");
    }

    const query = [
      {
        $match: {
          isDeleted: false,
          workflow_id: new mongoose.Types.ObjectId(req.params.workFlowId),
          ...(req.query._id
            ? { _id: new mongoose.Types.ObjectId(req.query._id) }
            : {}),
        },
      },
      {
        $sort: {
          sequence: 1,
        },
      },
    ];
    const projectWorkFlowStatus = await ProjectWorkFlowStatus.aggregate(query);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      req.query._id ? projectWorkFlowStatus[0] : projectWorkFlowStatus,
      []
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Get all workflow stages with backend pagination and search
exports.listProjectWorkFlowStages = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      pageNo: Joi.number().integer().min(1).optional().default(1),
      limit: Joi.number().integer().min(1).optional().default(25),
      search: Joi.string().optional().allow(""),
    });
    const { error, value } = validationSchema.validate(req.query);
    if (error) {
      return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    }

    const pageNo = Number(value.pageNo || 1);
    const limit = Number(value.limit || 25);
    const skip = (pageNo - 1) * limit;

    const searchQuery = String(value.search || "").trim();

    const baseQuery = [
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "projectworkflows",
          let: { workflow_id: "$workflow_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$workflow_id"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$companyId", new mongoose.Types.ObjectId(req.user.companyId)] },
                  ],
                },
              },
            },
          ],
          as: "workflow",
        },
      },
      {
        $unwind: {
          path: "$workflow",
          preserveNullAndEmptyArrays: false,
        },
      },
      ...(searchQuery
        ? [
            {
              $match: {
                $or: [
                  { title: { $regex: searchQuery, $options: "i" } },
                  { "workflow.project_workflow": { $regex: searchQuery, $options: "i" } },
                ],
              },
            },
          ]
        : []),
    ];

    const countResult = await ProjectWorkFlowStatus.aggregate([
      ...baseQuery,
      { $count: "total" },
    ]);
    const total = Number(countResult?.[0]?.total || 0);

    const rows = await ProjectWorkFlowStatus.aggregate([
      ...baseQuery,
      {
        $sort: {
          "workflow.project_workflow": 1,
          sequence: 1,
        },
      },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          color: 1,
          sequence: 1,
          isDefault: 1,
          workflow_id: "$workflow._id",
          workflow_name: "$workflow.project_workflow",
        },
      },
    ]);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, rows, {
      total,
      pageNo,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Check is exists..
exports.projectWorkFlowStatusExists = async (title, companyObjectId, id = null) => {
  try {
    const data = await ProjectWorkFlowStatus.aggregate([
      {
        $match: {
          isDeleted: false,
          ...(id
            ? {
                _id: { $ne: new mongoose.Types.ObjectId(id) },
              }
            : {}),
        },
      },
      {
        $lookup: {
          from: "projectworkflows",
          localField: "workflow_id",
          foreignField: "_id",
          as: "workflow",
        },
      },
      {
        $unwind: {
          path: "$workflow",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "workflow.isDeleted": false,
          "workflow.companyId": companyObjectId,
        },
      },
      {
        $addFields: {
          titleLower: { $toLower: "$title" }, // Add a temporary field with lowercase title
        },
      },
      {
        $match: {
          titleLower: title.trim().toLowerCase(), // Match the lowercase title
        },
      },
    ]);
    return data.length > 0;
  } catch (error) {
    console.log("🚀 ~ exports.projectWorkFlowStatusExists= ~ error:", error);
  }
};

//Update Project Work Flow:
exports.updateProjectWorkFlowStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      workflow_id: Joi.string().required(),
      title: Joi.string().required(),
      color: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const companyObjectId = getCompanyObjectId(req);
    const workflow = await getCompanyWorkflowById(value.workflow_id, companyObjectId);
    if (!workflow) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Invalid workflow for this company.");
    }

    const existingStage = await ProjectWorkFlowStatus.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean();
    if (!existingStage) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }
    if (String(existingStage.workflow_id || "") !== String(value.workflow_id || "")) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Stage does not belong to the provided workflow.");
    }

    if (
      !(await this.projectWorkFlowStatusExists(
        value.title,
        companyObjectId,
        req.params.id
      ))
    ) {
      const data = await ProjectWorkFlowStatus.findByIdAndUpdate(
        req.params.id,
        {
          workflow_id: value.workflow_id,
          title: value.title,
          color: value.color,
          updatedBy: req.user._id,
        },
        { new: true }
      );

      return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
    } else {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        messages.ALREADY_EXISTS,
        []
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Reorder Project Workflow Stages by sequence
exports.reorderProjectWorkFlowStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      workflow_id: Joi.string().required(),
      ordered_stage_ids: Joi.array().items(Joi.string().required()).min(1).required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    }

    const workflowObjectId = new mongoose.Types.ObjectId(value.workflow_id);
    const companyObjectId = getCompanyObjectId(req);
    const workflow = await getCompanyWorkflowById(value.workflow_id, companyObjectId);
    if (!workflow) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Invalid workflow for this company.");
    }

    const orderedIds = value.ordered_stage_ids.map((id) => new mongoose.Types.ObjectId(id));

    const existingStages = await ProjectWorkFlowStatus.find(
      {
        workflow_id: workflowObjectId,
        isDeleted: false,
      },
      { _id: 1 }
    ).lean();

    const existingIdSet = new Set(existingStages.map((row) => String(row._id)));
    const incomingIdSet = new Set(value.ordered_stage_ids.map((id) => String(id)));
    if (existingIdSet.size !== incomingIdSet.size) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        "Ordered stages must include all workflow stages exactly once."
      );
    }
    for (const stageId of incomingIdSet) {
      if (!existingIdSet.has(stageId)) {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          "Ordered stages contain invalid workflow stage ids."
        );
      }
    }

    const bulkOps = orderedIds.map((stageId, index) => ({
      updateOne: {
        filter: { _id: stageId, workflow_id: workflowObjectId, isDeleted: false },
        update: {
          $set: {
            sequence: index + 1,
            updatedBy: req.user._id,
            updatedAt: configs.utcDefault(),
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await ProjectWorkFlowStatus.bulkWrite(bulkOps);
    }

    const data = await ProjectWorkFlowStatus.find(
      { workflow_id: workflowObjectId, isDeleted: false },
      { _id: 1, title: 1, color: 1, sequence: 1, isDefault: 1 }
    )
      .sort({ sequence: 1 })
      .lean();

    return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project Work Flow:
exports.deleteProjectWorkFlowStatus = async (req, res) => {
  try {
    const companyObjectId = getCompanyObjectId(req);
    const stage = await ProjectWorkFlowStatus.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean();
    if (!stage) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }
    const workflow = await getCompanyWorkflowById(stage.workflow_id, companyObjectId);
    if (!workflow) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Invalid stage for this company.");
    }

    const data = await ProjectWorkFlowStatus.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(res, statusCode.SUCCESS, messages.DELETED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
