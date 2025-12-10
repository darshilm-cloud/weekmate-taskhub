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
            first_name: "$createdByDetails.first_name",
            last_name: "$createdByDetails.last_name",
            email: "$createdByDetails.email",
            phone_number: "$createdByDetails.phone_number"
          },
          updatedBy: {
            _id: "$updatedByDetails._id",
            full_name: "$updatedByDetails.full_name",
            first_name: "$updatedByDetails.first_name",
            last_name: "$updatedByDetails.last_name",
            email: "$updatedByDetails.email",
            phone_number: "$updatedByDetails.phone_number"
          },
          deletedBy: {
            _id: "$deletedByDetails._id",
            full_name: "$deletedByDetails.full_name",
            first_name: "$deletedByDetails.first_name",
            last_name: "$deletedByDetails.last_name",
            email: "$deletedByDetails.email",
            phone_number: "$deletedByDetails.phone_number"
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

    // Helper function to map module names to model names
    const getModelName = (moduleName) => {
      const modelMap = {
        "tasks": "projecttasks",
        "projects": "projects",
        "notes": "notes_pms",
        "notebook": "notebook",
        "bugs": "projecttaskbugs",
        "discussions": "discussionstopics",
        "discussionDetails": "discussionstopicsdetails",
        "fileFolders": "filefolders",
        "fileUploads": "fileuploads",
        "taskComments": "Comments",
        "bugComments": "bugcomments",
        "notesComments": "notescomments",
        "subTasks": "subtasks",
        "projectMainTask": "projectmaintasks",
        "taskHoursLogs": "projecttaskhourlogs",
        "projectTimeSheets": "projecttimesheets",
        "projectLabels": "tasklabels",
        "projectStatus": "projectstatus",
        "projectTypes": "projecttypes",
        "projectTech": "projecttechs",
        "projectWorkFlow": "projectworkflows",
        "workFlowStatus": "workflowstatus",
        "employees": "employees",
        "pmsClients": "pmsclients",
        "pmsRoles": "pms_roles",
        "rolePermissions": "role_permissions",
        "complaints": "complaints",
        "complaints_status": "complaints_status",
        "complaints_comments": "complaints_comments",
        "reviews": "reviews",
        "projectexpanses": "projectexpanses",
        "hoursLoggedComments": "hoursloggedcomments",
        "hoursApprove": "hoursapprove"
      };
      const lowerModuleName = moduleName ? moduleName.toLowerCase() : "";
      return modelMap[lowerModuleName] || lowerModuleName;
    };

    // Helper function to populate and format deleted data
    const populateDeletedData = async (records, moduleName) => {
      if (!records || records.length === 0) return [];

      const formattedRecords = [];

      for (const record of records) {
        const formatted = { ...record };

        // Remove sensitive/internal fields and IDs
        delete formatted.password;
        delete formatted.resetCode;
        delete formatted.__v;
        delete formatted._id;
        delete formatted.companyId;
        delete formatted.createdBy;
        delete formatted.updatedBy;
        delete formatted.deletedBy;

        // Helper to convert ObjectId to string for querying
        const toObjectId = (id) => {
          if (!id) return null;
          if (id instanceof mongoose.Types.ObjectId) return id;
          if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
            return new mongoose.Types.ObjectId(id);
          }
          return null;
        };

        // Module-specific population
        if (moduleName === "projects") {
          // Populate technology
          if (formatted.technology && Array.isArray(formatted.technology) && formatted.technology.length > 0) {
            try {
              const TechModel = mongoose.model("projecttechs");
              const techIds = formatted.technology.map(id => toObjectId(id)).filter(Boolean);
              if (techIds.length > 0) {
                const techs = await TechModel.find({ _id: { $in: techIds } })
                  .select("project_tech")
                  .lean();
                formatted.technology = techs.length > 0 ? techs.map(t => t.project_tech || "").filter(Boolean).join(", ") : "";
              } else {
                formatted.technology = "";
              }
            } catch (error) {
              console.error("Error populating technology:", error);
              formatted.technology = "";
            }
          } else {
            formatted.technology = "";
          }

          // Populate project_type
          if (formatted.project_type) {
            try {
              const ProjectTypeModel = mongoose.model("projecttypes");
              const projectTypeId = toObjectId(formatted.project_type);
              if (projectTypeId) {
                const projectType = await ProjectTypeModel.findById(projectTypeId)
                  .select("project_type")
                  .lean();
                formatted.project_type = projectType && projectType.project_type ? projectType.project_type : "";
              } else {
                formatted.project_type = "";
              }
            } catch (error) {
              console.error("Error populating project_type:", error);
              formatted.project_type = "";
            }
          } else {
            formatted.project_type = "";
          }

          // Populate project_status
          if (formatted.project_status) {
            try {
              const ProjectStatusModel = mongoose.model("projectstatus");
              const projectStatusId = toObjectId(formatted.project_status);
              if (projectStatusId) {
                const projectStatus = await ProjectStatusModel.findById(projectStatusId)
                  .select("title")
                  .lean();
                formatted.project_status = projectStatus && projectStatus.title ? projectStatus.title : "";
              } else {
                formatted.project_status = "";
              }
            } catch (error) {
              console.error("Error populating project_status:", error);
              formatted.project_status = "";
            }
          } else {
            formatted.project_status = "";
          }

          // Populate manager
          if (formatted.manager) {
            try {
              const EmployeesModel = mongoose.model("employees");
              const managerId = toObjectId(formatted.manager);
              if (managerId) {
                const manager = await EmployeesModel.findById(managerId)
                  .select("full_name first_name last_name")
                  .lean();
                formatted.manager = manager ? (manager.full_name || `${manager.first_name || ""} ${manager.last_name || ""}`.trim()) : "";
              } else {
                formatted.manager = "";
              }
            } catch (error) {
              console.error("Error populating manager:", error);
              formatted.manager = "";
            }
          } else {
            formatted.manager = "";
          }

          // Populate acc_manager
          if (formatted.acc_manager) {
            try {
              const EmployeesModel = mongoose.model("employees");
              const accManagerId = toObjectId(formatted.acc_manager);
              if (accManagerId) {
                const accManager = await EmployeesModel.findById(accManagerId)
                  .select("full_name first_name last_name")
                  .lean();
                formatted.acc_manager = accManager ? (accManager.full_name || `${accManager.first_name || ""} ${accManager.last_name || ""}`.trim()) : "";
              } else {
                formatted.acc_manager = "";
              }
            } catch (error) {
              console.error("Error populating acc_manager:", error);
              formatted.acc_manager = "";
            }
          } else {
            formatted.acc_manager = "";
          }

          // Populate assignees
          if (formatted.assignees && Array.isArray(formatted.assignees) && formatted.assignees.length > 0) {
            try {
              const EmployeesModel = mongoose.model("employees");
              const assigneeIds = formatted.assignees.map(id => toObjectId(id)).filter(Boolean);
              if (assigneeIds.length > 0) {
                const assignees = await EmployeesModel.find({ _id: { $in: assigneeIds } })
                  .select("full_name first_name last_name")
                  .lean();
                formatted.assignees = assignees.length > 0 
                  ? assignees.map(a => a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim()).filter(Boolean).join(", ")
                  : "";
              } else {
                formatted.assignees = "";
              }
            } catch (error) {
              console.error("Error populating assignees:", error);
              formatted.assignees = "";
            }
          } else {
            formatted.assignees = "";
          }

          // Populate pms_clients
          if (formatted.pms_clients && Array.isArray(formatted.pms_clients) && formatted.pms_clients.length > 0) {
            try {
              const PMSClientsModel = mongoose.model("pmsclients");
              const clientIds = formatted.pms_clients.map(id => toObjectId(id)).filter(Boolean);
              if (clientIds.length > 0) {
                const clients = await PMSClientsModel.find({ _id: { $in: clientIds } })
                  .select("name company_name")
                  .lean();
                formatted.pms_clients = clients.length > 0 
                  ? clients.map(c => c.name || c.company_name || "").filter(Boolean).join(", ") || "-"
                  : "-";
              } else {
                formatted.pms_clients = "-";
              }
            } catch (error) {
              console.error("Error populating pms_clients:", error);
              formatted.pms_clients = "-";
            }
          } else {
            formatted.pms_clients = "-";
          }

          // Populate workFlow
          if (formatted.workFlow) {
            try {
              const WorkFlowModel = mongoose.model("projectworkflows");
              const workFlowId = toObjectId(formatted.workFlow);
              if (workFlowId) {
                const workFlow = await WorkFlowModel.findById(workFlowId)
                  .select("title")
                  .lean();
                formatted.workFlow = workFlow && workFlow.title ? workFlow.title : "";
              } else {
                formatted.workFlow = "";
              }
            } catch (error) {
              console.error("Error populating workFlow:", error);
              formatted.workFlow = "";
            }
          } else {
            formatted.workFlow = "";
          }

          // Format dates
          if (formatted.start_date) {
            formatted.start_date = moment(formatted.start_date).format("DD MMM YYYY HH:mm:ss");
          }
          if (formatted.end_date) {
            formatted.end_date = moment(formatted.end_date).format("DD MMM YYYY HH:mm:ss");
          }
          if (formatted.createdAt) {
            formatted.createdAt = moment(formatted.createdAt).format("DD MMM YYYY HH:mm:ss");
          }
          if (formatted.updatedAt) {
            formatted.updatedAt = moment(formatted.updatedAt).format("DD MMM YYYY HH:mm:ss");
          }

          // Format boolean
          if (formatted.isBillable !== undefined) {
            formatted.isBillable = formatted.isBillable ? "Yes" : "No";
          }

        } else if (moduleName === "tasks") {
          // Populate project_id
          if (formatted.project_id) {
            try {
              const ProjectsModel = mongoose.model("projects");
              const projectId = toObjectId(formatted.project_id);
              if (projectId) {
                const project = await ProjectsModel.findById(projectId)
                  .select("title projectId")
                  .lean();
                formatted.project_id = project && project.projectId ? `#${project.projectId}` : "";
              } else {
                formatted.project_id = "";
              }
            } catch (error) {
              console.error("Error populating project_id:", error);
              formatted.project_id = "";
            }
          }

          // Populate main_task_id
          if (formatted.main_task_id) {
            try {
              const MainTaskModel = mongoose.model("projectmaintasks");
              const mainTaskId = toObjectId(formatted.main_task_id);
              if (mainTaskId) {
                const mainTask = await MainTaskModel.findById(mainTaskId)
                  .select("title")
                  .lean();
                formatted.main_task_id = mainTask && mainTask.title ? mainTask.title : "";
              } else {
                formatted.main_task_id = "";
              }
            } catch (error) {
              console.error("Error populating main_task_id:", error);
              formatted.main_task_id = "";
            }
          }

          // Populate task_labels
          if (formatted.task_labels && Array.isArray(formatted.task_labels) && formatted.task_labels.length > 0) {
            try {
              const TaskLabelsModel = mongoose.model("tasklabels");
              const labelIds = formatted.task_labels.map(id => toObjectId(id)).filter(Boolean);
              if (labelIds.length > 0) {
                const labels = await TaskLabelsModel.find({ _id: { $in: labelIds } })
                  .select("title")
                  .lean();
                formatted.task_labels = labels.length > 0 ? labels.map(l => l.title || "").filter(Boolean).join(", ") : "";
              } else {
                formatted.task_labels = "";
              }
            } catch (error) {
              console.error("Error populating task_labels:", error);
              formatted.task_labels = "";
            }
          } else {
            formatted.task_labels = "";
          }

          // Populate assignees
          if (formatted.assignees && Array.isArray(formatted.assignees) && formatted.assignees.length > 0) {
            try {
              const EmployeesModel = mongoose.model("employees");
              const assigneeIds = formatted.assignees.map(id => toObjectId(id)).filter(Boolean);
              if (assigneeIds.length > 0) {
                const assignees = await EmployeesModel.find({ _id: { $in: assigneeIds } })
                  .select("full_name first_name last_name")
                  .lean();
                formatted.assignees = assignees.length > 0 
                  ? assignees.map(a => a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim()).filter(Boolean).join(", ")
                  : "";
              } else {
                formatted.assignees = "";
              }
            } catch (error) {
              console.error("Error populating assignees:", error);
              formatted.assignees = "";
            }
          } else {
            formatted.assignees = "";
          }

          // Populate pms_clients
          if (formatted.pms_clients && Array.isArray(formatted.pms_clients) && formatted.pms_clients.length > 0) {
            try {
              const PMSClientsModel = mongoose.model("pmsclients");
              const clientIds = formatted.pms_clients.map(id => toObjectId(id)).filter(Boolean);
              if (clientIds.length > 0) {
                const clients = await PMSClientsModel.find({ _id: { $in: clientIds } })
                  .select("name company_name")
                  .lean();
                formatted.pms_clients = clients.length > 0 
                  ? clients.map(c => c.name || c.company_name || "").filter(Boolean).join(", ") || "-"
                  : "-";
              } else {
                formatted.pms_clients = "-";
              }
            } catch (error) {
              console.error("Error populating pms_clients:", error);
              formatted.pms_clients = "-";
            }
          } else {
            formatted.pms_clients = "-";
          }

          // Populate task_status
          if (formatted.task_status) {
            try {
              const WorkflowStatusModel = mongoose.model("workflowstatus");
              const taskStatusId = toObjectId(formatted.task_status);
              if (taskStatusId) {
                const taskStatus = await WorkflowStatusModel.findById(taskStatusId)
                  .select("title")
                  .lean();
                formatted.task_status = taskStatus && taskStatus.title ? taskStatus.title : "";
              } else {
                formatted.task_status = "";
              }
            } catch (error) {
              console.error("Error populating task_status:", error);
              formatted.task_status = "";
            }
          }

          // Populate task_status_history
          if (formatted.task_status_history && Array.isArray(formatted.task_status_history) && formatted.task_status_history.length > 0) {
            try {
              const WorkflowStatusModel = mongoose.model("workflowstatus");
              const EmployeesModel = mongoose.model("employees");
              
              const populatedHistory = await Promise.all(
                formatted.task_status_history.map(async (historyItem) => {
                  const populatedItem = { ...historyItem };
                  
                  // Populate task_status
                  if (historyItem.task_status) {
                    const taskStatusId = toObjectId(historyItem.task_status);
                    if (taskStatusId) {
                      const taskStatus = await WorkflowStatusModel.findById(taskStatusId)
                        .select("title")
                        .lean();
                      populatedItem.task_status = taskStatus && taskStatus.title ? taskStatus.title : "";
                    } else {
                      populatedItem.task_status = "";
                    }
                  }
                  
                  // Populate updatedBy
                  if (historyItem.updatedBy) {
                    const updatedById = toObjectId(historyItem.updatedBy);
                    if (updatedById) {
                      const updatedByUser = await EmployeesModel.findById(updatedById)
                        .select("full_name first_name last_name email")
                        .lean();
                      populatedItem.updatedBy = updatedByUser 
                        ? (updatedByUser.full_name || `${updatedByUser.first_name || ""} ${updatedByUser.last_name || ""}`.trim() || updatedByUser.email)
                        : "";
                    } else {
                      populatedItem.updatedBy = "";
                    }
                  }
                  
                  // Format updatedAt
                  if (historyItem.updatedAt) {
                    populatedItem.updatedAt = moment(historyItem.updatedAt).format("DD MMM YYYY HH:mm:ss");
                  }
                  
                  // Remove any ID fields
                  delete populatedItem._id;
                  
                  return populatedItem;
                })
              );
              
              formatted.task_status_history = populatedHistory;
            } catch (error) {
              console.error("Error populating task_status_history:", error);
              formatted.task_status_history = [];
            }
          } else {
            formatted.task_status_history = [];
          }

          // Format dates
          if (formatted.start_date) {
            formatted.start_date = moment(formatted.start_date).format("DD MMM YYYY HH:mm:ss");
          }
          if (formatted.due_date) {
            formatted.due_date = moment(formatted.due_date).format("DD MMM YYYY HH:mm:ss");
          }
          if (formatted.createdAt) {
            formatted.createdAt = moment(formatted.createdAt).format("DD MMM YYYY HH:mm:ss");
          }
          if (formatted.updatedAt) {
            formatted.updatedAt = moment(formatted.updatedAt).format("DD MMM YYYY HH:mm:ss");
          }
        }

        // Remove any remaining ObjectId fields, arrays of ObjectIds, or null/undefined values
        Object.keys(formatted).forEach(key => {
          const value = formatted[key];
          // Remove ObjectId instances
          if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'ObjectId') {
            delete formatted[key];
          }
          // Remove arrays that might contain ObjectIds (if not already populated)
          else if (Array.isArray(value) && value.length > 0 && value[0] && typeof value[0] === 'object' && value[0].constructor && value[0].constructor.name === 'ObjectId') {
            delete formatted[key];
          }
          // Remove null or undefined
          else if (value === null || value === undefined) {
            delete formatted[key];
          }
        });

        formattedRecords.push(formatted);
      }

      return formattedRecords;
    };

    // Fetch deleted data if it's a DELETE operation
    let deletedData = null;
    if (logData.operationName === "DELETE" && logData.moduleName && logData.additionalData) {
      try {
        const modelName = getModelName(logData.moduleName);
        const Model = mongoose.model(modelName);
        const additionalData = logData.additionalData;
        
        // Get deleted record IDs
        let deletedIds = [];
        if (additionalData.deletedRecordIds && Array.isArray(additionalData.deletedRecordIds)) {
          deletedIds = additionalData.deletedRecordIds;
        } else if (additionalData.recordId) {
          deletedIds = [additionalData.recordId];
        }

        if (deletedIds.length > 0) {
          // Fetch deleted records (including soft deleted ones) - don't filter by isDeleted
          const deletedRecords = await Model.find({
            _id: { $in: deletedIds.map(id => global.newObjectId(id)) }
          }).lean();
          
          if (deletedRecords && deletedRecords.length > 0) {
            // Populate and format the deleted data
            deletedData = await populateDeletedData(deletedRecords, logData.moduleName);
          }
        }
      } catch (error) {
        console.error("Error fetching deleted data:", error);
        // Continue without deleted data if there's an error
      }
    }

    const response = {
      _id: logData._id,
      operationName: logData.operationName,
      moduleName: logData.moduleName,
      email: logData.email,
      createdAt: moment(logData.createdAt).format("YYYY-MM-DD HH:mm:ss"),
      companyName: (logData.companyDetails && logData.companyDetails.companyName) || null,
      createdBy: logData.createdByDetails ? {
        _id: logData.createdByDetails._id,
        full_name: logData.createdByDetails.full_name,
        first_name: logData.createdByDetails.first_name,
        last_name: logData.createdByDetails.last_name,
        email: logData.createdByDetails.email,
        phone_number: logData.createdByDetails.phone_number
      } : null,
      updatedBy: logData.updatedByDetails ? {
        _id: logData.updatedByDetails._id,
        full_name: logData.updatedByDetails.full_name,
        first_name: logData.updatedByDetails.first_name,
        last_name: logData.updatedByDetails.last_name,
        email: logData.updatedByDetails.email,
        phone_number: logData.updatedByDetails.phone_number
      } : null,
      deletedBy: logData.deletedByDetails ? {
        _id: logData.deletedByDetails._id,
        full_name: logData.deletedByDetails.full_name,
        first_name: logData.deletedByDetails.first_name,
        last_name: logData.deletedByDetails.last_name,
        email: logData.deletedByDetails.email,
        phone_number: logData.deletedByDetails.phone_number
      } : null,
      additionalData: logData.additionalData || null,
      updatedData: logData.updatedData || null,
      deletedData: deletedData || null
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

