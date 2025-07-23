const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const Reviews = mongoose.model("reviews");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr,
  getAggregationPagination,
} = require("../helpers/queryHelper");
const { statusCode } = require("../helpers/constant");
const configs = require("../configs");
const messages = require("../helpers/messages");
const {
  getRefModelFromLoginUser,
  getCreatedUpdatedDeletedByQuery,
} = require("../helpers/common");
const { newReviewsMail } = require("../template/reviews");
const { checkUserIsAdmin } = require("./authentication");

//Add Review
exports.addReview = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      client_name: Joi.string().required(),
      feedback: Joi.string().required(),
      feedback_type: Joi.string().required(),
      client_nda_sign: Joi.boolean().optional().default(false),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    let data = new Reviews({
      project_id: value?.project_id || null,
      client_name: value?.client_name || null,
      feedback: value?.feedback.replace(/\n/g, '<br>') || null,
      feedback_type: value?.feedback_type || null,
      client_nda_sign: value?.client_nda_sign || false,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user)),
    });
    await data.save();

    let emailDetails = await this.getReviewsDetailsForMail(data._id,decodedCompanyId);
    await newReviewsMail(emailDetails, decodedCompanyId)

    return successResponse(
      res,
      statusCode.CREATED,
      messages.REVIEW_CREATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Review :
exports.getReview = async (req, res) => {
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
      sort: Joi.string().default("_id"), //
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
      project_id: Joi.array().optional(),
      technology: Joi.array().optional(),
      manager_id: Joi.array().optional(),
      acc_manager_id: Joi.array().optional(),
      priority: Joi.string().optional(),
      status: Joi.string().optional(),
      feedback_type: Joi.string().optional().allow(""),
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
      pageLimit: value?.limit,
      pageNum: value?.pageNo,
      sort: value?.sort,
      sortBy: value?.sortBy,
    });
    let orFilter = {};
    if (!(await checkUserIsAdmin(req?.user?._id))) {
      orFilter = {
        $or: [
          { "manager._id": new mongoose.Types.ObjectId(req?.user?._id) },
          { "acc_manager._id": new mongoose.Types.ObjectId(req?.user?._id) },
          { "createdBy._id": new mongoose.Types.ObjectId(req?.user?._id) },
          { "project.assignees": new mongoose.Types.ObjectId(req?.user?._id) },
          
        ],
      };
    }

    let matchQuery = {
      isDeleted: false,
      "project.companyId":newObjectId(decodedCompanyId),
      // For details
      ...(value?.feedback_type ? { feedback_type: value?.feedback_type } : null),
      ...(value?._id ? { _id: new mongoose.Types.ObjectId(value?._id) } : null),
      // filters..
      ...(value?.priority ? { priority: value?.priority } : {}),
      ...(value?.status ? { status: value?.status } : {}),
      ...(value?.technology?.length > 0
        ? {
            "technology._id": {
              $in: value.technology.map((s) => new mongoose.Types.ObjectId(s)),
            },
          }
        : {}),

      ...(value?.manager_id?.length > 0
        ? {
            "manager._id": {
              $in: value.manager_id.map((s) => new mongoose.Types.ObjectId(s)),
            },
          }
        : {}),

      ...(value?.acc_manager_id?.length > 0
        ? {
            "acc_manager._id": {
              $in: value.acc_manager_id.map(
                (s) => new mongoose.Types.ObjectId(s)
              ),
            },
          }
        : {}),
      ...(value?.project_id?.length > 0
        ? {
            "project._id": {
              $in: value.project_id.map((s) => new mongoose.Types.ObjectId(s)),
            },
          }
        : {}),
    };

    if (value?.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(
          [
            "complaint",
            ...(!value.isSearch
              ? ["manager.full_name", "acc_manager.full_name", "project.title"]
              : []),
          ],
          value?.search
        ),
      };
    }
    matchQuery = {
      ...matchQuery,
      ...orFilter
    };

    const mainQuery = [
      {
        $lookup: {
          from: "projects",
          let: { project_id: "$project_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_id"] },
                    { $eq: ["$isDeleted", false] },
                    // { $eq: ["$companyId", newObjectId(decodedCompanyId)] },
                  ],
                },
              },
            },
          ],
          as: "project",
        },
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "projecttechs",
          let: { technology: "$project.technology" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$technology"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "technology",
        },
      },
      // {
      //   $unwind: {
      //     path: "$technology",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      {
        $lookup: {
          from: "employees",
          let: { manager: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "manager",
        },
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { acc_manager: "$project.acc_manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$acc_manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "acc_manager",
        },
      },
      {
        $unwind: {
          path: "$acc_manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(await getCreatedUpdatedDeletedByQuery()),
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          project: {
            _id: 1,
            title: 1,
            manager: 1,
            acc_manager: 1,
            technology: 1,
            companyId:1
          },
          manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
          },
          acc_manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
          },
          technology: {
            _id: 1,
            project_tech: 1,
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
          },
          project_id: 1,
          client_name: 1,
          feedback: 1,
          feedback_type: 1,
          client_nda_sign: 1,
          updatedAt: 1,
          createdAt: 1,
          isDeleted: 1
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await Reviews.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    let listQuery = [];
    if (!value?.isSearch) {
      listQuery = await getAggregationPagination(mainQuery, pagination);
    } else {
      listQuery = [...mainQuery, { $sort: pagination.sort }];
    }
    let data = await Reviews.aggregate(listQuery);

    let metaData = {};
    if (!value?.isSearch) {
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
      value?._id ? data[0] : data,
      !value?._id && metaData
    );
  } catch (error) {
    console.log("🚀 ~ exports.getReview= ~ error:", error)
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Review :
exports.updateReview = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      client_name: Joi.string().required(),
      feedback: Joi.string().required(),
      feedback_type: Joi.string().required(),
      client_nda_sign: Joi.boolean().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const data = await Reviews.findByIdAndUpdate(
      req.params.id,
      {
        project_id: value?.project_id || null,
        client_name: value?.client_name || null,
        feedback: value?.feedback || null,
        feedback_type: value?.feedback_type || null,
        client_nda_sign: value?.client_nda_sign || null,
        updatedBy: req.user._id || null,
        ...(await getRefModelFromLoginUser(req?.user, true)),
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.REVIEW_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// delete Review :
exports.deleteReview = async (req, res) => {
  try {
    const complaint = await Reviews.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, false, true)),
      },
      { new: true }
    );

    if (!complaint) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.REVIEW_DELETED,
      complaint
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// get complaint details for mail ...
exports.getReviewsDetailsForMail = async (reviewId,companyId) => {
  try {
    const mainQuery = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(reviewId),
        },
      },
      {
        $lookup: {
          from: "projects",
          let: { project_id: "$project_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_id"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$companyId", newObjectId(companyId)] },
                  ],
                },
              },
            },
          ],
          as: "project",
        },
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "projecttechs",
          let: { technology: "$project.technology" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$technology"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "technology",
        },
      },
      {
        $unwind: {
          path: "$technology",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { manager: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "manager",
        },
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { acc_manager: "$project.acc_manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$acc_manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "acc_manager",
        },
      },
      {
        $unwind: {
          path: "$acc_manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(await getCreatedUpdatedDeletedByQuery()),
      {
        $project: {
          _id: 1,
          project: {
            _id: 1,
            title: 1,
            manager: 1,
            acc_manager: 1,
            technology: 1,
          },
          manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1,
          },
          acc_manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1,
          },
          technology: {
            _id: 1,
            project_tech: 1,
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
            email: 1,
          },
          project_id: 1,
          client_name: 1,
          feedback: 1,
          feedback_type: 1,
          client_nda_sign: 1,
          updatedAt: 1,
          createdAt: 1,
        },
      },
    ];

    const data = await Reviews.aggregate(mainQuery);
    return data[0];
  } catch (error) {
  console.log("🚀 ~ exports.getReviewsDetailsForMail= ~ error:", error)
  }
};
