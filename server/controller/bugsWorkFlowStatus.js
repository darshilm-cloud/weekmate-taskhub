const Joi = require("joi");
const mongoose = require("mongoose");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");

const BugsWorkFlowStatus = mongoose.model("bugsworkflowstatus");
const PROTECTED_DEFAULT_BUG_STAGES = [
  "open",
  "in progress",
  "to be tested",
  "on hold",
  "closed",
];

const isTitleExists = async (title, id = null) => {
  const rows = await BugsWorkFlowStatus.aggregate([
    {
      $match: {
        isDeleted: false,
        ...(id ? { _id: { $ne: new mongoose.Types.ObjectId(id) } } : {}),
      },
    },
    {
      $addFields: {
        titleLower: { $toLower: "$title" },
      },
    },
    {
      $match: {
        titleLower: String(title || "").trim().toLowerCase(),
      },
    },
  ]);
  return rows.length > 0;
};

const isProtectedDefaultStage = (stageDoc) => {
  if (!stageDoc) return false;
  if (stageDoc.isDefault) return true;
  const title = String(stageDoc.title || "").trim().toLowerCase();
  return PROTECTED_DEFAULT_BUG_STAGES.includes(title);
};

exports.addBugsWorkFlowStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      color: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    }

    if (await isTitleExists(value.title)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS, []);
    }

    const last = await BugsWorkFlowStatus.find({
      isDeleted: false,
    })
      .sort({ sequence: -1 })
      .limit(1)
      .lean();
    const nextSequence =
      Array.isArray(last) && last.length > 0 ? Number(last[0]?.sequence || 0) + 1 : 1;

    const data = new BugsWorkFlowStatus({
      title: value.title,
      color: value.color,
      sequence: nextSequence,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    await data.save();

    return successResponse(res, statusCode.CREATED, messages.CREATED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getBugsWorkFlowStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      _id: Joi.string().optional().allow(""),
      pageNo: Joi.number().integer().min(1).optional().default(1),
      limit: Joi.number().integer().min(1).optional().default(25),
      search: Joi.string().optional().allow(""),
    });
    const { error, value } = validationSchema.validate(req.query);
    if (error) {
      return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    }

    if (value._id) {
      const row = await BugsWorkFlowStatus.findOne({
        _id: value._id,
        isDeleted: false,
      }).lean();
      return successResponse(res, statusCode.SUCCESS, messages.LISTING, row || null, {});
    }

    const matchQuery = {
      isDeleted: false,
      ...(value.search
        ? {
            title: {
              $regex: value.search,
              $options: "i",
            },
          }
        : {}),
    };

    const total = await BugsWorkFlowStatus.countDocuments(matchQuery);
    const pageNo = Number(value.pageNo || 1);
    const limit = Number(value.limit || 25);
    const skip = (pageNo - 1) * limit;

    const query = [
      {
        $match: matchQuery,
      },
      {
        $sort: {
          sequence: 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ];
    const rows = await BugsWorkFlowStatus.aggregate(query);
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      rows,
      {
        total,
        pageNo,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.updateBugsWorkFlowStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      color: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    }

    if (await isTitleExists(value.title, req.params.id)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS, []);
    }

    const existingStage = await BugsWorkFlowStatus.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean();
    if (!existingStage) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }
    if (isProtectedDefaultStage(existingStage)) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        "Default bug stages cannot be edited."
      );
    }

    const data = await BugsWorkFlowStatus.findByIdAndUpdate(
      req.params.id,
      {
        title: value.title,
        color: value.color,
        updatedBy: req.user._id,
      },
      { new: true }
    );
    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }
    return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.reorderBugsWorkFlowStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      ordered_stage_ids: Joi.array().items(Joi.string().required()).min(1).required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    }

    const existingStages = await BugsWorkFlowStatus.find(
      { isDeleted: false },
      { _id: 1 }
    ).lean();
    const existingIdSet = new Set(existingStages.map((row) => String(row._id)));
    const incomingIdSet = new Set(value.ordered_stage_ids.map((id) => String(id)));

    if (existingIdSet.size !== incomingIdSet.size) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        "Ordered stages must include all bug stages exactly once."
      );
    }
    for (const stageId of incomingIdSet) {
      if (!existingIdSet.has(stageId)) {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          "Ordered stages contain invalid bug stage ids."
        );
      }
    }

    const bulkOps = value.ordered_stage_ids.map((stageId, index) => ({
      updateOne: {
        filter: {
          _id: new mongoose.Types.ObjectId(stageId),
          isDeleted: false,
        },
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
      await BugsWorkFlowStatus.bulkWrite(bulkOps);
    }

    const rows = await BugsWorkFlowStatus.find(
      { isDeleted: false },
      { _id: 1, title: 1, color: 1, sequence: 1, isDefault: 1 }
    )
      .sort({ sequence: 1 })
      .lean();

    return successResponse(res, statusCode.SUCCESS, messages.UPDATED, rows);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.deleteBugsWorkFlowStatus = async (req, res) => {
  try {
    const existingStage = await BugsWorkFlowStatus.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean();
    if (!existingStage) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }
    if (isProtectedDefaultStage(existingStage)) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        "Default bug stages cannot be deleted."
      );
    }

    const data = await BugsWorkFlowStatus.findByIdAndUpdate(
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
