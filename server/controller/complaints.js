const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const Complaints = mongoose.model("complaints");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr,
  getAggregationPagination
} = require("../helpers/queryHelper");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const {
  getRefModelFromLoginUser,
  getCreatedUpdatedDeletedByQuery
} = require("../helpers/common");
const { newComplaintMail } = require("../template/complaints");
const { checkUserIsAdmin } = require("./authentication");

//Add Complaint
exports.addComplaint = async (req, res) => {
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
      client_email: Joi.string().required(),
      complaint: Joi.string().required(),
      priority: Joi.string().required(),
      escalation_level: Joi.string().required(),
      status: Joi.string().required(),
      reason: Joi.string().required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    let data = new Complaints({
      companyId:newObjectId(decodedCompanyId),
      project_id: value?.project_id || null,
      client_name: value?.client_name || null,
      client_email: value?.client_email || null,
      complaint: value?.complaint || null,
      priority: value?.priority || null,
      escalation_level: value?.escalation_level || null,
      status: value?.status || null,
      reason: value?.reason || null,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user))
    });
    await data.save();

    let emailDetails = await this.getComplaintDetailsForMail(data._id);
    await newComplaintMail(emailDetails, decodedCompanyId);

    return successResponse(
      res,
      statusCode.CREATED,
      messages.COMPLAINT_CREATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Complaint :
exports.getComplaint = async (req, res) => {
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
      status: Joi.string().optional()
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
      sortBy: value?.sortBy
    });
    let orFilter = {};
    if (!(await checkUserIsAdmin(req?.user?._id))) {
      orFilter = {
        $or: [
          { "manager._id": new mongoose.Types.ObjectId(req?.user?._id) },
          { "acc_manager._id": new mongoose.Types.ObjectId(req?.user?._id) },
          { "createdBy._id": new mongoose.Types.ObjectId(req?.user?._id) },
          { "project.assignees": new mongoose.Types.ObjectId(req?.user?._id) }
        ]
      };
    }

    let matchQuery = {
      isDeleted: false,
      companyId:newObjectId(decodedCompanyId),
      // For details
      ...(value?._id ? { _id: new mongoose.Types.ObjectId(value?._id) } : null),
      // filters..
      ...(value?.priority ? { priority: value?.priority } : {}),
      ...(value?.status ? { status: value?.status } : {}),
      ...(value?.technology?.length > 0
        ? {
            "technology._id": {
              $in: value.technology.map((s) => new mongoose.Types.ObjectId(s))
            }
          }
        : {}),

      ...(value?.manager_id?.length > 0
        ? {
            "manager._id": {
              $in: value.manager_id.map((s) => new mongoose.Types.ObjectId(s))
            }
          }
        : {}),

      ...(value?.acc_manager_id?.length > 0
        ? {
            "acc_manager._id": {
              $in: value.acc_manager_id.map(
                (s) => new mongoose.Types.ObjectId(s)
              )
            }
          }
        : {}),
      ...(value?.project_id?.length > 0
        ? {
            "project._id": {
              $in: value.project_id.map((s) => new mongoose.Types.ObjectId(s))
            }
          }
        : {})
    };

    if (value?.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(
          [
            "complaint",
            ...(!value.isSearch
              ? ["manager.full_name", "acc_manager.full_name", "project.title"]
              : [])
          ],
          value?.search
        )
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "technology"
        }
      },
      {
        $unwind: {
          path: "$technology",
          preserveNullAndEmptyArrays: true
        }
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
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
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
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "acc_manager"
        }
      },
      {
        $unwind: {
          path: "$acc_manager",
          preserveNullAndEmptyArrays: true
        }
      },
      ...(await getCreatedUpdatedDeletedByQuery()),
      { $match: matchQuery },
      // {
      //     $lookup: {
      //         from: "complaints_statuses",
      //         localField: "_id",
      //         foreignField: "complaint_id",
      //         as: "complaintstaatus",

      //     }
      // },

      {
        $project: {
          _id: 1,
          project: {
            _id: 1,
            title: 1,
            manager: 1,
            acc_manager: 1,
            technology: 1
          },
          manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1
          },
          acc_manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1
          },
          technology: {
            _id: 1,
            project_tech: 1
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1
          },
          project_id: 1,
          client_name: 1,
          client_email: 1,
          complaint: 1,
          priority: 1,
          escalation_level: 1,
          status: 1,
          reason: 1,
          updatedAt: 1,
          createdAt: 1
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await Complaints.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    let listQuery = [];
    if (!value?.isSearch) {
      listQuery = await getAggregationPagination(mainQuery, pagination);
    } else {
      listQuery = [...mainQuery, { $sort: pagination.sort }];
    }
    let data = await Complaints.aggregate(listQuery);

    let metaData = {};
    if (!value?.isSearch) {
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
      value?._id ? data[0] : data,
      !value?._id && metaData
    );
  } catch (error) {
    console.log("🚀 ~ exports.getProjects= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Complaint :
exports.updateComplaint = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      client_name: Joi.string().required(),
      client_email: Joi.string().required(),
      complaint: Joi.string().required(),
      priority: Joi.string().required(),
      escalation_level: Joi.string().required(),
      // status: Joi.string().required(),
      reason: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const data = await Complaints.findByIdAndUpdate(
      req.params.id,
      {
        project_id: value?.project_id || null,
        client_name: value?.client_name || null,
        client_email: value?.client_email || null,
        complaint: value?.complaint || null,
        priority: value?.priority || null,
        escalation_level: value?.escalation_level || null,
        status: value?.status || null,
        reason: value?.reason || null,
        updatedBy: req.user._id || null,
        acc_manager: value?.acc_manager || null,
        ...(await getRefModelFromLoginUser(req?.user, true))
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.COMPLAINT_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// delete Complaint :
exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaints.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, false, true))
      },
      { new: true }
    );

    if (!complaint) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.COMPLAINT_DELETED,
      complaint
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// get complaint details for mail ...
exports.getComplaintDetailsForMail = async (complaintId) => {
  try {
    const mainQuery = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(complaintId)
        }
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "technology"
        }
      },
      {
        $unwind: {
          path: "$technology",
          preserveNullAndEmptyArrays: true
        }
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
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
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
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "acc_manager"
        }
      },
      {
        $unwind: {
          path: "$acc_manager",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { manager: "$manager.reporting_manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "managers_rm"
        }
      },
      {
        $unwind: {
          path: "$managers_rm",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { acc_manager: "$acc_manager.reporting_manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$acc_manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "acc_managers_rm"
        }
      },
      {
        $unwind: {
          path: "$acc_managers_rm",
          preserveNullAndEmptyArrays: true
        }
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
            technology: 1
          },
          manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1,
            reporting_manager: 1
          },
          managers_rm: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1
          },
          acc_managers_rm: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1
          },
          acc_manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1
          },
          technology: {
            _id: 1,
            project_tech: 1
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
            email: 1
          },
          project_id: 1,
          client_name: 1,
          client_email: 1,
          complaint: 1,
          priority: 1,
          escalation_level: 1,
          status: 1,
          reason: 1,
          updatedAt: 1,
          createdAt: 1
        }
      }
    ];

    const data = await Complaints.aggregate(mainQuery);
    return data[0];
  } catch (error) {
    console.log("🚀 ~ exports.getProjectDetailsForMail= ~ error:", error);
  }
};
