const Joi = require("joi");
const XLSX = require("xlsx");
const path = require("path");
const moment = require("moment");
const { removeCache } = require("../middleware/cacheStore");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const ProjectTasks = mongoose.model("projecttasks");
const projectBugs = mongoose.model("projecttaskbugs");
const ProjectLabels = mongoose.model("tasklabels");
const Employees = mongoose.model("employees");
const Projects = mongoose.model("projects");
const ProjectFileUploads = mongoose.model("fileuploads");
const ProjectTaskUpdateHistory = mongoose.model("taskupdatehistory");
const ProjectWorkFlowStatus = mongoose.model("workflowstatus");
const CommentsModel = mongoose.model("Comments");
const PMSClients = mongoose.model("pmsclients");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr,
  getAggregationPagination
} = require("../helpers/queryHelper");
const { statusCode, DEFAULT_DATA } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const {
  generateRandomId,
  arraysAreEqual,
  getArrayChanges,
  getCreatedUpdatedDeletedByQuery,
  getRefModelFromLoginUser,
  getClientQuery
} = require("../helpers/common");
const { filesManageInDB } = require("./fileUploads");
const { sendmailToAssignees, taskData } = require("./sendEmail");
const { taskStatusUpdateMail } = require("../template/tasks");
const {
  checkLoginUserIsProjectManager,
  checkLoginUserIsProjectAccountManager
} = require("./projectMainTask");
const { checkUserIsAdmin } = require("./authentication");
const jsonDataFromFile = (fileObj) => {
  // read file from buffer
  const wb = XLSX.read(fileObj.buffer, {
    type: "buffer",
    cellDates: true // otherwise for csv 2021-04-12T12:00:00Z is converted to 44298.22928240741
  });

  const sheetNameList = wb.SheetNames;
  const sheet = wb.Sheets[sheetNameList[0]];

  const parsedJsonData = XLSX.utils.sheet_to_json(wb.Sheets[sheetNameList[0]]);

  const columnNames = [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell_address = { c: C, r: range.s.r }; // A1, B1, etc.
    const cell_ref = XLSX.utils.encode_cell(cell_address);
    const cell = sheet[cell_ref];
    if (cell && cell.t === "s") {
      columnNames.push(XLSX.utils.format_cell(cell));
    }
  }

  return { parse: parsedJsonData, cols: columnNames };
};

// Check is exists..
exports.projectTaskExists = async (reqData, id = null) => {
  try {
    let isExist = false;
    const data = await ProjectTasks.findOne({
      isDeleted: false,
      // title: reqData?.title?.trim()?.toLowerCase(),
      title: { $regex: new RegExp(`^${reqData?.title}$`, "i") },
      project_id: new mongoose.Types.ObjectId(reqData.project_id),
      main_task_id: new mongoose.Types.ObjectId(reqData.main_task_id),
      ...(id
        ? {
          _id: { $ne: id }
        }
        : {})
    });
    if (data) isExist = true;
    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectTaskExists= ~ error:", error);
  }
};

const normalizeWorkflowStageKey = (value) => {
  const raw = String(value || "").toLowerCase().trim();
  const compact = raw.replace(/[\s_-]+/g, "");

  if (compact.includes("todo")) return "todo";
  if (compact.includes("inprogress") || raw.includes("progress")) return "inprogress";
  if (compact.includes("onhold") || raw.includes("hold") || raw.includes("review")) return "onhold";
  if (raw.includes("done") || raw.includes("complete") || raw.includes("closed")) return "done";

  return compact;
};

const resolveWorkflowStageIdForTask = async ({
  statusValue,
  workflowId,
}) => {
  if (!statusValue) return "";

  const rawValue = String(statusValue).trim();
  if (!workflowId || !mongoose.Types.ObjectId.isValid(String(workflowId))) return "";

  const existingStages = await ProjectWorkFlowStatus.find({
    workflow_id: new mongoose.Types.ObjectId(workflowId),
    isDeleted: false,
  })
    .sort({ sequence: 1 })
    .lean();

  if (!existingStages.length) return "";

  if (mongoose.Types.ObjectId.isValid(rawValue)) {
    const matchedById = existingStages.find(
      (stage) => String(stage?._id || "") === rawValue
    );
    return matchedById?._id?.toString() || "";
  }

  const targetKey = normalizeWorkflowStageKey(rawValue);
  if (!targetKey) return "";

  const matchedStage = existingStages.find((stage) => {
    const stageKey = normalizeWorkflowStageKey(stage?.title || stage?.name || "");
    return stageKey === targetKey;
  });

  if (matchedStage?._id) return matchedStage._id.toString();
  return "";
};

const invalidateTaskBoardCaches = (projectId) => {
  removeCache("boardtasks:get:", true);
  if (projectId) {
    removeCache("maintasks:get:", true);
  }
};

//Add Project task :
exports.addProjectsTask = async (req, res) => {
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
      main_task_id: Joi.string().required(),
      status: Joi.string().optional().default("active"),
      descriptions: Joi.string().optional().allow("").default(""),
      priority: Joi.string().valid("Low", "Medium", "High").optional().default("Low"),
      task_labels: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional().allow(""),
      start_date: Joi.date().optional(),
      due_date: Joi.date().optional(),
      end_date: Joi.date().optional().allow(null),
      assignees: Joi.array().optional(),
      pms_clients: Joi.array().optional().default([]),
      estimated_hours: Joi.string().optional().default("00"),
      estimated_minutes: Joi.string().optional().default("00"),
      attachments: Joi.any().optional(),
      folder_id: Joi.any().optional(),
      task_progress: Joi.string().optional().default("0"),
      task_status: Joi.string().optional(),
      recurringType: Joi.string().valid("", "monthly", "yearly").optional().default(""),
      custom_fields: Joi.object().optional().default({})
    }).unknown(true);
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (
      value?.attachments &&
      value.attachments.length > 0 &&
      !value.folder_id
    ) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        messages.FOLDER_REQUIRED
      );
    }
    // if (await this.projectTaskExists(value)) {
    //   return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    // } else {
    // data type of task_labels changed array to string .. need to manage here cause of this use in other module
    let task_labels = [];
    if (value?.task_labels && value?.task_labels != "") {
      const labels = Array.isArray(value.task_labels)
        ? value.task_labels
        : [value.task_labels];

      task_labels = labels
        .filter(Boolean)
        .map((labelId) => new mongoose.Types.ObjectId(labelId));
    }

    value.task_labels = task_labels;

    const projectData = value?.project_id
      ? await Projects.findById(value.project_id, {
          workFlow: 1,
          workflow: 1,
          work_flow: 1,
          workflow_id: 1,
          work_flow_id: 1,
        }).lean()
      : null;

    const workflowId =
      projectData?.workFlow ||
      projectData?.workflow ||
      projectData?.work_flow ||
      projectData?.workflow_id ||
      projectData?.work_flow_id;

    const resolvedTaskStatus =
      (await resolveWorkflowStageIdForTask({
        statusValue: value.task_status,
        workflowId,
      })) || value.task_status;

    if (
      value?.task_status &&
      !mongoose.Types.ObjectId.isValid(String(resolvedTaskStatus))
    ) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        "Invalid task stage"
      );
    }

    let data = new ProjectTasks({
      title: value.title,
      taskId: generateRandomId(),
      project_id: value.project_id,
      main_task_id: value.main_task_id || null,
      task_status: resolvedTaskStatus || null,
      assignees: value.assignees || [],
      pms_clients: value.pms_clients || [],
      status: value.status,
      descriptions: value.descriptions || "",
      task_labels: value.task_labels || [],
      start_date: value.start_date || null,
      end_date: value.end_date || null,
      due_date: value.due_date || null,
      estimated_hours: value.estimated_hours,
      estimated_minutes: value.estimated_minutes,
      // attachments: value.attachments || [],
      task_progress: value.task_progress,
      recurringType: value.recurringType || "",
      custom_fields: value.custom_fields || {},
      ...(resolvedTaskStatus && {
        task_status_history: [
          {
            task_status: resolvedTaskStatus,
            updatedBy: req.user._id,
            updatedAt: configs.utcDefault()
          }
        ]
      }),

      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user))
    });
    const newData = await data.save();

    // save  files,..
    if (value?.attachments && value.attachments.length > 0) {
      await filesManageInDB(
        value.attachments,
        req.user,
        value.project_id,
        value.folder_id,
        newData._id
      );
    }

    // Add a data in history..
    let newHistory = new ProjectTaskUpdateHistory({
      project_id: value.project_id,
      main_task_id: value.main_task_id || null,
      task_id: newData._id,
      updated_key: "createdAt",
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user))
    });
    await newHistory.save();

    // send mail to assignee..
    // if (value.assignees && value.assignees.length > 0) {
    try {
      await sendmailToAssignees(newData._id, [], decodedCompanyId);
    } catch (mailErr) {
      console.error("Failed to send assignee mail:", mailErr);
    }
    // }
    // console.log("🚀 ~ exports.addProjectsTask= ~ newData:", newData)
    return successResponse(
      res,
      statusCode.CREATED,
      messages.TASK_CREATED,
      data
    );
    // }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project task :
exports.getProjectsTask = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
      project_id: Joi.string().required(),
      main_task_id: Joi.string().required(),
      // Filters..
      status: Joi.string().optional().default("active"), // active/archive
      workFlowStatus: Joi.array().optional().default(["all"]), // [all | _id]
      assignees: Joi.string().optional().default("all"), // all | un_assigned | _id
      labels: Joi.array().optional().default("all"), // [ all | un_assigned | _id]
      start_date: Joi.string().optional(),
      due_date: Joi.string().optional(),
      isDropdown: Joi.boolean().optional().default(false)
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

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value.project_id),
      main_task_id: new mongoose.Types.ObjectId(value.main_task_id),
      // For details
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {}),

      // filters...
      ...(value.status ? { status: value.status } : {}),
      ...(value?.workFlowStatus && !value?.workFlowStatus.includes("all")
        ? {
          task_status: {
            $in: value.workFlowStatus.map(
              (v) => new mongoose.Types.ObjectId(v)
            )
          }
        }
        : {}),
      ...(value?.assignees && !value.assignees.includes("all")
        ? value.assignees.includes("un_assigned")
          ? { assignees: { $eq: [] } }
          : {
            assignees: value?.assignees
          }
        : {}),

      ...(value?.labels && !value.labels.includes("all")
        ? value.labels.includes("un_assigned")
          ? { task_labels: { $size: 0 } }
          : {
            task_labels: {
              $in: value?.labels.map((v) => new mongoose.Types.ObjectId(v))
            }
          }
        : {}),

      ...(value?.start_date || value?.due_date
        ? value?.start_date && !value?.due_date
          ? {
            start_date: {
              $gte: moment(value?.start_date).startOf("day").toDate()
            }
          }
          : !value?.start_date && value?.due_date
            ? {
              due_date: {
                $lte: moment(value?.due_date).startOf("day").toDate()
              }
            }
            : {
              start_date: {
                $gte: moment(value?.start_date).startOf("day").toDate()
              },
              due_date: {
                $lte: moment(value?.due_date).startOf("day").toDate()
              }
            }
        : {})
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["title"], value.search)
      };
    }

    const mainQuery = [
      {
        $lookup: {
          from: "projectmaintasks",
          let: { mainTaskId: "$main_task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$mainTaskId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "mainTask"
        }
      },
      {
        $unwind: {
          path: "$mainTask",
          preserveNullAndEmptyArrays: true
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
                    // {
                    //   $eq: [
                    //     "$main_task_id",
                    //     new mongoose.Types.ObjectId(value.main_task_id),
                    //   ],
                    // },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            },

            {
              $lookup: {
                from: "projecttimesheets",
                let: { timesheet_id: "$timesheet_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$timesheet_id"] },
                          { $eq: ["$isDeleted", false] }
                        ]
                      }
                    }
                  }
                ],
                as: "timesheet"
              }
            },
            {
              $unwind: {
                path: "$timesheet",
                preserveNullAndEmptyArrays: true
              }
            },
            ...(await getCreatedUpdatedDeletedByQuery()),
            {
              $project: {
                _id: 1,
                project_id: 1,
                task_id: 1,
                subtask_id: 1,
                descriptions: 1,
                logged_hours: 1,
                logged_minutes: 1,
                logged_seconds: 1,
                logged_status: 1,
                createdBy: {
                  _id: 1,
                  full_name: 1,
                  emp_img: 1,
                  client_img: 1
                },
                createdAt: 1,
                timesheet: {
                  _id: 1,
                  title: 1
                }
              }
            }
          ],
          as: "task_hours"
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
          as: "task_status"
        }
      },
      {
        $unwind: {
          path: "$task_status",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "workflowstatuses",
          let: { task_status_history: "$task_status_history" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$task_status_history"] },
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
        $lookup: {
          from: "fileuploads",
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
          as: "attachments"
        }
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
                    { $in: ["$_id", "$$task_labels"] },
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
          let: { assigneesIds: "$assignees" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$assigneesIds"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "assignees"
        }
      },

      ...(await getClientQuery()),
      {
        $lookup: {
          from: "taskupdatehistory",
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
                    {
                      $eq: [
                        "$main_task_id",
                        new mongoose.Types.ObjectId(value.main_task_id)
                      ]
                    },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            },
            ...(await getCreatedUpdatedDeletedByQuery()),
            {
              $project: {
                _id: 1,
                project_id: 1,
                main_task_id: 1,
                task_id: 1,
                subtask_id: 1,
                updated_key: 1,
                pervious_value: 1,
                new_value: 1,
                createdBy: {
                  _id: 1,
                  full_name: 1,
                  emp_img: 1,
                  client_img: 1
                },
                createdAt: 1
              }
            }
          ],
          as: "task_update_history"
        }
      },
      { $match: matchQuery },
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
          }
        }
      },
      {
        $project: {
          _id: 1,
          task_hours: 1,
          // totalLoggedTime: 1,
          // totalLoggedHours: {
          //   $floor: {
          //     $divide: ["$totalLoggedTime", 60],
          //   },
          // },
          // totalLoggedMinutes: {
          //   $mod: ["$totalLoggedTime", 60],
          // },
          taskId: 1,
          time: {
            $concat: [
              {
                $toString: {
                  $floor: {
                    $divide: ["$totalLoggedTime", 3600]
                  }
                }
              },
              ":",
              {
                $toString: {
                  $concat: [
                    {
                      $toString: {
                        $cond: [
                          { $lt: [{ $mod: [{ $divide: ["$totalLoggedTime", 60] }, 60] }, 10] },
                          "0",
                          ""
                        ]
                      }
                    },
                    {
                      $toString: {
                        $mod: [{ $divide: ["$totalLoggedTime", 60] }, 60]
                      }
                    }
                  ]
                }
              }
            ]
          },
          title: 1,
          project: 1,
          status: 1,
          descriptions: 1,
          description: "$descriptions",
          start_date: 1,
          due_date: 1,
          end_date: 1,
          priority: 1,
          custom_fields: 1,
          estimated_hours: 1,
          estimated_minutes: 1,

          attachments: {
            $map: {
              input: "$attachments",
              as: "attachment",
              in: {
                _id: "$$attachment._id",
                name: "$$attachment.name",
                file_type: "$$attachment.file_type",
                path: "$$attachment.path"
              }
            }
          },
          task_progress: 1,
          // task_status_history: {
          //   $map: {
          //     input: "$task_status_history",
          //     as: "statusHistory",
          //     in: {
          //       $mergeObjects: [
          //         "$$statusHistory",
          //         {
          //           task_status: {
          //             _id: "$$statusHistory.task_status",
          //             title: {
          //               $cond: [
          //                 { $isArray: "$workFlowStatus" },
          //                 {
          //                   $arrayElemAt: [
          //                     "$$statusHistory.task_status.workFlowStatus.title",
          //                     0,
          //                   ],
          //                 },
          //                 "Unknown",
          //               ],
          //             },
          //           },
          //           updatedBy: {
          //             _id: "$$statusHistory.updatedBy",
          //             full_name: {
          //               $cond: [
          //                 { $isArray: "$assignees" },
          //                 { $arrayElemAt: ["$assignees.full_name", 0] },
          //                 "Unknown",
          //               ],
          //             },
          //           },
          //         },
          //       ],
          //     },
          //   },
          // },

          mainTask: 1,
          task_status: {
            _id: 1,
            title: 1,
            color: 1,
            isDefault: 1
          },
          taskLabels: 1,
          assignees: {
            $map: {
              input: {
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$assignees" },
                      { $ne: ["$assignees", []] }
                    ]
                  },
                  then: "$assignees",
                  else: []
                }
              },
              as: "assigneeId",
              in: {
                _id: "$$assigneeId._id",
                emp_img: "$$assigneeId.emp_img",
                name: "$$assigneeId.full_name",
                first_name: "$$assigneeId.first_name",
                last_name: "$$assigneeId.last_name",
                for_tag_user: {
                  $concat: [
                    "$$assigneeId.first_name",
                    "_",
                    "$$assigneeId.last_name"
                  ]
                }
              }
            }
          },
          ...(await getClientQuery(true)),
          task_update_history: 1,
          recurringType: 1
        }
      }
    ];

    if (value?.isDropdown) {
      const mainQuery = [
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
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "assignees"
          }
        },
        ...(await getClientQuery()),
        { $match: matchQuery },
        {
          $project: {
            _id: 1,
            title: 1,
            project: 1,
            recurringType: 1,
            assignees: {
              $map: {
                input: {
                  $cond: {
                    if: {
                      $and: [
                        { $isArray: "$assignees" },
                        { $ne: ["$assignees", []] }
                      ]
                    },
                    then: "$assignees",
                    else: []
                  }
                },
                as: "assigneeId",
                in: {
                  _id: "$$assigneeId._id",
                  emp_img: "$$assigneeId.emp_img",
                  name: "$$assigneeId.full_name",
                  first_name: "$$assigneeId.first_name",
                  last_name: "$$assigneeId.last_name",
                  for_tag_user: {
                    $concat: [
                      "$$assigneeId.first_name",
                      "_",
                      "$$assigneeId.last_name"
                    ]
                  }
                }
              }
            },
            ...(await getClientQuery(true))
          }
        }
      ];
      let data = await ProjectTasks.aggregate(mainQuery);
      return successResponse(
        res,
        statusCode.SUCCESS,
        messages.LISTING,
        value._id ? data[0] : data
      );
    }
    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await ProjectTasks.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await ProjectTasks.aggregate([
      ...mainQuery,
      { $sort: pagination.sort }
    ]);

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
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Project task :  .. not in use
exports.updateProjectsTask = async (req, res) => {
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
      main_task_id: Joi.string().required(),
      status: Joi.string().optional().default("active"),
      descriptions: Joi.string().optional().allow("").default(""),
      task_labels: Joi.string().optional().allow(""),
      start_date: Joi.date().optional(),
      due_date: Joi.date().optional(),
      assignees: Joi.array().optional().default([]),
      estimated_hours: Joi.string().optional().default("00"),
      estimated_minutes: Joi.string().optional().default("00"),
      attachments: Joi.array().optional(),
      task_progress: Joi.string().optional().default("0"),
      task_status: Joi.string().optional(),
      folder_id: Joi.any().optional()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    // if (await this.projectTaskExists(value, req.params.id)) {
    //   return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    // } else {
    // data type of task_labels changed array to string .. need to manage here cause of this use in other module
    let task_labels = [];
    if (value?.task_labels && value?.task_labels == "")
      task_labels = [new mongoose.Types.ObjectId(value.task_labels)];

    value.task_labels = task_labels;
    const getData = await ProjectTasks.findById(req.params.id);

    // Get old data before update for logging
    const oldTaskData = getData.toObject ? getData.toObject() : getData;

    const data = await ProjectTasks.findByIdAndUpdate(
      req.params.id,
      {
        title: value.title,
        project_id: value.project_id,
        main_task_id: value.main_task_id || null,
        task_status: value.task_status || null,
        assignees: value.assignees || [],
        status: value.status,
        descriptions: value.descriptions || "",
      priority: value.priority || "Low",
        task_labels: value.task_labels || [],
        start_date: value.start_date || null,
      end_date: value.end_date || null,
        due_date: value.due_date || null,
        start_date: value.start_date || null,
        estimated_hours: value.estimated_hours,
        estimated_minutes: value.estimated_minutes,
        attachments: value.attachments || [],
        task_progress: value.task_progress,
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
        updatedBy: req.user._id
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }
    // save  files,..
    if (value?.attachments) {
      await filesManageInDB(
        value.attachments,
        req.user,
        value.project_id,
        value.folder_id,
        req.params.id
      );
    }

    // For send mail for new added subscribers..
    const assigneesData = getArrayChanges(
      getData.assignees.map((a) => a.toString()),
      value.assignees
    );

    if (assigneesData.added && assigneesData.added.length > 0) {
      await sendmailToAssignees(
        req.params.id,
        assigneesData.added,
        decodedCompanyId
      );
    }
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.TASK_UPDATED,
      data
    );
    // }
  } catch (error) {
    console.log("🚀 ~ exports.updateProjectsTask= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// update status...
exports.updateProjectsTaskStatus = async (req, res) => {
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

    const data = await ProjectTasks.findByIdAndUpdate(
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

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.TASK_STATUS_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.updateMultipleTaskStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      task_status: Joi.string().required(),
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

    const firstTask = await ProjectTasks.findOne(
      {
        project_id: new mongoose.Types.ObjectId(value.project_id),
        _id: {
          $in: value.task_ids.map((i) => new mongoose.Types.ObjectId(i))
        }
      },
      {
        project_id: 1,
      }
    ).lean();

    const projectData = firstTask?.project_id
      ? await Projects.findById(firstTask.project_id, {
          workFlow: 1,
          workflow: 1,
          work_flow: 1,
          workflow_id: 1,
          work_flow_id: 1,
        }).lean()
      : null;

    const workflowId =
      projectData?.workFlow ||
      projectData?.workflow ||
      projectData?.work_flow ||
      projectData?.workflow_id ||
      projectData?.work_flow_id;

    const resolvedTaskStatus =
      (await resolveWorkflowStageIdForTask({
        statusValue: value.task_status,
        workflowId,
      })) || value.task_status;

    if (!mongoose.Types.ObjectId.isValid(String(resolvedTaskStatus))) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        "Invalid task stage"
      );
    }

    const data = await ProjectTasks.updateMany(
      {
        project_id: new mongoose.Types.ObjectId(value.project_id),
        _id: {
          $in: value.task_ids.map((i) => new mongoose.Types.ObjectId(i))
        }
      },
      {
        task_status: new mongoose.Types.ObjectId(resolvedTaskStatus),
        updatedBy: req.user._id,
        updatedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, true))
      },
      { new: true }
    );

    invalidateTaskBoardCaches(value.project_id);

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.TASK_STATUS_UPDATED,
      {}
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project task :
exports.deleteProjectsTask = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");

    // Get the task data before deletion for logging
    const taskData = await ProjectTasks.findById(req.params.id).lean();

    const data = await ProjectTasks.findByIdAndUpdate(
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
    if (userInfo && taskData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "tasks",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: taskData,
        additionalData: {
          recordId: taskData._id.toString(),
          isSoftDelete: true
        }
      });
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.TASK_DELETED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.deleteMultipleTask = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string.required(),
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

    const data = await ProjectTasks.updateMany(
      {
        project_id: new mongoose.Types.ObjectId(value.project_id),
        _id: {
          $in: value.task_ids.map((t) => new mongoose.Types.ObjectId(t))
        }
      },
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

    return successResponse(res, statusCode.SUCCESS, messages.DELETED, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// update workflow...
exports.updateProjectsTaskWorkflow = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      task_status: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    // Before update ...
    const getData = await taskData(req.params.id);

    // Get old data before update for logging
    const oldTaskDataRaw = await ProjectTasks.findById(req.params.id)
      .populate("assignees")
      .populate("task_status")
      .populate("task_labels")
      .populate("task_status_history.task_status", "title")
      .populate("task_status_history.updatedBy", "full_name first_name last_name")
      .lean();
    const oldTaskDataForLogging = oldTaskDataRaw || (getData.task ? (getData.task.toObject ? getData.task.toObject({ flattenMaps: false }) : getData.task) : null);

    const loginUserId = req.user._id;
    let common = {
      updatedBy: loginUserId,
      updatedAt: configs.utcDefault(),
      ...(await getRefModelFromLoginUser(req?.user, true))
    };
    let updateObj = {}; // For task prop
    let historyUpdateObj = {}; // For history

    updateObj = { ...common };
    historyUpdateObj = {
      project_id: new mongoose.Types.ObjectId(getData?.project._id),
      main_task_id: new mongoose.Types.ObjectId(getData.mainTask._id),
      task_id: new mongoose.Types.ObjectId(req.params.id),
      createdBy: loginUserId,
      createdAt: configs.utcDefault(),
      ...(await getRefModelFromLoginUser(req?.user)),
      ...common
    };

    // manage update history..
    const workflowId =
      getData?.project?.workFlow?._id ||
      getData?.project?.workflow?._id ||
      getData?.project?.work_flow?._id ||
      getData?.project?.workFlow ||
      getData?.project?.workflow ||
      getData?.project?.work_flow ||
      getData?.project?.workflow_id ||
      getData?.project?.work_flow_id;

    const resolvedTaskStatus =
      (await resolveWorkflowStageIdForTask({
        statusValue: value?.task_status,
        workflowId,
      })) || value?.task_status;

    if (!mongoose.Types.ObjectId.isValid(String(resolvedTaskStatus))) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        "Invalid task stage"
      );
    }

    if (value?.task_status) {
      updateObj.task_status = resolvedTaskStatus;

      // if previous and new both value same no need to update..
      if (getData?.task_status?._id.toString() !== resolvedTaskStatus) {
        let previousTaskStatusTitle = "";
        let newTaskStatusTitle = "";

        if (getData?.task_status?._id) {
          const previousTaskStatus = await ProjectWorkFlowStatus.findById(
            getData?.task_status._id
          );
          previousTaskStatusTitle = previousTaskStatus
            ? previousTaskStatus.title
            : "";
        }

        if (resolvedTaskStatus) {
          const newTaskStatus = await ProjectWorkFlowStatus.findById(
            resolvedTaskStatus
          );
          newTaskStatusTitle = newTaskStatus ? newTaskStatus.title : "";
        }
        updateObj = {
          ...updateObj,
          ...(getData?.task_status?._id && !value?.task_status
            ? {
              task_status_history: [
                ...getData?.task_status_history,
                {
                  task_status: null,
                  updatedBy: loginUserId,
                  updatedAt: configs.utcDefault(),
                  ...(await getRefModelFromLoginUser(req?.user, true))
                }
              ]
            }
            : !getData?.task_status?._id && value?.task_status
              ? {
                task_status_history: [
                  {
                    task_status: resolvedTaskStatus,
                    updatedBy: loginUserId,
                    updatedAt: configs.utcDefault(),
                    ...(await getRefModelFromLoginUser(req?.user, true))
                  }
                ]
              }
              : getData?.task_status?._id &&
                resolvedTaskStatus &&
                getData?.task_status?._id.toString() !==
                resolvedTaskStatus.toString()
                ? {
                  task_status_history: [
                    ...getData?.task_status_history,
                    {
                      task_status: resolvedTaskStatus,
                      updatedBy: loginUserId,
                      updatedAt: configs.utcDefault()
                    }
                  ]
                }
                : getData?.task_status_history)
        };
        historyUpdateObj = {
          ...historyUpdateObj,
          updated_key: "task_status",
          pervious_value: previousTaskStatusTitle,
          new_value: newTaskStatusTitle
        };

        // save update history..
        const newHistory = new ProjectTaskUpdateHistory(historyUpdateObj);
        await newHistory.save();
      }
    }

    const data = await ProjectTasks.findByIdAndUpdate(
      req.params.id,
      updateObj,
      { new: true }
    );

    invalidateTaskBoardCaches(getData?.project?._id || getData?.project_id);

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    // after update ...
    const updatedData = await taskData(req.params.id);

    // Get new data after update for logging
    const newTaskDataRaw = await ProjectTasks.findById(data._id)
      .populate("assignees")
      .populate("task_status")
      .populate("task_labels")
      .populate("task_status_history.task_status", "title")
      .populate("task_status_history.updatedBy", "full_name first_name last_name")
      .lean();
    const newTaskDataForLogging = newTaskDataRaw || (data.toObject ? data.toObject() : data);

    // Helper function to transform task data for logging (reuse from updateProjectsTaskProps)
    const transformTaskDataForLogging = async (taskData) => {
      if (!taskData) return taskData;
      const transformed = { ...taskData };
      // Transform assignees array to array of assignee names
      if (transformed.assignees && Array.isArray(transformed.assignees)) {
        try {
          const EmployeesModel = mongoose.model("employees");
          const assigneeNames = [];

          for (const assignee of transformed.assignees) {
            if (!assignee) continue;

            if (typeof assignee === 'object' &&
              (assignee.full_name !== undefined ||
                assignee.first_name !== undefined ||
                assignee.last_name !== undefined)) {
              const name = assignee.full_name ||
                `${assignee.first_name || ""} ${assignee.last_name || ""}`.trim();
              if (name) assigneeNames.push(name);
            } else {
              const assigneeId = assignee instanceof mongoose.Types.ObjectId
                ? assignee
                : (typeof assignee === 'string' && mongoose.Types.ObjectId.isValid(assignee)
                  ? new mongoose.Types.ObjectId(assignee)
                  : (typeof assignee === 'object' && assignee._id
                    ? (assignee._id instanceof mongoose.Types.ObjectId
                      ? assignee._id
                      : new mongoose.Types.ObjectId(assignee._id))
                    : null));

              if (assigneeId) {
                const assigneeDoc = await EmployeesModel.findById(assigneeId)
                  .select("full_name first_name last_name")
                  .lean();
                if (assigneeDoc) {
                  const name = assigneeDoc.full_name ||
                    `${assigneeDoc.first_name || ""} ${assigneeDoc.last_name || ""}`.trim();
                  if (name) assigneeNames.push(name);
                }
              }
            }
          }
          transformed.assignees = assigneeNames;
        } catch (error) {
          console.error("Error transforming assignees for logging:", error);
          transformed.assignees = [];
        }
      } else if (transformed.assignees) {
        transformed.assignees = [];
      }
      // Transform task_status object to task_status name
      if (transformed.task_status) {
        if (typeof transformed.task_status === 'object' && transformed.task_status.title !== undefined) {
          transformed.task_status = transformed.task_status.title;
        } else if (transformed.task_status instanceof mongoose.Types.ObjectId ||
          (typeof transformed.task_status === 'string' && mongoose.Types.ObjectId.isValid(transformed.task_status))) {
          try {
            const WorkflowStatusModel = mongoose.model("workflowstatus");
            const statusId = transformed.task_status instanceof mongoose.Types.ObjectId
              ? transformed.task_status
              : new mongoose.Types.ObjectId(transformed.task_status);
            const status = await WorkflowStatusModel.findById(statusId)
              .select("title")
              .lean();
            transformed.task_status = status ? status.title : transformed.task_status.toString();
          } catch (error) {
            transformed.task_status = transformed.task_status.toString();
          }
        }
      }
      // Transform task_status_history array
      if (transformed.task_status_history && Array.isArray(transformed.task_status_history)) {
        try {
          const WorkflowStatusModel = mongoose.model("workflowstatus");
          const EmployeesModel = mongoose.model("employees");
          const moment = require("moment");
          const historyData = [];

          for (const historyItem of transformed.task_status_history) {
            if (!historyItem || typeof historyItem !== 'object') continue;

            const historyEntry = {};

            // Transform task_status - handle null, ObjectId, string, or populated object
            if (historyItem.task_status !== null && historyItem.task_status !== undefined) {
              if (typeof historyItem.task_status === 'object' && historyItem.task_status.title !== undefined) {
                // Already populated
                historyEntry.task_status = historyItem.task_status.title;
              } else {
                // It's an ObjectId or string ID - fetch the name
                let statusId = null;
                if (historyItem.task_status instanceof mongoose.Types.ObjectId) {
                  statusId = historyItem.task_status;
                } else if (typeof historyItem.task_status === 'string' && mongoose.Types.ObjectId.isValid(historyItem.task_status)) {
                  statusId = new mongoose.Types.ObjectId(historyItem.task_status);
                } else if (typeof historyItem.task_status === 'object' && historyItem.task_status._id) {
                  statusId = historyItem.task_status._id instanceof mongoose.Types.ObjectId
                    ? historyItem.task_status._id
                    : new mongoose.Types.ObjectId(historyItem.task_status._id);
                }

                if (statusId) {
                  const status = await WorkflowStatusModel.findById(statusId)
                    .select("title")
                    .lean();
                  historyEntry.task_status = status && status.title ? status.title : "";
                } else {
                  historyEntry.task_status = "";
                }
              }
            } else {
              // task_status is null or undefined
              historyEntry.task_status = "";
            }

            // Transform updatedBy - handle ObjectId, string, or populated object
            if (historyItem.updatedBy !== null && historyItem.updatedBy !== undefined) {
              if (typeof historyItem.updatedBy === 'object' &&
                (historyItem.updatedBy.full_name !== undefined ||
                  historyItem.updatedBy.first_name !== undefined ||
                  historyItem.updatedBy.email !== undefined)) {
                // Already populated
                historyEntry.updatedBy = historyItem.updatedBy.full_name ||
                  `${historyItem.updatedBy.first_name || ""} ${historyItem.updatedBy.last_name || ""}`.trim() ||
                  historyItem.updatedBy.email || "";
              } else {
                // It's an ObjectId or string ID - fetch the name
                let updatedById = null;
                if (historyItem.updatedBy instanceof mongoose.Types.ObjectId) {
                  updatedById = historyItem.updatedBy;
                } else if (typeof historyItem.updatedBy === 'string' && mongoose.Types.ObjectId.isValid(historyItem.updatedBy)) {
                  updatedById = new mongoose.Types.ObjectId(historyItem.updatedBy);
                } else if (typeof historyItem.updatedBy === 'object' && historyItem.updatedBy._id) {
                  updatedById = historyItem.updatedBy._id instanceof mongoose.Types.ObjectId
                    ? historyItem.updatedBy._id
                    : new mongoose.Types.ObjectId(historyItem.updatedBy._id);
                }

                if (updatedById) {
                  const updatedByUser = await EmployeesModel.findById(updatedById)
                    .select("full_name first_name last_name email")
                    .lean();
                  historyEntry.updatedBy = updatedByUser
                    ? (updatedByUser.full_name || `${updatedByUser.first_name || ""} ${updatedByUser.last_name || ""}`.trim() || updatedByUser.email)
                    : "";
                } else {
                  historyEntry.updatedBy = "";
                }
              }
            } else {
              historyEntry.updatedBy = "";
            }
            // Format updatedAt - ensure proper date format
            if (historyItem.updatedAt) {
              try {
                historyEntry.updatedAt = moment(historyItem.updatedAt).format("DD MMM YYYY HH:mm:ss");
              } catch (dateError) {
                // If moment fails, try to format manually or keep original
                historyEntry.updatedAt = historyItem.updatedAt.toString();
              }
            } else {
              historyEntry.updatedAt = "";
            }
            // Only add entry if it has at least one meaningful value
            if (historyEntry.task_status || historyEntry.updatedBy || historyEntry.updatedAt) {
              historyData.push(historyEntry);
            }
          }
          transformed.task_status_history = historyData;
        } catch (error) {
          console.error("Error transforming task_status_history for logging:", error);
          transformed.task_status_history = [];
        }
      } else if (transformed.task_status_history) {
        transformed.task_status_history = [];
      }

      return transformed;
    };

    // Transform data for logging
    const oldTaskData = await transformTaskDataForLogging(oldTaskDataForLogging);
    const newTaskData = await transformTaskDataForLogging(newTaskDataForLogging);

    await taskStatusUpdateMail(
      {
        oldData: getData,
        newData: updatedData
      },
      decodedCompanyId
    );

    // Log update activity
    try {
      const { logUpdate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
      const userInfo = await getUserInfoForLogging(req.user);
      if (userInfo && oldTaskData && newTaskData) {
        await logUpdate({
          companyId: userInfo.companyId,
          moduleName: "tasks",
          email: userInfo.email,
          createdBy: userInfo._id,
          updatedBy: userInfo._id,
          oldData: oldTaskData,
          newData: newTaskData,
          additionalData: {
            recordId: oldTaskData._id.toString()
          }
        });
      }
    } catch (logError) {
      console.error("Error logging task workflow update activity:", logError);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.TASK_STATUS_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Project task props:
exports.updateProjectsTaskProps = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      // updated_key: Joi.string().required(),
      updated_key: Joi.array().min(1).required(),
      project_id: Joi.string().required(),
      main_task_id: Joi.string().required(),
      title: Joi.string().optional(),
      status: Joi.string().optional().default("active"),
      descriptions: Joi.string().optional().allow("").default(""),
      priority: Joi.string().valid("Low", "Medium", "High").optional(),
      task_labels: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional().allow(""),
      start_date: Joi.date().optional().allow(null),
      due_date: Joi.date().optional().allow(null),
      end_date: Joi.date().optional().allow(null),
      assignees: Joi.array().optional(),
      pms_clients: Joi.array().default([]),
      estimated_hours: Joi.string().optional().default("00"),
      estimated_minutes: Joi.string().optional().default("00"),
      attachments: Joi.array().optional(),
      task_progress: Joi.string().optional().default("0"),
      task_status: Joi.string().optional(),
      folder_id: Joi.string().optional(),
      recurringType: Joi.string().valid("", "monthly", "yearly").optional().default(""),
      custom_fields: Joi.object().optional().default({})
    }).unknown(true);
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    // if (
    //   // value.updated_key == "title" &&
    //   value.updated_key.includes("title") &&
    //   (await this.projectTaskExists(value, req.params.id))
    // ) {
    //   return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    // } else {
    // data type of task_labels changed array to string .. need to manage here cause of this use in other module
    let task_labels = [];
    if (value?.task_labels && value?.task_labels != "") {
      if (Array.isArray(value.task_labels)) {
        task_labels = value.task_labels;
      } else {
        task_labels = [value.task_labels];
      }
    }

    value.task_labels = task_labels;

    const getData = await ProjectTasks.findById(req.params.id)
      .populate("assignees")
      .populate("task_status")
      .populate("task_labels")
      .populate("task_status_history.task_status", "title")
      .populate("task_status_history.updatedBy", "full_name first_name last_name");

    // Get old data before update for logging - use lean() for consistency with new data
    const oldTaskDataRaw = await ProjectTasks.findById(req.params.id)
      .populate("assignees")
      .populate("task_status")
      .populate("task_labels")
      .populate("task_status_history.task_status", "title")
      .populate("task_status_history.updatedBy", "full_name first_name last_name")
      .lean();

    // Get update obj...
    const { updateObj, historyUpdateArr } = await this.getDataForUpdate(
      req.user,
      getData,
      {
        ...value,
        task_id: req.params.id
      }
    );

    const data = await ProjectTasks.findByIdAndUpdate(
      req.params.id,
      updateObj,
      {
        new: true
      }
    );

    if (historyUpdateArr && historyUpdateArr?.length) {
      const newHistory = await ProjectTaskUpdateHistory.insertMany(
        historyUpdateArr
      );
    }

    if (!data) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }

    // Get new data after update for logging - populate necessary fields
    const newDataPopulated = await ProjectTasks.findById(data._id)
      .populate("assignees")
      .populate("task_status")
      .populate("task_labels")
      .populate("task_status_history.task_status", "title")
      .populate("task_status_history.updatedBy", "full_name first_name last_name")
      .lean();
    const newTaskDataRaw = newDataPopulated || (data.toObject ? data.toObject() : data);

    // Helper function to transform task data for logging
    const transformTaskDataForLogging = async (taskData) => {
      if (!taskData) return taskData;
      const transformed = { ...taskData };
      // Transform assignees array to array of assignee names
      if (transformed.assignees && Array.isArray(transformed.assignees)) {
        try {
          const EmployeesModel = mongoose.model("employees");
          const assigneeNames = [];

          for (const assignee of transformed.assignees) {
            if (!assignee) continue;

            // Check if it's already a populated object
            if (typeof assignee === 'object' &&
              (assignee.full_name !== undefined ||
                assignee.first_name !== undefined ||
                assignee.last_name !== undefined)) {
              const name = assignee.full_name ||
                `${assignee.first_name || ""} ${assignee.last_name || ""}`.trim();
              if (name) assigneeNames.push(name);
            } else {
              // It's an ObjectId or string ID - fetch the name
              const assigneeId = assignee instanceof mongoose.Types.ObjectId
                ? assignee
                : (typeof assignee === 'string' && mongoose.Types.ObjectId.isValid(assignee)
                  ? new mongoose.Types.ObjectId(assignee)
                  : (typeof assignee === 'object' && assignee._id
                    ? (assignee._id instanceof mongoose.Types.ObjectId
                      ? assignee._id
                      : new mongoose.Types.ObjectId(assignee._id))
                    : null));

              if (assigneeId) {
                const assigneeDoc = await EmployeesModel.findById(assigneeId)
                  .select("full_name first_name last_name")
                  .lean();
                if (assigneeDoc) {
                  const name = assigneeDoc.full_name ||
                    `${assigneeDoc.first_name || ""} ${assigneeDoc.last_name || ""}`.trim();
                  if (name) assigneeNames.push(name);
                }
              }
            }
          }
          transformed.assignees = assigneeNames;
        } catch (error) {
          console.error("Error transforming assignees for logging:", error);
          transformed.assignees = transformed.assignees
            .map(a => {
              if (typeof a === 'object' && a.full_name) return a.full_name;
              if (typeof a === 'object' && a._id) return a._id.toString();
              return a ? a.toString() : null;
            })
            .filter(Boolean);
        }
      } else if (transformed.assignees) {
        transformed.assignees = [];
      }
      // Transform task_status object to task_status name
      if (transformed.task_status) {
        if (typeof transformed.task_status === 'object' && transformed.task_status.title !== undefined) {
          transformed.task_status = transformed.task_status.title;
        } else if (transformed.task_status instanceof mongoose.Types.ObjectId ||
          (typeof transformed.task_status === 'string' && mongoose.Types.ObjectId.isValid(transformed.task_status))) {
          try {
            const WorkflowStatusModel = mongoose.model("workflowstatus");
            const statusId = transformed.task_status instanceof mongoose.Types.ObjectId
              ? transformed.task_status
              : new mongoose.Types.ObjectId(transformed.task_status);
            const status = await WorkflowStatusModel.findById(statusId)
              .select("title")
              .lean();
            transformed.task_status = status ? status.title : transformed.task_status.toString();
          } catch (error) {
            transformed.task_status = transformed.task_status.toString();
          }
        }
      }
      // Transform task_labels array to array of label names
      if (transformed.task_labels && Array.isArray(transformed.task_labels)) {
        try {
          const ProjectLabelsModel = mongoose.model("tasklabels");
          const labelNames = [];

          for (const label of transformed.task_labels) {
            if (!label) continue;

            // Check if it's already a populated object
            if (typeof label === 'object' && label.title !== undefined) {
              labelNames.push(label.title);
            } else {
              // It's an ObjectId or string ID - fetch the name
              const labelId = label instanceof mongoose.Types.ObjectId
                ? label
                : (typeof label === 'string' && mongoose.Types.ObjectId.isValid(label)
                  ? new mongoose.Types.ObjectId(label)
                  : (typeof label === 'object' && label._id
                    ? (label._id instanceof mongoose.Types.ObjectId
                      ? label._id
                      : new mongoose.Types.ObjectId(label._id))
                    : null));

              if (labelId) {
                const labelDoc = await ProjectLabelsModel.findById(labelId)
                  .select("title")
                  .lean();
                if (labelDoc && labelDoc.title) {
                  labelNames.push(labelDoc.title);
                }
              }
            }
          }
          transformed.task_labels = labelNames;
        } catch (error) {
          console.error("Error transforming task_labels for logging:", error);
          transformed.task_labels = transformed.task_labels
            .map(l => {
              if (typeof l === 'object' && l.title) return l.title;
              if (typeof l === 'object' && l._id) return l._id.toString();
              return l ? l.toString() : null;
            })
            .filter(Boolean);
        }
      } else if (transformed.task_labels) {
        transformed.task_labels = [];
      }
      // Transform task_status_history array
      if (transformed.task_status_history && Array.isArray(transformed.task_status_history)) {
        try {
          const WorkflowStatusModel = mongoose.model("workflowstatus");
          const moment = require("moment");
          const historyData = [];

          for (const historyItem of transformed.task_status_history) {
            if (!historyItem || typeof historyItem !== 'object') continue;

            const historyEntry = {};

            // Transform task_status
            if (historyItem.task_status) {
              if (typeof historyItem.task_status === 'object' && historyItem.task_status.title !== undefined) {
                historyEntry.task_status = historyItem.task_status.title;
              } else {
                const statusId = historyItem.task_status instanceof mongoose.Types.ObjectId
                  ? historyItem.task_status
                  : (typeof historyItem.task_status === 'string' && mongoose.Types.ObjectId.isValid(historyItem.task_status)
                    ? new mongoose.Types.ObjectId(historyItem.task_status)
                    : null);

                if (statusId) {
                  const status = await WorkflowStatusModel.findById(statusId)
                    .select("title")
                    .lean();
                  historyEntry.task_status = status ? status.title : "";
                } else {
                  historyEntry.task_status = "";
                }
              }
            } else {
              historyEntry.task_status = "";
            }

            // Transform updatedBy
            if (historyItem.updatedBy) {
              if (typeof historyItem.updatedBy === 'object' &&
                (historyItem.updatedBy.full_name !== undefined ||
                  historyItem.updatedBy.first_name !== undefined)) {
                historyEntry.updatedBy = historyItem.updatedBy.full_name ||
                  `${historyItem.updatedBy.first_name || ""} ${historyItem.updatedBy.last_name || ""}`.trim() ||
                  historyItem.updatedBy.email || "";
              } else {
                const EmployeesModel = mongoose.model("employees");
                const updatedById = historyItem.updatedBy instanceof mongoose.Types.ObjectId
                  ? historyItem.updatedBy
                  : (typeof historyItem.updatedBy === 'string' && mongoose.Types.ObjectId.isValid(historyItem.updatedBy)
                    ? new mongoose.Types.ObjectId(historyItem.updatedBy)
                    : null);

                if (updatedById) {
                  const updatedByUser = await EmployeesModel.findById(updatedById)
                    .select("full_name first_name last_name email")
                    .lean();
                  historyEntry.updatedBy = updatedByUser
                    ? (updatedByUser.full_name || `${updatedByUser.first_name || ""} ${updatedByUser.last_name || ""}`.trim() || updatedByUser.email)
                    : "";
                } else {
                  historyEntry.updatedBy = "";
                }
              }
            } else {
              historyEntry.updatedBy = "";
            }
            // Format updatedAt
            if (historyItem.updatedAt) {
              historyEntry.updatedAt = moment(historyItem.updatedAt).format("DD MMM YYYY HH:mm:ss");
            } else {
              historyEntry.updatedAt = "";
            }

            historyData.push(historyEntry);
          }

          transformed.task_status_history = historyData;
        } catch (error) {
          console.error("Error transforming task_status_history for logging:", error);
          transformed.task_status_history = [];
        }
      } else if (transformed.task_status_history) {
        transformed.task_status_history = [];
      }

      return transformed;
    };

    // Transform data for logging
    const oldTaskData = await transformTaskDataForLogging(oldTaskDataRaw);
    const newTaskData = await transformTaskDataForLogging(newTaskDataRaw);

    // For send mail for new added subscribers..
    const assigneesData = getArrayChanges(
      getData.assignees.map((a) => a.toString()),
      value.assignees
    );

    if (assigneesData.added && assigneesData.added.length > 0) {
      await sendmailToAssignees(
        req.params.id,
        assigneesData.added,
        decodedCompanyId
      );
    }

    // Log update activity
    try {
      const { logUpdate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
      const userInfo = await getUserInfoForLogging(req.user);
      if (userInfo && oldTaskData && newTaskData) {
        await logUpdate({
          companyId: userInfo.companyId,
          moduleName: "tasks",
          email: userInfo.email,
          createdBy: userInfo._id,
          updatedBy: userInfo._id,
          oldData: oldTaskData,
          newData: newTaskData,
          additionalData: {
            recordId: oldTaskData._id.toString()
          }
        });
      }
    } catch (logError) {
      console.error("Error logging task update activity:", logError);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.TASK_UPDATED,
      newDataPopulated
    );
    // }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getDataForUpdate = async (loginUser, perviousData, reqBody) => {
  try {
    const loginUserId = loginUser._id;
    let common = {
      updatedBy: loginUserId,
      updatedAt: configs.utcDefault(),
      ...(await getRefModelFromLoginUser(loginUser, true))
    };

    let updateObj = {}; // For task prop

    let historyUpdateObj = {}; // For history

    let historyUpdateArr = []; // Collection of history

    if (reqBody?.updated_key && reqBody?.updated_key?.length > 0) {
      updateObj = { ...common };
      historyUpdateObj = {
        ...(reqBody?.project_id
          ? { project_id: new mongoose.Types.ObjectId(reqBody?.project_id) }
          : {}),
        ...(reqBody?.main_task_id
          ? { main_task_id: new mongoose.Types.ObjectId(reqBody?.main_task_id) }
          : {}),
        ...(reqBody?.task_id
          ? { task_id: new mongoose.Types.ObjectId(reqBody?.task_id) }
          : {}),
        ...(reqBody?.subtask_id
          ? { subtask_id: new mongoose.Types.ObjectId(reqBody?.subtask_id) }
          : {}),
        createdBy: loginUserId,
        createdAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(loginUser)),
        ...common
      };

      for (let i = 0; i < reqBody?.updated_key?.length; i++) {
        const element = reqBody?.updated_key[i];

        switch (element) {
          case "title":
            if (reqBody?.title) {
              updateObj.title = reqBody?.title;
              // if previous and new both value same no need to update..

              if (perviousData?.title !== reqBody?.title) {
                // delete historyUpdateObj.updated_key;
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: perviousData?.title,
                  new_value: reqBody?.title
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "status":
            if (reqBody?.status) {
              updateObj.status = reqBody?.status;
              // if previous and new both value same no need to update..
              if (perviousData?.status !== reqBody?.status) {
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: perviousData?.status,
                  new_value: reqBody?.status
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "descriptions":
            if (reqBody?.descriptions) {
              updateObj.descriptions = reqBody?.descriptions;
              // if previous and new both value same no need to update..
              if (perviousData?.descriptions !== reqBody?.descriptions) {
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: perviousData?.descriptions,
                  new_value: reqBody?.descriptions
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "priority":
            if (reqBody?.priority) {
              updateObj.priority = reqBody?.priority;
              if (perviousData?.priority !== reqBody?.priority) {
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: perviousData?.priority,
                  new_value: reqBody?.priority
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "task_labels":
            if (reqBody?.task_labels) {
              updateObj.task_labels = reqBody?.task_labels;
              let previousTaskLabelsTitle = "";
              let newTaskLabelsTitle = "";

              // if previous and new both value same no need to update..
              if (
                !arraysAreEqual(
                  reqBody?.task_labels,
                  perviousData?.task_labels.map((a) => a.toString())
                )
              ) {
                // delete historyUpdateObj.updated_key;

                if (
                  perviousData?.task_labels &&
                  perviousData?.task_labels.length > 0
                ) {
                  const previousTaskLabels = await ProjectLabels.find({
                    _id: { $in: perviousData?.task_labels },
                    isDeleted: false
                  });
                  previousTaskLabelsTitle = previousTaskLabels
                    .map((p) => p.title)
                    .join(",");
                }

                if (reqBody?.task_labels && reqBody?.task_labels.length > 0) {
                  const newTaskLabels = await ProjectLabels.find({
                    _id: { $in: reqBody?.task_labels },
                    isDeleted: false
                  });
                  newTaskLabelsTitle = newTaskLabels
                    .map((p) => p.title)
                    .join(",");
                }

                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: previousTaskLabelsTitle,
                  new_value: newTaskLabelsTitle
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "start_date":
            if (reqBody?.start_date || reqBody.start_date == null) {
              updateObj.start_date = reqBody?.start_date;
              // if previous and new both value same no need to update..

              if (
                perviousData?.start_date == null &&
                reqBody?.start_date == null
              ) {
                console.log("No updates to task history start dt");
              } else {
                if (
                  !moment(perviousData?.start_date).isSame(
                    moment(reqBody?.start_date),
                    "day"
                  )
                ) {
                  historyUpdateObj = {
                    ...historyUpdateObj,
                    updated_key: element,
                    pervious_value: perviousData?.start_date,
                    new_value: reqBody?.start_date
                  };
                  historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
                }
              }
            }
            break;

          case "due_date":
            if (reqBody?.due_date || reqBody.due_date == null) {
              updateObj.due_date = reqBody?.due_date;
              // if previous and new both value same no need to update..

              if (perviousData?.due_date == null && reqBody?.due_date == null) {
                console.log("No updates to task history due dt");
              } else {
                if (
                  !moment(perviousData?.due_date).isSame(
                    moment(reqBody?.due_date),
                    "day"
                  )
                ) {
                  historyUpdateObj = {
                    ...historyUpdateObj,
                    updated_key: element,
                    pervious_value: perviousData?.due_date,
                    new_value: reqBody?.due_date
                  };
                  historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
                }
              }
            }
            break;

          case "end_date":
            if (reqBody?.end_date || reqBody.end_date == null) {
              updateObj.end_date = reqBody?.end_date;
              if (perviousData?.end_date == null && reqBody?.end_date == null) {
                console.log("No updates to task history end dt");
              } else if (
                !moment(perviousData?.end_date).isSame(
                  moment(reqBody?.end_date),
                  "day"
                )
              ) {
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: perviousData?.end_date,
                  new_value: reqBody?.end_date
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "assignees":
            if (reqBody?.assignees) {
              updateObj.assignees = reqBody?.assignees;

              let changedArr = getArrayChanges(
                perviousData?.assignees?.map((a) => a?.toString()),
                reqBody?.assignees
              );

              if (
                changedArr.added.length > 0 ||
                changedArr.removed.length > 0
              ) {
                let new_assignee = null;
                let remove_assignee = null;
                let previous_assignee = null;

                // previous Assignee...
                if (perviousData?.assignees?.length > 0) {
                  const previousAssignee = await Employees.find({
                    _id: {
                      $in: perviousData?.assignees?.map(
                        (a) => new mongoose.Types.ObjectId(a)
                      )
                    },
                    isDeleted: false,
                    isActivate: true
                  });

                  previous_assignee = previousAssignee
                    .map((n) => n.full_name)
                    .join(",");
                }

                if (reqBody?.assignees?.length > 0) {
                  const newAssignee = await Employees.find({
                    _id: {
                      $in: reqBody?.assignees?.map(
                        (a) => new mongoose.Types.ObjectId(a)
                      )
                    },
                    isDeleted: false,
                    isActivate: true
                  });

                  new_assignee = newAssignee.map((n) => n.full_name).join(",");
                }

                // new added assignee..
                let updateKey = "";
                if (changedArr?.added?.length > 0) {
                  updateKey = "new_assignee";

                  // If need added/removed assignees name..
                  // const newAssignee = await Employees.find({
                  //   _id: {
                  //     $in: changedArr?.added?.map(
                  //       (a) => new mongoose.Types.ObjectId(a)
                  //     ),
                  //   },
                  //   isDeleted: false,
                  //   isActivate: true,
                  // });
                  // new_assignee = newAssignee.map((n) => n.full_name).join(",");
                  // historyUpdateObj = {
                  //   ...historyUpdateObj,
                  //   pervious_value: previous_assignee,
                  //   new_value: new_assignee,
                  // };
                  // historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
                }
                // remove assignee...
                if (changedArr?.removed?.length > 0) {
                  updateKey = "remove_assignee";

                  // If need added/removed assignees name..
                  // const removeAssignee = await Employees.find({
                  //   _id: {
                  //     $in: changedArr?.removed?.map(
                  //       (a) => new mongoose.Types.ObjectId(a)
                  //     ),
                  //   },
                  //   isDeleted: false,
                  //   isActivate: true,
                  // });
                  // remove_assignee = removeAssignee
                  //   .map((n) => n.full_name)
                  //   .join(",");

                  // historyUpdateObj = {
                  //   ...historyUpdateObj,
                  //   pervious_value: previous_assignee,
                  //   new_value: remove_assignee,
                  // };
                  // historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
                }

                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: updateKey,
                  pervious_value: previous_assignee,
                  new_value: new_assignee
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }

            break;

          case "pms_clients":
            if (reqBody?.pms_clients) {
              updateObj.pms_clients = reqBody?.pms_clients;

              let changedArr = getArrayChanges(
                perviousData?.pms_clients?.map((a) => a?.toString()),
                reqBody?.pms_clients
              );

              if (
                changedArr.added.length > 0 ||
                changedArr.removed.length > 0
              ) {
                let new_clients = null;
                let remove_clients = null;
                let previous_clients = null;

                // previous Assignee...
                if (perviousData?.pms_clients?.length > 0) {
                  const previousAssignee = await PMSClients.find({
                    _id: {
                      $in: perviousData?.pms_clients?.map(
                        (a) => new mongoose.Types.ObjectId(a)
                      )
                    },
                    isDeleted: false,
                    isActivate: true
                  });

                  previous_clients = previousAssignee
                    .map((n) => n.full_name)
                    .join(",");
                }

                if (reqBody?.pms_clients?.length > 0) {
                  const newAssignee = await PMSClients.find({
                    _id: {
                      $in: reqBody?.pms_clients?.map(
                        (a) => new mongoose.Types.ObjectId(a)
                      )
                    },
                    isDeleted: false,
                    isActivate: true
                  });

                  new_clients = newAssignee.map((n) => n.full_name).join(",");
                }

                // new added assignee..
                let updateKey = "";
                if (changedArr?.added?.length > 0) {
                  updateKey = "new_clients";
                }
                // remove assignee...
                if (changedArr?.removed?.length > 0) {
                  updateKey = "remove_clients";
                }
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: updateKey,
                  pervious_value: previous_clients,
                  new_value: new_clients
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }

            break;

          case "estimated_hours":
            if (reqBody?.estimated_hours) {
              updateObj.estimated_hours = reqBody?.estimated_hours;
              // if previous and new both value same no need to update..
              if (perviousData?.estimated_hours !== reqBody?.estimated_hours) {
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: perviousData?.estimated_hours,
                  new_value: reqBody?.estimated_hours
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "estimated_minutes":
            if (reqBody?.estimated_minutes) {
              updateObj.estimated_minutes = reqBody?.estimated_minutes;
              // if previous and new both value same no need to update..
              if (
                perviousData?.estimated_minutes !== reqBody?.estimated_minutes
              ) {
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: perviousData?.estimated_minutes,
                  new_value: reqBody?.estimated_minutes
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "task_progress":
            if (reqBody?.task_progress) {
              updateObj.task_progress = reqBody?.task_progress;
              // if previous and new both value same no need to update..
              if (perviousData?.task_progress !== reqBody?.task_progress) {
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: perviousData?.task_progress,
                  new_value: reqBody?.task_progress
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "attachments":
            if (reqBody?.attachments) {
              // await this.updateAttachments(loginUserId, reqBody);
              await filesManageInDB(
                reqBody.attachments,
                loginUser,
                new mongoose.Types.ObjectId(reqBody?.project_id),
                reqBody.folder_id,
                reqBody.task_id
              );
            }
            break;

          case "task_status":
            if (reqBody?.task_status) {
              updateObj.task_status = reqBody?.task_status;

              // if previous and new both value same no need to update..
              if (
                perviousData?.task_status.toString() !== reqBody?.task_status
              ) {
                let previousTaskStatusTitle = "";
                let newTaskStatusTitle = "";

                if (perviousData?.task_status) {
                  const previousTaskStatus =
                    await ProjectWorkFlowStatus.findById(
                      perviousData?.task_status
                    );
                  previousTaskStatusTitle = previousTaskStatus
                    ? previousTaskStatus.title
                    : "";
                }

                if (reqBody?.task_status) {
                  const newTaskStatus = await ProjectWorkFlowStatus.findById(
                    reqBody?.task_status
                  );
                  newTaskStatusTitle = newTaskStatus ? newTaskStatus.title : "";
                }
                updateObj = {
                  ...updateObj,
                  ...(perviousData?.task_status && !reqBody?.task_status
                    ? {
                      task_status_history: [
                        ...perviousData?.task_status_history,
                        {
                          task_status: null,
                          updatedBy: loginUserId,
                          updatedAt: configs.utcDefault()
                        }
                      ]
                    }
                    : !perviousData?.task_status && reqBody?.task_status
                      ? {
                        task_status_history: [
                          {
                            task_status: reqBody?.task_status,
                            updatedBy: loginUserId,
                            updatedAt: configs.utcDefault()
                          }
                        ]
                      }
                      : perviousData?.task_status &&
                        reqBody?.task_status &&
                        perviousData?.task_status.toString() !==
                        reqBody?.task_status.toString()
                        ? {
                          task_status_history: [
                            ...perviousData?.task_status_history,
                            {
                              task_status: reqBody?.task_status,
                              updatedBy: loginUserId,
                              updatedAt: configs.utcDefault()
                            }
                          ]
                        }
                        : perviousData?.task_status_history)
                };
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: previousTaskStatusTitle,
                  new_value: newTaskStatusTitle
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "recurringType":
            if (reqBody?.recurringType !== undefined) {
              updateObj.recurringType = reqBody?.recurringType;
              // if previous and new both value same no need to update..
              if (perviousData?.recurringType !== reqBody?.recurringType) {
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: perviousData?.recurringType,
                  new_value: reqBody?.recurringType
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "custom_fields":
            if (reqBody?.custom_fields && typeof reqBody.custom_fields === "object") {
              updateObj.custom_fields = reqBody.custom_fields;
              if (
                JSON.stringify(perviousData?.custom_fields || {}) !==
                JSON.stringify(reqBody.custom_fields || {})
              ) {
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: JSON.stringify(perviousData?.custom_fields || {}),
                  new_value: JSON.stringify(reqBody.custom_fields || {})
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          default:
            break;
        }
      }
    }

    return {
      updateObj,
      historyUpdateArr
    };
  } catch (error) {
    console.log("🚀 ~getDataForUpdate error:", error);
  }
};

exports.updateAttachments = async (loginUserId, reqBody) => {
  try {
    let where = {
      isDeleted: false,
      ...(reqBody?.project_id ? { project_id: reqBody?.project_id } : {}),
      ...(reqBody?.task_id ? { task_id: reqBody?.task_id } : {}),
      ...(reqBody?.sub_task_id ? { sub_task_id: reqBody?.sub_task_id } : {})
    };
    let common = {
      updatedBy: loginUserId,
      updatedAt: configs.utcDefault()
    };
    let updateObj = { ...common };
    let createObj = {
      createdBy: loginUserId,
      createdAt: configs.utcDefault(),
      ...common
    };

    if (reqBody && reqBody?.attachments) {
      if (reqBody?.attachments.length == 0) {
        // Delete all the files of task or sub task
        await ProjectFileUploads.updateMany(where, {
          $set: {
            ...updateObj,
            deletedBy: loginUserId,
            isDeleted: true,
            deletedAt: configs.utcDefault()
          }
        });
      } else {
        for (let i = 0; i < reqBody?.attachments.length; i++) {
          const element = reqBody?.attachments[i];
          const obj = {
            name: element.file_name,
            file_type: path.extname(element.file_name),
            path: element.file_path,
            ...(reqBody?.folder_id ? { folder_id: reqBody?.folder_id } : {}),
            ...(reqBody?.task_id ? { task_id: reqBody?.task_id } : {}),
            ...(reqBody?.sub_task_id
              ? { sub_task_id: reqBody?.sub_task_id }
              : {})
          };
          if (element?._id) {
            // Update file...
            await ProjectFileUploads.findOneAndUpdate(
              {
                ...where,
                _id: element._id
              },
              {
                $set: {
                  ...obj,
                  ...updateObj
                }
              }
            );
          } else {
            // create file...
            const newfile = new ProjectFileUploads({
              ...obj,
              ...createObj
            });
            await newfile.save();
            // return
          }
        }
      }
      return;
    }
  } catch (error) {
    console.log("🚀 ~updateAttachments error:", error);
  }
};

exports.getHistory = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      _id: Joi.string().optional(),
      task_id: Joi.string().required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    let matchQuery = {
      isDeleted: false,
      task_id: new mongoose.Types.ObjectId(value.task_id),
      ...(value?._id
        ? {
          _id: new mongoose.Types.ObjectId(value._id)
        }
        : {})
    };

    const mainQuery = [
      { $match: matchQuery },
      ...(await getCreatedUpdatedDeletedByQuery()),
      ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
      { $sort: { _id: -1 } },
      {
        $project: {
          _id: 1,
          updated_key: 1,
          pervious_value: 1,
          new_value: 1,
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1
          },
          createdAt: 1,
          updatedAt: 1,
          updatedBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1
          }
        }
      }
    ];

    let data = await ProjectTaskUpdateHistory.aggregate(mainQuery);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      value._id ? data[0] : data,
      {}
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project task :
exports.getProjectsWiseTask = async (req, res) => {
  try {
    const projectId = new mongoose.Types.ObjectId(req.params.projectId);

    const [isAdmin, isManager, isAccManager] = await Promise.all([
      checkUserIsAdmin(req.user._id),
      checkLoginUserIsProjectManager(projectId, req.user._id),
      checkLoginUserIsProjectAccountManager(projectId, req.user._id)
    ]);

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(projectId)
    };

    let mainTaskQuery = [
      { $eq: ["$_id", "$$mainTaskId"] },
      { $eq: ["$isDeleted", false] }
    ];
    if (!isManager && !isAdmin && !isAccManager) {
      mainTaskQuery = [
        ...mainTaskQuery,
        {
          $or: [
            {
              $eq: [
                "$$taskCreatedBy",
                new mongoose.Types.ObjectId(req.user._id)
              ]
            },
            {
              $in: [
                new mongoose.Types.ObjectId(req.user._id),
                "$$taskAssignees"
              ]
            },
            {
              $in: [
                new mongoose.Types.ObjectId(req.user._id),
                "$$taskPmsClients"
              ]
            },
            {
              $eq: ["$createdBy", new mongoose.Types.ObjectId(req.user._id)]
            },
            {
              $in: [new mongoose.Types.ObjectId(req.user._id), "$subscribers"]
            },
            {
              $in: [new mongoose.Types.ObjectId(req.user._id), "$pms_clients"]
            }
          ]
        }
      ];
    }

    const query = [
      {
        $match: matchQuery
      },
      // This test case for :: when task is assignee to emp but if emp not subscriber of main task
      {
        $lookup: {
          from: "projectmaintasks",
          let: {
            mainTaskId: "$main_task_id",
            taskCreatedBy: "$createdBy",
            taskAssignees: "$assignees",
            taskPmsClients: "$pms_clients"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: mainTaskQuery
                }
              }
            }
          ],
          as: "mainTask"
        }
      },
      {
        $unwind: {
          path: "$mainTask",
          preserveNullAndEmptyArrays: false
        }
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
                    { $in: ["$_id", "$$task_labels"] },
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
          as: "task_status"
        }
      },
      {
        $unwind: {
          path: "$task_status",
          preserveNullAndEmptyArrays: true
        }
      },
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
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "assignees"
        }
      },
      {
        $sort: {
          _id: -1
        }
      }
    ];
    const data = await ProjectTasks.aggregate(query);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, []);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Project bugs details taskwise:
exports.taskwiseBugsDetailedData = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      task_id: Joi.string().required(),
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
    const mainQuery = [
      {
        $lookup: {
          from: "employees",
          localField: "createdBy",
          foreignField: "_id",
          as: "reporter"
        }
      },
      {
        $unwind: {
          path: "$reporter",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          localField: "assignees",
          foreignField: "_id",
          as: "assignees"
        }
      },
      {
        $lookup: {
          from: "bugsworkflowstatuses",
          let: { bug_status: "$bug_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$bug_status"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "bug_status"
        }
      },
      {
        $unwind: {
          path: "$bug_status",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          isDeleted: false,
          task_id: new mongoose.Types.ObjectId(value?.task_id),
          project_id: new mongoose.Types.ObjectId(value?.project_id)
        }
      },
      {
        $project: {
          _id: 1,
          bugId: 1,
          title: 1,
          bug_status: "$bug_status.title",
          createdBy: 1,
          reporter: "$reporter.full_name",
          assignees: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            emp_img: 1
          },
          due_date: 1,
          createdAt: 1,
          task_id: 1,
          project_id: 1
        }
      },
      {
        $sort: {
          createdAt: 1
        }
      }
    ];

    const data = await projectBugs.aggregate(mainQuery);
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    console.log("🚀 ~ exports.projectBugsDetailedData= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Add Project task Copy:
exports.addProjectsTaskCopy = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      task_id: Joi.string().required(),
      project_id: Joi.string().required(),
      main_task_id: Joi.string().required(),
      status: Joi.string().optional().default("active"),
      task_status: Joi.string().optional(),
      isCopyAssignee: Joi.boolean().required(),
      isCopyClients: Joi.boolean().required(),
      isCopyDates: Joi.boolean().required(),
      isCopyComments: Joi.boolean().required(),
      attachments: Joi.any().optional(),
      folder_id: Joi.any().optional()
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
      value?.attachments &&
      value.attachments.length > 0 &&
      !value.folder_id
    ) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        messages.FOLDER_REQUIRED
      );
    }

    // if (await this.projectTaskExists(value)) {
    //   return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    // } else {
    let projectData;
    if (
      value?.project_id ||
      value?.project_id != undefined ||
      value?.project_id != null ||
      value?.project_id != ""
    ) {
      projectData = await Projects.findOne({
        _id: new mongoose.Types.ObjectId(value?.project_id),
        isDeleted: false
      });
    } else {
      // if project id-> data not found
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }

    let taskData;
    // initially, to get the old task details to be copied:
    if (
      value?.task_id ||
      value?.task_id != undefined ||
      value?.task_id != null ||
      value?.task_id != ""
    ) {
      taskData = await ProjectTasks.findOne({
        _id: new mongoose.Types.ObjectId(value?.task_id),
        isDeleted: false
      });
    } else {
      // if old task id-> data not found
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }
    // to get all the comments of that particular task
    const comments = await CommentsModel.find({
      task_id: new mongoose.Types.ObjectId(value?.task_id),
      isDeleted: false
    });
    // to get the id id of TO DO of that particular workflow
    const workFlowStatus = await ProjectWorkFlowStatus.findOne({
      workflow_id: new mongoose.Types.ObjectId(projectData?.workFlow),
      isDefault: true,
      isDeleted: false,
      title: DEFAULT_DATA.WORKFLOW_STATUS.TODO
    });
    let data = new ProjectTasks({
      title: value?.title,
      taskId: generateRandomId(),
      project_id: value?.project_id,
      main_task_id: value?.main_task_id,
      task_status: value?.task_status
        ? value?.task_status
        : workFlowStatus?._id,
      assignees: value?.isCopyAssignee
        ? taskData?.assignees
          ? taskData?.assignees
          : []
        : [],
      pms_clients: value?.isCopyClients
        ? taskData?.pms_clients
          ? taskData?.pms_clients
          : []
        : [],
      start_date: value?.isCopyDates
        ? taskData?.start_date
          ? taskData?.start_date
          : null
        : null,
      due_date: value?.isCopyDates
        ? taskData?.due_date
          ? taskData?.due_date
          : null
        : null,
      ...(value?.task_status && {
        task_status_history: [
          {
            task_status: value?.task_status
              ? value?.task_status
              : workFlowStatus?._id,
            updatedBy: req.user._id,
            updatedAt: configs.utcDefault()
          }
        ]
      }),

      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user))
    });

    const newData = await data.save();

    if (value?.isCopyComments) {
      // to add all old comments as to copy task
      const newComments = comments.map((comment) => {
        return {
          ...comment.toObject(), // Convert Mongoose document to plain JavaScript object
          _id: new mongoose.Types.ObjectId(),
          task_id: newData._id
        };
      });

      // Save the new comments
      await CommentsModel.insertMany(newComments);
    }
    // save  files,..
    if (value?.attachments && value.attachments.length > 0) {
      await filesManageInDB(
        value.attachments,
        req.user,
        value.project_id,
        value.folder_id,
        newData._id
      );
    }

    // Add a data in history..
    let newHistory = new ProjectTaskUpdateHistory({
      project_id: value.project_id,
      main_task_id: value.main_task_id || null,
      task_id: newData._id,
      updated_key: "createdAt",
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user))
    });
    await newHistory.save();

    // send mail to assignee..
    // if (value.assignees && value.assignees.length > 0) {
    //   await sendmailToAssignees(newData._id);
    // }

    return successResponse(res, statusCode.CREATED, messages.COPIED, data);
    // }
  } catch (error) {
    console.log("errorr:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.importTasksData = async (req, res) => {
  try {
    if (req.body.project_id) {
      if (!req.files || !req.files.attachment) {
        return res.json({
          message: messages.IMPORT_FILE_NOT_FOUND,
          statusCode: statusCode.BAD_REQUEST
        });
      }
      if (req.files.attachment.length !== 1) {
        return res.json({
          message: messages.SINGLE_FILE,
          statusCode: statusCode.BAD_REQUEST
        });
      }
      const fileObj = req.files.attachment[0];

      const fileExt =
        fileObj.originalname.split(".")[
        fileObj.originalname.split(".").length - 1
        ];

      if (!["xlsx", "xls", "csv"].includes(fileExt.toLowerCase())) {
        return res.json({
          message: messages.FILE_EXT,
          statusCode: statusCode.BAD_REQUEST
        });
      }
      const dataPayload = jsonDataFromFile(fileObj);
      // console.log("DataPAyload:", dataPayload);
      dataPayload.parse.forEach((item) => {
        if (typeof item["Task"] === "number") {
          item["Task"] = item["Task"].toString();
        }
        if (typeof item["Estimated Hours"] === "number") {
          item["Estimated Hours"] = item["Estimated Hours"].toString();
        }
        if (typeof item["Estimated Mintues"] === "number") {
          item["Estimated Mintues"] = item["Estimated Mintues"].toString();
        }
      });

      const requiredColumns = [
        "Task",
        // "Start Date",
        // "Due Date",
        "Assignees Email",
        "Estimated Hours",
        "Estimated Minutes",
        "Created By Email"
      ];
      const allColumnsExist = (cols, requiredColumns) => {
        return requiredColumns.every((column) => cols.includes(column));
      };

      if (!allColumnsExist(dataPayload.cols, requiredColumns)) {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          messages.COLUMNS_MISMATCH
        );
      }

      const taskSchema = Joi.object({
        Task: Joi.string().required(),
        // "Start Date": Joi.date().optional(),
        // "Due Date": Joi.date().optional(),
        Descriptions: Joi.string().optional(),
        "Assignees Email": Joi.string().required(),
        "Estimated Hours": Joi.number().optional(),
        "Estimated Minutes": Joi.number().optional(),
        "Created By Email": Joi.string().required()
      });
      const payloadSchema = Joi.array().items(taskSchema).min(1).required();
      const { error, value } = payloadSchema.validate(dataPayload.parse, {
        abortEarly: false
      });

      let data = [];
      let resp = [];

      const projectData = await Projects.findOne({
        _id: new mongoose.Types.ObjectId(req.body?.project_id),
        isDeleted: false
      });

      const tasksStatus = await ProjectWorkFlowStatus.findOne({
        workflow_id: projectData?.workFlow,
        title: DEFAULT_DATA.WORKFLOW_STATUS.TODO,
        isDeleted: false
      });
      // for (const  [index, item]  of value) {
      for (let index = 0; index < value.length; index++) {
        const item = value[index];

        // console.log("${[index].toString()}", `${[index].toString()}`);
        // if (
        //   error?.details[index]?.message.includes(
        //     `Start Date" must be a valid date`
        //   ) &&
        //   error?.details[index]?.message.includes(`${[index].toString()}`)
        // ) {
        //   item["Due Date"] = moment(item["Due Date"]).format("YYYY-MM-DD");
        //   resp.push([{ record: item }, { error: "Start Date is Invalid" }]);
        //   continue;
        // }
        // if (
        //   error?.details[index]?.message.includes(
        //     `Due Date" must be a valid date`
        //   ) &&
        //   error?.details[index]?.message.includes(`${[index].toString()}`)
        // ) {
        //   item["Start Date"] = moment(item["Start Date"]).format("YYYY-MM-DD");
        //   resp.push([{ record: item }, { error: "Due Date is Invalid" }]);
        //   continue;
        // }
        // if (item["Start Date"] && item["Due Date"]) {
        //   item["Start Date"] = moment(item["Start Date"]).format("YYYY-MM-DD");
        //   item["Due Date"] = moment(item["Due Date"]).format("YYYY-MM-DD");
        // }

        // console.log("itenmm", item);
        if (item["Task"] == undefined) {
          resp.push([{ record: item }, { error: "Task is required" }]);
          continue;
        }
        // if (item["Start Date"] == undefined) {
        //   resp.push([{ record: item }, { error: "Start Date is required" }]);
        //   continue;
        // }
        // if (item["Due Date"] == undefined) {
        //   resp.push([{ record: item }, { error: "Due Date is required" }]);
        //   continue;
        // }
        if (item["Assignees Email"] == undefined) {
          resp.push([
            { record: item },
            { error: "Assignees Email is required" }
          ]);
          continue;
        }
        // if (item["Estimated Hours"] == undefined) {
        //   resp.push([
        //     { record: item },
        //     { error: "Estimated Hours is required" },
        //   ]);
        //   continue;
        // }
        // if (item["Estimated Minutes"] == undefined) {
        //   resp.push([
        //     { record: item },
        //     { error: "Estimated Minutes is required" },
        //   ]);
        //   continue;
        // }
        if (!item["Created By Email"]) {
          resp.push([{ record: item }, { error: "Created By Email required" }]);
          continue;
        }

        // if (item["Start Date"] && item["Due Date"]) {
        //   if (moment(item["Start Date"]) > moment(item["Due Date"])) {
        //     resp.push([
        //       { record: item },
        //       { error: "Start Date must not be after the Due Date" },
        //     ]);
        //     continue;
        //   }
        // }

        let createdByMail = item["Created By Email"]?.replace(/\s/g, "");
        const createdbyEmp = await Employees.find({
          email: createdByMail,
          isActivate: true,
          isDeleted: false
        }).select("_id emp_code full_name");
        if (createdbyEmp && createdbyEmp.length <= 0) {
          resp.push([{ record: item }, { error: "Created By User not found" }]);
          continue;
        }

        const isTask = await ProjectTasks.findOne({
          title: item["Task"],
          project_id: new mongoose.Types.ObjectId(req.body?.project_id),
          main_task_id: new mongoose.Types.ObjectId(req.body?.main_task_id),
          isDeleted: false
        });

        if (isTask) {
          resp.push([
            { record: item },
            { error: "Task already exists for this MainTask List" }
          ]);
          continue;
        }

        let assigneesMails = item["Assignees Email"]?.replace(/\s/g, "");
        let assignees = assigneesMails?.split(",");
        let employees = [];
        if (assignees != undefined) {
          employees = await Employees.find({
            email: { $in: assignees },
            isActivate: true,
            isDeleted: false
          }).select("_id emp_code full_name");
        }

        if (item["Assignees Email"] != undefined && employees.length <= 0) {
          resp.push([{ record: item }, { error: "Assignees Email not found" }]);
          continue;
        }

        if (item) {
          const tasks = new ProjectTasks({
            title: item["Task"],
            project_id: req.body?.project_id,
            main_task_id: req.body?.main_task_id,
            descriptions: item["Descriptions"] || "",
            // start_date:
            //   item["Start Date"] == "Invalid date" ? null : item["Start Date"],
            // due_date:
            //   item["Due Date"] == "Invalid date" ? null : item["Due Date"],
            estimated_hours: item["Estimated Hours"] || "00",
            estimated_minutes: item["Estimated Minutes"] || "00",
            task_status: tasksStatus?._id,
            assignees: employees?.map((assignee) => assignee._id) || [],
            taskId: generateRandomId(),
            isImported: true,
            recurringType: (item["Recurring Type(Monthly/Yearly)"] && (
              item["Recurring Type(Monthly/Yearly)"].toLowerCase().trim() === "month" ||
              item["Recurring Type(Monthly/Yearly)"].toLowerCase().trim() === "monthly"
            )) ? "monthly"
              : (item["Recurring Type(Monthly/Yearly)"] && (
                item["Recurring Type(Monthly/Yearly)"].toLowerCase().trim() === "year" ||
                item["Recurring Type(Monthly/Yearly)"].toLowerCase().trim() === "yearly"
              )) ? "yearly"
                : "",
            createdBy: createdbyEmp[0]?._id,
            updatedBy: createdbyEmp[0]?._id,
            ...(value?.task_status && {
              task_status_history: [
                {
                  task_status: value?.task_status,
                  updatedBy: req.user._id,
                  updatedAt: configs.utcDefault()
                }
              ]
            }),
            ...(await getRefModelFromLoginUser(createdbyEmp[0]?._id))
          });

          data.push(await tasks.save());
        }
      }

      // console.log("resp:", resp);
      const csvFields = [
        "Task",
        // "Start Date",
        // "Due Date",
        "Assignees Email",
        "Estimated Hours",
        "Estimated Minutes",
        "Created By Email",
        "Descriptions",
        "Response Errors"
      ];

      // Generate CSV data
      const csvData = resp.map((item) => ({
        // ...item[0].record,
        Task: item[0].record["Task"] ? item[0].record["Task"] : "-",
        // "Start Date": item[0].record["Start Date"]
        //   ? moment(item[0].record["Start Date"]).format("YYYY-MM-DD")
        //   : "-",
        // "Due Date": item[0].record["Due Date"]
        //   ? moment(item[0].record["Due Date"]).format("YYYY-MM-DD")
        //   : "-",
        "Assignees Email": item[0].record["Assignees Email"]
          ? item[0].record["Assignees Email"].replace(/,/g, "-")
          : "-",
        "Estimated Hours": item[0].record["Estimated Hours"]
          ? item[0].record["Estimated Hours"]
          : "-",
        "Estimated Minutes": item[0].record["Estimated Minutes"]
          ? item[0].record["Estimated Minutes"]
          : "-",
        "Created By Email": item[0].record["Created By Email"]
          ? item[0].record["Created By Email"]
          : "-",
        Descriptions: item[0].record["Descriptions"]
          ? item[0].record["Descriptions"]
          : "-",
        "Response Errors": item[1].error
      }));

      let CSVData = [csvFields, ...csvData.map((ele) => Object.values(ele))];

      if (resp && resp.length <= 0) {
        return successResponse(
          res,
          statusCode.CREATED,
          messages.TASK_CSV_IMPORT,
          data
        );
      } else {
        return successResponse(
          res,
          statusCode.PARTIAL,
          messages.VALIDATION_FAILED,
          CSVData
        );
      }
    } else {
      // if project id not found
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }
  } catch (error) {
    console.log("erere", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project task for Overview:
exports.getProjectsTaskOverview = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      countFor: Joi.string().required(),
      row: Joi.string().optional(),
      col: Joi.string().optional()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value?.project_id)
    };
    if (value?.countFor == "My") {
      if (value.countFor === "My") {
        matchQuery.assignees = new mongoose.Types.ObjectId(req.user._id);
      }
    }
    const projectData = await Projects.findOne({
      _id: new mongoose.Types.ObjectId(value?.project_id),
      isDeleted: false
    });

    const tasksStatus = await ProjectWorkFlowStatus.findOne({
      workflow_id: projectData?.workFlow,
      title: DEFAULT_DATA.WORKFLOW_STATUS.DONE,
      isDeleted: false
    });

    const mainQuery = [
      { $match: matchQuery },
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
                    { $eq: ["$isDeleted", false] },
                    {
                      $ne: [
                        "$_id",
                        new mongoose.Types.ObjectId(tasksStatus?._id)
                      ]
                    }
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
          preserveNullAndEmptyArrays: false
        }
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
                    { $in: ["$_id", "$$task_labels"] },
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
          let: { assigneesIds: "$assignees" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$assigneesIds"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "assignees"
        }
      },

      {
        $project: {
          _id: 1,
          title: 1,
          start_date: 1,
          due_date: 1,
          main_task_id: 1,
          project_id: 1,
          assignees: 1,
          taskLabels: {
            _id: 1,
            title: 1,
            color: 1
          },
          task_status: {
            _id: 1,
            title: 1,
            color: 1
          },
          assignees: {
            $map: {
              input: {
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$assignees" },
                      { $ne: ["$assignees", []] }
                    ]
                  },
                  then: "$assignees",
                  else: []
                }
              },
              as: "assigneeId",
              in: {
                _id: "$$assigneeId._id",
                emp_img: "$$assigneeId.emp_img",
                name: "$$assigneeId.full_name",
                first_name: "$$assigneeId.first_name",
                last_name: "$$assigneeId.last_name"
              }
            }
          },
          isOverdue: {
            $cond: {
              if: {
                $and: [
                  { $lt: ["$due_date", new Date()] },
                  { $ne: ["$due_date", null] },
                  {
                    $ne: [
                      {
                        $dateToString: {
                          format: "%Y-%m-%d",
                          date: "$due_date"
                        }
                      },
                      moment().format("YYYY-MM-DD")
                    ]
                  }
                ]
              },
              then: true,
              else: false
            }
          },
          isToday: {
            $or: [
              {
                $eq: [
                  { $dateToString: { format: "%Y-%m-%d", date: "$due_date" } },
                  moment().format("YYYY-MM-DD")
                ]
              },
              {
                $eq: [
                  { $dateToString: { format: "%Y-%m-%d", date: "$start_date" } },
                  moment().format("YYYY-MM-DD")
                ]
              }
            ]
          },
          isUpcoming: {
            $and: [
              { $gt: ["$due_date", new Date()] },
              { $ne: ["$due_date", null] }
            ]
          },
          noDateSet: {
            $and: [{ $eq: ["$start_date", null] }, { $eq: ["$due_date", null] }]
          }
        }
      }
    ];

    let data = await ProjectTasks.aggregate(mainQuery);

    let overDue = [];
    let today = [];
    let upComing = [];
    let noDate = [];
    data.forEach((ele) => {
      if (ele.isOverdue) {
        overDue.push(ele);
      } else if (ele.isUpcoming) {
        upComing.push(ele);
      } else if (ele.isToday) {
        today.push(ele);
      } else if (ele.noDateSet) {
        noDate.push(ele);
      }
    });

    if (
      (value?.row && value?.col) ||
      (value?.row != undefined && value?.col != undefined) ||
      (value?.row != "" && value?.col != "")
    ) {
      switch (value?.col) {
        case "All":
          if (value?.countFor == "All") {
            switch (value?.row) {
              case "Overdue":
                return successResponse(
                  res,
                  statusCode.SUCCESS,
                  messages.LISTING,
                  overDue
                );
              case "Today":
                return successResponse(
                  res,
                  statusCode.SUCCESS,
                  messages.LISTING,
                  today
                );
              case "No date set":
                return successResponse(
                  res,
                  statusCode.SUCCESS,
                  messages.LISTING,
                  noDate
                );
              case "Upcoming":
                return successResponse(
                  res,
                  statusCode.SUCCESS,
                  messages.LISTING,
                  upComing
                );
            }
          }
        case "My":
          if (value?.countFor == "My") {
            switch (value?.row) {
              case "Overdue":
                return successResponse(
                  res,
                  statusCode.SUCCESS,
                  messages.LISTING,
                  overDue
                );
              case "Today":
                return successResponse(
                  res,
                  statusCode.SUCCESS,
                  messages.LISTING,
                  today
                );
              case "No date set":
                return successResponse(
                  res,
                  statusCode.SUCCESS,
                  messages.LISTING,
                  noDate
                );
              case "Upcoming":
                return successResponse(
                  res,
                  statusCode.SUCCESS,
                  messages.LISTING,
                  upComing
                );
            }
          }
      }
    }
    const closedTasksCount = await ProjectTasks.countDocuments({
      ...matchQuery,
      task_status: tasksStatus?._id,
      isDeleted: false
    });

    let countData = {
      // data: [...data],
      totalTasks: data.length,
      overDue: overDue.length,
      upComing: upComing.length,
      today: today.length,
      noDate: noDate.length,
      closed: closedTasksCount
    };

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      value._id ? countData[0] : countData
    );
  } catch (error) {
    console.log("🚀 ~ exports.getProjectsTaskOverview= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
