const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const ComplaintsStatus = mongoose.model("complaints_status");
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
const {
  newComplaintStatusMail,
  newComplaintStatusResolutionFeedbackMailToClient
} = require("../template/complaints_status");

//Add Complaint
exports.addComplaintStatus = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      complaint_id: Joi.string().required(),
      status: Joi.string().required(),
      root_cause: Joi.string().required(),
      immediate_action: Joi.string().optional().allow(""),
      corrective_action: Joi.string().optional().allow(""),
      resolved_status: Joi.boolean().optional()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    let data = new ComplaintsStatus({
      status: value?.status || null,
      complaint_id: value?.complaint_id || null,
      root_cause: value?.root_cause || null,
      immediate_action: value?.immediate_action || null,
      corrective_action: value?.corrective_action || null,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user))
    });
    await data.save();
    const dataAtCompalint = await Complaints.findByIdAndUpdate(
      { _id: value?.complaint_id },
      {
        status: value?.status || null
      }
    );
    if (!["in_progress", "customer_lost"].includes(value?.status)) {
      let emailDetails = await this.getComplaintStatusDetailsForMail(data._id);
      await newComplaintStatusMail(emailDetails, "add",decodedCompanyId);
    }
    if (value?.resolved_status != undefined && value?.resolved_status) {
      let emailDetails = await this.getComplaintStatusDetailsForMail(data._id);
      await newComplaintStatusResolutionFeedbackMailToClient(emailDetails,decodedCompanyId);
    }

    return successResponse(
      res,
      statusCode.CREATED,
      messages.COMPLAINT_STATUS_CREATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Complaint :
exports.getComplaintStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"), //
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
      complaint_id: Joi.string().optional()
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

    let matchQuery = {
      isDeleted: false,
      ...(value?.complaint_id
        ? { complaint_id: new mongoose.Types.ObjectId(value?.complaint_id) }
        : null),
      // For details
      ...(value?._id ? { _id: new mongoose.Types.ObjectId(value?._id) } : null)
    };

    if (value?.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(
          [
            "root_cause",
            "corrective_action",
            "immediate_action",
            ...(!value.isSearch
              ? [
                  "manager.full_name",
                  "acc_manager.full_name",
                  "project.title",
                  "complaints.complaint"
                ]
              : [])
          ],
          value?.search
        )
      };
    }
    matchQuery = {
      ...matchQuery
    };

    const mainQuery = [
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          complaint_id: 1,
          root_cause: 1,
          immediate_action: 1,
          corrective_action: 1,
          status: 1,
          updatedAt: 1,
          createdAt: 1
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await ComplaintsStatus.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    let listQuery = [];
    if (!value?.isSearch) {
      listQuery = await getAggregationPagination(mainQuery, pagination);
    } else {
      listQuery = [...mainQuery, { $sort: pagination.sort }];
    }
    let data = await ComplaintsStatus.aggregate(listQuery);

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
exports.updateComplaintStatus = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      complaint_id: Joi.string().required(),
      status: Joi.string().required(),
      root_cause: Joi.string().required(),
      immediate_action: Joi.string().optional().allow(""),
      corrective_action: Joi.string().optional().allow(""),
      resolved_status: Joi.boolean().optional()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const data = await ComplaintsStatus.findByIdAndUpdate(
      req.params.id,
      {
        status: value?.status || null,
        complaint_id: value?.complaint_id || null,
        root_cause: value?.root_cause || null,
        immediate_action: value?.immediate_action || null,
        corrective_action: value?.corrective_action || null,
        updatedBy: req.user._id || null,
        acc_manager: value?.acc_manager || null,
        ...(await getRefModelFromLoginUser(req?.user, true))
      },
      { new: true }
    );

    const dataAtCompalint = await Complaints.findByIdAndUpdate(
      { _id: value?.complaint_id },
      {
        status: value?.status || null
      }
    );

    console.log(value?.status, "value?.status", data, dataAtCompalint);

    if (!data) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }

    if (!["in_progress", "customer_lost"].includes(value?.status)) {
      let emailDetails = await this.getComplaintStatusDetailsForMail(data._id);
      await newComplaintStatusMail(emailDetails, "edit",decodedCompanyId);
    }
    if (value?.resolved_status != undefined && value?.resolved_status) {
      let emailDetails = await this.getComplaintStatusDetailsForMail(data._id);
      await newComplaintStatusResolutionFeedbackMailToClient(emailDetails,decodedCompanyId);
    }
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.COMPLAINT_STATUS_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Archived to active Complaint :
exports.deleteComplaintStatus = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Get the complaint status data before deletion for logging
    const statusData = await ComplaintsStatus.findById(req.params.id).lean();
    
    const complaint_status = await ComplaintsStatus.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, false, true))
      },
      { new: true }
    );

    if (!complaint_status) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && statusData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "complaints_status",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: statusData,
        additionalData: {
          recordId: statusData._id.toString(),
          isSoftDelete: true
        }
      });
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.COMPLAINT_STATUS_DELETED,
      complaint_status
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// get complaint details for mail ...
exports.getComplaintStatusDetailsForMail = async (statusId) => {
  try {
    const mainQuery = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(statusId)
        }
      },
      {
        $lookup: {
          from: "complaints",
          let: { complaint_id: "$complaint_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$complaint_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "complaints"
        }
      },
      {
        $unwind: {
          path: "$complaints",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projects",
          let: { project_id: "$complaints.project_id" },
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
          let: { manager: "$project.manager.reporting_manager" },
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
          let: { manager: "$project.acc_manager.reporting_manager" },
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
          complaints: {
            _id: 1,
            project_id: 1,
            complaint: 1,
            status: 1,
            client_name: 1,
            client_email: 1,
            priority: 1,
            escalation_level: 1
          },
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
            email: 1
          },
          managers_rm: {
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
          acc_managers_rm: {
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
          root_cause: 1,
          immediate_action: 1,
          corrective_action: 1,
          status: 1,
          updatedAt: 1,
          createdAt: 1
        }
      }
    ];
    const data = await ComplaintsStatus.aggregate(mainQuery);
    return data[0];
  } catch (error) {
    console.log("🚀 ~ exports.getProjectDetailsForMail= ~ error:", error);
  }
};
