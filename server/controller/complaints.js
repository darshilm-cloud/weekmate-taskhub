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

// $lookup by _id (single doc) + $unwind keeping unmatched rows
const eqLookup = (from, localExpr, as, extraConds = []) => [
  {
    $lookup: {
      from,
      let: { v: localExpr },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$_id", "$$v"] },
                { $eq: ["$isDeleted", false] },
                ...extraConds
              ]
            }
          }
        }
      ],
      as
    }
  },
  { $unwind: { path: `$${as}`, preserveNullAndEmptyArrays: true } }
];

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
      escalation_level: value?.escalation_level ? new mongoose.Types.ObjectId(value.escalation_level) : null,
      status: value?.status || null,
      reason: value?.reason || null,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user))
    });
    await data.save();

    setImmediate(async () => {
      try {
        const { logCreate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
        const userInfo = await getUserInfoForLogging(req);
        if (userInfo) {
          await logCreate({
            companyId: userInfo.companyId,
            moduleName: "complaints",
            email: userInfo.email,
            createdBy: userInfo._id,
            additionalData: { recordName: data.client_name || null },
            ipAddress: userInfo.ipAddress,
          });
        }
      } catch (e) {}
    });

    let emailDetails = await exports.getComplaintDetailsForMail(data._id);
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
      status: Joi.string().optional(),
      // Created Date range filter (createdAt)
      start_date: Joi.date().iso().optional().allow(null, ""),
      end_date: Joi.date().iso().optional().allow(null, ""),
      // Stat cards / charts over ALL rows matching the filters (not just this page)
      include_summary: Joi.boolean().default(false),
      timezone: Joi.string().max(64).optional()
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
    if (value?.start_date || value?.end_date) {
      matchQuery.createdAt = {
        ...(value.start_date
          ? { $gte: moment(value.start_date).startOf("day").toDate() }
          : {}),
        ...(value.end_date
          ? { $lte: moment(value.end_date).endOf("day").toDate() }
          : {})
      };
    }

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


    // Base-collection filters run first (index friendly, fewer docs joined).
    // Everything else depends on looked-up fields (project/manager/technology/createdBy)
    // and must run after the joins (unchanged behaviour).
    const BASE_KEYS = ["isDeleted", "companyId", "_id", "priority", "status", "createdAt"];
    const baseMatch = {};
    const postMatch = {};
    Object.keys(matchQuery).forEach((k) => {
      (BASE_KEYS.includes(k) ? baseMatch : postMatch)[k] = matchQuery[k];
    });
    const hasPostMatch = Object.keys(postMatch).length > 0;

    const activeEmp = [
      { $eq: ["$isSoftDeleted", false] },
      { $eq: ["$isActivate", true] }
    ];
    const projectStages = eqLookup("projects", "$project_id", "project");
    const technologyStages = [
      {
        $lookup: {
          from: "projecttechs",
          let: { technology: { $ifNull: ["$project.technology", []] } },
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
      }
    ];
    const managerStages = eqLookup("employees", "$project.manager", "manager", activeEmp);
    const accManagerStages = eqLookup("employees", "$project.acc_manager", "acc_manager", activeEmp);
    const escalationStages = eqLookup("employees", "$escalation_level", "escalation_level", activeEmp);
    const createdByStages = await getCreatedUpdatedDeletedByQuery();

    const mainQuery = [
      { $match: baseMatch },
      ...projectStages,
      ...technologyStages,
      ...managerStages,
      ...accManagerStages,
      ...escalationStages,
      ...createdByStages,
      ...(hasPostMatch ? [{ $match: postMatch }] : []),
      {
    $group: {
      _id: "$_id", // Group by complaint ID to remove duplicates
      // Keep the first occurrence of each field
      project: { $first: "$project" },
      manager: { $first: "$manager" },
      acc_manager: { $first: "$acc_manager" },
      technology: { $first: "$technology" },
      createdBy: { $first: "$createdBy" },
      project_id: { $first: "$project_id" },
      client_name: { $first: "$client_name" },
      client_email: { $first: "$client_email" },
      complaint: { $first: "$complaint" },
      priority: { $first: "$priority" },
      escalation_level: { $first: "$escalation_level" },
      status: { $first: "$status" },
      reason: { $first: "$reason" },
      updatedAt: { $first: "$updatedAt" },
      createdAt: { $first: "$createdAt" }
    }
  },
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
          escalation_level: { _id: 1, full_name: 1, emp_img: 1, email: 1 },
          status: 1,
          reason: 1,
          updatedAt: 1,
          createdAt: 1
        }
      }
    ];

    // Lean count: no escalation/createdBy joins unless a filter needs them, no $project.
    // (technology unwind only multiplies rows that the $group below de-duplicates)
    const countQuery = hasPostMatch
      ? [
          { $match: baseMatch },
          ...projectStages,
          ...(value?.technology?.length > 0 ? technologyStages : []),
          ...managerStages,
          ...accManagerStages,
          ...(Object.keys(orFilter).length > 0 ? createdByStages : []),
          { $match: postMatch },
          { $group: { _id: "$_id" } },
          { $count: "count" }
        ]
      : [{ $match: baseMatch }, { $count: "count" }];

    // Fast path: no filter depends on a joined field and sort key is a base field
    // -> sort/skip/limit first, then join only the page.
    const SIMPLE_SORT_KEYS = [
      "_id", "createdAt", "updatedAt", "priority", "status",
      "client_name", "client_email", "complaint", "reason"
    ];
    let listQuery = [];
    if (!value?.isSearch) {
      if (!hasPostMatch && SIMPLE_SORT_KEYS.includes(value?.sort)) {
        listQuery = [
          { $match: baseMatch },
          { $sort: pagination.sort },
          { $skip: pagination.skip },
          { $limit: pagination.limit },
          ...mainQuery.slice(1),
          { $sort: pagination.sort }
        ];
      } else {
        listQuery = await getAggregationPagination(mainQuery, pagination);
      }
    } else {
      listQuery = [...mainQuery, { $sort: pagination.sort }];
    }
    let summaryQuery = null;
    if (value?.include_summary && !value?._id) {
      const tz = value.timezone || "UTC";
      const ym = (date) => ({ $dateToString: { format: "%Y-%m", date, timezone: tz } });
      const statusLike = (re) => ({
        $regexMatch: { input: { $toLower: { $ifNull: ["$status", ""] } }, regex: re }
      });
      summaryQuery = [
        ...(hasPostMatch
          ? [
              { $match: baseMatch },
              ...projectStages,
              ...(value?.technology?.length > 0 ? technologyStages : []),
              ...managerStages,
              ...accManagerStages,
              ...(Object.keys(orFilter).length > 0 ? createdByStages : []),
              { $match: postMatch },
              // one row per complaint (the technology unwind can multiply rows)
              {
                $group: {
                  _id: "$_id",
                  status: { $first: "$status" },
                  createdAt: { $first: "$createdAt" }
                }
              }
            ]
          : [{ $match: baseMatch }]),
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  resolved: { $sum: { $cond: [statusLike("resolv"), 1, 0] } },
                  inProgress: { $sum: { $cond: [statusLike("progress"), 1, 0] } },
                  thisMonth: { $sum: { $cond: [{ $eq: [ym("$createdAt"), ym("$$NOW")] }, 1, 0] } }
                }
              }
            ],
            statuses: [{ $group: { _id: { $ifNull: ["$status", "Unknown"] }, count: { $sum: 1 } } }],
            monthly: [
              { $match: { createdAt: { $gte: moment().subtract(6, "months").startOf("month").toDate() } } },
              { $group: { _id: ym("$createdAt"), count: { $sum: 1 } } }
            ]
          }
        }
      ];
    }

    const [totalCountResult, data, summaryResult] = await Promise.all([
      Complaints.aggregate(countQuery),
      Complaints.aggregate(listQuery),
      summaryQuery ? Complaints.aggregate(summaryQuery) : Promise.resolve(null)
    ]);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;
    const summary = summaryResult
      ? {
          totals: { total: 0, resolved: 0, inProgress: 0, thisMonth: 0, ...(summaryResult[0]?.totals?.[0] || {}), _id: undefined },
          statuses: summaryResult[0]?.statuses || [],
          monthly: summaryResult[0]?.monthly || []
        }
      : undefined;

    let metaData = {};
    if (!value?.isSearch) {
      metaData = {
        ...(summary ? { summary } : {}),
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

    // Get old data before update for logging
    const oldComplaintData = await Complaints.findById(req.params.id).lean();

    const data = await Complaints.findByIdAndUpdate(
      req.params.id,
      {
        project_id: value?.project_id || null,
        client_name: value?.client_name || null,
        client_email: value?.client_email || null,
        complaint: value?.complaint || null,
        priority: value?.priority || null,
        escalation_level: value?.escalation_level ? new mongoose.Types.ObjectId(value.escalation_level) : null,
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

    // Get new data after update for logging
    const newComplaintData = data.toObject ? data.toObject() : data;

    // Log update activity
    try {
      const { logUpdate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
      const userInfo = await getUserInfoForLogging(req);
      if (userInfo && oldComplaintData && newComplaintData) {
        await logUpdate({
          companyId: userInfo.companyId,
          moduleName: "complaints",
          email: userInfo.email,
          createdBy: userInfo._id,
          updatedBy: userInfo._id,
          oldData: oldComplaintData,
          newData: newComplaintData,
          additionalData: {
            recordId: oldComplaintData._id.toString()
          },
          ipAddress: userInfo.ipAddress
});
      }
    } catch (logError) {
      console.error("Error logging complaint update activity:", logError);
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
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Get the complaint data before deletion for logging
    const complaintData = await Complaints.findById(req.params.id).lean();
    
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

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req);
    if (userInfo && complaintData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "complaints",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: complaintData,
        additionalData: {
          recordId: complaintData._id.toString(),
          isSoftDelete: true
        },
        ipAddress: userInfo.ipAddress
});
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
          let: { technology: { $ifNull: ["$project.technology", []] } },
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
          let: { escalation_id: "$escalation_level" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$escalation_id"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "escalation_level"
        }
      },
      {
        $unwind: {
          path: "$escalation_level",
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
          escalation_level: { _id: 1, full_name: 1, emp_img: 1, email: 1 },
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
