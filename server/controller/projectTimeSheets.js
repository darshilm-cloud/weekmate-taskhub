const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const ProjectTimeSheets = mongoose.model("projecttimesheets");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr,
  getAggregationPagination,
} = require("../helpers/queryHelper");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const { checkLoginUserIsProjectManager, checkLoginUserIsProjectAccountManager } = require("./projectMainTask");
const { checkUserIsAdmin } = require("./authentication");

// Check is exists..
exports.projectTimeSheetExists = async (reqData, id = null) => {
  try {
    let isExist = false;

    const data = await ProjectTimeSheets.aggregate([
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(reqData?.project_id),
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
          titleLower: reqData?.title?.trim().toLowerCase(), // Match the lowercase title
        },
      },
    ]);
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectTimeSheetExists= ~ error:", error);
  }
};

//Add Project TimeSheet :
exports.addProjectsTimeSheet = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      project_id: Joi.string().required(),
      // main_task_id: Joi.string().allow('').optional(),
      hours: Joi.string().allow("").optional(),
      minutes: Joi.string().allow("").optional(),
      isPrivate: Joi.boolean().optional(),
      status: Joi.string().allow("").optional(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (await this.projectTimeSheetExists(value)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let data = new ProjectTimeSheets({
        title: value.title,
        project_id: value.project_id,
        // main_task_id: value.main_task_id || null,
        hours: value.hours || null,
        minutes: value.minutes || null,
        isPrivate: value.isPrivate,
        status: value.status,
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

//Get Project TimeSheet :
exports.getProjectsTimeSheet = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
      project_id: Joi.string().required(),
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

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value.project_id),
      ...(value?._id
        ? {
            _id: new mongoose.Types.ObjectId(value._id),
          }
        : {}),
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["title"], value.search),
      };
    }

    const [isAdmin,isManager,isAccManager]=await Promise.all([
      checkUserIsAdmin(req.user._id),
      checkLoginUserIsProjectManager(
        value.project_id,
        req.user._id
      ),
      checkLoginUserIsProjectAccountManager(
        value.project_id,
        req.user._id
      )
    ])
    
    let loggedHrQuery = [
      { $eq: ["$timesheet_id", "$$timesheet_id"] },
      { $eq: ["$isDeleted", false] },
    ];

    if (!isManager && !isAdmin && !isAccManager) {
      loggedHrQuery = [
        ...loggedHrQuery,
        {
          $or: [
            {
              $eq: ["$createdBy", new mongoose.Types.ObjectId(req.user._id)],
            },
            {
              $in: [
                new mongoose.Types.ObjectId(req.user._id),
                "$$projectClient",
              ],
            },
          ],
        },
      ];
    }

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
          from: "projecttaskhourlogs",
          let: { timesheet_id: "$_id", projectClient: "$project.pms_clients" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: loggedHrQuery,
                },
              },
            },
          ],
          as: "timesheetDetails",
        },
      },
      {
        $unwind: {
          path: "$timesheetDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: matchQuery },
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          hours: { $first: "$hours" },
          minutes: { $first: "$minutes" },
          isPrivate: { $first: "$isPrivate" },
          projectTitle: { $first: "$project.title" },
          status: { $first: "$status" },
          totalHours: {
            $sum: {
              $toInt: "$timesheetDetails.logged_hours",
            },
          },
          totalMinutes: {
            $sum: {
              $toInt: "$timesheetDetails.logged_minutes",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          isPrivate: 1,
          projectTitle: 1,
          status: 1,
          hours: 1,
          minutes: 1,
          totaltime: {
            $let: {
              vars: {
                totalMinutes: "$totalMinutes",
                totalHours: "$totalHours",
              },
              in: {
                $concat: [
                  {
                    $toString: {
                      $add: [
                        "$totalHours",
                        {
                          $trunc: {
                            $divide: ["$totalMinutes", 60],
                          },
                        },
                      ],
                    },
                  },
                  "h",
                  " ",
                  {
                    $toString: {
                      $mod: ["$totalMinutes", 60],
                    },
                  },
                  "m",
                ],
              },
            },
          },
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await ProjectTimeSheets.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await ProjectTimeSheets.aggregate([
      ...mainQuery,
      { $sort: pagination.sort },
    ]);

    const metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page,
    };

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      value._id ? data[0] : data,
      !value._id && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//summary:
exports.getSummary = async (req, res) => {
  try {
    const mainQuery = [
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(req.params.id),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "projecttaskhourlogs",
          let: { timesheet_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$timesheet_id", "$$timesheet_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "timesheetDetails",
        },
      },
      {
        $unwind: {
          path: "$timesheetDetails",
          preserveNullAndEmptyArrays: true,
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
        $group: {
          _id: null,
          totalHours: {
            $sum: {
              $toInt: "$timesheetDetails.logged_hours",
            },
          },
          projectEstimatedhours: { $first: "$project.estimatedHours" },
          billedHours: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$timesheetDetails.logged_status", "Billed"] },
                    { $eq: ["$timesheetDetails.isDeleted", false] },
                  ],
                },
                { $toInt: "$timesheetDetails.logged_hours" },
                0,
              ],
            },
          },
          nonBillableHours: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: ["$timesheetDetails.logged_status", "Non_Billable"],
                    },
                    { $eq: ["$timesheetDetails.isDeleted", false] },
                  ],
                },
                { $toInt: "$timesheetDetails.logged_hours" },
                0,
              ],
            },
          },
          voidHours: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$timesheetDetails.logged_status", "Void"] },
                    { $eq: ["$timesheetDetails.isDeleted", false] },
                  ],
                },
                { $toInt: "$timesheetDetails.logged_hours" },
                0,
              ],
            },
          },
          billableHours: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$timesheetDetails.logged_status", "Billable"] },
                    { $eq: ["$timesheetDetails.isDeleted", false] },
                  ],
                },
                { $toInt: "$timesheetDetails.logged_hours" },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalHours: {
            $concat: [{ $toString: "$totalHours" }, "h"],
          },
          billedHours: {
            $concat: [{ $toString: "$billedHours" }, "h"],
          },
          nonBillableHours: {
            $concat: [{ $toString: "$nonBillableHours" }, "h"],
          },
          projectEstimatedhours: {
            $concat: [{ $toString: "$projectEstimatedhours" }, "h"],
          },
          billableHours: {
            $concat: [{ $toString: "$billableHours" }, "h"],
          },
          voidHours: {
            $concat: [{ $toString: "$voidHours" }, "h"],
          },
        },
      },
    ];

    let data = await ProjectTimeSheets.aggregate(mainQuery);

    // Process the result as needed
    const summaryData = data[0] || {
      totalHours: 0,
      billedHours: 0,
      nonBillableHours: 0,
    };

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.SUCCESS,
      summaryData
    );
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};


//Update Project TimeSheet :
exports.updateProjectsTimeSheet = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      hours: Joi.string().allow('').optional(),
      minutes: Joi.string().allow('').optional(),
      status: Joi.string().allow('').optional()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (await this.projectTimeSheetExists(value, req.params.id)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      const data = await ProjectTimeSheets.findByIdAndUpdate(
        req.params.id,
        {
          title: value.title,
          // main_task_id: value.main_task_id || null,
          updatedBy: req.user._id,
          status: value.status,
          hours: value.hours || null,
          minutes: value.minutes || null,
        },
        { new: true }
      );

      if (!data) {
        return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
      }

      return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project TimeSheet :
exports.deleteProjectsTimeSheet = async (req, res) => {
  try {
    const data = await ProjectTimeSheets.findByIdAndUpdate(
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
