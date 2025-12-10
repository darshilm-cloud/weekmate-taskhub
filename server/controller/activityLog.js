const mongoose = require("mongoose");
const { errorResponse, successResponse, catchBlockErrorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const ActivityLog = mongoose.model("activitylogs");
const moment = require("moment");
const Joi = require("joi");

/**
 * Get activity logs list with filters and pagination
 * POST /v1/activityLog/list
 */
exports.getActivityLogList = async (req, res) => {
  try {
    // Validation schema
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      operationName: Joi.string().valid("LOGIN", "LOGOUT", "DELETE", "UPDATE", "").allow("").optional(),
      moduleName: Joi.string().optional().allow(""),
      email: Joi.string().optional().allow(""),
      fromDate: Joi.date().optional(),
      toDate: Joi.date().optional(),
      search: Joi.string().trim().allow("").optional(),
      sortBy: Joi.string().valid("createdAt", "operationName", "email").default("createdAt"),
      sortOrder: Joi.string().valid("asc", "desc").default("desc")
    });

    const validationResult = await schema.validateAsync(req.body);
    const {
      page,
      limit,
      operationName,
      moduleName,
      email,
      fromDate,
      toDate,
      search,
      sortBy,
      sortOrder
    } = validationResult;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Build match query
    let matchQuery = {
      companyId: global.newObjectId(req.user.companyId)
    };

    // Operation name filter
    if (operationName && operationName !== "") {
      matchQuery.operationName = operationName.toUpperCase();
    }

    // Module name filter
    if (moduleName && moduleName !== "") {
      matchQuery.moduleName = moduleName;
    }

    // Email filter
    if (email && email !== "") {
      matchQuery.email = { $regex: email.trim(), $options: "i" };
    }

    // Date range filter
    if (fromDate && toDate) {
      matchQuery.createdAt = {
        $gte: moment(fromDate).startOf("day").toDate(),
        $lte: moment(toDate).endOf("day").toDate()
      };
    } else if (fromDate) {
      matchQuery.createdAt = {
        $gte: moment(fromDate).startOf("day").toDate()
      };
    } else if (toDate) {
      matchQuery.createdAt = {
        $lte: moment(toDate).endOf("day").toDate()
      };
    }

    // Search filter (searches in email)
    if (search && search.trim() !== "") {
      matchQuery.email = { $regex: search.trim(), $options: "i" };
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Aggregate pipeline
    const pipeline = [
      {
        $match: matchQuery
      },
      {
        $lookup: {
          from: "employees",
          let: { createdById: "$createdBy" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$_id",
                        {
                          $cond: [
                            { $eq: [{ $type: "$$createdById" }, "objectId"] },
                            "$$createdById",
                            { $toObjectId: "$$createdById" }
                          ]
                        }
                      ]
                    },
                    { $eq: ["$companyId", global.newObjectId(req.user.companyId)] }
                  ]
                }
              }
            }
          ],
          as: "createdByDetails"
        }
      },
      {
        $unwind: {
          path: "$createdByDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { updatedById: "$updatedBy" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$_id",
                        {
                          $cond: [
                            { $eq: [{ $type: "$$updatedById" }, "objectId"] },
                            "$$updatedById",
                            { $toObjectId: "$$updatedById" }
                          ]
                        }
                      ]
                    },
                    { $eq: ["$companyId", global.newObjectId(req.user.companyId)] }
                  ]
                }
              }
            }
          ],
          as: "updatedByDetails"
        }
      },
      {
        $unwind: {
          path: "$updatedByDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { deletedById: "$deletedBy" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$_id",
                        {
                          $cond: [
                            { $eq: [{ $type: "$$deletedById" }, "objectId"] },
                            "$$deletedById",
                            { $toObjectId: "$$deletedById" }
                          ]
                        }
                      ]
                    },
                    { $eq: ["$companyId", global.newObjectId(req.user.companyId)] }
                  ]
                }
              }
            }
          ],
          as: "deletedByDetails"
        }
      },
      {
        $unwind: {
          path: "$deletedByDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          companyId: 1,
          operationName: 1,
          moduleName: 1,
          email: 1,
          createdAt: 1,
          createdBy: {
            _id: "$createdByDetails._id",
            full_name: "$createdByDetails.full_name",
            email: "$createdByDetails.email"
          },
          updatedBy: {
            _id: "$updatedByDetails._id",
            full_name: "$updatedByDetails.full_name",
            email: "$updatedByDetails.email"
          },
          deletedBy: {
            _id: "$deletedByDetails._id",
            full_name: "$deletedByDetails.full_name",
            email: "$deletedByDetails.email"
          },
          additionalData: 1,
          updatedData: 1
        }
      },
      {
        $sort: sortObj
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ];

    // Get total count
    const totalCount = await ActivityLog.countDocuments(matchQuery);

    // Execute aggregation
    const activityLogs = await ActivityLog.aggregate(pipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    const paginationInfo = {
      currentPage: page,
      totalPages,
      totalCount,
      limit
    };

    return successResponse(
      res,
      statusCode.SUCCESS,
      "Activity logs fetched successfully",
      {
        activityLogs,
        pagination: paginationInfo
      }
    );
  } catch (error) {
    console.error("ActivityLog List Error:", error);
    return catchBlockErrorResponse(res, error.message || messages.SERVER_ERROR);
  }
};

/**
 * Get activity log by ID with additional data lookups
 * GET /v1/activityLog/:id
 */
exports.getActivityLogById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || !global.validObjectId(id)) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Valid activity log ID is required");
    }

    // Find activity log with createdBy, updatedBy, deletedBy and company lookup
    const activityLog = await ActivityLog.aggregate([
      {
        $match: {
          _id: global.newObjectId(id),
          companyId: global.newObjectId(req.user.companyId)
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { createdById: "$createdBy" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$_id",
                        {
                          $cond: [
                            { $eq: [{ $type: "$$createdById" }, "objectId"] },
                            "$$createdById",
                            { $toObjectId: "$$createdById" }
                          ]
                        }
                      ]
                    },
                    { $eq: ["$companyId", global.newObjectId(req.user.companyId)] }
                  ]
                }
              }
            }
          ],
          as: "createdByDetails"
        }
      },
      {
        $unwind: {
          path: "$createdByDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { updatedById: "$updatedBy" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$_id",
                        {
                          $cond: [
                            { $eq: [{ $type: "$$updatedById" }, "objectId"] },
                            "$$updatedById",
                            { $toObjectId: "$$updatedById" }
                          ]
                        }
                      ]
                    },
                    { $eq: ["$companyId", global.newObjectId(req.user.companyId)] }
                  ]
                }
              }
            }
          ],
          as: "updatedByDetails"
        }
      },
      {
        $unwind: {
          path: "$updatedByDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { deletedById: "$deletedBy" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$_id",
                        {
                          $cond: [
                            { $eq: [{ $type: "$$deletedById" }, "objectId"] },
                            "$$deletedById",
                            { $toObjectId: "$$deletedById" }
                          ]
                        }
                      ]
                    },
                    { $eq: ["$companyId", global.newObjectId(req.user.companyId)] }
                  ]
                }
              }
            }
          ],
          as: "deletedByDetails"
        }
      },
      {
        $unwind: {
          path: "$deletedByDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "companies",
          let: { companyId: "$companyId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$companyId"]
                }
              }
            }
          ],
          as: "companyDetails"
        }
      },
      {
        $unwind: {
          path: "$companyDetails",
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    if (!activityLog || activityLog.length === 0) {
      return errorResponse(res, statusCode.NOT_FOUND, "Activity log not found");
    }

    const logData = activityLog[0];

    const response = {
      _id: logData._id,
      operationName: logData.operationName,
      moduleName: logData.moduleName,
      email: logData.email,
      createdAt: moment(logData.createdAt).format("YYYY-MM-DD HH:mm:ss"),
      companyName: logData.companyDetails?.companyName || null,
      createdBy: logData.createdByDetails ? {
        _id: logData.createdByDetails._id,
        full_name: logData.createdByDetails.full_name,
        email: logData.createdByDetails.email
      } : null,
      updatedBy: logData.updatedByDetails ? {
        _id: logData.updatedByDetails._id,
        full_name: logData.updatedByDetails.full_name,
        email: logData.updatedByDetails.email
      } : null,
      deletedBy: logData.deletedByDetails ? {
        _id: logData.deletedByDetails._id,
        full_name: logData.deletedByDetails.full_name,
        email: logData.deletedByDetails.email
      } : null,
      additionalData: logData.additionalData || null,
      updatedData: logData.updatedData || null
    };

    return successResponse(
      res,
      statusCode.SUCCESS,
      "Activity log fetched successfully",
      response
    );
  } catch (error) {
    console.error("ActivityLog Detail Error:", error);
    return catchBlockErrorResponse(res, error.message || messages.SERVER_ERROR);
  }
};

