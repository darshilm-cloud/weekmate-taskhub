const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const Project = mongoose.model("projects");
const ProjectTasks = mongoose.model("projecttasks");
const ProjectTimeLogged = mongoose.model("projecttaskhourlogs");
const TotalTaskhoursLogged = mongoose.model("projecttotaltaskhourlogs");
const ProjectBugs = mongoose.model("projecttaskbugs");
// const Holiday = mongoose.model("holidays");
const { statusCode, DEFAULT_DATA } = require("../helpers/constant");
const messages = require("../helpers/messages");
const { checkUserIsAdmin } = require("./authentication");
const {
  getCreatedUpdatedDeletedByQuery,
  getProjectDefaultSettingQuery,
} = require("../helpers/common");
const { addProjectRandomId } = require("./projects");
const { manageAllProjectTabSetting } = require("./projectTabsSetting");
const { getTotalLoggedHoursForMonthByEmployee } = require("./taskHoursLogs");

//Get Project :
exports.getMyProjects = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      manager_id: Joi.string().optional(),
      project_status: Joi.array().optional().default([]),
      category: Joi.array().optional().default([]), // technology
      project_type: Joi.array().optional().default([]),
      isComplaints: Joi.boolean().optional().default(false),
      pageNo: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).optional(),
      search: Joi.string().optional().allow(''),
    });

    const { error, value } = validationSchema.validate(req?.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { manager_id, project_status, category, project_type, isComplaints, pageNo, limit, search } = value;

    // Convert page and limit to integers with default values
    const pageNum = pageNo && pageNo > 0 ? parseInt(pageNo, 10) : null;
    const limitNum = limit && limit > 0 ? parseInt(limit, 10) : null;

    // Or filter..
    let orFilter = {};
    // get login user role ...
    if (!(await checkUserIsAdmin(req?.user?._id))) {
      orFilter = {
        $or: [
          { assignees: new mongoose.Types.ObjectId(req?.user?._id) },
          { pms_clients: new mongoose.Types.ObjectId(req?.user?._id) },
          { manager: new mongoose.Types.ObjectId(req?.user?._id) },
          { createdBy: new mongoose.Types.ObjectId(req?.user?._id) },
          { acc_manager: new mongoose.Types.ObjectId(req?.user?._id) },
        ],
      };
    }

    // Manage projects default tabs in background (non-blocking)
    manageAllProjectTabSetting(req.user).catch(() => {});
    
    let matchQuery = {
      isDeleted: false,
      companyId: newObjectId(decodedCompanyId),
      // For details
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {}),

      // filters..
      ...(project_status.length > 0
        ? {
          project_status: {
            $in: project_status.map(
              (s) => new mongoose.Types.ObjectId(s)
            ),
          },
        }
        : {}),

      ...(category.length > 0
        ? {
          technology: {
            $in: category.map((c) => new mongoose.Types.ObjectId(c)),
          },
        }
        : {}),

      ...(project_type.length > 0
        ? {
          project_type: {
            $in: project_type.map(
              (t) => new mongoose.Types.ObjectId(t)
            ),
          },
        }
        : {}),

      ...(manager_id
        ? { manager: new mongoose.Types.ObjectId(manager_id) }
        : {}),
    };

    matchQuery = {
      ...matchQuery,
      ...orFilter,
    };

    // Add search condition if provided
    if (search && search.trim()) {
      matchQuery.$and = matchQuery.$and || [];
      matchQuery.$and.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { projectId: { $regex: search, $options: "i" } },
          { descriptions: { $regex: search, $options: "i" } }
        ]
      });
    }

    // Count query for pagination metadata
    const countQuery = [
      {
        $lookup: {
          from: "star_projects",
          let: { project: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$project_id", "$$project"] },
                    { $eq: ["$isDeleted", false] },
                    {
                      $eq: [
                        "$createdBy",
                        new mongoose.Types.ObjectId(req?.user?._id),
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "starProects",
        },
      },
      {
        $unwind: {
          path: "$starProects",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "projecttypes",
          let: { typeId: "$project_type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$typeId"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "project_types",
        },
      },
      {
        $unwind: {
          path: "$project_types",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(await getProjectDefaultSettingQuery("_id")),
      { $match: matchQuery },
      {
        $count: "total"
      }
    ];

    const countResult = await Project.aggregate(countQuery);
    let totalDocuments = countResult.length > 0 ? countResult[0].total : 0;

    const mainQuery = [
      {
        $lookup: {
          from: "star_projects",
          let: { project: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$project_id", "$$project"] },
                    { $eq: ["$isDeleted", false] },
                    {
                      $eq: [
                        "$createdBy",
                        new mongoose.Types.ObjectId(req?.user?._id),
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "starProects",
        },
      },
      {
        $unwind: {
          path: "$starProects",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "projecttypes",
          let: { typeId: "$project_type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$typeId"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "project_types",
        },
      },
      {
        $unwind: {
          path: "$project_types",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(await getProjectDefaultSettingQuery("_id")),
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          isBillable: 1,
          projectId: 1,
          isStarred: "$starProects.isStarred",
          ...(await getProjectDefaultSettingQuery("_id", true)),
          end_date: 1,
          start_date: 1,
          descriptions: 1,
          estimatedHours: 1,
          project_status: 1,
          technology: 1,
          project_type: 1,
          project_types: {
            _id: 1,
            project_type: 1,
            isDeleted: 1,
            slug: 1,
          },
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $sort: {
          isStarred: -1,
          _id: -1,
        },
      },
    ];

    // Add pagination if both page and limit are provided
    if (pageNum && limitNum) {
      const skip = (pageNum - 1) * limitNum;
      mainQuery.push(
        { $skip: skip },
        { $limit: limitNum }
      );
    }

    let data = await Project.aggregate(mainQuery);

    // Apply complaints filter if needed (after aggregation to maintain count accuracy)
    if (isComplaints && isComplaints !== undefined) {
      const filteredData = data.filter((ele) => {
        // if ([].includes(ele?.project_types?.slug)) {
        //   return ele;
        // }
      });
      
      // If complaints filter is applied after pagination, we need to recalculate total
      if (pageNum && limitNum) {
        // For complaints filter, we need to run a separate count query
        const complaintsCountQuery = [...countQuery];
        const complaintsCountResult = await Project.aggregate(complaintsCountQuery);
        const allData = complaintsCountResult.length > 0 ? await Project.aggregate([
          ...mainQuery.slice(0, -2) // Remove skip and limit
        ]) : [];
        
        const complaintsFilteredCount = allData.filter((ele) => {
          if (["DY", "AMC", "FC", "TM", "DD"].includes(ele?.project_types?.slug)) {
            return ele;
          }
        }).length;
        
        totalDocuments = complaintsFilteredCount;
      }
      
      data = data;
    }

    // check project have project id or not...
    await addProjectRandomId(data);

    // Prepare pagination meta if pagination is used
    const meta = {};
    if (pageNum && limitNum) {
      meta.total = totalDocuments;
      meta.page = pageNum;
      meta.limit = limitNum;
      meta.totalPages = Math.ceil(totalDocuments / limitNum);
    }

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, meta);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Get task data..
exports.getMyTasks = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      status: Joi.string().optional().default("all"),
      project_id: Joi.array().optional().default([]),
      start_date: Joi.date().optional().default(""),
      end_date: Joi.date().optional().default(""),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const isAdmin = await checkUserIsAdmin(req.user._id);

    // Or filter: non-admin only see tasks assigned to them
    let orFilter = {};
    let mainTaskQuery = [
      { $eq: ["$_id", "$$mainTaskId"] },
      { $eq: ["$isDeleted", false] },
    ];

    if (!isAdmin) {
      orFilter = {
        $or: [
          { assignees: new mongoose.Types.ObjectId(req.user._id) },
        ],
      };
      mainTaskQuery = [
        ...mainTaskQuery,
        {
          $or: [
            { $eq: ["$isPrivateList", false] },
            {
              $or: [
                { $eq: ["$createdBy", new mongoose.Types.ObjectId(req.user._id)] },
                { $in: [new mongoose.Types.ObjectId(req.user._id), "$subscribers"] },
                { $in: [new mongoose.Types.ObjectId(req.user._id), "$pms_clients"] },
              ],
            },
          ],
        },
      ];
    }

    let matchQuery = {
      isDeleted: false,
      status: "active",
      ...(value.status !== "all"
        ? value.status == "completed"
          ? {
            "task_status.title": DEFAULT_DATA.WORKFLOW_STATUS.DONE,
          }
          : {
            "task_status.title": {
              $ne: DEFAULT_DATA.WORKFLOW_STATUS.DONE,
            },
          }
        : {}),
      ...(value.project_id.length > 0
        ? {
          project_id: {
            $in: value.project_id.map((p) => new mongoose.Types.ObjectId(p)),
          },
        }
        : {}),

      ...(value.start_date !== "" && value.end_date == ""
        ? {
          due_date: {
            $gte: moment(value.start_date).startOf("day").toDate(),
          },
        }
        : {}),
      ...(value.start_date == "" && value.end_date !== ""
        ? {
          due_date: { $lte: moment(value.end_date).startOf("day").toDate() },
        }
        : {}),

      ...(value.start_date !== "" && value.end_date !== ""
        ? {
          due_date: {
            $gte: moment(value.start_date).startOf("day").toDate(),
            $lte: moment(value.end_date).startOf("day").toDate(),
          },
        }
        : {}),
    };

    matchQuery = {
      ...matchQuery,
      ...orFilter,
    };

    const userCompanyId = req.user.companyId
      ? new mongoose.Types.ObjectId(req.user.companyId)
      : null;

    const mainQuery = [
      {
        $lookup: {
          from: "projects",
          let: {
            project_id: "$project_id",
            ...(userCompanyId ? { userCompanyId } : {}),
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_id"] },
                    { $eq: ["$isDeleted", false] },
                    ...(userCompanyId
                      ? [{ $eq: ["$companyId", "$$userCompanyId"] }]
                      : []),
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
          preserveNullAndEmptyArrays: false,
        },
      },

      {
        $lookup: {
          from: "workflowstatuses",
          let: { workflow_id: "$task_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$workflow_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "task_status",
        },
      },
      {
        $unwind: {
          path: "$task_status",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: matchQuery },
      {
        $lookup: {
          from: "projectmaintasks",
          let: {
            mainTaskId: "$main_task_id",
            taskCreatedBy: "$createdBy",
            taskAssignees: "$assignees",
            taskPmsClients: "$pms_clients",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: mainTaskQuery,
                },
              },
            },
          ],
          as: "mainTask",
        },
      },
      {
        $unwind: {
          path: "$mainTask",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "tasklabels",
          let: { task_labels: "$task_labels" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", { $ifNull: ["$$task_labels", []] }] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "taskLabels"
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          taskId: 1,
          start_date: 1,
          due_date: 1,
          createdAt: 1,
          assignees: 1,
          taskLabels: { _id: 1, title: 1, color: 1 },
          project: {
            _id: 1,
            title: 1,
            manager: 1,
          },
          mainTask: {
            _id: 1,
            title: 1,
            isPrivateList: 1,
          },
          task_status: {
            _id: 1,
            title: 1,
            color: 1,
          },
        },
      },
      { $sort: { _id: -1 } },
    ];

    let data = await ProjectTasks.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Get task list for Task page (List/Kanban/Calendar). Admin can pass view_all to see all tasks.
exports.getTaskList = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      view_all: Joi.boolean().optional().default(false),
      search: Joi.string().allow("").optional(),
      status: Joi.string().optional().default("all"),
      project_id: Joi.array().optional().default([]),
      start_date: Joi.date().optional().default(""),
      end_date: Joi.date().optional().default(""),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const isAdmin = await checkUserIsAdmin(req.user._id);
    const viewAll = value.view_all && isAdmin;

    let orFilter = {};
    let mainTaskQuery = [
      { $eq: ["$_id", "$$mainTaskId"] },
      { $eq: ["$isDeleted", false] },
    ];

    if (!viewAll) {
      orFilter = {
        $or: [
          { assignees: new mongoose.Types.ObjectId(req.user._id) },
        ],
      };
      mainTaskQuery = [
        ...mainTaskQuery,
        {
          $or: [
            { $eq: ["$isPrivateList", false] },
            {
              $or: [
                { $eq: ["$createdBy", new mongoose.Types.ObjectId(req.user._id)] },
                { $in: [new mongoose.Types.ObjectId(req.user._id), "$subscribers"] },
                { $in: [new mongoose.Types.ObjectId(req.user._id), "$pms_clients"] },
              ],
            },
          ],
        },
      ];
    }

    let matchQuery = {
      isDeleted: false,
      status: "active",
      ...(value.status !== "all"
        ? value.status === "completed"
          ? { "task_status.title": DEFAULT_DATA.WORKFLOW_STATUS.DONE }
          : { "task_status.title": { $ne: DEFAULT_DATA.WORKFLOW_STATUS.DONE } }
        : {}),
      ...(value.project_id.length > 0
        ? { project_id: { $in: value.project_id.map((p) => new mongoose.Types.ObjectId(p)) } }
        : {}),
      ...(value.start_date !== "" && value.end_date === ""
        ? { due_date: { $gte: moment(value.start_date).startOf("day").toDate() } }
        : {}),
      ...(value.start_date === "" && value.end_date !== ""
        ? { due_date: { $lte: moment(value.end_date).startOf("day").toDate() } }
        : {}),
      ...(value.start_date !== "" && value.end_date !== ""
        ? {
            due_date: {
              $gte: moment(value.start_date).startOf("day").toDate(),
              $lte: moment(value.end_date).startOf("day").toDate(),
            },
          }
        : {}),
    };

    matchQuery = { ...matchQuery, ...orFilter };

    const userCompanyId = req.user.companyId
      ? new mongoose.Types.ObjectId(req.user.companyId)
      : null;

    const mainQuery = [
      {
        $lookup: {
          from: "projects",
          let: {
            project_id: "$project_id",
            ...(userCompanyId ? { userCompanyId } : {}),
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_id"] },
                    { $eq: ["$isDeleted", false] },
                    ...(userCompanyId
                      ? [{ $eq: ["$companyId", "$$userCompanyId"] }]
                      : []),
                  ],
                },
              },
            },
          ],
          as: "project",
        },
      },
      { $unwind: { path: "$project", preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: "workflowstatuses",
          let: { workflow_id: "$task_status" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$_id", "$$workflow_id"] }, { $eq: ["$isDeleted", false] }] } } },
          ],
          as: "task_status",
        },
      },
      { $unwind: { path: "$task_status", preserveNullAndEmptyArrays: true } },
      { $match: matchQuery },
      {
        $lookup: {
          from: "projectmaintasks",
          let: {
            mainTaskId: "$main_task_id",
            taskCreatedBy: "$createdBy",
            taskAssignees: "$assignees",
            taskPmsClients: "$pms_clients",
          },
          pipeline: [{ $match: { $expr: { $and: mainTaskQuery } } }],
          as: "mainTask",
        },
      },
      { $unwind: { path: "$mainTask", preserveNullAndEmptyArrays: false } },
      ...(value.search && value.search.trim()
        ? [{ $match: { title: { $regex: value.search.trim(), $options: "i" } } }]
        : []),
      {
        $lookup: {
          from: "employees",
          let: { assigneesIds: "$assignees" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$assigneesIds"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
            { $project: { _id: 1, full_name: 1, first_name: 1, last_name: 1 } },
          ],
          as: "assignees",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          taskId: 1,
          start_date: 1,
          due_date: 1,
          createdAt: 1,
          assignees: 1,
          task_progress: 1,
          project: { _id: 1, title: 1, manager: 1 },
          mainTask: { _id: 1, title: 1, isPrivateList: 1 },
          task_status: { _id: 1, title: 1, color: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ];

    const data = await ProjectTasks.aggregate(mainQuery);
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, {});
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};

// Get task data..
exports.getMyLoggedHours = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.array().optional().default([]),
      start_date: Joi.date().optional().default(""),
      end_date: Joi.date().optional().default(""),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    // Or filter..
    let orFilter = {};

    // get login user role ...
    // if (!(await checkUserIsAdmin(req.user._id))) {
    orFilter = {
      $or: [
        { employee_id: new mongoose.Types.ObjectId(req.user._id) },
        { createdBy: new mongoose.Types.ObjectId(req.user._id) },
      ],
    };
    // }

    let matchQuery = {
      isDeleted: false,
      ...(value.project_id.length > 0
        ? {
          project_id: {
            $in: value.project_id.map((p) => new mongoose.Types.ObjectId(p)),
          },
        }
        : {}),

      ...(value.start_date !== "" && value.end_date == ""
        ? {
          logged_date: {
            $gte: moment(value.start_date).startOf("day").toDate(),
          },
        }
        : {}),
      ...(value.start_date == "" && value.end_date !== ""
        ? {
          logged_date: {
            $lte: moment(value.end_date).startOf("day").toDate(),
          },
        }
        : {}),

      ...(value.start_date !== "" && value.end_date !== ""
        ? {
          logged_date: {
            $gte: moment(value.start_date).startOf("day").toDate(),
            $lte: moment(value.end_date).startOf("day").toDate(),
          },
        }
        : {}),
    };

    matchQuery = {
      ...matchQuery,
      ...orFilter,
    };

    const mainQuery = [
      ...(await getCreatedUpdatedDeletedByQuery()),
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          descriptions: 1,
          logged_hours: 1,
          logged_minutes: 1,
          logged_seconds: 1,
          logged_date: 1,
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
          },
          project_id: 1,
          timesheet_id: 1,
        },
      },
      {
        $sort: {
          logged_date: -1,
        },
      },
      {
        $group: {
          _id: {
            project: "$project_id",
            timesheet: "$timesheet_id",
          },
          data: { $push: "$$ROOT" },
          totalHours: { $sum: { $toInt: "$logged_hours" } }, // Convert logged_hours to integer and sum
          totalMinutes: { $sum: { $toInt: "$logged_minutes" } }, // Convert logged_minutes to integer and sum
          totalSeconds: { $sum: { $toInt: { $ifNull: ["$logged_seconds", 0] } } }, // Convert logged_seconds to integer and sum
        },
      },
      {
        $lookup: {
          from: "projects",
          let: { project_id: "$_id.project" },
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "projecttimesheets",
          let: { timesheet_id: "$_id.timesheet" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$timesheet_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "timesheet",
        },
      },
      {
        $unwind: {
          path: "$timesheet",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          total_minutes: {
            $add: [
              {
                $cond: {
                  if: { $eq: [{ $type: "$totalHours" }, "string"] },
                  then: { $multiply: [{ $toInt: "$totalHours" }, 60] },
                  else: { $multiply: ["$totalHours", 60] },
                },
              },
              { $toInt: "$totalMinutes" },
            ],
          },
          total_seconds: {
            $add: [
              {
                $cond: {
                  if: { $eq: [{ $type: "$totalHours" }, "string"] },
                  then: { $multiply: [{ $toInt: "$totalHours" }, 3600] },
                  else: { $multiply: ["$totalHours", 3600] },
                },
              },
              { $multiply: [{ $toInt: "$totalMinutes" }, 60] },
              { $toInt: { $ifNull: ["$totalSeconds", 0] } },
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          project: {
            _id: 1,
            title: 1,
          },
          timesheet: {
            _id: 1,
            title: 1,
          },
          logged_data: "$data",
          total_hours: {
            $divide: [{ $floor: { $divide: ["$total_minutes", 60] } }, 1],
          },
          total_minutes: { $mod: ["$total_minutes", 60] },
        },
      },
      {
        $sort: {
          "project._id": -1,
        },
      },
    ];

    let data = await ProjectTimeLogged.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Get task data..
exports.getMyBugs = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      status: Joi.string().optional().default("all"),
      project_id: Joi.array().optional().default([]),
      start_date: Joi.date().optional().default(""),
      end_date: Joi.date().optional().default(""),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    // Or filter..
    let orFilter = {};

    // get login user role ...
    // if (!(await checkUserIsAdmin(req.user._id))) {
    orFilter = {
      $or: [
        // { createdBy: new mongoose.Types.ObjectId(req.user._id) },
        { assignees: new mongoose.Types.ObjectId(req.user._id) },
        // { "task.createdBy": new mongoose.Types.ObjectId(req.user._id) },
        // { "task.assignees": new mongoose.Types.ObjectId(req.user._id) },
        // { "task.pms_clients": new mongoose.Types.ObjectId(req.user._id) },
        // { "project.manager": new mongoose.Types.ObjectId(req.user._id) },
      ],
    };
    // }

    let matchQuery = {
      isDeleted: false,
      ...(value.status !== "all"
        ? value.status == "completed"
          ? {
            "bug_status.title": DEFAULT_DATA.BUG_WORKFLOW_STATUS.DONE,
          }
          : {
            "bug_status.title": {
              $ne: DEFAULT_DATA.BUG_WORKFLOW_STATUS.DONE,
            },
          }
        : {}),
      ...(value.project_id.length > 0
        ? {
          project_id: {
            $in: value.project_id.map((p) => new mongoose.Types.ObjectId(p)),
          },
        }
        : {}),

      ...(value.start_date !== "" && value.end_date == ""
        ? {
          due_date: {
            $gte: moment(value.start_date).startOf("day").toDate(),
          },
        }
        : {}),
      ...(value.start_date == "" && value.end_date !== ""
        ? {
          due_date: { $lte: moment(value.end_date).startOf("day").toDate() },
        }
        : {}),

      ...(value.start_date !== "" && value.end_date !== ""
        ? {
          due_date: {
            $gte: moment(value.start_date).startOf("day").toDate(),
            $lte: moment(value.end_date).startOf("day").toDate(),
          },
        }
        : {}),
    };

    matchQuery = {
      ...matchQuery,
      ...orFilter,
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "projecttasks",
          let: { task_id: "$task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$task_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "task",
        },
      },
      {
        $unwind: {
          path: "$task",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "bugsworkflowstatuses",
          let: { status_id: "$bug_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$status_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "bug_status",
        },
      },
      {
        $unwind: {
          path: "$bug_status",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          descriptions: 1,
          bugId: 1,
          start_date: 1,
          due_date: 1,
          createdAt: 1,
          project: {
            _id: 1,
            title: 1,
            manager: 1,
          },
          task: {
            _id: 1,
            title: 1,
          },
          bug_status: {
            _id: 1,
            title: 1,
            color: 1,
          },
        },
      },
      { $sort: { _id: -1 } },
    ];

    let data = await ProjectBugs.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};


// exports.getEmpTrackedHoursforDashboard = async (req, res) => {
//   try {
//     const validationSchema = Joi.object({
//       month: Joi.string().required(),
//       year: Joi.string().required(),
//     });

//     const { error, value } = validationSchema.validate(req.body);
//     if (error) {
//       return errorResponse(
//         res,
//         statusCode.BAD_REQUEST,
//         error.details[0].message
//       );
//     }

//     let holiday_data = await Holiday.aggregate([
//       {
//         $match: {
//           isDeleted: false,
//           $or: [{ isOptional: { $exists: false } }, { isOptional: false }],
//           $expr: {
//             $and: [
//               { $eq: [{ $month: "$holiday_date" }, parseInt(value.month)] },
//               { $eq: [{ $year: "$holiday_date" }, parseInt(value.year)] },
//             ],
//           },
//         },
//       },
//     ]);

//     // Get the total number of days in the month
//     const totalDaysInMonth = moment(
//       `${value.year}-${value.month}`,
//       "YYYY-MM"
//     ).daysInMonth();

//     let totalWorkingDays = 0;
//     let holidaysOnWorkingDays = 0;

//     let WorkingDaysTillToday = 0;
//     let holidaysOnWorkingDaysTillToday = 0;

//     let todayDate = moment();

//     for (let day = 1; day <= totalDaysInMonth; day++) {
//       const currentDay = moment(
//         `${value.year}-${value.month}-${day}`,
//         "YYYY-MM-DD"
//       );

//       // Check if it's a weekend (Saturday = 6, Sunday = 0)
//       const isWeekend = currentDay.day() === 0 || currentDay.day() === 6;
//       if (!isWeekend) {
//         totalWorkingDays++; // Increment working days if not a weekend
//         // console.log("totalWorkingDays",totalWorkingDays)

//         if (currentDay.isBefore(todayDate, 'day')) {
//           WorkingDaysTillToday += 1;
//         }
//       }

//       // Check if the current day is a holiday and also a weekday
//       const isHoliday = holiday_data.some((holiday) =>
//         moment(holiday.holiday_date).isSame(currentDay, "day")
//       );
//       if (isHoliday && !isWeekend) {
//         holidaysOnWorkingDays++;
//         if (currentDay.isBefore(todayDate, 'day')) {
//           holidaysOnWorkingDaysTillToday += 1;
//         }
//       }
//     }

//     // Subtract holidays that fall on weekdays from the total working days
//     totalWorkingDays -= holidaysOnWorkingDays;
//     WorkingDaysTillToday -= holidaysOnWorkingDaysTillToday;

//     // console.log("----", totalWorkingDays);

//     const data2 = await TotalTaskhoursLogged.aggregate([
//       {
//         $match: {
//           isDeleted: false,
//           employee_id: new mongoose.Types.ObjectId(req?.user?._id),
//           month: value?.month,
//           year: value?.year,
//         },
//       },
//     ]);

//     const totalWorkingHours = totalWorkingDays * 8.5;
//     const totalWorkingMinutes = totalWorkingHours * 60;

//     // const WorkingHoursTillToday = WorkingDaysTillToday * 8.5;

//     // Extract working and logged hours
//     const employeeLoggedHoursData = await getTotalLoggedHoursForMonthByEmployee(
//       value.month,
//       value.year,
//       req?.user?._id,
//       true
//     );
//     const empTotalTimeData = employeeLoggedHoursData?.length
//     ? employeeLoggedHoursData[0]
//     : { total_hours_as_working_days_ofemp: 0, total_minutes_as_working_days_ofemp: 0 };

//     // console.log("🚀 ~ exports.getEmpTrackedHoursforDashboard= ~ empTotalTimeData.total_hours_as_working_days_ofemp:", empTotalTimeData.total_hours_as_working_days_ofemp)
//     const WorkingHoursTillToday = (empTotalTimeData.total_hours_as_working_days_ofemp);
//     // console.log("🚀 ~ exports.getEmpTrackedHoursforDashboard= ~ WorkingHoursTillToday:", WorkingHoursTillToday)
//     // Extract logged hours and convert to minutes
//     const loggedTime = data2[0]?.total_time.split(":"); // Split logged time by ':'
//     const loggedHours = loggedTime?.length > 0 ? parseInt(loggedTime[0], 10) : 0;
//     const loggedMinutes =
//       loggedTime?.length > 0 ? parseInt(loggedTime[1], 10) : 0;
//     const totalLoggedMinutes = loggedHours * 60 + loggedMinutes;

//     // Calculate percentage
//     const loggedPercentage = (totalLoggedMinutes / totalWorkingMinutes) * 100;

//     let behindHours = false;
//     let totalBehindHoursTillToday = 0;
//     if (parseInt(WorkingHoursTillToday) > parseInt(loggedHours)) {
//       behindHours = true;
//       totalBehindHoursTillToday = parseInt(WorkingHoursTillToday) - parseInt(loggedHours);
//     }

//     const masterData = {
//       totalWorkingHours: WorkingHoursTillToday,
//       behindHours:behindHours,
//       totalBehindHoursTillToday:totalBehindHoursTillToday,
//       data2: data2[0],
//       loggedPercentage: loggedPercentage.toFixed(2) + "%", // Add percentage as part of response
//     };
//     return successResponse(
//       res,
//       statusCode.SUCCESS,
//       messages.LISTING,
//       masterData,
//       {}
//     );
//   } catch (error) {
//     console.log(
//       "🚀 ~ exports.grandTotalforTrackedandApprovedHours= ~ error:",
//       error
//     );
//     return catchBlockErrorResponse(res, error.message);
//   }
// };