const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const ProjectLabels = mongoose.model("tasklabels");

const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const {
  getAggregationPagination,
  getTotalCountQuery,
  getPagination,
  searchDataArr
} = require("../helpers/queryHelper");

// Check is exists..
exports.projectLabelsExists = async (title, id = null, companyId = null) => {
  try {
    let isExist = false;

    const data = await ProjectLabels.aggregate([
      {
        $match: {
          isDeleted: false,
          companyId: newObjectId(companyId),
          ...(id
            ? {
                _id: { $ne: new mongoose.Types.ObjectId(id) }
              }
            : {})
        }
      },
      {
        $addFields: {
          titleLower: { $toLower: "$title" } // Add a temporary field with lowercase title
        }
      },
      {
        $match: {
          titleLower: title.trim().toLowerCase() // Match the lowercase title
        }
      }
    ]);
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectLabelsExists= ~ error:", error);
  }
};

//Add Project Labels :
exports.addProjectLabels = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      title: Joi.string().required(),
      color: Joi.string().required(),
      project_id: Joi.string().optional()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (await this.projectLabelsExists(value.title, null, decodedCompanyId)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let data = new ProjectLabels({
        companyId: newObjectId(decodedCompanyId),
        title: value.title,
        color: value.color,
        project_id: value.project_id || null,
        createdBy: req.user._id,
        updatedBy: req.user._id
      });
      await data.save();
      return successResponse(res, statusCode.CREATED, messages.CREATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project Labels :
exports.getProjectLabels = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
      isDropdown: Joi.boolean().optional().default(false)
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const pagination = getPagination({
      pageLimit: value.limit,
      pageNum: value.pageNo,
      sort: value.sort,
      sortBy: value.sortBy
    });

    // project wise labels and common for all the project..
    let matchQuery = {
      isDeleted: false,
      companyId: newObjectId(decodedCompanyId),
      ...(req.body._id // For details
        ? { _id: new mongoose.Types.ObjectId(req.body._id) }
        : {}),
      $or: [
        req.body?.project_id
          ? {
              project_id: new mongoose.Types.ObjectId(req.body?.project_id) // project wise...
            }
          : {},
        { project_id: { $eq: null } } // Common for all
      ]
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["title"], value.search)
      };
    }

    let data;
    let metaData = [];
    if (value.isDropdown) {
      data = await ProjectLabels.find(matchQuery).sort(pagination.sort);
    } else {
      const query = [
        {
          $match: matchQuery
        }
      ];
      const totalCountQuery = getTotalCountQuery(query);
      const totalCountResult = await ProjectLabels.aggregate(totalCountQuery);
      const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

      data = await ProjectLabels.aggregate(
        getAggregationPagination(query, pagination)
      );

      metaData = {
        total: totalCount,
        limit: pagination.limit,
        pageNo: pagination.page,
        totalPages:
          pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
        currentPage: pagination.page
      };
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      req.query._id ? data[0] : data,
      !value._id && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Project Labels :
exports.updateProjectLabels = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      title: Joi.string().required(),
      color: Joi.string().required(),
      project_id: Joi.string().optional()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (
      await this.projectLabelsExists(
        value.title,
        req.params.id,
        decodedCompanyId
      )
    ) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      // Get old data before update for logging
      const oldLabelData = await ProjectLabels.findById(req.params.id).lean();

      const data = await ProjectLabels.findByIdAndUpdate(
        req.params.id,
        {
          title: value.title,
          color: value.color,
          project_id: value.project_id || null,
          updatedBy: req.user._id
        },
        { new: true }
      );

      if (!data) {
        return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
      }

      // Get new data after update for logging
      const newLabelData = data.toObject ? data.toObject() : data;

      // Log update activity
      try {
        const { logUpdate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
        const userInfo = await getUserInfoForLogging(req.user);
        if (userInfo && oldLabelData && newLabelData) {
          await logUpdate({
            companyId: userInfo.companyId,
            moduleName: "projectLabels",
            email: userInfo.email,
            createdBy: userInfo._id,
            updatedBy: userInfo._id,
            oldData: oldLabelData,
            newData: newLabelData,
            additionalData: {
              recordId: oldLabelData._id.toString()
            }
          });
        }
      } catch (logError) {
        console.error("Error logging project label update activity:", logError);
      }

      return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project Labels :
exports.deleteProjectLabels = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Get label data before deletion for logging
    const labelData = await ProjectLabels.findById(req.params.id).lean();
    
    const data = await ProjectLabels.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault()
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && labelData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "projectLabels",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: labelData,
        additionalData: {
          recordId: labelData._id.toString(),
          isSoftDelete: true
        }
      });
    }

    return successResponse(res, statusCode.SUCCESS, messages.DELETED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
