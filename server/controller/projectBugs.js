const Joi = require("joi");
const XLSX = require("xlsx");
const moment = require("moment");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const ProjectBugs = mongoose.model("projecttaskbugs");
const Employees = mongoose.model("employees");
const ProjectTaskUpdateHistory = mongoose.model("taskupdatehistory");
const ProjectBugsWorkFlowStatus = mongoose.model("bugsworkflowstatus");
const ProjectBugLabels = mongoose.model("tasklabels");
const ProjectTasks = mongoose.model("projecttasks");
const PMSClients = mongoose.model("pmsclients");

const {
  getPagination,
  getTotalCountQuery,
  searchDataArr
} = require("../helpers/queryHelper");
const { statusCode, DEFAULT_DATA } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const {
  generateRandomId,
  arraysAreEqual,
  getArrayChanges,
  getRefModelFromLoginUser,
  getCreatedUpdatedDeletedByQuery,
  getClientQuery
} = require("../helpers/common");
const { filesManageInDB } = require("./fileUploads");
const { mailForBugAssignees, getProjectBugsData } = require("./sendEmail");
const {
  checkLoginUserIsProjectManager,
  checkLoginUserIsProjectAccountManager
} = require("./projectMainTask");
const { bugWorkflowStatusUpdateMail } = require("../template/projectBugs");
const { checkUserIsAdmin } = require("./authentication");
const { sheet } = require("../template/exportRepeatedBugsCSV");
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
exports.projectBugExists = async (reqData, id = null) => {
  try {
    let isExist = false;
    // const data = await ProjectBugs.findOne({
    //   isDeleted: false,
    //   title: { $regex: new RegExp(`^${reqData?.title}$`, "i") },
    //   project_id: new mongoose.Types.ObjectId(reqData.project_id),
    //   task_id: new mongoose.Types.ObjectId(reqData.task_id),
    //   ...(reqData.sub_task_id
    //     ? { sub_task_id: new mongoose.Types.ObjectId(reqData.sub_task_id) }
    //     : {}),
    //   ...(id
    //     ? {
    //       _id: { $ne: id },
    //     }
    //     : {}),
    // });
    // if (data) isExist = true;

    const data = await ProjectBugs.aggregate([
      {
        $match: {
          $or: [
            { project_id: new mongoose.Types.ObjectId(reqData?.project_id) },
            { task_id: new mongoose.Types.ObjectId(reqData?.task_id) }
          ],
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
          titleLower: reqData?.title.trim().toLowerCase() // Match the lowercase title
        }
      }
    ]);
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectBugExists= ~ error:", error);
  }
};

//Add Project bugs :
exports.addProjectsBugs = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      title: Joi.string().required(),
      bugId: Joi.string().optional().allow(""),
      project_id: Joi.string().required(),
      task_id: Joi.string().optional().default(null),
      sub_task_id: Joi.string().optional().default(null),
      status: Joi.string().optional().default("active"),
      descriptions: Joi.string().optional().allow("").default(""),
      bug_labels: Joi.string().optional().allow(""),
      start_date: Joi.date().optional().allow(null),
      due_date: Joi.date().optional().allow(null),
      assignees: Joi.array().optional(),
      pms_clients: Joi.array().optional().default([]),
      estimated_hours: Joi.string().optional().default("00"),
      estimated_minutes: Joi.string().optional().default("00"),
      attachments: Joi.any().optional(),
      folder_id: Joi.any().optional(),
      progress: Joi.string().optional().default("0"),
      bug_status: Joi.string().optional(),
      isRepeated: Joi.boolean().optional().default(false),
      createdBy: Joi.string().optional().allow(null, ""),
      createdAt: Joi.date().optional().allow(null)
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
    if (await this.projectBugExists(value)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let statusData = await ProjectBugsWorkFlowStatus.findOne({
        title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.TODO
      }).select("_id");

      // data type of bug_labels changed array to string .. need to manage here cause of this use in other module
      let bug_labels = [];
      if (value?.bug_labels && value?.bug_labels != "")
        bug_labels = [new mongoose.Types.ObjectId(value.bug_labels)];

      value.bug_labels = bug_labels;
      let data = new ProjectBugs({
        title: value.title,
        bugId: value.bugId || generateRandomId(),
        project_id: value.project_id,
        task_id: value.task_id || null,
        sub_task_id: value.sub_task_id || null,
        bug_status: value.bug_status || statusData._id,
        assignees: value.assignees || [],
        pms_clients: value.pms_clients || [],
        status: value.status,
        descriptions: value.descriptions || "",
        bug_labels: value.bug_labels || [],
        start_date: value.start_date || null,
        due_date: value.due_date || null,
        estimated_hours: value.estimated_hours,
        estimated_minutes: value.estimated_minutes,
        isRepeated: value.isRepeated,
        // attachments: value.attachments || [],
        progress: value.progress,
        ...(value?.bug_status && {
          bug_status_history: [
            {
              bug_status: value?.bug_status,
              updatedBy: req.user._id,
              updatedAt: configs.utcDefault()
            }
          ]
        }),

        createdBy: value.createdBy || req.user._id,
        ...(value.createdAt ? { createdAt: value.createdAt } : {}),
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
          null,
          null,
          null,
          null,
          null,
          null,
          newData._id
        );
      }

      // Add a data in history..
      let newHistory = new ProjectTaskUpdateHistory({
        project_id: value.project_id,
        bug_id: newData._id,
        updated_key: "createdAt",
        createdBy: req.user._id,
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user))
      });
      await newHistory.save();

      // send mail to assignee..
      if (value.assignees && value.assignees.length > 0) {
        await mailForBugAssignees(newData._id, [], decodedCompanyId);
      }
      return successResponse(
        res,
        statusCode.CREATED,
        messages.BUG_CREATED,
        data
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project bugs :
exports.getProjectsBugs = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
      project_id: Joi.string().required(),
      task_id: Joi.string().optional(),
      sub_task_id: Joi.string().optional(),
      // Filters..
      status: Joi.string().optional().default("active"), // active/archive
      bugWorkFlowStatus: Joi.array().optional().default(["all"]), // [all | _id]
      assignees: Joi.string().optional().default("all"), // all | un_assigned | _id
      labels: Joi.array().optional().default("all"), // [ all | un_assigned | _id]
      start_date: Joi.string().optional(),
      due_date: Joi.string().optional()
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
      // For details
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {}),

      // filters...
      ...(value.task_id
        ? { task_id: new mongoose.Types.ObjectId(value.task_id) }
        : {}),
      ...(value.sub_task_id
        ? { sub_task_id: new mongoose.Types.ObjectId(value.sub_task_id) }
        : {}),
      ...(value.status ? { status: value.status } : {}),
      ...(value?.bugWorkFlowStatus && !value?.bugWorkFlowStatus.includes("all")
        ? {
            bug_status: {
              $in: value.bugWorkFlowStatus.map(
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
          ? { bug_labels: { $size: 0 } }
          : {
              bug_labels: {
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
          from: "projecttasks",
          let: { taskId: "$task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$taskId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "task"
        }
      },
      {
        $unwind: {
          path: "$task",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projectsubtasks",
          let: { subTaskId: "$sub_task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$subTaskId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "sub_task"
        }
      },
      {
        $unwind: {
          path: "$sub_task",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projecttaskhourlogs",
          let: { bugsId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$bug_id", "$$bugsId"] },
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
        $lookup: {
          from: "bugsworkflowstatuses",
          let: { bug_status_history: "$bug_status_history" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$bug_status_history"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "bug_status_history"
        }
      },

      {
        $lookup: {
          from: "fileuploads",
          let: { bugs_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$bugs_id", "$$bugs_id"] },
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
          let: { bug_labels: "$bug_labels" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$bug_labels"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "bug_labels"
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
                          60
                        ] // Convert hours to minutes
                      },
                      {
                        $toDouble: "$$this.logged_minutes" // Convert string to double
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
          bugId: 1,
          bug_labels: 1,
          time: {
            $concat: [
              {
                $toString: {
                  $floor: {
                    $divide: ["$totalLoggedTime", 60]
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
                          { $lt: [{ $mod: ["$totalLoggedTime", 60] }, 10] },
                          "0",
                          ""
                        ]
                      }
                    },
                    {
                      $toString: {
                        $mod: ["$totalLoggedTime", 60]
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
          start_date: 1,
          due_date: 1,
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
          progress: 1,
          task: 1,
          sub_task: 1,
          bug_status: {
            _id: 1,
            title: 1
          },
          taskLabels: 1,
          isRepeated: 1,
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
                name: "$$assigneeId.full_name"
              }
            }
          }
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await ProjectBugs.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await ProjectBugs.aggregate([
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

//Update Project bugs :
exports.updateProjectsBugs = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      updated_key: Joi.array().min(1).required(),
      title: Joi.string().required(),
      bugId: Joi.string().optional().allow(""),
      project_id: Joi.string().required(),
      task_id: Joi.string().optional().default(null),
      sub_task_id: Joi.string().optional().default(null),
      status: Joi.string().optional().default("active"),
      descriptions: Joi.string().optional().allow("").default(""),
      bug_labels: Joi.string().optional().allow(""),
      start_date: Joi.date().optional().allow(null),
      due_date: Joi.date().optional().allow(null),
      assignees: Joi.array().optional(),
      pms_clients: Joi.array().default([]),
      estimated_hours: Joi.string().optional().default("00"),
      estimated_minutes: Joi.string().optional().default("00"),
      attachments: Joi.any().optional(),
      folder_id: Joi.any().optional(),
      progress: Joi.string().optional().default("0"),
      bug_status: Joi.string().optional(),
      isRepeated: Joi.boolean().optional(),
      createdBy: Joi.string().optional().allow(null, ""),
      createdAt: Joi.date().optional().allow(null)
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (await this.projectBugExists(value, req.params.id)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      // data type of bug_labels changed array to string .. need to manage here cause of this use in other module
      let bug_labels = [];
      if (value?.bug_labels && value?.bug_labels != "")
        bug_labels = [new mongoose.Types.ObjectId(value.bug_labels)];

      value.bug_labels = bug_labels;
      const getData = await ProjectBugs.findById(req.params.id);
      // Get update obj...
      const { updateObj, historyUpdateArr } = await this.getDataForBugUpdate(
        req.user,
        getData,
        {
          ...value,
          bug_id: req.params.id
        }
      );

      const data = await ProjectBugs.findByIdAndUpdate(
        req.params.id,
        { ...updateObj, isRepeated: value.isRepeated },
        {
          new: true
        }
      );

      if (!data) {
        return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
      }

      if (historyUpdateArr && historyUpdateArr?.length) {
        const newHistory = await ProjectTaskUpdateHistory.insertMany(
          historyUpdateArr
        );
      }

      // For send mail for new added subscribers..
      const assigneesData = getArrayChanges(
        getData.assignees.map((a) => a.toString()),
        value.assignees
      );

      if (assigneesData.added && assigneesData.added.length > 0) {
        await mailForBugAssignees(
          req.params.id,
          assigneesData.added,
          decodedCompanyId
        );
      }
      return successResponse(
        res,
        statusCode.SUCCESS,
        messages.BUG_UPDATED,
        data
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// update status...
exports.updateProjectsBugStatus = async (req, res) => {
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

    const data = await ProjectBugs.findByIdAndUpdate(
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
      messages.BUG_STATUS_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project bugs :
exports.deleteProjectsBugs = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Get the bug data before deletion for logging
    const bugData = await ProjectBugs.findById(req.params.id).lean();
    
    const data = await ProjectBugs.findByIdAndUpdate(
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
    if (userInfo && bugData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "bugs",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: bugData,
        additionalData: {
          recordId: bugData._id.toString(),
          isSoftDelete: true
        }
      });
    }

    return successResponse(res, statusCode.SUCCESS, messages.BUG_DELETED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// update workflow...
exports.updateProjectsBugWorkflow = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      bug_status: Joi.string().required()
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
    const getData = await getProjectBugsData(req.params.id);

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
      bug_id: new mongoose.Types.ObjectId(req.params.id),
      project_id: new mongoose.Types.ObjectId(getData?.project?._id),
      createdBy: loginUserId,
      createdAt: configs.utcDefault(),
      ...(await getRefModelFromLoginUser(req?.user)),
      ...common
    };

    if (value?.bug_status) {
      updateObj.bug_status = value?.bug_status;

      // if previous and new both value same no need to update..
      if (getData?.bug_status?._id.toString() !== value?.bug_status) {
        let previousBugStatusTitle = "";
        let newBugStatusTitle = "";

        if (getData?.bug_status?._id) {
          const previousTaskStatus = await ProjectBugsWorkFlowStatus.findById(
            getData?.bug_status?._id
          );
          previousBugStatusTitle = previousTaskStatus
            ? previousTaskStatus.title
            : "";
        }

        if (value?.bug_status) {
          const newTaskStatus = await ProjectBugsWorkFlowStatus.findById(
            value?.bug_status
          );
          newBugStatusTitle = newTaskStatus ? newTaskStatus.title : "";
        }
        updateObj = {
          ...updateObj,
          ...(getData?.bug_status?._id && !value?.bug_status
            ? {
                bug_status_history: [
                  ...getData?.bug_status_history,
                  {
                    bug_status: null,
                    ...common
                  }
                ]
              }
            : !getData?.bug_status?._id && value?.bug_status
            ? {
                bug_status_history: [
                  {
                    bug_status: value?.bug_status,
                    ...common
                  }
                ]
              }
            : getData?.bug_status?._id &&
              value?.bug_status &&
              getData?.bug_status?._id.toString() !==
                value?.bug_status.toString()
            ? {
                bug_status_history: [
                  ...getData?.bug_status_history,
                  {
                    bug_status: value?.bug_status,
                    ...common
                  }
                ]
              }
            : getData?.bug_status_history)
        };

        historyUpdateObj = {
          ...historyUpdateObj,
          updated_key: "bug_status",
          pervious_value: previousBugStatusTitle,
          new_value: newBugStatusTitle
        };
        // save update history..
        const newHistory = new ProjectTaskUpdateHistory(historyUpdateObj);
        await newHistory.save();
      }
    }

    const data = await ProjectBugs.findByIdAndUpdate(req.params.id, updateObj, {
      new: true
    });

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    // after update ...
    const updatedData = await getProjectBugsData(req.params.id);

    await bugWorkflowStatusUpdateMail(
      {
        oldData: getData,
        newData: updatedData
      },
      decodedCompanyId
    );

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.BUG_STATUS_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Project bugs details :
exports.projectBugsDetailedData = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      task_id: Joi.string().optional(),
      bug_work_flow_status: Joi.array().optional().default(["all"]),
      status: Joi.string().optional().allow("").default(null),
      bug_status: Joi.string().optional().allow("").default(null),
      start_date: Joi.string().optional().allow("").default(null),
      due_date: Joi.string().optional().allow("").default(null),
      bug_labels: Joi.array().optional().default(["all"]),
      assignees: Joi.array().optional().default(["all"])
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const [isAdmin, isManager, isAccManager] = await Promise.all([
      checkUserIsAdmin(req.user._id),
      checkLoginUserIsProjectManager(value.project_id, req.user._id),
      checkLoginUserIsProjectAccountManager(value.project_id, req.user._id)
    ]);

    let bugQuery = [
      { $eq: ["$bug_status", "$$statusId"] },
      {
        $eq: ["$project_id", new mongoose.Types.ObjectId(value.project_id)]
      },
      { $eq: ["$isDeleted", false] }
    ];

    if (!isManager && !isAdmin && !isAccManager) {
      bugQuery = [
        ...bugQuery,
        {
          $or: [
            {
              $eq: ["$createdBy", new mongoose.Types.ObjectId(req.user._id)]
            },
            {
              $in: [new mongoose.Types.ObjectId(req.user._id), "$assignees"]
            },
            {
              $eq: [
                // "$task.createdBy",
                { $ifNull: ["$task.createdBy", null] },
                new mongoose.Types.ObjectId(req.user._id)
              ]
            },
            {
              $in: [
                new mongoose.Types.ObjectId(req.user._id),
                // "$task.assignees",
                { $ifNull: ["$task.assignees", []] }
              ]
            },
            {
              $in: [
                new mongoose.Types.ObjectId(req.user._id),
                // "$task.pms_clients",
                { $ifNull: ["$task.pms_clients", []] }
              ]
            },
            {
              $in: [
                new mongoose.Types.ObjectId(req.user._id),
                // "$task.pms_clients",
                { $ifNull: ["$project.pms_clients", []] }
              ]
            }
          ]
        }
      ];
    }

    // Filters..
    if (value.task_id && value.task_id !== "")
      bugQuery = [
        ...bugQuery,
        { $eq: ["$task_id", new mongoose.Types.ObjectId(value.task_id)] }
      ];

    if (value.status && value.status !== "")
      bugQuery = [...bugQuery, { $eq: ["$status", value.status] }];

    if (value.bug_status && value.bug_status !== "")
      bugQuery = [
        ...bugQuery,
        { $eq: ["$bug_status", new mongoose.Types.ObjectId(value.bug_status)] }
      ];

    if (value.start_date && value.start_date !== "")
      bugQuery = [
        ...bugQuery,
        {
          $gte: [
            "$start_date",
            moment(value.start_date).startOf("day").toDate()
          ]
        }
      ];

    if (value.due_date && value.due_date !== "")
      bugQuery = [
        ...bugQuery,
        {
          $lte: ["$due_date", moment(value.due_date).startOf("day").toDate()]
        }
      ];

    if (
      value?.bug_work_flow_status &&
      !value?.bug_work_flow_status.includes("all")
    ) {
      bugQuery = [
        ...bugQuery,
        {
          $in: ["$bug_status", value.bug_work_flow_status]
        }
      ];
    }

    if (value.assignees && !value.assignees.includes("all")) {
      if (value.assignees.includes("un_assigned")) {
        bugQuery = [
          ...bugQuery,
          {
            $eq: ["$assignees", []]
          }
        ];
      } else {
        // bugQuery = [
        //   ...bugQuery,
        //   {
        //     $in: [
        //       "$assignees",
        //       value.assignees.map((l) => new mongoose.Types.ObjectId(l)),
        //     ],
        //   },
        // ];
        bugQuery = [
          ...bugQuery,
          {
            $setEquals: [
              "$assignees",
              value.assignees.map((l) => new mongoose.Types.ObjectId(l))
            ]
          }
        ];
      }
    }

    if (value.bug_labels && !value.bug_labels.includes("all")) {
      if (value.bug_labels.includes("un_assigned")) {
        bugQuery = [
          ...bugQuery,
          {
            $eq: ["$bug_labels", []]
          }
        ];
      } else {
        bugQuery = [
          ...bugQuery,
          {
            $in: [
              "$bug_labels",
              value.bug_labels.map((l) => new mongoose.Types.ObjectId(l))
            ]
          }
        ];
      }
    }

    const mainQuery = [
      {
        $match: {
          isDeleted: false
        }
      },
      {
        $lookup: {
          from: "projecttaskbugs",
          let: { statusId: "$_id" },
          pipeline: [
            {
              $lookup: {
                from: "projects",
                let: { projectId: "$project_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$projectId"] },
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
                from: "projecttasks",
                let: { task_id: "$task_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$task_id"] },
                          { $eq: ["$isDeleted", false] }
                        ]
                      }
                    }
                  }
                ],
                as: "task"
              }
            },
            {
              $unwind: {
                path: "$task",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $match: {
                $expr: {
                  $and: bugQuery
                }
              }
            },
            {
              $lookup: {
                from: "employees",
                let: { reporterId: "$createdBy" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$reporterId"] },
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
                as: "createdBy"
              }
            },
            {
              $unwind: {
                path: "$createdBy",
                preserveNullAndEmptyArrays: true
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

            {
              $lookup: {
                from: "tasklabels",
                let: { labelId: "$bug_labels" },
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
                as: "bug_labels"
              }
            },

            {
              $lookup: {
                from: "projecttaskhourlogs",
                let: { bug_id: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$bug_id", "$$bug_id"] },
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
                as: "bug_hours"
              }
            },
            {
              $addFields: {
                totalLoggedTime: {
                  $reduce: {
                    input: "$bug_hours",
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
                                60
                              ] // Convert hours to minutes
                            },
                            {
                              $toDouble: "$$this.logged_minutes" // Convert string to double
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
              $lookup: {
                from: "bugscomments",
                let: { bugId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$bug_id", "$$bugId"] },
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
              $lookup: {
                from: "bugsworkflowstatuses",
                let: { bugId: "$bug_status" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$bugId"] },
                          { $eq: ["$isDeleted", false] }
                        ]
                      }
                    }
                  }
                ],
                as: "bug_status_details"
              }
            },
            {
              $project: {
                _id: 1,
                title: 1,
                bugId: 1,
                status: 1,
                bug_status: 1,
                createdBy: 1,
                assignees: 1,
                pms_clients: 1,
                estimated_hours: 1,
                estimated_minutes: 1,
                start_date: 1,
                due_date: 1,
                estimated_hours: 1,
                estimated_minutes: 1,
                descriptions: 1,
                bug_status_details: {
                  _id: 1,
                  title: 1,
                  color: 1
                },
                bug_labels: 1,
                comments: { $size: "$comments" },
                isRepeated: 1,
                task: {
                  _id: 1,
                  title: 1,
                  taskId: 1
                },
                total_logged_hours: {
                  // only hours
                  $floor: {
                    $divide: ["$totalLoggedTime", 60]
                  }
                },
                total_logged_minutes: {
                  $mod: ["$totalLoggedTime", 60]
                }
              }
            },
            {
              $sort: { _id: -1 }
            }
          ],
          as: "bugs"
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          color: 1,
          bugs: 1,
          total_bugs: {
            $size: "$bugs"
          }
        }
      },
      {
        $sort: {
          sequence: 1
        }
      }
    ];

    const data = await ProjectBugsWorkFlowStatus.aggregate(mainQuery);
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    console.log("🚀 ~ exports.projectBugsDetailedData= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// get data for bug update and manage history data..
exports.getDataForBugUpdate = async (loginUser, perviousData, reqBody) => {
  try {
    const loginUserId = loginUser?._id;
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
        ...(reqBody?.bug_id
          ? { bug_id: new mongoose.Types.ObjectId(reqBody?.bug_id) }
          : {}),
        createdBy: loginUserId,
        createdAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(loginUser)),
        ...common
      };

      for (let i = 0; i < reqBody?.updated_key?.length; i++) {
        const element = reqBody?.updated_key[i];

        switch (element) {
          case "bugId":
            if (typeof reqBody?.bugId !== "undefined") {
              updateObj.bugId = reqBody?.bugId;
              if (perviousData?.bugId !== reqBody?.bugId) {
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: perviousData?.bugId,
                  new_value: reqBody?.bugId
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

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

          case "bug_labels":
            if (reqBody?.bug_labels) {
              updateObj.bug_labels = reqBody?.bug_labels;
              let previousTaskLabelsTitle = "";
              let newTaskLabelsTitle = "";

              // if previous and new both value same no need to update..
              if (
                !arraysAreEqual(
                  reqBody?.bug_labels,
                  perviousData?.bug_labels.map((a) => a.toString())
                )
              ) {
                if (
                  perviousData?.bug_labels &&
                  perviousData?.bug_labels.length > 0
                ) {
                  const previousTaskLabels = await ProjectBugLabels.find({
                    _id: { $in: perviousData?.bug_labels },
                    isDeleted: false
                  });
                  previousTaskLabelsTitle = previousTaskLabels
                    .map((p) => p.title)
                    .join(",");
                }

                if (reqBody?.bug_labels && reqBody?.bug_labels.length > 0) {
                  const newTaskLabels = await ProjectBugLabels.find({
                    _id: { $in: reqBody?.bug_labels },
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
            if (reqBody?.start_date) {
              updateObj.start_date = reqBody?.start_date;
              // if previous and new both value same no need to update..
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
            break;

          case "due_date":
            if (reqBody?.due_date) {
              updateObj.due_date = reqBody?.due_date;
              // if previous and new both value same no need to update..
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
            break;

          case "assignees":
            if (reqBody?.assignees) {
              updateObj.assignees = reqBody?.assignees;

              let changedArr = getArrayChanges(
                (perviousData?.assignees || []).map((a) => a.toString()),
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
                }
                // remove assignee...
                if (changedArr?.removed?.length > 0) {
                  updateKey = "remove_assignee";
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

          case "createdBy":
            if (typeof reqBody?.createdBy !== "undefined" && reqBody?.createdBy) {
              updateObj.createdBy = reqBody?.createdBy;

              if ((perviousData?.createdBy?.toString?.() || perviousData?.createdBy?.toString()) !== reqBody?.createdBy) {
                const previousReporter = perviousData?.createdBy
                  ? await Employees.findById(perviousData.createdBy).select("full_name")
                  : null;
                const newReporter = await Employees.findById(reqBody.createdBy).select("full_name");

                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: previousReporter?.full_name || "",
                  new_value: newReporter?.full_name || ""
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }

            break;

          case "createdAt":
            if (typeof reqBody?.createdAt !== "undefined" && reqBody?.createdAt) {
              updateObj.createdAt = reqBody?.createdAt;

              if (
                !moment(perviousData?.createdAt).isSame(
                  moment(reqBody?.createdAt),
                  "day"
                )
              ) {
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: perviousData?.createdAt,
                  new_value: reqBody?.createdAt
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }

            break;

          case "pms_clients":
            if (reqBody?.pms_clients) {
              updateObj.pms_clients = reqBody?.pms_clients;

              let changedArr = getArrayChanges(
                (perviousData?.pms_clients || []).map((a) => a.toString()),
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

          case "progress":
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
                null,
                null,
                null,
                null,
                null,
                null,
                reqBody.bug_id
              );
            }
            break;

          case "bug_status":
            if (reqBody?.bug_status) {
              updateObj.bug_status = reqBody?.bug_status;

              // if previous and new both value same no need to update..
              if (perviousData?.bug_status.toString() !== reqBody?.bug_status) {
                let previousBugStatusTitle = "";
                let newBugStatusTitle = "";

                if (perviousData?.bug_status) {
                  const previousTaskStatus =
                    await ProjectBugsWorkFlowStatus.findById(
                      perviousData?.bug_status
                    );
                  previousBugStatusTitle = previousTaskStatus
                    ? previousTaskStatus.title
                    : "";
                }

                if (reqBody?.bug_status) {
                  const newTaskStatus =
                    await ProjectBugsWorkFlowStatus.findById(
                      reqBody?.bug_status
                    );
                  newBugStatusTitle = newTaskStatus ? newTaskStatus.title : "";
                }
                updateObj = {
                  ...updateObj,
                  ...(perviousData?.bug_status && !reqBody?.bug_status
                    ? {
                        bug_status_history: [
                          ...perviousData?.bug_status_history,
                          {
                            bug_status: null,
                            updatedBy: loginUserId,
                            updatedAt: configs.utcDefault(),
                            ...(await getRefModelFromLoginUser(
                              loginUserId,
                              true
                            ))
                          }
                        ]
                      }
                    : !perviousData?.bug_status && reqBody?.bug_status
                    ? {
                        bug_status_history: [
                          {
                            bug_status: reqBody?.bug_status,
                            updatedBy: loginUserId,
                            updatedAt: configs.utcDefault(),
                            ...(await getRefModelFromLoginUser(
                              loginUserId,
                              true
                            ))
                          }
                        ]
                      }
                    : perviousData?.bug_status &&
                      reqBody?.bug_status &&
                      perviousData?.bug_status.toString() !==
                        reqBody?.bug_status.toString()
                    ? {
                        bug_status_history: [
                          ...perviousData?.bug_status_history,
                          {
                            bug_status: reqBody?.bug_status,
                            updatedBy: loginUserId,
                            updatedAt: configs.utcDefault(),
                            ...(await getRefModelFromLoginUser(
                              loginUserId,
                              true
                            ))
                          }
                        ]
                      }
                    : perviousData?.bug_status_history)
                };
                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: previousBugStatusTitle,
                  new_value: newBugStatusTitle
                };
                historyUpdateArr = [...historyUpdateArr, historyUpdateObj];
              }
            }
            break;

          case "task":
            if (reqBody?.task_id) {
              updateObj.task_id = reqBody?.task_id;

              // if previous and new both value same no need to update..
              if (perviousData?.task_id?.toString() !== reqBody?.task_id) {
                let previousTaskTitle = "";
                let newTaskTitle = "";

                if (perviousData?.task_id) {
                  const previousTaskStatus = await ProjectTasks.findById(
                    perviousData?.task_id
                  );
                  previousTaskTitle = previousTaskStatus
                    ? previousTaskStatus.title
                    : "";
                }

                if (reqBody?.task_id) {
                  const newTaskStatus = await ProjectTasks.findById(
                    reqBody?.task_id
                  );
                  newTaskTitle = newTaskStatus ? newTaskStatus.title : "";
                }

                historyUpdateObj = {
                  ...historyUpdateObj,
                  updated_key: element,
                  pervious_value: previousTaskTitle,
                  new_value: newTaskTitle
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
    console.log("🚀 ~ exports.getDataForBugUpdate= ~ error:", error);
  }
};

// bugs history..
exports.getHistory = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      _id: Joi.string().optional(),
      bug_id: Joi.string().required()
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
      bug_id: new mongoose.Types.ObjectId(value.bug_id),
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

// exports.importBugsData = async (req, res) => {
//   try {

//     if (!req.files || !req.files.attachment) {
//       return res.json({
//         message: messages.IMPORT_FILE_NOT_FOUND,
//         statusCode: statusCode.BAD_REQUEST,
//       });
//     }
//     if (req.files.attachment.length !== 1) {
//       return res.json({
//         message: messages.SINGLE_FILE,
//         statusCode: statusCode.BAD_REQUEST,
//       });
//     }
//     const fileObj = req.files.attachment[0];

//     const fileExt =
//       fileObj.originalname.split(".")[
//         fileObj.originalname.split(".").length - 1
//       ];

//     if (!["xlsx", "xls", "csv"].includes(fileExt.toLowerCase())) {
//       return res.json({
//         message: messages.FILE_EXT,
//         statusCode: statusCode.BAD_REQUEST,
//       });
//     }
//     const dataPayload = jsonDataFromFile(fileObj);
//     dataPayload.parse.forEach((item) => {
//       if (typeof item["Estimated Hours"] === "number") {
//         item["Estimated Hours"] = item["Estimated Hours"].toString();
//       }
//       if (typeof item["Estimated Mintues"] === "number") {
//         item["Estimated Mintues"] = item["Estimated Mintues"].toString();
//       }
//       if (typeof item["Issue"] === "number") {
//         item["Issue"] = item["Issue"].toString();
//       }
//       if (typeof item["Project Name"] === "number") {
//         item["Project Name"] = item["Project Name"].toString();
//       }
//     });
//     const requiredColumns = [
//       "Issue",
//       "Project Name",
//       "Task Name",
//       "Created By Email",
//     ];
//     const allColumnsExist = (cols, requiredColumns) => {
//       return requiredColumns.every((column) => cols.includes(column));
//     };

//     if (!allColumnsExist(dataPayload.cols, requiredColumns)) {
//       return errorResponse(
//         res,
//         statusCode.BAD_REQUEST,
//         "Columns does not match, Please verify the Sample CSV"
//       );
//     }

//     const bugSchema = Joi.object({
//       "Issue Id": Joi.string().optional(),
//       Issue: Joi.string().optional().allow(""),
//       "Project Name": Joi.string().optional().allow(""),
//       "Task Name": Joi.string().optional().allow(""),
//       // "Sub Task Name": Joi.string().optional(),
//       Description: Joi.string().optional(),
//       "Start Date": Joi.date().optional(),
//       "Due Date": Joi.date().optional(),
//       "Assignees Email": Joi.string().optional(),
//       "Estimated Hours": Joi.string().optional(),
//       "Estimated Mintues": Joi.string().optional(),
//       Labels: Joi.string().optional(),
//       "Created By Email": Joi.string().optional(),
//     });
//     const payloadSchema = Joi.array().items(bugSchema).min(1).required();
//     const { error, value } = payloadSchema.validate(dataPayload.parse);
//     let data = [];
//     let resp = [];

//     for (const item of value) {
//       if (
//         error?.details[0].message.includes(`Start Date" must be a valid date`)
//       ) {
//         item["Due Date"] = moment(item["Due Date"]).format("YYYY-MM-DD");
//         resp.push([{ record: item }, { error: "Start Date is Invalid" }]);
//         continue;
//       }
//       if (
//         error?.details[0].message.includes(`Due Date" must be a valid date`)
//       ) {
//         item["Start Date"] = moment(item["Start Date"]).format("YYYY-MM-DD");
//         resp.push([{ record: item }, { error: "Due Date is Invalid" }]);
//         continue;
//       }
//       if (item["Start Date"] && item["Due Date"]) {
//         item["Start Date"] = moment(item["Start Date"]).format("YYYY-MM-DD");
//         item["Due Date"] = moment(item["Due Date"]).format("YYYY-MM-DD");
//       }
//       if (item["Issue"] == undefined) {
//         resp.push([{ record: item }, { error: "Issue is required" }]);
//         continue;
//       }
//       let isLabels = "";
//       if (item["Labels"]) {
//         let labels = item["Labels"].replace(/\s/g, "").split(",");
//         isLabels = await ProjectBugLabels.find({
//           title: { $in: labels },
//           isDeleted: false,
//         });
//         if (isLabels && isLabels.length <= 0) {
//           resp.push([{ record: item }, { error: "Bugs Labels not found" }]);
//           continue;
//         }
//       }
//       if (!item["Start Date"] && item["Due Date"]) {
//         item["Due Date"] = moment(item["Due Date"]).format("YYYY-MM-DD");
//         resp.push([
//           { record: item },
//           { error: "Start Date not found for the Due Date" },
//         ]);
//         continue;
//       }
//       if (item["Start Date"] && item["Due Date"]) {
//         if (moment(item["Start Date"]) > moment(item["Due Date"])) {
//           resp.push([
//             { record: item },
//             { error: "Start Date must not be after the Due Date" },
//           ]);
//           continue;
//         }
//       }
//       const isBugStatus = await ProjectBugsWorkFlowStatus.findOne({
//         title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.TODO,
//         isDeleted: false,
//       });
//       // if (!isBugStatus) {
//       //   resp.push([{ record: item }, { error: "Bugs WorkFlow Status is required" }]);
//       //   continue;
//       // }
//       const isProject = await Projects.findOne({
//         title: item["Project Name"],
//         isDeleted: false,
//       });
//       if (item["Project Name"] == undefined) {
//         resp.push([{ record: item }, { error: "Project name is required" }]);
//         continue;
//       }
//       if (!isProject) {
//         resp.push([{ record: item }, { error: "Project name not found" }]);
//         continue;
//       }
//       const isTask = await ProjectTasks.findOne({
//         title: item["Task Name"],
//         project_id: isProject._id,
//         isDeleted: false,
//       });
//       if (item["Task Name"] == undefined) {
//         resp.push([{ record: item }, { error: "Task name is required" }]);
//         continue;
//       }
//       if (!isTask) {
//         resp.push([{ record: item }, { error: "Task name not found" }]);
//         continue;
//       }
//       // const issubTask = await ProjectSubTasks.findOne({ // as not implemented yet so not checking it to further condition.
//       //   title: item["Sub Task Name"],
//       //   project_id: isProject._id,
//       //   task_id: isTask._id,
//       //   isDeleted: false,
//       // })
//       let assigneesMails = item["Assignees Email"]?.replace(/\s/g, "");
//       let assignees = assigneesMails?.split(",");
//       let employees = [];
//       if (assignees != undefined) {
//         employees = await Employees.find({
//           email: { $in: assignees },
//           isActivate: true,
//           isDeleted: false,
//         }).select("_id emp_code full_name");
//       }

//       if (item["Assignees Email"] != undefined && employees.length <= 0) {
//         resp.push([{ record: item }, { error: "Assignees Email not found" }]);
//         continue;
//       }
//       if (!item["Created By Email"]) {
//         resp.push([{ record: item }, { error: "Created By Email required" }]);
//         continue;
//       }
//       let createdByMail = item["Created By Email"]?.replace(/\s/g, "");
//       const createdbyEmp = await Employees.find({
//         email: createdByMail,
//         isActivate: true,
//         isDeleted: false,
//       }).select("_id emp_code full_name");
//       if (createdbyEmp && createdbyEmp.length <= 0) {
//         resp.push([{ record: item }, { error: "Created By Email not found" }]);
//         continue;
//       }
//       if (item) {
//         const bugExists = await ProjectBugs.find({
//           title: item["Issue"],
//           isDeleted: false,
//           project_id: isProject?._id,
//           task_id: isTask?._id,
//         });
//         const bugIdExists = await ProjectBugs.find({
//           isDeleted: false,
//           bugId: item["Issue Id"],
//           project_id: isProject?._id,
//           task_id: isTask?._id,
//         });
//         if (bugExists.length > 0) {
//           resp.push([
//             { record: item },
//             { error: "Issue for this task already exists" },
//           ]);
//           continue;
//         }
//         if (bugIdExists.length > 0) {
//           resp.push([
//             { record: item },
//             { error: "Issue Id for this task already exists" },
//           ]);
//           continue;
//         }
//         const bugs = new ProjectBugs({
//           title: item["Issue"],
//           project_id: isProject?._id,
//           task_id: isTask?._id,
//           bug_status: isBugStatus?._id,
//           descriptions: item["Description"] || "",
//           bugId: item["Issue Id"] || generateRandomId(),
//           start_date: item["Start Date"] || null,
//           due_date: item["Due Date"] || null,
//           assignees: employees?.map((assignee) => assignee._id) || [],
//           bug_labels:
//             isLabels?.length <= 0 ? [] : isLabels?.map((label) => label._id),
//           estimated_hours: item["Estimated Hours"] || "00",
//           estimated_minutes: item["Estimated Mintues"] || "00",
//           bug_status_history: [
//             {
//               bug_status: isBugStatus?._id,
//               updatedBy: createdbyEmp[0]?._id,
//               updatedAt: configs.utcDefault(),
//               ...(await getRefModelFromLoginUser(req?.user, true)),
//             },
//           ],
//           isImported: true,
//           createdBy: createdbyEmp[0]?._id,
//           updatedBy: createdbyEmp[0]?._id,
//           ...(await getRefModelFromLoginUser(createdbyEmp[0]?._id)),
//         });

//         data.push(await bugs.save());
//       }
//     }

//     const csvFields = [
//       "Issue",
//       "Project Name",
//       "Task Name",
//       "Description",
//       "Start Date",
//       "Due Date",
//       "Assignees Email",
//       "Estimated Hours",
//       "Estimated Minutes",
//       "Labels",
//       "Created By Email",
//       "Response Errors",
//     ];

//     // Generate CSV data
//     const csvData = resp.map((item) => ({
//       // ...item[0].record,
//       Issue: item[0].record["Issue"] ? item[0].record["Issue"] : "-",
//       "Project Name": item[0].record["Project Name"]
//         ? item[0].record["Project Name"]
//         : "-",
//       "Task Name": item[0].record["Task Name"]
//         ? item[0].record["Task Name"]
//         : "-",
//       Description: item[0].record["Description"]
//         ? item[0].record["Description"]
//         : "-",
//       "Start Date": item[0].record["Start Date"]
//         ? item[0].record["Start Date"]
//         : "-",
//       "Due Date": item[0].record["Due Date"] ? item[0].record["Due Date"] : "-",
//       "Assignees Email": item[0].record["Assignees Email"]
//         ? item[0].record["Assignees Email"]
//         : "-",
//       "Estimated Hours": item[0].record["Estimated Hours"]
//         ? item[0].record["Estimated Hours"]
//         : "-",
//       "Estimated Minutes": item[0].record["Estimated Minutes"]
//         ? item[0].record["Estimated Minutes"]
//         : "-",
//       Labels: item[0].record["Labels"] ? item[0].record["Labels"] : "-",
//       "Created By Email": item[0].record["Created By Email"]
//         ? item[0].record["Created By Email"]
//         : "-",
//       "Response Errors": item[1].error,
//     }));

//     // const json2csvParser = new Parser({ fields: csvFields });
//     // const csv = json2csvParser.parse(csvData);
//     // const filePath = "./public/exported_datta.csv";
//     // fs.writeFileSync(filePath, csv);
//     let CSVData = [csvFields, ...csvData.map((ele) => Object.values(ele))];

//     if (resp && resp.length <= 0) {
//       return successResponse(
//         res,
//         statusCode.CREATED,
//         messages.BUG_CSV_IMPORT,
//         data
//       );
//     } else {
//       return successResponse(
//         res,
//         statusCode.PARTIAL,
//         messages.VALIDATION_FAILED,
//         CSVData
//       );

//       // res.status(statusCode.PARTIAL).download(filePath);
//     }
//   } catch (error) {
//     console.log(error);
//     return catchBlockErrorResponse(res, error.message);
//   }
// };

exports.exportRepeatedBugsCSV = async (req, res) => {
  try {
    const projectId = req.params.id;
    let matchQuery = {
      isDeleted: false,
      isRepeated: true,
      project_id: new mongoose.Types.ObjectId(projectId)
    };
    const mainQuery = [
      {
        $lookup: {
          from: "projecttasks",
          let: { taskId: "$task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$taskId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "task"
        }
      },
      {
        $unwind: {
          path: "$task",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projectsubtasks",
          let: { subTaskId: "$sub_task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$subTaskId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "sub_task"
        }
      },
      {
        $unwind: {
          path: "$sub_task",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projecttaskhourlogs",
          let: { bugsId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$bug_id", "$$bugsId"] },
                    {
                      $eq: [
                        "$project_id",
                        new mongoose.Types.ObjectId(projectId)
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
        $lookup: {
          from: "bugsworkflowstatuses",
          let: { bug_status_history: "$bug_status_history" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$bug_status_history"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "bug_status_history"
        }
      },

      {
        $lookup: {
          from: "fileuploads",
          let: { bugs_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$bugs_id", "$$bugs_id"] },
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
          let: { bug_labels: "$bug_labels" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$bug_labels"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "bug_labels"
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
                          60
                        ] // Convert hours to minutes
                      },
                      {
                        $toDouble: "$$this.logged_minutes" // Convert string to double
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
          bugId: 1,
          bug_labels: 1,
          time: {
            $concat: [
              {
                $toString: {
                  $floor: {
                    $divide: ["$totalLoggedTime", 60]
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
                          { $lt: [{ $mod: ["$totalLoggedTime", 60] }, 10] },
                          "0",
                          ""
                        ]
                      }
                    },
                    {
                      $toString: {
                        $mod: ["$totalLoggedTime", 60]
                      }
                    }
                  ]
                }
              }
            ]
          },
          title: 1,
          project: "$project.title",
          status: 1,
          descriptions: 1,
          start_date: 1,
          due_date: 1,
          estimated_hours: 1,
          estimated_minutes: 1,
          progress: 1,
          task: "$task.title",
          sub_task: 1,
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
                name: "$$assigneeId.full_name"
              }
            }
          }
        }
      }
    ];

    let data = await ProjectBugs.aggregate(mainQuery);
    let html = sheet(data);
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, html);
  } catch (error) {
    console.log("---", error);
  }
};

// new import csv
exports.importBugsData = async (req, res) => {
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
        if (typeof item["Issue"] === "number") {
          item["Issue"] = item["Issue"].toString();
        }
      });
      const requiredColumns = ["Issue", "Assignees Email", "Created By Email"];
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

      const bugSchema = Joi.object({
        Issue: Joi.string().optional().allow(""),
        "Assignees Email": Joi.string().optional(),
        "Task Name": Joi.string().optional().allow(""),
        "Created By Email": Joi.string().optional()
      });
      const payloadSchema = Joi.array().items(bugSchema).min(1).required();
      const { error, value } = payloadSchema.validate(dataPayload.parse);
      if (error) {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          error.details[0].message
        );
      }
      let data = [];
      let resp = [];

      const bugStatus = await ProjectBugsWorkFlowStatus.findOne({
        title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.TODO,
        isDeleted: false
      });

      for (const item of value) {
        if (item["Issue"] == undefined) {
          resp.push([{ record: item }, { error: "Issue is required" }]);
          continue;
        }

        if (!item["Created By Email"]) {
          resp.push([{ record: item }, { error: "Created By Email required" }]);
          continue;
        }
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
        const bugExists = await ProjectBugs.find({
          title: item["Issue"],
          isDeleted: false,
          project_id: req.body?.project_id
        });
        const isTask = await ProjectTasks.findOne({
          title: item["Task Name"],
          project_id: req.body?.project_id,
          isDeleted: false
        });
        if (bugExists.length > 0) {
          resp.push([
            { record: item },
            { error: "Issue for this project already exists" }
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
          const bugs = new ProjectBugs({
            title: item["Issue"],
            project_id: req.body?.project_id,
            task_id: isTask?._id,
            bug_status: bugStatus?._id,
            assignees: employees?.map((assignee) => assignee._id) || [],
            bugId: item["Issue Id"] || generateRandomId(),
            bug_status_history: [
              {
                bug_status: bugStatus?._id,
                updatedBy: createdbyEmp[0]?._id,
                updatedAt: configs.utcDefault(),
                ...(await getRefModelFromLoginUser(req?.user, true))
              }
            ],
            isImported: true,
            createdBy: createdbyEmp[0]?._id,
            updatedBy: createdbyEmp[0]?._id,
            ...(await getRefModelFromLoginUser(createdbyEmp[0]?._id))
          });

          data.push(await bugs.save());
        }
      }

      // console.log("resp:", resp);
      const csvFields = [
        "Issue",
        "Task Name",
        "Assignees Email",
        "Created By Email",
        "Response Errors"
      ];

      // Generate CSV data
      const csvData = resp.map((item) => ({
        // ...item[0].record,
        Issue: item[0].record["Issue"] ? item[0].record["Issue"] : "-",
        "Task Name": item[0].record["Task Name"]
          ? item[0].record["Task Name"]
          : "-",
        "Assignees Email": item[0].record["Assignees Email"]
          ? item[0].record["Assignees Email"].replace(/,/g, "-")
          : "-",
        "Created By Email": item[0].record["Created By Email"]
          ? item[0].record["Created By Email"]
          : "-",
        "Response Errors": item[1].error
      }));

      let CSVData = [csvFields, ...csvData.map((ele) => Object.values(ele))];

      if (resp && resp.length <= 0) {
        return successResponse(
          res,
          statusCode.CREATED,
          messages.BUG_CSV_IMPORT,
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
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};
