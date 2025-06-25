const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
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
  searchDataArr,
} = require("../helpers/queryHelper");

// Check is exists..
exports.projectLabelsExists = async (title, id = null) => {
  try {
    let isExist = false;
    // const data = await ProjectLabels.findOne({
    //   // title: title?.trim()?.toLowerCase(),
    //   title: { $regex: new RegExp(`^${title}$`, "i") },
    //   isDeleted: false,
    //   ...(id
    //     ? {
    //         _id: { $ne: id },
    //       }
    //     : {}),
    // });
    // if (data) isExist = true;

    const data = await ProjectLabels.aggregate([
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
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectLabelsExists= ~ error:", error);
  }
};

//Add Project Labels :
exports.addProjectLabels = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      color: Joi.string().required(),
      project_id: Joi.string().optional(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (await this.projectLabelsExists(value.title)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let data = new ProjectLabels({
        title: value.title,
        color: value.color,
        project_id: value.project_id || null,
        createdBy: req.user._id,
        updatedBy: req.user._id,
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
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
      isDropdown: Joi.boolean().optional().default(false),
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
      sortBy: value.sortBy,
    });

    // project wise labels and common for all the project..
    let matchQuery = {
      isDeleted: false,
      ...(req.body._id // For details
        ? { _id: new mongoose.Types.ObjectId(req.body._id) }
        : {}),
      $or: [
        req.body?.project_id
          ? {
              project_id: new mongoose.Types.ObjectId(req.body?.project_id), // project wise...
            }
          : {},
        { project_id: { $eq: null } }, // Common for all
      ],
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["title"], value.search),
      };
    }

    let data;
    let metaData = [];
    if (value.isDropdown) {
      data = await ProjectLabels.find(matchQuery).sort(pagination.sort);
    } else {
      const query = [
        {
          $match: matchQuery,
        },
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
        currentPage: pagination.page,
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
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      color: Joi.string().required(),
      project_id: Joi.string().optional(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (await this.projectLabelsExists(value.title, req.params.id)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      const data = await ProjectLabels.findByIdAndUpdate(
        req.params.id,
        {
          title: value.title,
          color: value.color,
          project_id: value.project_id || null,
          updatedBy: req.user._id,
        },
        { new: true }
      );

      if (!data) {
        return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
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
    const data = await ProjectLabels.findByIdAndUpdate(
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
