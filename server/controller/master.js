const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const Joi = require("joi");
const EmpDepartment = mongoose.model("empdepartments");
const EmpSubDepartment = mongoose.model("subdepartments");
const EmpDesignation = mongoose.model("empdesignations");
const Employee = mongoose.model("employees");
const Resource = mongoose.model("resource");
const Project = mongoose.model("projects");
const Tasks = mongoose.model("projecttasks");
const MainTasks = mongoose.model("projectmaintasks");
const timeSheets = mongoose.model("projecttimesheets");
const workflowstatus = mongoose.model("workflowstatus");
const PMSClients = mongoose.model("pmsclients");
const ProjectTaskBugs = mongoose.model("projecttaskbugs");
const ProjectBugs = mongoose.model("bugsworkflowstatus");
const Discussions = mongoose.model("discussionstopics");
const Notes = mongoose.model("notes_pms");
const TasksHoursLogged = mongoose.model("projecttaskhourlogs");

const { getCreatedUpdatedDeletedByQuery } = require("../helpers/common");

const { statusCode, DEFAULT_DATA } = require("../helpers/constant");
const messages = require("../helpers/messages");

const configRoles = require("../settings/config.json");

exports.getEmpDepartment = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      dept_id: Joi.string().optional().default(null)
    });
    const { error, value } = validationSchema.validate(req.query);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const data = await EmpDepartment.find({
      isDeleted: false,
      ...(value?.dept_id && {
        _id: new mongoose.Types.ObjectId(value.dept_id)
      })
    })
      .select("_id department_name")
      .sort({
        department_name: 1
      });
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getEmpSubDepartment = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      dept_id: Joi.string().optional().default(null)
    });
    const { error, value } = validationSchema.validate(req.query);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const data = await EmpSubDepartment.find({
      isDeleted: false,
      ...(value?.dept_id && {
        _id: new mongoose.Types.ObjectId(value.dept_id)
      })
    })
      .select("_id sub_department_name")
      .sort({
        sub_department_name: 1
      });
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getEmpDesignations = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      design_id: Joi.string().optional().default(null)
    });
    const { error, value } = validationSchema.validate(req.query);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const data = await EmpDesignation.find({
      isDeleted: false,
      ...(value?.design_id && {
        _id: new mongoose.Types.ObjectId(value.design_id)
      })
    })
      .select("_id designation_name")
      .sort({
        designation_name: 1
      });
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getResource = async (req, res) => {
  try {
    const data = await Resource.find({ isDeleted: false })
      .select("_id resource_name")
      .sort({
        resource_name: 1
      });
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getProjects = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).optional(),
      search: Joi.string().optional().allow(''),
      includeClosed: Joi.boolean().truthy("true").falsy("false").optional().default(false),
    });

    const { error, value } = validationSchema.validate(req.query);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { page, limit, search, includeClosed } = value;

    // Convert page and limit to integers with default values
    const pageNum = page && page > 0 ? parseInt(page, 10) : null;
    const limitNum = limit && limit > 0 ? parseInt(limit, 10) : null;

    // Base match conditions
    const baseMatch = {
      isDeleted: false,
      companyId: newObjectId(decodedCompanyId)
    };

    // Add search condition if provided
    let searchMatch = {};
    if (search && search.trim()) {
      searchMatch = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { projectId: { $regex: search, $options: "i" } },
          { descriptions: { $regex: search, $options: "i" } }
        ]
      };
    }

    // Build main aggregation query
    const mainQuery = [
      {
        $match: baseMatch
      },
      {
        $lookup: {
          from: "projectstatuses",
          localField: "project_status",
          foreignField: "_id",
          as: "statusInfo"
        }
      },
      {
        $unwind: "$statusInfo"
      },
      {
        $match: {
          ...(!includeClosed && {
            "statusInfo.title": DEFAULT_DATA.PROJECT_STATUS.ACTIVE,
          }),
          ...searchMatch
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          projectId: 1,
          color: 1,
          descriptions: 1,
          technology: 1,
          project_type: 1,
          project_status: 1,
          manager: 1,
          acc_manager: 1,
          assignees: 1,
          pms_clients: 1,
          workFlow: 1,
          estimatedHours: 1,
          isBillable: 1,
          start_date: 1,
          end_date: 1,
          recurringType: 1,
          updatedAt: 1,
          status: "$statusInfo.title"
        }
      },
      {
        $sort: {
          title: 1
        }
      }
    ];

    // Get total count for pagination metadata
    const countQuery = [...mainQuery];
    countQuery.push({ $count: "total" });
    const countResult = await Project.aggregate(countQuery);
    const totalDocuments = countResult.length > 0 ? countResult[0].total : 0;

    // Add pagination if both page and limit are provided
    if (pageNum && limitNum) {
      const skip = (pageNum - 1) * limitNum;
      mainQuery.push(
        { $skip: skip },
        { $limit: limitNum }
      );
    }

    const data = await Project.aggregate(mainQuery);

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

exports.getSubscribers = async (req, res) => {
  try {
    const projectId = req.params.id;
    const mainQuery = [
      {
        $match: {
          isDeleted: false,
          _id: new mongoose.Types.ObjectId(projectId)
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { manager: "$manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$manager"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "managerDetails"
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { assignees: "$assignees" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$assignees"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "assigneesDetails"
        }
      },
      {
        $addFields: {
          managersAndAssignees: {
            $setUnion: [
              {
                $map: {
                  input: "$managerDetails",
                  as: "manager",
                  in: {
                    _id: "$$manager._id",
                    emp_img: "$$manager.emp_img",
                    email: "$$manager.email",
                    full_name: "$$manager.full_name",
                    first_name: "$$manager.first_name"
                    // type: "manager",
                  }
                }
              },
              {
                $map: {
                  input: "$assigneesDetails",
                  as: "assignees",
                  in: {
                    _id: "$$assignees._id",
                    emp_img: "$$assignees.emp_img",
                    email: "$$assignees.email",
                    full_name: "$$assignees.full_name",
                    first_name: "$$assignees.first_name"
                    // type: "assignee",
                  }
                }
              }

              // {
              //   $map: {
              //     input: "$mainTasksSubscribersDetails",
              //     as: "mainTaskSubscriber",
              //     in: {
              //       _id: "$$mainTaskSubscriber._id",
              //       emp_img: "$$mainTaskSubscriber.emp_img",
              //       email: "$$mainTaskSubscriber.email",
              //       full_name: "$$mainTaskSubscriber.full_name",
              //       first_name: "$$mainTaskSubscriber.first_name",
              //       type: "subscriber",
              //     },
              //   },
              // },
              // {
              //   $map: {
              //     input: "$taskAssigneesDetails",
              //     as: "taskAssignee",
              //     in: {
              //       _id: "$$taskAssignee._id",
              //       emp_img: "$$taskAssignee.emp_img",
              //       email: "$$taskAssignee.email",
              //       full_name: "$$taskAssignee.full_name",
              //       first_name: "$$taskAssignee.first_name",
              //       type: "task_assignee",
              //     },
              //   },
              // },
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          managersAndAssignees: 1
        }
      }
    ];

    const data = await Project.aggregate(mainQuery);
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      data.length > 0 ? data[0] && data[0]["managersAndAssignees"] : []
    );
  } catch (error) {
    console.error("Error 152 master.js / controller :", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getTaggedUsersList = async (req, res) => {
  try {
    const {
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      isDiscussions: Joi.boolean().optional(),
      disucssionTopicid: Joi.string().optional(), // _id
      isTasks: Joi.boolean().optional(),
      taskId: Joi.string().optional(), // _id
      isBugs: Joi.boolean().optional(),
      bugId: Joi.string().optional(), // _id
      isNotes: Joi.boolean().optional(),
      noteId: Joi.string().optional(), // _id
      isLoggedhours: Joi.boolean().optional(),
      loggedhoursId: Joi.string().optional() // _id
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (value?.isDiscussions) {
      const mainQuery = [
        {
          $match: {
            isDeleted: false,
            _id: new mongoose.Types.ObjectId(value?.disucssionTopicid)
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
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$companyId", new mongoose.Types.ObjectId(decodedCompanyId)] }
                    ]
                  }
                }
              }
            ],
            as: "projectData"
          }
        },
        {
          $unwind: {
            path: "$projectData",
            preserveNullAndEmptyArrays: false
          }
        },

        {
          $lookup: {
            from: "employees",
            let: { manager: "$projectData.manager" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$_id", "$$manager"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isSoftDeleted", false] },
                      { $eq: ["$isActivate", true] },
                      { $eq: ["$companyId", new mongoose.Types.ObjectId(decodedCompanyId)] }
                    ]
                  }
                }
              }
            ],
            as: "managerDetails"
          }
        },

        {
          $lookup: {
            from: "employees",
            let: { subscriber: "$subscribers" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$_id", "$$subscriber"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isSoftDeleted", false] },
                      { $eq: ["$isActivate", true] },
                      { $eq: ["$companyId", new mongoose.Types.ObjectId(decodedCompanyId)] }
                    ]
                  }
                }
              }
            ],
            as: "subscribersDetails"
          }
        },

        {
          $lookup: {
            from: "pmsclients",
            let: { pms_client: "$pms_clients" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$_id", "$$pms_client"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "clientDetails"
          }
        },

        {
          $addFields: {
            users: {
              $setUnion: [
                {
                  $map: {
                    input: "$managerDetails",
                    as: "manager",
                    in: {
                      _id: "$$manager._id",
                      emp_img: "$$manager.emp_img",
                      email: "$$manager.email",
                      full_name: "$$manager.full_name",
                      first_name: "$$manager.first_name"
                    }
                  }
                },
                {
                  $map: {
                    input: "$subscribersDetails",
                    as: "subscribers",
                    in: {
                      _id: "$$subscribers._id",
                      emp_img: "$$subscribers.emp_img",
                      email: "$$subscribers.email",
                      full_name: "$$subscribers.full_name",
                      first_name: "$$subscribers.first_name"
                    }
                  }
                },
                {
                  $map: {
                    input: "$clientDetails",
                    as: "clients",
                    in: {
                      _id: "$$clients._id",
                      emp_img: "$$clients.emp_img",
                      email: "$$clients.email",
                      full_name: "$$clients.full_name",
                      first_name: "$$clients.first_name"
                    }
                  }
                }
              ]
            }
          }
        },

        {
          $project: {
            _id: 1,
            users: 1
          }
        }
      ];

      const data = await Discussions.aggregate(mainQuery);

      return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
    }

    if (value?.isTasks) {
      const mainQuery = [
        {
          $match: {
            isDeleted: false,
            _id: new mongoose.Types.ObjectId(value?.taskId)
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
            as: "projectData"
          }
        },
        {
          $unwind: {
            path: "$projectData",
            preserveNullAndEmptyArrays: false
          }
        },

        {
          $lookup: {
            from: "employees",
            let: { manager: "$projectData.manager" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$_id", "$$manager"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "managerDetails"
          }
        },

        {
          $lookup: {
            from: "employees",
            let: { assignees: "$assignees" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$_id", "$$assignees"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "assigneesDetails"
          }
        },

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
            as: "maintasksData"
          }
        },
        {
          $unwind: {
            path: "$maintasksData",
            preserveNullAndEmptyArrays: false
          }
        },

        {
          $lookup: {
            from: "employees",
            let: { subscriber: "$maintasksData.subscribers" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$_id", "$$subscriber"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "subscribersDetails"
          }
        },

        {
          $lookup: {
            from: "pmsclients",
            let: { pms_client: "$maintasksData.pms_clients" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$_id", "$$pms_client"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "clientDetails"
          }
        },

        {
          $addFields: {
            users: {
              $setUnion: [
                {
                  $map: {
                    input: "$managerDetails",
                    as: "manager",
                    in: {
                      _id: "$$manager._id",
                      emp_img: "$$manager.emp_img",
                      email: "$$manager.email",
                      full_name: "$$manager.full_name",
                      first_name: "$$manager.first_name"
                    }
                  }
                },
                {
                  $map: {
                    input: "$assigneesDetails",
                    as: "assignees",
                    in: {
                      _id: "$$assignees._id",
                      emp_img: "$$assignees.emp_img",
                      email: "$$assignees.email",
                      full_name: "$$assignees.full_name",
                      first_name: "$$assignees.first_name"
                    }
                  }
                },
                {
                  $map: {
                    input: "$subscribersDetails",
                    as: "subscribers",
                    in: {
                      _id: "$$subscribers._id",
                      emp_img: "$$subscribers.emp_img",
                      email: "$$subscribers.email",
                      full_name: "$$subscribers.full_name",
                      first_name: "$$subscribers.first_name"
                    }
                  }
                },
                {
                  $map: {
                    input: "$clientDetails",
                    as: "clients",
                    in: {
                      _id: "$$clients._id",
                      emp_img: "$$clients.emp_img",
                      email: "$$clients.email",
                      full_name: "$$clients.full_name",
                      first_name: "$$clients.first_name"
                    }
                  }
                }
              ]
            }
          }
        },

        {
          $project: {
            _id: 1,
            users: 1
          }
        }
      ];

      const data = await Tasks.aggregate(mainQuery);

      return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
    }

    if (value?.isBugs) {
      const mainQuery = [
        {
          $match: {
            isDeleted: false,
            _id: new mongoose.Types.ObjectId(value?.bugId)
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
            as: "projectData"
          }
        },
        {
          $unwind: {
            path: "$projectData",
            preserveNullAndEmptyArrays: false
          }
        },

        {
          $lookup: {
            from: "employees",
            let: { manager: "$projectData.manager" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$_id", "$$manager"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "managerDetails"
          }
        },

        {
          $lookup: {
            from: "employees",
            let: { assignees: "$assignees" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$_id", "$$assignees"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "assigneesDetails"
          }
        },

        {
          $addFields: {
            users: {
              $setUnion: [
                {
                  $map: {
                    input: "$managerDetails",
                    as: "manager",
                    in: {
                      _id: "$$manager._id",
                      emp_img: "$$manager.emp_img",
                      email: "$$manager.email",
                      full_name: "$$manager.full_name",
                      first_name: "$$manager.first_name"
                    }
                  }
                },
                {
                  $map: {
                    input: "$assigneesDetails",
                    as: "assignees",
                    in: {
                      _id: "$$assignees._id",
                      emp_img: "$$assignees.emp_img",
                      email: "$$assignees.email",
                      full_name: "$$assignees.full_name",
                      first_name: "$$assignees.first_name"
                    }
                  }
                }
              ]
            }
          }
        },

        {
          $project: {
            _id: 1,
            users: 1
          }
        }
      ];

      const data = await ProjectTaskBugs.aggregate(mainQuery);

      return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
    }

    if (value?.isNotes) {
      const mainQuery = [
        {
          $match: {
            isDeleted: false,
            _id: new mongoose.Types.ObjectId(value?.noteId)
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
            as: "projectData"
          }
        },
        {
          $unwind: {
            path: "$projectData",
            preserveNullAndEmptyArrays: false
          }
        },

        {
          $lookup: {
            from: "employees",
            let: { manager: "$projectData.manager" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$_id", "$$manager"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "managerDetails"
          }
        },

        {
          $lookup: {
            from: "employees",
            let: { subscriber: "$subscribers" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$_id", "$$subscriber"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "subscribersDetails"
          }
        },

        {
          $lookup: {
            from: "pmsclients",
            let: { pms_client: "$pms_clients" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$_id", "$$pms_client"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "clientDetails"
          }
        },

        {
          $addFields: {
            users: {
              $setUnion: [
                {
                  $map: {
                    input: "$managerDetails",
                    as: "manager",
                    in: {
                      _id: "$$manager._id",
                      emp_img: "$$manager.emp_img",
                      email: "$$manager.email",
                      full_name: "$$manager.full_name",
                      first_name: "$$manager.first_name"
                    }
                  }
                },
                {
                  $map: {
                    input: "$subscribersDetails",
                    as: "subscribers",
                    in: {
                      _id: "$$subscribers._id",
                      emp_img: "$$subscribers.emp_img",
                      email: "$$subscribers.email",
                      full_name: "$$subscribers.full_name",
                      first_name: "$$subscribers.first_name"
                    }
                  }
                },
                {
                  $map: {
                    input: "$clientDetails",
                    as: "clients",
                    in: {
                      _id: "$$clients._id",
                      emp_img: "$$clients.emp_img",
                      email: "$$clients.email",
                      full_name: "$$clients.full_name",
                      first_name: "$$clients.first_name"
                    }
                  }
                }
              ]
            }
          }
        },

        {
          $project: {
            _id: 1,
            projectData: "$projectData",
            users: 1
          }
        }
      ];

      const data = await Notes.aggregate(mainQuery);

      return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
    }

    if (value?.isLoggedhours) {
      const mainQuery = [
        {
          $match: {
            isDeleted: false,
            _id: new mongoose.Types.ObjectId(value?.loggedhoursId)
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
            as: "projectData"
          }
        },
        {
          $unwind: {
            path: "$projectData",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $lookup: {
            from: "employees",
            let: { manager: "$projectData.manager" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$_id", "$$manager"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "managerDetails"
          }
        },
        {
          $lookup: {
            from: "employees",
            let: { employee: "$createdBy" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$_id", "$$employee"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isActivate", true] }
                    ]
                  }
                }
              }
            ],
            as: "employeeDetails"
          }
        },
        {
          $addFields: {
            users: {
              $setUnion: [
                {
                  $map: {
                    input: "$managerDetails",
                    as: "manager",
                    in: {
                      _id: "$$manager._id",
                      emp_img: "$$manager.emp_img",
                      email: "$$manager.email",
                      full_name: "$$manager.full_name",
                      first_name: "$$manager.first_name"
                    }
                  }
                },
                {
                  $map: {
                    input: "$employeeDetails",
                    as: "employee",
                    in: {
                      _id: "$$employee._id",
                      emp_img: "$$employee.emp_img",
                      email: "$$employee.email",
                      full_name: "$$employee.full_name",
                      first_name: "$$employee.first_name"
                    }
                  }
                }
              ]
            }
          }
        },

        {
          $project: {
            _id: 1,
            users: 1
          }
        }
      ];

      const data = await TasksHoursLogged.aggregate(mainQuery);

      return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
    }

    // const mainQuery = [
    //   {
    //     $match: {
    //       isDeleted: false,
    //       _id: new mongoose.Types.ObjectId(projectId),
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "employees",
    //       let: { manager: "$manager" },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $and: [
    //                 { $eq: ["$_id", "$$manager"] },
    //                 { $eq: ["$isDeleted", false] },
    //               ],
    //             },
    //           },
    //         },
    //       ],
    //       as: "managerDetails",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "employees",
    //       let: { assignees: "$assignees" },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $and: [
    //                 { $in: ["$_id", "$$assignees"] },
    //                 { $eq: ["$isDeleted", false] },
    //                 { $eq: ["$isActivate", true] }
    //               ],
    //             },
    //           },
    //         },
    //       ],
    //       as: "assigneesDetails",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "pmsclients",
    //       let: { clients: "$pms_clients" },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $and: [
    //                 { $in: ["$_id", "$$clients"] },
    //                 { $eq: ["$isDeleted", false] },
    //                 { $eq: ["$isActivate", true] }
    //               ],
    //             },
    //           },
    //         },
    //       ],
    //       as: "clientDetails",
    //     },
    //   },

    //   {
    //     $addFields: {
    //       managersAndAssignees: {
    //         $setUnion: [
    //           {
    //             $map: {
    //               input: "$managerDetails",
    //               as: "manager",
    //               in: {
    //                 _id: "$$manager._id",
    //                 emp_img: "$$manager.emp_img",
    //                 email: "$$manager.email",
    //                 full_name: "$$manager.full_name",
    //                 first_name: "$$manager.first_name",
    //                 // type: "manager",
    //               },
    //             },
    //           },
    //           {
    //             $map: {
    //               input: "$assigneesDetails",
    //               as: "assignees",
    //               in: {
    //                 _id: "$$assignees._id",
    //                 emp_img: "$$assignees.emp_img",
    //                 email: "$$assignees.email",
    //                 full_name: "$$assignees.full_name",
    //                 first_name: "$$assignees.first_name",
    //                 // type: "assignee",
    //               },
    //             },
    //           },
    //           {
    //             $map: {
    //               input: "$clientDetails",
    //               as: "clients",
    //               in: {
    //                 _id: "$$clients._id",
    //                 emp_img: "$$clients.emp_img",
    //                 email: "$$clients.email",
    //                 full_name: "$$clients.full_name",
    //                 first_name: "$$clients.first_name",
    //                 // type: "assignee",
    //               },
    //             },
    //           },

    //         ],
    //       },
    //     },
    //   },
    //   {
    //     $project: {
    //       _id: 0,
    //       managersAndAssignees: 1,
    //     },
    //   },
    // ];

    // const data = await Project.aggregate(mainQuery);
    // return successResponse(
    //   res,
    //   statusCode.SUCCESS,
    //   messages.LISTING,
    //   data.length > 0 ? data[0] && data[0]["managersAndAssignees"] : []
    // );
  } catch (error) {
    console.error("Error 152 master.js / controller :", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getEmployees = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      emp_id: Joi.string().optional().default(null),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).optional(),
      search: Joi.string().optional().allow(''),
    });

    const { error, value } = validationSchema.validate(req.query);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { emp_id, page, limit, search } = value;

    // Convert page and limit to integers with default values
    const pageNum = page && page > 0 ? parseInt(page, 10) : null;
    const limitNum = limit && limit > 0 ? parseInt(limit, 10) : null;

    // Base match conditions
    const baseMatch = {
      companyId: newObjectId(decodedCompanyId),
      isDeleted: false,
      isSoftDeleted: false,
      isActivate: true,
      ...(emp_id && {
        _id: new mongoose.Types.ObjectId(emp_id),
      }),
    };

    // Add search condition if provided
    if (search && search.trim()) {
      baseMatch.$or = [
        { full_name: { $regex: search, $options: "i" } },
        { emp_code: { $regex: search, $options: "i" } },
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } }
      ];
    }

    // Get total count for this filter
    const countQuery = [
      {
        $match: baseMatch
      },
      {
        $count: "total"
      }
    ];

    const countResult = await Employee.aggregate(countQuery);
    const totalDocuments = countResult.length > 0 ? countResult[0].total : 0;

    // Main aggregation query
    const mainQuery = [
      {
        $match: baseMatch,
      },
      {
        $sort: {
          first_name: 1,
        },
      },
      {
        $project: {
          _id: 1,
          full_name: 1,
          emp_code: 1,
          first_name: 1,
          last_name: 1,
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

    const data = await Employee.aggregate(mainQuery);

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
    console.error("Error 152 master.js / controller :", error);
    return catchBlockErrorResponse(res, error.message);
  }
};


exports.getTasks = async (req, res) => {
  try {
    const projectId = req.params.id;
    const mainQuery = [
      {
        $match: {
          isDeleted: false,
          project_id: new mongoose.Types.ObjectId(projectId)
        }
      },
      {
        $project: {
          _id: 1,
          title: 1
        }
      }
    ];
    const data = await Tasks.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    console.error("Error 152 master.js / controller :", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getTimesheets = async (req, res) => {
  try {
    const projectId = req.params.id;
    const mainQuery = [
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(projectId),
          isDeleted: false
        }
      },
      {
        $lookup: {
          from: "projects",
          localField: "project_id",
          foreignField: "_id",
          as: "projectDetails"
        }
      },
      {
        $project: {
          _id: 1,
          title: 1
        }
      }
    ];
    const data = await timeSheets.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    console.error("Error 152 master.js / controller :", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getBugsWorkFlow = async (req, res) => {
  try {
    const mainQuery = [
      {
        $match: {
          isDeleted: false
        }
      },
      {
        $sort: { sequence: 1 }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          color: 1
        }
      }
    ];
    const data = await ProjectBugs.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    console.log("🚀 ~ exports.getBugsWorkFlow= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getPMSClient = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      client_id: Joi.string().optional().default(null),
      isDropdown: Joi.boolean().optional().default(false),
      project_id: Joi.string().optional().default(null),
      pageNo: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).optional(),
      search: Joi.string().optional().allow(''),
    });

    const input = req.method === "GET" ? req.query : req.body;
    const { error, value } = validationSchema.validate(input);

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { client_id, isDropdown, project_id, pageNo, limit, search } = value;

    // Convert page and limit to integers with default values
    const pageNum = pageNo && pageNo > 0 ? parseInt(pageNo, 10) : null;
    const limitNum = limit && limit > 0 ? parseInt(limit, 10) : null;

    // Get project clients if project_id is provided
    let projectClient = [];
    if (project_id) {
      const project = await Project.findById(project_id);
      projectClient = project ? project.pms_clients : [];
    }

    // Base match conditions
    const baseMatch = {
      isDeleted: false,
      isSoftDeleted: false,
      companyId: newObjectId(decodedCompanyId),
      ...(isDropdown === true ? { isActivate: true } : {}),
      ...(client_id && {
        _id: new mongoose.Types.ObjectId(client_id),
      }),
      ...(project_id && {
        _id: {
          $in: projectClient,
        },
      }),
    };

    // Add search condition if provided
    if (search && search.trim()) {
      baseMatch.$or = [
        { full_name: { $regex: search, $options: "i" } },
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { company_name: { $regex: search, $options: "i" } }
      ];
    }

    // Get total count for this filter
    const countQuery = [
      {
        $match: baseMatch
      },
      {
        $count: "total"
      }
    ];

    const countResult = await PMSClients.aggregate(countQuery);
    const totalDocuments = countResult.length > 0 ? countResult[0].total : 0;

    // Main aggregation query
    const mainQuery = [
      {
        $match: baseMatch,
      },
      {
        $sort: {
          first_name: 1,
        },
      },
      {
        $project: {
          _id: 1,
          full_name: 1,
          first_name: 1,
          last_name: 1,
          email: 1,
          client_img: 1,
          company_name: 1,
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

    const data = await PMSClients.aggregate(mainQuery);

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
    console.log("🚀 ~ exports.getPMSClient= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};


exports.getTaskWiseBugs = async (req, res) => {
  try {
    const mainQuery = [
      {
        $match: {
          isDeleted: false,
          task_id: new mongoose.Types.ObjectId(req.params.taskId)
        }
      },
      {
        $project: {
          _id: 1,
          title: 1
        }
      },
      {
        $sort: {
          _id: -1
        }
      }
    ];
    const data = await ProjectTaskBugs.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    console.log("🚀 ~ exports.getTaskWiseBugs= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getmainTasksList = async (req, res) => {
  try {
    const mainQuery = [
      {
        $match: {
          isDeleted: false,
          project_id: new mongoose.Types.ObjectId(req.params.id)
        }
      },
      {
        $project: {
          _id: 1,
          title: 1
        }
      }
    ];
    const data = await MainTasks.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    console.error("Error 152 master.js / controller :", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getStages = async (req, res) => {
  try {
    const mainQuery = [
      {
        $match: {
          isDeleted: false,
          workflow_id: new mongoose.Types.ObjectId(req.params.id)
        }
      },
      {
        $project: {
          _id: 1,
          title: 1
        }
      }
    ];
    const data = await workflowstatus.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    console.error("Error 152 master.js / controller :", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getTasksAssigned = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user._id;
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
          as: "maintask"
        }
      },
      {
        $unwind: {
          path: "$maintask",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          isDeleted: false,
          project_id: new mongoose.Types.ObjectId(projectId),
          assignees: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $project: {
          _id: 1,
          title: 1
        }
      }
    ];
    const data = await Tasks.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    console.error("Error 152 master.js / controller :", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// [TO DO] : Change requires for SAAS
exports.getEmployeeManagerWise = async (req, res) => {
  try {
    let matchQuery = {
      // isDeleted: false,
      // isActivate: true,
      // isSoftDeleted: false
    };
    // 1. Fetch all employees reporting to the logged-in user (req.user._id)
    const reportingEmployees = await Employee.find(
      {
        reporting_manager: new mongoose.Types.ObjectId(req.user._id),
        isActivate: true,
        isDeleted: false,
        isSoftDeleted: false
      },
      { _id: 1 }
    );
    // console.log("🚀 ~ exports.getEmployeeManagerWise= ~ reportingEmployees:", reportingEmployees)

    // 2. If no employees report to the user, return empty response
    if (!reportingEmployees?.length) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    // Get the list of employee IDs reporting to the user
    const employeeIds = reportingEmployees.map((emp) => emp._id);

    // 3. Modify the match query to filter based on the reporting employees
    matchQuery = {
      _id: { $in: employeeIds }
    };

    const mainQuery = [
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          emp_img: 1,
          full_name: 1,
          first_name: 1
        }
      },
      // Add this $match stage to filter out documents with null values
      {
        $match: {
          $and: [
            { full_name: { $ne: null } }, // Filter out if full_name is null
            { first_name: { $ne: null } }, // Filter out if name is null
            { emp_img: { $ne: null } } // Filter out if emp_img is null
          ]
        }
      },
      {
        $sort: { first_name: 1 }
      }
    ];

    let data = await Employee.aggregate(mainQuery);

    //

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      data,
      {} // metaData
    );
  } catch (error) {
    console.log("🚀 ~ exports.getTaskHoursLogsByTimesheet= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getAccMgrs = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      emp_id: Joi.string().optional().default(null),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).optional(),
      search: Joi.string().optional().allow(""),
    });
    
    const { error, value } = validationSchema.validate(req.query);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { emp_id, page, limit, search } = value;

    // Convert page and limit to integers with default values
    const pageNum = page && page > 0 ? page : null;
    const limitNum = limit && limit > 0 ? limit : null;

    // Build match conditions
    const matchConditions = {
      isDeleted: false,
      isSoftDeleted: false,
      isActivate: true,
      "pmsroles.role_name": configRoles.PMS_ROLES.AM,
      companyId: newObjectId(decodedCompanyId),
      ...(emp_id && {
        _id: newObjectId(emp_id)
      })
    };

    // Add search condition if provided
    if (search) {
      matchConditions.$or = [
        { full_name: { $regex: search, $options: "i" } },
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { emp_code: { $regex: search, $options: "i" } }
      ];
    }

    const mainQuery = [
      {
        $lookup: {
          from: "pms_roles",
          let: { pms_role_id: "$pms_role_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$pms_role_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "pmsroles"
        }
      },
      {
        $unwind: {
          path: "$pmsroles",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: matchConditions
      },
      {
        $sort: {
          first_name: 1
        }
      },
      {
        $project: {
          _id: 1,
          full_name: 1,
          email: 1,
          emp_img: 1
        }
      }
    ];

    // Get total count for pagination metadata
    const countQuery = [...mainQuery];
    countQuery.push({ $count: "total" });
    const countResult = await Employee.aggregate(countQuery);
    const totalDocuments = countResult.length > 0 ? countResult[0].total : 0;

    // Apply pagination if provided
    if (pageNum && limitNum) {
      const skip = (pageNum - 1) * limitNum;
      mainQuery.push({ $skip: skip });
      mainQuery.push({ $limit: limitNum });
    }

    const data = await Employee.aggregate(mainQuery);

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
    console.error("Error 152 master.js / controller :", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
