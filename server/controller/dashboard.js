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
const { newObjectId } = require("../helpers/common");

// Global Team Report (Summary for the whole company)
exports.getGlobalTeamReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const cid = new mongoose.Types.ObjectId(companyId);

    const [empStats, projectCount, taskStats] = await Promise.all([
      // 1. Employee stats
      mongoose.model("employees").aggregate([
        { $match: { companyId: cid, isDeleted: false, isSoftDeleted: false } },
        {
          $lookup: {
            from: "pms_roles",
            localField: "pms_role_id",
            foreignField: "_id",
            as: "role"
          }
        },
        { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ["$isActivate", true] }, 1, 0] } },
            admins: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: "$role.role_name", regex: /admin/i } },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      // 2. Project counts
      Project.countDocuments({ companyId: cid, isDeleted: false }),
      // 3. Task aggregation (Scoped to company projects)
      ProjectTasks.aggregate([
        {
          $lookup: {
            from: "projects",
            localField: "project_id",
            foreignField: "_id",
            as: "project"
          }
        },
        { $unwind: "$project" },
        { 
          $match: { 
            "project.companyId": cid, 
            isDeleted: false,
            status: "active" 
          } 
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [
                  { 
                    $or: [
                      { $in: [{ $toLower: "$status" }, ["done", "complete", "closed", "finish"]] },
                      // If task_status is populated/looked up, but usually we just check title keywords
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const emps = empStats[0] || { total: 0, active: 0 };
    const tasks = taskStats[0] || { total: 0, completed: 0 };

    return successResponse(res, statusCode.SUCCESS, "Global team report data", {
      employees: {
        total: emps.total,
        active: emps.active,
        inactive: emps.total - emps.active,
        admins: emps.admins || 0
      },
      projects: {
        total: projectCount
      },
      tasks: {
        total: tasks.total,
        completed: tasks.completed,
        incomplete: Math.max(0, tasks.total - tasks.completed)
      }
    });
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

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
      return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    }

    const { manager_id, project_status, category, project_type, isComplaints, pageNo, limit, search } = value;

    const pageNum = pageNo && pageNo > 0 ? parseInt(pageNo, 10) : null;
    const limitNum = limit && limit > 0 ? parseInt(limit, 10) : null;

    // Tab-setting sync removed from the listing path — see projects.js getProjects for explanation.

    // Admin check must complete before building the match query
    const isAdmin = await checkUserIsAdmin(req?.user?._id);

    const userId = new mongoose.Types.ObjectId(req?.user?._id);

    // Build match query using ONLY raw document fields (ObjectIds, booleans, strings).
    // Applied as the VERY FIRST pipeline stage so MongoDB uses the compound index
    // { companyId: 1, isDeleted: 1 } and eliminates the bulk of 10 k docs before any $lookup.
    let matchQuery = {
      isDeleted: false,
      companyId: newObjectId(decodedCompanyId),
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {}),
      ...(project_status.length > 0
        ? { project_status: { $in: project_status.map((s) => new mongoose.Types.ObjectId(s)) } }
        : {}),
      ...(category.length > 0
        ? { technology: { $in: category.map((c) => new mongoose.Types.ObjectId(c)) } }
        : {}),
      ...(project_type.length > 0
        ? { project_type: { $in: project_type.map((t) => new mongoose.Types.ObjectId(t)) } }
        : {}),
      ...(manager_id ? { manager: new mongoose.Types.ObjectId(manager_id) } : {}),
      ...(!isAdmin
        ? {
            $or: [
              { assignees: userId },
              { pms_clients: userId },
              { manager: userId },
              { createdBy: userId },
              { acc_manager: userId },
            ],
          }
        : {}),
    };

    if (search && search.trim()) {
      matchQuery.$and = matchQuery.$and || [];
      matchQuery.$and.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { projectId: { $regex: search, $options: "i" } },
          { descriptions: { $regex: search, $options: "i" } },
        ],
      });
    }

    const COMPLAINT_SLUGS = ["DY", "AMC", "FC", "TM", "DD"];

    // Fetch tab-setting pipeline stages and projection object in one round-trip
    // (previously called 3 separate times — once per countQuery/mainQuery/$project)
    const [tabSettingStages, tabSettingProjection] = await Promise.all([
      getProjectDefaultSettingQuery("_id"),
      getProjectDefaultSettingQuery("_id", true),
    ]);

    // projecttypes lookup — reused by both count (isComplaints) and main pipeline
    const typesLookupStages = [
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
      { $unwind: { path: "$project_types", preserveNullAndEmptyArrays: true } },
    ];

    // ── Count — fast path ────────────────────────────────────────────────────
    // matchQuery references only raw fields → countDocuments uses the index directly
    // (no joins, no full collection scan).  Only isComplaints needs a $lookup.
    let totalDocuments;
    if (!isComplaints) {
      totalDocuments = await Project.countDocuments(matchQuery);
    } else {
      const countResult = await Project.aggregate([
        { $match: matchQuery },
        ...typesLookupStages,
        { $match: { "project_types.slug": { $in: COMPLAINT_SLUGS } } },
        { $count: "total" },
      ]);
      totalDocuments = countResult[0]?.total || 0;
    }

    // ── Main pipeline ────────────────────────────────────────────────────────
    const mainQuery = [
      // $match FIRST — eliminates most documents before any $lookup
      { $match: matchQuery },
      // Star lookup — needed for sort order (isStarred desc)
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
                    { $eq: ["$createdBy", userId] },
                  ],
                },
              },
            },
          ],
          as: "starProects",
        },
      },
      { $unwind: { path: "$starProects", preserveNullAndEmptyArrays: true } },
      // projecttypes lookup — needed for isComplaints filter and projection
      ...typesLookupStages,
      // Apply complaints slug filter inside the pipeline (replaces JS post-filter + second full aggregate)
      ...(isComplaints ? [{ $match: { "project_types.slug": { $in: COMPLAINT_SLUGS } } }] : []),
      // Tab-setting nested lookup (project_tabs_settings → project_tabs)
      ...tabSettingStages,
      {
        $project: {
          _id: 1,
          title: 1,
          isBillable: 1,
          projectId: 1,
          isStarred: "$starProects.isStarred",
          ...tabSettingProjection,
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
      { $sort: { isStarred: -1, _id: -1 } },
    ];

    if (pageNum && limitNum) {
      const skip = (pageNum - 1) * limitNum;
      mainQuery.push({ $skip: skip }, { $limit: limitNum });
    }

    const data = await Project.aggregate(mainQuery);

    // Backfill missing projectIds in background — do not block the response
    setImmediate(() => addProjectRandomId(data).catch(() => {}));

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
      view_all: Joi.boolean().optional().default(false),
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

      ...(value.start_date !== "" || value.end_date !== ""
        ? {
            $or: [
              {
                due_date: {
                  ...(value.start_date !== "" ? { $gte: moment(value.start_date).startOf("day").toDate() } : {}),
                  ...(value.end_date !== "" ? { $lte: moment(value.end_date).endOf("day").toDate() } : {}),
                },
              },
              {
                start_date: {
                  ...(value.start_date !== "" ? { $gte: moment(value.start_date).startOf("day").toDate() } : {}),
                  ...(value.end_date !== "" ? { $lte: moment(value.end_date).endOf("day").toDate() } : {}),
                },
              },
            ],
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
        $lookup: {
          from: "employees",
          let: { createdById: "$createdBy" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$createdById"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] }
                  ]
                }
              }
            },
            { $project: { _id: 1, full_name: 1, first_name: 1, last_name: 1 } }
          ],
          as: "createdBy"
        }
      },
      {
        $unwind: {
          path: "$createdBy",
          preserveNullAndEmptyArrays: true,
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
          createdBy: 1,
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
      pageNo: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).optional(),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { pageNo, limit } = value;
    const pageNum = pageNo && pageNo > 0 ? parseInt(pageNo, 10) : null;
    const limitNum = limit && limit > 0 ? parseInt(limit, 10) : null;

    const isAdmin = await checkUserIsAdmin(req.user._id);
    const viewAll = value.view_all && isAdmin;

    let orFilter = {};
    let mainTaskQuery = [
      { $eq: ["$_id", "$$mainTaskId"] },
      { $eq: ["$isDeleted", false] },
    ];

    if (!viewAll) {
      const userId = new mongoose.Types.ObjectId(req.user._id);

      // When project_ids are explicitly provided, trust access control
      // from the caller (e.g. project-report already filtered by user's projects).
      // Otherwise fall back to user-scoped filtering.
      if (value.project_id.length > 0) {
        // No extra orFilter — the project_id match already limits scope
        orFilter = {};
      } else {
        orFilter = {
          $or: [
            { assignees: userId },
            { createdBy: userId },
            { "project.manager": userId },
            { "project.acc_manager": userId },
          ],
        };
      }
      mainTaskQuery = [
        ...mainTaskQuery,
        {
          $or: [
            { $eq: ["$isPrivateList", false] },
            {
              $or: [
                { $eq: ["$createdBy", userId] },
                { $in: [userId, "$subscribers"] },
                { $in: [userId, "$pms_clients"] },
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
      ...(value.start_date !== "" || value.end_date !== ""
        ? {
            $or: [
              {
                due_date: {
                  ...(value.start_date !== "" ? { $gte: moment(value.start_date).startOf("day").toDate() } : {}),
                  ...(value.end_date !== "" ? { $lte: moment(value.end_date).endOf("day").toDate() } : {}),
                },
              },
              {
                start_date: {
                  ...(value.start_date !== "" ? { $gte: moment(value.start_date).startOf("day").toDate() } : {}),
                  ...(value.end_date !== "" ? { $lte: moment(value.end_date).endOf("day").toDate() } : {}),
                },
              },
            ],
          }
        : {}),
    };

    matchQuery = { ...matchQuery, ...orFilter };

    const userCompanyId = req.user.companyId
      ? new mongoose.Types.ObjectId(req.user.companyId)
      : null;

    // Build the stages that are common to both count and data fetch
    const preMatchStages = [
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
    ];

    // Get Total Count
    const countResult = await ProjectTasks.aggregate([
      ...preMatchStages,
      ...(value.search && value.search.trim()
        ? [{ $match: { title: { $regex: value.search.trim(), $options: "i" } } }]
        : []),
      { $count: "total" },
    ]);
    const totalDocuments = countResult[0]?.total || 0;

    const mainQuery = [
      ...preMatchStages,
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
        $lookup: {
          from: "tasklabels",
          let: { task_labels: "$task_labels" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", { $ifNull: ["$$task_labels", []] }] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            { $project: { _id: 1, title: 1, color: 1, name: 1, label_name: 1 } },
          ],
          as: "taskLabels",
        },
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
                    { $eq: ["$_id", "$$createdById"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                  ],
                },
              },
            },
            { $project: { _id: 1, full_name: 1, first_name: 1, last_name: 1 } },
          ],
          as: "createdBy",
        },
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          title: 1,
          taskId: 1,
          start_date: 1,
          due_date: 1,
          createdAt: 1,
          createdBy: 1,
          assignees: 1,
          taskLabels: 1,
          task_labels: 1,
          task_progress: 1,
          project: { _id: 1, title: 1, manager: 1 },
          mainTask: { _id: 1, title: 1, isPrivateList: 1 },
          task_status: { _id: 1, title: 1, color: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ];

    if (pageNum && limitNum) {
      const skip = (pageNum - 1) * limitNum;
      mainQuery.push({ $skip: skip }, { $limit: limitNum });
    }

    const data = await ProjectTasks.aggregate(mainQuery);
    const meta = {};
    if (pageNum && limitNum) {
      meta.total = totalDocuments;
      meta.page = pageNum;
      meta.limit = limitNum;
      meta.totalPages = Math.ceil(totalDocuments / limitNum);
    }
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, meta);
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
