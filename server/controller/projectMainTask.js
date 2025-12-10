const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const WorkflowStatusModel = mongoose.model("workflowstatus");
const ProjectMainTasks = mongoose.model("projectmaintasks");
const Project = mongoose.model("projects");
const ProjectTasks = mongoose.model("projecttasks");
const ProjectTaskComments = mongoose.model("Comments");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr
} = require("../helpers/queryHelper");
const { statusCode, DEFAULT_DATA } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const {
  subscribersMail,
  deleteMainTaskManagerMail,
  sendmailToAssignees
} = require("./sendEmail");
const {
  getArrayChanges,
  getRefModelFromLoginUser,
  getClientQuery,
  generateRandomId
} = require("../helpers/common");
const { sheet } = require("../template/tasksCSV");
const { checkUserIsAdmin } = require("./authentication");
const { checkIsPMSClient } = require("./PMSRoles");

// Check is exists..
exports.projectMainTaskExists = async (title, project_id, id = null) => {
  try {
    let isExist = false;
    // const data = await ProjectMainTasks.findOne({
    //   // title: title?.trim()?.toLowerCase(),
    //   title: { $regex: new RegExp(`^${title}$`, "i") },
    //   isDeleted: false,
    //   project_id: new mongoose.Types.ObjectId(project_id),
    //   ...(id
    //     ? {
    //         _id: { $ne: new mongoose.Types.ObjectId(id) },
    //       }
    //     : {}),
    // });

    // Use aggregation to perform a case-insensitive match
    const data = await ProjectMainTasks.aggregate([
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(project_id),
          isDeleted: false,
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
    console.log("🚀 ~ exports.projectMainTaskExists= ~ error:", error);
  }
};

//Add Project main task :
exports.addProjectsMainTask = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      title: Joi.string().required(),
      project_id: Joi.string().required(),
      // workflow_id: Joi.string().required(),
      task_status: Joi.string().optional(),
      subscribers: Joi.array().optional().default([]),
      pms_clients: Joi.array().optional().default([]),
      subscriber_stages: Joi.array().optional().default([]),
      status: Joi.string().optional().default("active"),
      isPrivateList: Joi.boolean().optional().default(false),
      isDisplayInGantt: Joi.boolean().optional().default(false)
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (await this.projectMainTaskExists(value.title, value.project_id)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let data = new ProjectMainTasks({
        title: value.title,
        project_id: value.project_id,
        // workflow_id: value.workflow_id || null,
        task_status: value.task_status || null,
        subscribers: value.subscribers || [],
        pms_clients: value.pms_clients || [],
        subscriber_stages: value.subscriber_stages || [],
        status: value.status,
        isPrivateList: value.isPrivateList || false,
        isDisplayInGantt: value.isDisplayInGantt || false,
        ...(value?.task_status && {
          task_status_history: [
            {
              task_status: value?.task_status,
              updatedBy: req.user._id,
              updatedAt: configs.utcDefault()
            }
          ]
        }),

        createdBy: req.user._id,
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user))
      });
      let isPMSClient = await checkIsPMSClient(req.user._id);
      if (isPMSClient) {
        data.pms_clients.push(new mongoose.Types.ObjectId(req.user._id));
      }
      let newdata = await data.save();

      // For send mail
      if (
        (value?.subscribers && value?.subscribers.length > 0) ||
        (value?.pms_clients && value?.pms_clients.length > 0)
      ) {
        await subscribersMail(newdata._id, [], [], decodedCompanyId);
      }
      return successResponse(res, statusCode.CREATED, messages.CREATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project main task :
exports.getProjectsMainTask = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
      project_id: Joi.string().required()
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

    const [isClient, isAdmin, isManager, isAccManager] =
      await Promise.all([
        checkIsPMSClient(req.user._id),
        checkUserIsAdmin(req.user._id),
        this.checkLoginUserIsProjectManager(value.project_id, req.user._id),
        this.checkLoginUserIsProjectAccountManager(
          value.project_id,
          req.user._id
        )
      ]);

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value.project_id),
      // For details
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {}),
      ...(!isManager && !isAdmin && !isAccManager
        ? {
            $or: [
              { isPrivateList: false },
              {
                $or: [
                  {
                    "subscribers._id": new mongoose.Types.ObjectId(req.user._id)
                  },
                  {
                    "pms_clients._id": new mongoose.Types.ObjectId(req.user._id)
                  },
                  { createdBy: new mongoose.Types.ObjectId(req.user._id) }
                ]
              }
            ]
          }
        : {})
    };

    let task_query = [
      { $eq: ["$main_task_id", "$$mainTaskId"] },
      { $eq: ["$isDeleted", false] }
    ];

    if (!isManager  && !isClient && !isAdmin && !isAccManager) {
      task_query = [
        ...task_query,
        {
          $or: [
            {
              $eq: ["$createdBy", new mongoose.Types.ObjectId(req.user._id)]
            },
            {
              $in: [new mongoose.Types.ObjectId(req.user._id), "$assignees"]
            },
            {
              $in: [new mongoose.Types.ObjectId(req.user._id), "$pms_clients"]
            }
          ]
        }
      ];
    }

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["title"], value.search)
      };
    }
    const doneStatus = await WorkflowStatusModel.find({
      title: DEFAULT_DATA.WORKFLOW_STATUS.DONE,
      isDeleted: false
    }).exec();

    const mainQuery = [
      { $match: { isDeleted: false } },
      {
        $unwind: {
          path: "$subscriber_stages",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          localField: "subscriber_stages.subscriber_id",
          foreignField: "_id",
          as: "subscriber"
        }
      },
      {
        $unwind: {
          path: "$subscriber",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "workflowstatuses",
          localField: "subscriber_stages.stages",
          foreignField: "_id",
          as: "stages"
        }
      },
      {
        $unwind: {
          path: "$stages",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          project_id: { $first: "$project_id" },
          title: { $first: "$title" },
          subscribers: { $first: "$subscribers" },
          pms_clients: { $first: "$pms_clients" },
          status: { $first: "$status" },
          isPrivateList: { $first: "$isPrivateList" },
          isBookmark: { $first: "$isBookmark" },
          task_status: { $first: "$task_status" },
          createdBy: { $first: "$createdBy" },
          isDeleted: { $first: "$isDeleted" },
          subscriber_stages: {
            $push: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$subscribers", []] }, // Check if subscribers is not an empty array
                    { $ne: ["$subscriber_stages", []] },
                    { $ne: ["$isDeleted", true] }
                  ]
                },
                then: {
                  $filter: {
                    input: [
                      {
                        subscriber: {
                          _id: "$subscriber._id",
                          name: "$subscriber.full_name",
                          emp_img: "$subscriber.emp_img"
                        },
                        stages: {
                          _id: "$stages._id",
                          title: "$stages.title"
                        }
                      }
                    ],
                    as: "result",
                    cond: { $ne: ["$$result.subscriber._id", null] } // Check if subscriber._id is not null
                  }
                },
                else: "$$REMOVE"
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          project_id: 1,
          title: 1,
          subscribers: 1,
          pms_clients: 1,
          isDeleted: 1,
          status: 1,
          isPrivateList: 1,
          isBookmark: 1,
          task_status: 1,
          createdBy: 1,
          subscriber_stages: {
            $reduce: {
              input: "$subscriber_stages",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] }
            }
          }
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
          from: "projectworkflows",
          let: { workflow_id: "$project.workFlow" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$workflow_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "workflows"
        }
      },
      {
        $unwind: {
          path: "$workflows",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projecttasks",
          let: { mainTaskId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: task_query
                }
              }
            },
            {
              $lookup: {
                from: "workflowstatuses",
                let: { taskStatus: "$task_status" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$taskStatus"] },
                          { $eq: ["$isDeleted", false] }
                        ]
                      }
                    }
                  }
                ],
                as: "task_status"
              }
            },
            {
              $unwind: {
                path: "$task_status",
                preserveNullAndEmptyArrays: true
              }
            }
          ],
          as: "tasks"
        }
      },
      {
        $lookup: {
          from: "workflowstatuses",
          let: { task_status: "$task_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$task_status"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "workFlowStatus"
        }
      },
      {
        $unwind: {
          path: "$workFlowStatus",
          preserveNullAndEmptyArrays: true
        }
      },
      // its added for long list data load handle in perticular projects..[DEFAULT_DATA.RESTRICT_PROJECT_ID]
      {
        $addFields: {
          tasks: {
            $cond: {
              if: {
                $in: ["$project.projectId", DEFAULT_DATA.RESTRICT_PROJECT_ID]
              },
              then: {
                $filter: {
                  input: "$tasks",
                  as: "task",
                  cond: {
                    $and: [
                      {
                        $ne: [
                          "$$task.task_status.title",
                          DEFAULT_DATA.WORKFLOW_STATUS.DONE
                        ]
                      }
                    ]
                  }
                }
              },
              else: "$tasks"
            }
          }
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { subscribers: "$subscribers" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$subscribers"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "subscribers"
        }
      },
      ...(await getClientQuery()),
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          status: 1,
          isPrivateList: 1,
          isDisplayInGantt: 1,
          totalTasks: { $size: ["$tasks"] },
          DONE: {
            $filter: {
              input: "$tasks",
              as: "task",
              cond: {
                $in: [
                  "$$task.task_status",
                  doneStatus.map(
                    (done) => new mongoose.Types.ObjectId(done._id)
                  )
                ]
              }
            }
          },
          totalDoneTasks: {
            $cond: {
              // its added for long list data load handle in perticular projects..[DEFAULT_DATA.RESTRICT_PROJECT_ID]
              if: {
                $and: [
                  {
                    $in: [
                      "$project.projectId",
                      DEFAULT_DATA.RESTRICT_PROJECT_ID
                    ]
                  }
                ]
              },
              then: 0,
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$tasks",
                        as: "task",
                        cond: {
                          $in: [
                            "$$task.task_status._id",
                            doneStatus.map(
                              (done) => new mongoose.Types.ObjectId(done._id)
                            )
                          ]
                        }
                      }
                    },
                    as: "doneTask",
                    in: {
                      $cond: {
                        if: { $ne: ["$$doneTask", []] },
                        then: 1,
                        else: 0
                      }
                    }
                  }
                }
              }
            }
          },

          workflows: {
            _id: 1,
            project_workflow: 1
          },
          workFlowStatus: {
            _id: 1,
            title: 1
          },
          project: 1,
          subscribers: {
            $map: {
              input: {
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$subscribers" },
                      { $ne: ["$subscribers", []] }
                    ]
                  },
                  then: "$subscribers",
                  else: []
                }
              },
              as: "subscriberId",
              in: {
                _id: "$$subscriberId._id",
                name: "$$subscriberId.full_name",
                emp_img: "$$subscriberId.emp_img"
              }
            }
          },
          pms_clients: 1,
          ...(await getClientQuery(true)),
          subscriber_stages: 1
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    // const totalCountResult = await ProjectMainTasks.aggregate(countQuery);

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    // let data = await ProjectMainTasks.aggregate([
    //   ...mainQuery,
    //   { $sort: { isPrivateList: -1, ...pagination.sort } },
    // ]);

    const [totalCountResult, data] = await Promise.all([
      ProjectMainTasks.aggregate(countQuery),
      ProjectMainTasks.aggregate([
        ...mainQuery,
        { $sort: { isPrivateList: -1, ...pagination.sort } }
      ])
    ]);

    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    const metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page
    };

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      value._id ? data[0] : data,
      !value._id && metaData
    );
  } catch (error) {
    console.log("🚀 ~ exports.getProjectsMainTask= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Project main task :
exports.updateProjectsMainTask = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      title: Joi.string().required(),
      project_id: Joi.string().required(),
      // workflow_id: Joi.string().required(),
      task_status: Joi.string().optional(),
      subscribers: Joi.array().optional(),
      pms_clients: Joi.array().default([]),
      subscriber_stages: Joi.array().optional().default([]),
      status: Joi.string().optional().default("active"),
      isPrivateList: Joi.boolean().optional().default(false),
      isDisplayInGantt: Joi.boolean().optional().default(false)
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
      await this.projectMainTaskExists(
        value.title,
        value.project_id,
        req.params.id
      )
    ) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      const getData = await ProjectMainTasks.findById(req.params.id).populate(
        "task_status"
      );

      const data = await ProjectMainTasks.findByIdAndUpdate(
        req.params.id,
        {
          title: value.title,
          project_id: value.project_id,
          // workflow_id: value.workflow_id || null,
          task_status: value.task_status || null,
          ...(getData.task_status && !value.task_status
            ? {
                task_status_history: [
                  ...getData.task_status_history,
                  {
                    task_status: null,
                    updatedBy: req.user._id,
                    updatedAt: configs.utcDefault()
                  }
                ]
              }
            : !getData.task_status && value.task_status
            ? {
                task_status_history: [
                  {
                    task_status: value.task_status,
                    updatedBy: req.user._id,
                    updatedAt: configs.utcDefault()
                  }
                ]
              }
            : getData.task_status &&
              value.task_status &&
              getData.task_status.toString() !== value.task_status.toString()
            ? {
                task_status_history: [
                  ...getData.task_status_history,
                  {
                    task_status: value.task_status,
                    updatedBy: req.user._id,
                    updatedAt: configs.utcDefault()
                  }
                ]
              }
            : getData.task_status_history),
          subscribers: value.subscribers || [],
          pms_clients: value.pms_clients || [],
          subscriber_stages: value.subscriber_stages || [],
          status: value.status,
          isPrivateList: value.isPrivateList || false,
          isDisplayInGantt: value.isDisplayInGantt || false,
          updatedBy: req.user._id,
          ...(await getRefModelFromLoginUser(req?.user, true))
        },
        { new: true }
      );

      if (!data) {
        return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
      }

      // For send mail for new added subscribers..
      const subscribersData = getArrayChanges(
        getData.subscribers.map((s) => s.toString()),
        value.subscribers
      );

      // For send mail for new added clients..
      const clientsData = getArrayChanges(
        getData.pms_clients.map((s) => s.toString()),
        value.pms_clients
      );

      if (
        (subscribersData.added && subscribersData.added.length > 0) ||
        (clientsData.added && clientsData.added.length > 0)
      ) {
        await subscribersMail(
          req.params.id,
          subscribersData.added,
          clientsData.added,
          decodedCompanyId
        );
      }

      return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project main task :
exports.deleteProjectsMainTask = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    // Get the main task data before deletion for logging
    const mainTaskData = await ProjectMainTasks.findById(req.params.id).lean();

    const data = await ProjectMainTasks.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, false, true))
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && mainTaskData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "projectMainTask",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: mainTaskData,
        additionalData: {
          recordId: mainTaskData._id.toString(),
          project_id: mainTaskData.project_id?.toString(),
          isSoftDelete: true
        }
      });
    }

    // Mail for manager..
    await deleteMainTaskManagerMail(req.params.id, decodedCompanyId);
    return successResponse(res, statusCode.SUCCESS, messages.DELETED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Project main task details :
exports.projectMainTaskDetailsData = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      main_task_id: Joi.string().required(),
      work_flow_status: Joi.array().default([]),
      task_status: Joi.string().optional().allow("").default(null),
      start_date: Joi.string().optional().allow("").default(null),
      due_date: Joi.string().optional().allow("").default(null),
      task_labels: Joi.array().default([]),
      assignees: Joi.array().default([])
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const [isClient, isAdmin, isManager, isAccManager] =
      await Promise.all([
        checkIsPMSClient(req.user._id),
        checkUserIsAdmin(req.user._id),
        this.checkLoginUserIsProjectManager(
          value.project_id,
          req.user._id
        ),
        this.checkLoginUserIsProjectAccountManager(
          value.project_id,
          req.user._id
        )
      ]);

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value.project_id),
      _id: new mongoose.Types.ObjectId(value.main_task_id),
      ...(value.work_flow_status && value.work_flow_status.length > 0
        ? {
            "workflowStatus._id": {
              $in: value.work_flow_status.map(
                (i) => new mongoose.Types.ObjectId(i)
              )
            }
          }
        : {}),
      // For details
      ...(!isManager && !isAdmin && !isAccManager
        ? {
            $or: [
              { isPrivateList: false },
              {
                $or: [
                  {
                    subscribers: new mongoose.Types.ObjectId(req.user._id)
                  },
                  {
                    pms_clients: new mongoose.Types.ObjectId(req.user._id)
                  },
                  { createdBy: new mongoose.Types.ObjectId(req.user._id) }
                ]
              }
            ]
          }
        : {})
    };

    let taskQuery = [
      { $eq: ["$task_status", "$$statusId"] },
      {
        $eq: ["$project_id", new mongoose.Types.ObjectId(value.project_id)]
      },
      {
        $eq: ["$main_task_id", new mongoose.Types.ObjectId(value.main_task_id)]
      },
      { $eq: ["$isDeleted", false] }
    ];

    if (!isManager && !isClient && !isAdmin && !isAccManager) {
      taskQuery = [
        ...taskQuery,
        {
          $or: [
            {
              $eq: ["$createdBy", new mongoose.Types.ObjectId(req.user._id)]
            },
            {
              $in: [new mongoose.Types.ObjectId(req.user._id), "$assignees"]
            },
            {
              $in: [new mongoose.Types.ObjectId(req.user._id), "$pms_clients"]
            }
          ]
        }
      ];
    }

    // Filters..
    if (value.task_status && value.task_status !== "")
      taskQuery = [...taskQuery, { $eq: ["$status", value.task_status] }];

    if (value.start_date && value.start_date !== "")
      taskQuery = [
        ...taskQuery,
        {
          $gte: [
            "$start_date",
            moment(value.start_date).startOf("day").toDate()
          ]
        }
      ];

    if (value.due_date && value.due_date !== "")
      taskQuery = [
        ...taskQuery,
        {
          $lte: ["$due_date", moment(value.due_date).startOf("day").toDate()]
        }
      ];

    if (value.task_labels && value.task_labels.length > 0) {
      taskQuery = [
        ...taskQuery,
        {
          $gt: [
            {
              $size: {
                $setIntersection: [
                  "$task_labels",
                  value.task_labels.map((l) => new mongoose.Types.ObjectId(l))
                ]
              }
            },
            0
          ]
        }
      ];
    }

    if (value.assignees && value.assignees.length > 0) {
      taskQuery = [
        ...taskQuery,
        {
          $gt: [
            {
              $size: {
                $setIntersection: [
                  "$assignees",
                  value.assignees.map((l) => new mongoose.Types.ObjectId(l))
                ]
              }
            },
            0
          ]
        }
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
          from: "workflowstatuses",
          let: { workflow_id: "$project.workFlow" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$workflow_id", "$$workflow_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "workflowStatus"
        }
      },
      {
        $unwind: {
          path: "$workflowStatus",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: matchQuery
      },
      {
        $lookup: {
          from: "projecttasks",
          let: { statusId: "$workflowStatus._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: taskQuery
                }
              }
            },
            {
              $lookup: {
                from: "employees",
                let: { assigneeIds: "$assignees" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $in: ["$_id", "$$assigneeIds"] },
                          { $eq: ["$isDeleted", false] },
                          { $eq: ["$isSoftDeleted", false] },
                          { $eq: ["$isActivate", true] }
                        ]
                      }
                    }
                  },
                  {
                    $project: {
                      _id: 1,
                      full_name: 1,
                      emp_img: 1
                    }
                  }
                ],
                as: "assignees"
              }
            },
            ...(await getClientQuery()),
            {
              $lookup: {
                from: "tasklabels",
                let: { labelId: "$task_labels" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $in: ["$_id", "$$labelId"] },
                          { $eq: ["$isDeleted", false] }
                        ]
                      }
                    }
                  },
                  {
                    $project: {
                      _id: 1,
                      title: 1,
                      color: 1
                    }
                  }
                ],
                as: "task_labels"
              }
            },
            {
              $lookup: {
                from: "projecttaskhourlogs",
                let: { taskId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$task_id", "$$taskId"] },
                          {
                            $eq: [
                              "$project_id",
                              new mongoose.Types.ObjectId(value.project_id)
                            ]
                          },
                          { $eq: ["$isDeleted", false] }
                        ]
                      }
                    }
                  }
                ],
                as: "task_hours"
              }
            },
            {
              $addFields: {
                totalLoggedTime: {
                  $reduce: {
                    input: "$task_hours",
                    initialValue: 0,
                    in: {
                      $add: [
                        "$$value",
                        {
                          $add: [
                            {
                              $multiply: [
                                {
                                  $toDouble: "$$this.logged_hours" // Convert string to double
                                },
                                3600 // Convert hours to seconds (60 * 60)
                              ]
                            },
                            {
                              $multiply: [
                                {
                                  $toDouble: "$$this.logged_minutes" // Convert string to double
                                },
                                60 // Convert minutes to seconds
                              ]
                            },
                            {
                              $ifNull: [
                                { $toDouble: "$$this.logged_seconds" },
                                0 // Default to 0 if logged_seconds is null/undefined
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  }
                },
                ...(await getClientQuery(true))
              }
            },
            {
              $lookup: {
                from: "comments",
                let: { taskId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$task_id", "$$taskId"] },
                          { $eq: ["$isDeleted", false] }
                        ]
                      }
                    }
                  }
                ],
                as: "comments"
              }
            },

            {
              $project: {
                _id: 1,
                title: 1,
                status: 1,
                createdBy: 1,
                // assignees: 1,
                // ...(await getClientQuery(true)),
                assignees: {
                  $concatArrays: ["$assignees", "$pms_clients"]
                },
                estimated_hours: 1,
                estimated_minutes: 1,
                start_date: 1,
                due_date: 1,
                estimated_hours: 1,
                estimated_minutes: 1,
                descriptions: 1,
                task_labels: 1,
                createdAt: 1,
                comments: { $size: "$comments" },
                total_logged_hours: {
                  // only hours
                  $floor: {
                    $divide: ["$totalLoggedTime", 3600]
                  }
                },
                total_logged_minutes: {
                  $floor: {
                    $divide: [{ $mod: ["$totalLoggedTime", 3600] }, 60]
                  }
                },
                total_logged_seconds: {
                  $mod: ["$totalLoggedTime", 60]
                }
                // totalLoggedTime: {
                //   $concat: [
                //     {
                //       $toString: {
                //         $divide: ["$totalLoggedTime", 60],
                //       },
                //     },
                //     "hr",
                //     ":",
                //     {
                //       $toString: {
                //         $mod: ["$totalLoggedTime", 60],
                //       },
                //     },
                //     "mins",
                //   ],
                // },
              }
            }
          ],
          as: "tasks"
        }
      },
      // its added for long list data load handle in perticular projects..[DEFAULT_DATA.RESTRICT_PROJECT_ID]
      {
        $addFields: {
          tasks: {
            $cond: {
              if: {
                $and: [
                  {
                    $eq: [
                      "$workflowStatus.title",
                      DEFAULT_DATA.WORKFLOW_STATUS.DONE
                    ]
                  },
                  {
                    $in: [
                      "$project.projectId",
                      DEFAULT_DATA.RESTRICT_PROJECT_ID
                    ]
                  }
                ]
              },
              then: [],
              else: "$tasks"
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          project_id: 1,
          status: 1,
          isPrivateList: 1,
          workflowStatus: {
            _id: 1,
            title: 1,
            color: 1,
            sequence: 1
          },
          tasks: 1,
          total_task: {
            $size: "$tasks"
          }
        }
      },
      {
        $sort: {
          "workflowStatus.sequence": 1
        }
      }
    ];
    const data = await ProjectMainTasks.aggregate(mainQuery);
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// update status...
exports.updateProjectsMainTaskStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      status: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const data = await ProjectMainTasks.findByIdAndUpdate(
      req.params.id,
      {
        status: value.status,
        updatedBy: req.user._id,
        updatedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, true))
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(res, statusCode.SUCCESS, messages.UPDATED, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// update min task as bookmark...
exports.updateProjectsMainTaskBookmark = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      isBookmark: Joi.boolean().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const data = await ProjectMainTasks.findByIdAndUpdate(
      req.params.id,
      {
        isBookmark: value.isBookmark,
        updatedBy: req.user._id,
        updatedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, true))
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// check login user is project manager OR project Creater...
exports.checkLoginUserIsProjectManager = async (project_id, loginUserId) => {
  try {
    let isManager = false;

    const getProject = await Project.findOne({
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(project_id),
      // manager: new mongoose.Types.ObjectId(loginUserId),
      $or: [
        { manager: new mongoose.Types.ObjectId(loginUserId) },
        { createdBy: new mongoose.Types.ObjectId(loginUserId) }
      ]
    });

    if (getProject) isManager = true;
    return isManager;
  } catch (error) {
    console.log("🚀 ~ exports.checkLoginUserIsProjectManager= ~ error:", error);
  }
};

// check login user is account manager ...
exports.checkLoginUserIsProjectAccountManager = async (
  project_id,
  loginUserId
) => {
  try {
    let isAccManager = false;

    const getProject = await Project.findOne({
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(project_id),
      acc_manager: new mongoose.Types.ObjectId(loginUserId)
    });

    if (getProject) isAccManager = true;
    return isAccManager;
  } catch (error) {
    console.log("🚀 ~ exports.checkLoginUserIsProjectManager= ~ error:", error);
  }
};

exports.csvDataexport = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      csvData: Joi.array().default([])
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const data = await this.tasksByWorkflowStatus(value.csvData);
    const html = sheet(data);
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.HTML_GENERATED,
      html
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.tasksByWorkflowStatus = async (data) => {
  try {
    const allTasks = [];

    data.forEach((item) => {
      const workflowTitle = item.workflowStatus.title;
      const tasks = item.tasks.map((task) => ({
        taskTitle: task.title,
        descriptions: task.descriptions,
        hours: task.estimated_hours,
        minutes: task.estimated_minutes,
        assignees: task.assignees,
        clients: task.clients,
        labels: task.task_labels,
        startDate: task.start_date,
        dueDate: moment(task.due_date).format("YYYY-MM-DD")
      }));

      allTasks.push([{ title: workflowTitle, tasks }]);
    });

    return allTasks;
  } catch (error) {
    console.log(
      "🚀 ~ exports.extractTasksByWorkflowStatus projectMainTask.js ~ error:",
      error
    );
  }
};

exports.createACopyOfMainTask = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      title: Joi.string().required(),
      main_task_id: Joi.string().required(),
      project_id: Joi.string().required(),
      is_assignees_copy: Joi.boolean().required(),
      is_clients_copy: Joi.boolean().required(),
      is_dates_copy: Joi.boolean().required(),
      is_task_stages_copy: Joi.boolean().required(),
      is_comments_copy: Joi.boolean().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const mainTaskData = await this.getDataForCopyMainTask(value);
    if (mainTaskData && mainTaskData.length > 0) {
      if (await this.projectMainTaskExists(value.title, value.project_id)) {
        return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
      } else {
        const commonObj = {
          project_id: new mongoose.Types.ObjectId(value.project_id),
          isDeleted: false,
          createdBy: req.user._id,
          updatedBy: req.user._id,
          ...(await getRefModelFromLoginUser(req?.user))
        };

        const mainTask = mainTaskData[0];

        // Copy main Task..
        let mainTaskObj = new ProjectMainTasks({
          title: value.title,
          ...(value.is_assignees_copy == true
            ? {
                subscribers: mainTask.subscribers || [],
                subscriber_stages: mainTask.subscriber_stages || []
              }
            : {}),
          ...(value.is_clients_copy == true
            ? {
                pms_clients: mainTask.pms_clients || []
              }
            : {}),
          ...commonObj
        });
        const copyList = await mainTaskObj.save();

        if (
          (copyList?.subscribers && copyList?.subscribers.length > 0) ||
          (copyList?.pms_clients && copyList?.pms_clients.length > 0)
        ) {
          await subscribersMail(copyList._id, [], [], decodedCompanyId);
        }

        if (copyList && mainTask.tasks && mainTask.tasks.length > 0) {
          // Get Todo workflow for task ..
          const workFlowStatus = await WorkflowStatusModel.findOne({
            isDeleted: false,
            workflow_id: new mongoose.Types.ObjectId(mainTask.project.workFlow),
            title: DEFAULT_DATA.WORKFLOW_STATUS.TODO
          });

          for (let i = 0; i < mainTask.tasks.length; i++) {
            let task = mainTask.tasks[i];
            // Copy task..
            let taskObj = new ProjectTasks({
              title: task.title,
              taskId: generateRandomId(),
              main_task_id: new mongoose.Types.ObjectId(copyList._id),
              ...(value.is_assignees_copy == true
                ? {
                    assignees: task.assignees || []
                  }
                : {}),
              ...(value.is_clients_copy == true
                ? {
                    pms_clients: task.pms_clients || []
                  }
                : {}),
              ...(value.is_dates_copy == true
                ? {
                    start_date: task.start_date || null,
                    due_date: task.due_date || null
                  }
                : {}),

              ...(value.is_task_stages_copy == true
                ? {
                    task_status: task.task_status || null,
                    ...(task?.task_status && {
                      task_status_history: [
                        {
                          task_status: task?.task_status,
                          updatedBy: req.user._id,
                          updatedAt: configs.utcDefault()
                        }
                      ]
                    })
                  }
                : {
                    task_status:
                      new mongoose.Types.ObjectId(workFlowStatus)?._id || null,
                    ...(workFlowStatus?._id && {
                      task_status_history: [
                        {
                          task_status: workFlowStatus?._id,
                          updatedBy: req.user._id,
                          updatedAt: configs.utcDefault()
                        }
                      ]
                    })
                  }),
              ...commonObj
            });
            const copyTask = await taskObj.save();

            // send mail to assignee..
            if (
              (copyTask?.assignees && copyTask?.assignees.length > 0) ||
              (copyTask?.pms_clients && copyTask?.pms_clients.length > 0)
            ) {
              await sendmailToAssignees(copyTask._id, [], decodedCompanyId);
            }

            // Copy task comments
            if (value.is_comments_copy && task.comments.length > 0) {
              for (let j = 0; j < task.comments.length; j++) {
                let comment = task.comments[j];
                delete comment._id;
                let commentObj = new ProjectTaskComments({
                  ...comment,
                  task_id: new mongoose.Types.ObjectId(copyTask._id)
                });
                await commentObj.save();
              }
            }
          }
        }
        return successResponse(res, statusCode.CREATED, messages.COPIED, []);
      }
    } else {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getDataForCopyMainTask = async (data) => {
  try {
    const query = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(data.main_task_id),
          project_id: new mongoose.Types.ObjectId(data.project_id),
          isDeleted: false
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
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $lookup: {
          from: "projecttasks",
          let: { mainTaskId: "$_id", projectId: "$project_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$project_id", "$$projectId"]
                    },
                    {
                      $eq: ["$main_task_id", "$$mainTaskId"]
                    },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "comments",
                let: { taskId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$task_id", "$$taskId"] },
                          { $eq: ["$isDeleted", false] }
                        ]
                      }
                    }
                  }
                ],
                as: "comments"
              }
            }
          ],
          as: "tasks"
        }
      }
    ];
    const mainTask = await ProjectMainTasks.aggregate(query);

    return mainTask;
  } catch (error) {
    console.log("🚀 ~ exports.getDataForCopyMainTask= ~ error:", error);
  }
};

exports.moveTasksInOtherList = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      new_main_task_id: Joi.string().required(),
      task_ids: Joi.array().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const isExits = await ProjectMainTasks.findOne({
      _id: new mongoose.Types.ObjectId(value.new_main_task_id),
      project_id: new mongoose.Types.ObjectId(value.project_id),
      isDeleted: false
    });

    if (!isExits) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    const data = await ProjectTasks.updateMany(
      {
        _id: {
          $in: value.task_ids.map((t) => new mongoose.Types.ObjectId(t))
        }
      },
      {
        main_task_id: new mongoose.Types.ObjectId(value.new_main_task_id),
        updatedBy: req.user._id,
        updatedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, true))
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(res, statusCode.SUCCESS, messages.UPDATED, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
