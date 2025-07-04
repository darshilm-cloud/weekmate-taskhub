const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const Project = mongoose.model("projects");
const fileFolders = mongoose.model("filefolders");
const ProjectTimeSheet = mongoose.model("projecttimesheets");
const ProjectTasks = mongoose.model("projecttasks");
const ProjectWorkFlowStatus = mongoose.model("workflowstatus");
const BugsWorkflowStatus = mongoose.model("bugsworkflowstatus");
const ProjectWorkFlow = mongoose.model("projectworkflows");
const ProjectTech = mongoose.model("projecttechs");
const ProjectStar = mongoose.model("star_project");
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
  newProjectManagerMail,
  newProjectAssigneesMail,
  mailForUpdateProjectInfo
} = require("../template/project");
const {
  getArrayChanges,
  getRefModelFromLoginUser,
  getCreatedUpdatedDeletedByQuery,
  getClientQuery,
  generateRandomId,
  getProjectDefaultSettingQuery
} = require("../helpers/common");
const { projectStatusExists } = require("./projectStatus");
const ProjectStatus = mongoose.model("projectstatus");
const {
  checkLoginUserIsProjectManager,
  checkLoginUserIsProjectAccountManager
} = require("./projectMainTask");
const { sheet } = require("../template/projectsReportsCSV");
const { checkUserIsAdmin, checkUserIsSuperAdmin } = require("./authentication");
const { projectWorkFlowExists } = require("./projectWorkFlow");
const { manageAllProjectTabSetting } = require("./projectTabsSetting");
const { getCache, storeCache } = require("../middleware/cacheStore");
const { generateCacheKey } = require("../middleware/CryptoKey");

// Check is exists..
exports.projectExists = async (title, id = null) => {
  try {
    let isExist = false;

    const data = await Project.aggregate([
      {
        $match: {
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
    console.log("🚀 ~ exports.projectExists= ~ error:", error);
  }
};

// add Project wise default data...
exports.addProjectDefaultData = async (addedProject, loginUserId) => {
  try {
    // Add default project folder..
    let projectFolder = new fileFolders({
      name: addedProject.title,
      isDefault: true,
      project_id: addedProject._id,
      createdBy: loginUserId,
      updatedBy: loginUserId
    });
    projectFolder.save();

    // Add default project timesheet..
    let timeSheet = new ProjectTimeSheet({
      title: `${addedProject.title} - Timesheet`,
      isDefault: true,
      project_id: addedProject._id,
      createdBy: loginUserId,
      updatedBy: loginUserId
    });
    timeSheet.save();

    return;
  } catch (error) {
    console.log("🚀 ~ exports.addProjectDefaultData= ~ error:", error);
  }
};

// update Project wise default data...
exports.updateProjectDefaultData = async (
  reqBody,
  addedProject,
  loginUserId
) => {
  try {
    // If project title update ...
    if (reqBody?.title !== addedProject?.title) {
      let where = {
        project_id: new mongoose.Types.ObjectId(addedProject._id),
        isDefault: true,
        isDeleted: false
      };
      // update default project folder..
      await fileFolders.findOneAndUpdate(
        where,
        {
          name: reqBody.title,
          updatedBy: loginUserId
        },
        { new: true }
      );

      // update default project timesheet..
      await ProjectTimeSheet.findOneAndUpdate(
        where,
        {
          title: `${addedProject.title} - Timesheet`,
          updatedBy: loginUserId
        },
        { new: true }
      );
    }

    // If project workflow update ...
    // need to update task status to TO DO..
    if (reqBody?.workFlow.toString() !== addedProject?.workFlow?.toString()) {
      // 1st : get project tasks..
      const tasks = await ProjectTasks.find({
        project_id: new mongoose.Types.ObjectId(addedProject._id),
        isDeleted: false
      });

      if (tasks && tasks.length > 0) {
        // get updated workflow default status - todo..
        const workFlowStatus = await ProjectWorkFlowStatus.findOne({
          workflow_id: new mongoose.Types.ObjectId(reqBody?.workFlow),
          isDefault: true,
          isDeleted: false,
          title: DEFAULT_DATA.WORKFLOW_STATUS.TODO
        });

        // Update task workflow..
        await ProjectTasks.updateMany(
          {
            isDeleted: false,
            project_id: new mongoose.Types.ObjectId(addedProject._id)
          },
          {
            $set: {
              task_status: new mongoose.Types.ObjectId(workFlowStatus._id),
              task_status_history: [
                {
                  task_status: new mongoose.Types.ObjectId(workFlowStatus._id),
                  updatedBy: loginUserId,
                  updatedAt: configs.utcDefault()
                }
              ]
            }
          }
        );
      }
    }
    return;
  } catch (error) {
    console.log("🚀 ~ exports.addProjectDefaultData= ~ error:", error);
  }
};

//Add Project :
exports.addProjects = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      title: Joi.string().required(),
      color: Joi.string().optional().allow(""),
      descriptions: Joi.string().optional().allow("").default(""),
      technology: Joi.array().optional().default([]),
      project_type: Joi.string().optional().default(null),
      project_status: Joi.string().optional().default(null),
      manager: Joi.string().optional().default(null),
      workFlow: Joi.string().optional().default(null),
      assignees: Joi.array().default([]),
      pms_clients: Joi.array().default([]),
      estimatedHours: Joi.string().optional().allow("").default(""),
      start_date: Joi.date().optional().default(null),
      end_date: Joi.date().optional().default(null),
      isBillable: Joi.boolean().optional().default(false),
      acc_manager: Joi.string().optional().allow("")
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (await this.projectExists(value?.title)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let data = new Project({
        title: value?.title,
        color: value?.color || "",
        descriptions: value?.descriptions || "",
        technology:
          (value?.technology &&
            value?.technology.length > 0 &&
            value?.technology.map((a) => new mongoose.Types.ObjectId(a))) ||
          [],
        project_type: value?.project_type,
        project_status: value?.project_status,
        manager: value?.manager,
        workFlow: value?.workFlow,
        assignees:
          (value?.assignees &&
            value?.assignees.length > 0 &&
            value?.assignees.map((a) => new mongoose.Types.ObjectId(a))) ||
          [],
        pms_clients:
          (value?.pms_clients &&
            value?.pms_clients.length > 0 &&
            value?.pms_clients.map((a) => new mongoose.Types.ObjectId(a))) ||
          [],
        estimatedHours: value?.estimatedHours || "",
        start_date: value?.start_date,
        isBillable: value?.isBillable,
        projectId: generateRandomId(),
        end_date: value?.end_date,
        createdBy: req.user._id,
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user)),
        acc_manager:
          value?.acc_manager && value?.acc_manager != ""
            ? value?.acc_manager
            : null
      });
      await data.save();

      // Add project default data..
      await this.addProjectDefaultData(data, req.user._id);

      // For send mail...
      const addedData = await this.getProjectDetailsForMail(data._id);

      // mail to manger..
      if (addedData.manager) {
        await newProjectManagerMail(addedData);
      }

      // mail to assignees and client..
      if (
        addedData?.assignees?.length > 0 ||
        addedData?.pms_clients?.length > 0
      ) {
        await newProjectAssigneesMail(addedData);
      }

      return successResponse(
        res,
        statusCode.CREATED,
        messages.PROJECT_CREATED,
        data
      );
    }
  } catch (error) {
    console.log("🚀 ~ exports.addProjects= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project :
exports.getProjects = async (req, res) => {
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
      filterBy: Joi.string().default("all"),
      color: Joi.string().allow(""),
      project_status: Joi.array().optional().default([]),
      manager_id: Joi.array().optional().default([]),
      acc_manager_id: Joi.array().optional().default([]),
      assignee_id: Joi.array().optional().default([]),
      category: Joi.array().optional().default([]),
      technology: Joi.array().optional().default([]),
      project_type: Joi.array().optional().default([]),
      isArchived: Joi.boolean().optional().default(false),
      isSearch: Joi.boolean().default(false),
      isBillable: Joi.boolean().optional()
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

    // Manage projects default tabs .. . .
    await manageAllProjectTabSetting(req.user);

    // Or filter..
    let orFilter = [
      value?.filterBy !== "all"
        ? value?.filterBy == "assigned"
          ? {
              // "assignees._id": new mongoose.Types.ObjectId(req.user._id)
              $or: [
                { "assignees._id": new mongoose.Types.ObjectId(req.user._id) },
                {
                  "pms_clients._id": new mongoose.Types.ObjectId(req.user._id)
                }
              ]
            }
          : { "manager._id": new mongoose.Types.ObjectId(req.user._id) }
        : !(await checkUserIsSuperAdmin(req?.user?._id))
        ? {
            $or: [
              { "assignees._id": new mongoose.Types.ObjectId(req.user._id) },
              { "pms_clients._id": new mongoose.Types.ObjectId(req.user._id) },
              { "manager._id": new mongoose.Types.ObjectId(req.user._id) },
              { "createdBy._id": new mongoose.Types.ObjectId(req.user._id) },
              { "acc_manager._id": new mongoose.Types.ObjectId(req.user._id) }
            ]
          }
        : {}
    ];



    let matchQuery = {
      isDeleted: false, // value?.isArchived,
      // For details
      ...(value?._id
        ? { _id: new mongoose.Types.ObjectId(value?._id) }
        : // For active and archive
        !value?.isArchived
        ? {
            // "project_status.title": {
            //   // $ne: DEFAULT_DATA.PROJECT_STATUS.ARCHIVED,
            //   $eq: DEFAULT_DATA.PROJECT_STATUS.ACTIVE
            // }
          }
        : {
            "project_status.title": {
              // $eq: DEFAULT_DATA.PROJECT_STATUS.ARCHIVED,
              $ne: DEFAULT_DATA.PROJECT_STATUS.ACTIVE
            }
          }),
      // filters..
      ...(value?.color ? { color: value?.color } : {}),
      ...(value?.project_status?.length > 0
        ? {
            "project_status._id": {
              $in: value.project_status.map(
                (s) => new mongoose.Types.ObjectId(s)
              )
            }
          }
        : {}),

      ...(value?.category?.length > 0
        ? {
            "project_type._id": {
              $in: value.category.map((s) => new mongoose.Types.ObjectId(s))
            }
          }
        : {}),

      ...(value?.technology?.length > 0
        ? {
            "technology._id": {
              $in: value.technology.map((s) => new mongoose.Types.ObjectId(s))
            }
          }
        : {}),

      ...(value?.project_type?.length > 0
        ? {
            "project_type._id": {
              $in: value.project_type.map((s) => new mongoose.Types.ObjectId(s))
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
      ...(value?.assignee_id?.length > 0
        ? {
            "assignees._id": {
              $in: value.assignee_id.map((s) => new mongoose.Types.ObjectId(s))
            }
          }
        : {}),

      ...("isBillable" in value && { isBillable: value?.isBillable })
    };

    if (value?.search) {
      orFilter = [
        ...orFilter,
        searchDataArr(
          ["title", ...(!value.isSearch ? ["manager.full_name"] : [])],
          value?.search
        )
      ];
    }
    matchQuery = {
      ...matchQuery,
      $and: orFilter
    };

    console.log("🚀 ~ exports.getProjects= ~ orFilter:", JSON.stringify(matchQuery, null, 2));


    const mainQuery = [
      {
        $match: { isDeleted: false } // value?.isArchived,
      },
      {
        $lookup: {
          from: "projecttechs",
          let: { technology: "$technology" },
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
        $lookup: {
          from: "projecttypes",
          let: { project_type: "$project_type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_type"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project_type"
        }
      },
      {
        $unwind: {
          path: "$project_type",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projectstatuses",
          let: { project_status: "$project_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_status"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project_status"
        }
      },
      {
        $unwind: {
          path: "$project_status",
          preserveNullAndEmptyArrays: true
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
          let: { acc_manager: "$acc_manager" },
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
      ...(await getCreatedUpdatedDeletedByQuery()),

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
          from: "projectworkflows",
          let: { workFlow: "$workFlow" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$workFlow"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "workFlow"
        }
      },
      {
        $unwind: {
          path: "$workFlow",
          preserveNullAndEmptyArrays: true
        }
      },
      ...(await getProjectDefaultSettingQuery()),
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          color: 1,
          projectId: 1,
          isBillable: 1,
          isStarred: 1,
          end_date: 1,
          start_date: 1,
          descriptions: 1,
          estimatedHours: 1,
          technology: 1,
          //  {
          //   _id: 1,
          //   project_tech: 1,
          // },
          project_type: {
            _id: 1,
            project_type: 1
          },
          project_status: {
            _id: 1,
            title: 1
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
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1
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
                name: "$$assigneeId.full_name",
                emp_img: "$$assigneeId.emp_img"
              }
            }
          },
          ...(await getClientQuery(true)),
          workFlow: {
            _id: 1,
            project_workflow: 1
          },
          updatedAt: 1,
          createdAt: 1,
          ...(await getProjectDefaultSettingQuery("_id", true))
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    // const totalCountResult = await Project.aggregate(countQuery);

    let listQuery = [];
    if (!value?.isSearch) {
      listQuery = await getAggregationPagination(mainQuery, pagination);
    } else {
      listQuery = [...mainQuery, { $sort: pagination.sort }];
    }
    // let data = await Project.aggregate(listQuery);

    const [totalCountResult, data, _] = await Promise.all([
      Project.aggregate(countQuery),
      Project.aggregate(listQuery),
      // Need to check project status..(we need Active and Archived status default)
      this.checkDefaultProjectAndBugStatus(req.user._id)
    ]);

    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    let metaData = {};
    if (!value?.isSearch) {
      metaData = {
        total: totalCount,
        limit: pagination.limit,
        pageNo: pagination.page,
        totalPages:
          pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
        currentPage: pagination.page
      };
    }

    // Need to check project status..(we need Active and Archived status default)
    // await this.checkDefaultProjectAndBugStatus(req.user._id);

    // check project have project id or not...
    await this.addProjectRandomId(data);

    // cacheStore(cacheKey, value._id ? data[0] : data, !value._id && metaData);

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

//Update Project :
exports.updateProjects = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().optional().allow(""),
      color: Joi.string().optional().allow(""),
      descriptions: Joi.string().optional().allow(""),
      technology: Joi.array().optional().default([]),
      project_type: Joi.string().optional().default(null),
      project_status: Joi.string().optional().default(null),
      manager: Joi.string().optional().default(null),
      workFlow: Joi.string().optional().default(null),
      assignees: Joi.array().default([]),
      pms_clients: Joi.array().default([]),
      estimatedHours: Joi.string().optional().allow(""),
      start_date: Joi.date().optional().default(null),
      end_date: Joi.date().optional().default(null),
      isBillable: Joi.boolean().optional(),
      acc_manager: Joi.string().optional().default(null)
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (await this.projectExists(value?.title, req.params.id)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      const projectData = await Project.findById(req.params.id)
        .populate("manager")
        .populate("assignees");

      const data = await Project.findByIdAndUpdate(
        req.params.id,
        {
          title: value?.title,
          color: value?.color || "",
          descriptions: value?.descriptions || "",
          technology:
            (value?.technology &&
              value?.technology.length > 0 &&
              value?.technology.map((a) => new mongoose.Types.ObjectId(a))) ||
            [],
          project_type: value?.project_type,
          project_status: value?.project_status,
          manager: value?.manager,
          workFlow: value?.workFlow,
          assignees:
            (value?.assignees &&
              value?.assignees.length > 0 &&
              value?.assignees.map((a) => new mongoose.Types.ObjectId(a))) ||
            [],
          pms_clients:
            (value?.pms_clients &&
              value?.pms_clients.length > 0 &&
              value?.pms_clients.map((a) => new mongoose.Types.ObjectId(a))) ||
            [] ||
            [],
          estimatedHours: value?.estimatedHours || "",
          ...("isBillable" in value && { isBillable: value?.isBillable }),
          start_date: value?.start_date,
          end_date: value?.end_date,
          updatedBy: req.user._id,
          ...(await getRefModelFromLoginUser(req?.user, true)),
          acc_manager: value?.acc_manager || null
        },
        { new: true }
      );

      if (!data) {
        return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
      }

      // updated project data...
      if (
        // value?.color !== projectData?.color ||
        value?.manager !== projectData?.manager?._id.toString() ||
        value?.title !== projectData?.title
      ) {
        const updatedData = await Project.findById(data._id)
          .populate("manager")
          .populate("updatedBy")
          .populate("assignees");

        await mailForUpdateProjectInfo({
          oldData: projectData,
          newData: updatedData
        });
      }

      // update project default data..
      await this.updateProjectDefaultData(value, projectData, req.user._id);

      // For send mail for new added subscribers..
      const assigneesData = getArrayChanges(
        projectData.assignees.map((a) => a._id.toString()),
        value?.assignees
      );

      // For send mail for new added client..
      const clientData = getArrayChanges(
        projectData.pms_clients.map((a) => a.toString()),
        value?.pms_clients
      );

      if (
        (assigneesData.added && assigneesData.added.length > 0) ||
        (clientData.added && clientData.added.length > 0)
      ) {
        const updatedData = await this.getProjectDetailsForMail(
          data._id,
          assigneesData.added,
          clientData.added
        );

        await newProjectAssigneesMail(updatedData);
      }
      return successResponse(
        res,
        statusCode.SUCCESS,
        messages.PROJECT_UPDATED,
        data
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project :
exports.archivedToActiveProject = async (req, res) => {
  try {
    const projectStatus = DEFAULT_DATA.PROJECT_STATUS.ACTIVE;
    // get project active status...
    const data = await ProjectStatus.findOne({
      title: { $regex: new RegExp(`^${projectStatus}$`, "i") },
      isDeleted: false
    });
    if (data) {
      const project = await Project.findByIdAndUpdate(
        req.params.id,
        {
          project_status: new mongoose.Types.ObjectId(data._id),
          updatedAt: configs.utcDefault(),
          updatedBy: req.user._id,
          ...(await getRefModelFromLoginUser(req?.user, true))
        },
        { new: true }
      );

      if (!project) {
        return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
      }
    }
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.PROJECT_ACTIVATE,
      []
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// get project details for mail ...
exports.getProjectDetailsForMail = async (
  projectId,
  newAddedAssignees = [],
  newAddedClients = []
) => {
  try {
    const mainQuery = [
      {
        $lookup: {
          from: "projecttechs",
          let: { technology: "$technology" },
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
      // {
      //   $unwind: {
      //     path: "$technology",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      {
        $lookup: {
          from: "projectstatuses",
          let: { project_status: "$project_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_status"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project_status"
        }
      },
      {
        $unwind: {
          path: "$project_status",
          preserveNullAndEmptyArrays: true
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
      ...(await getCreatedUpdatedDeletedByQuery()),
      ...(await getClientQuery()),
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
        $match: {
          isDeleted: false,
          _id: new mongoose.Types.ObjectId(projectId)
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          projectId: 1,
          color: 1,
          end_date: 1,
          start_date: 1,
          isBillable: 1,
          descriptions: 1,
          estimatedHours: 1,
          technology: 1,
          // {
          //   _id: 1,
          //   project_tech: 1,
          // },
          project_status: {
            _id: 1,
            title: 1
          },
          manager: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            emp_img: 1,
            first_name: 1
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            emp_img: 1,
            client_img: 1
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
                // _id: "$$assigneeId._id",
                // name: "$$assigneeId.full_name",
                // email: "$$assigneeId.email",
                // emp_img: "$$assigneeId.emp_img",
                $cond: {
                  if: {
                    ...(newAddedAssignees.length > 0
                      ? {
                          $in: [
                            "$$assigneeId._id",
                            newAddedAssignees.map(
                              (n) => new mongoose.Types.ObjectId(n)
                            )
                          ]
                        }
                      : {})
                  },
                  then: {
                    _id: "$$assigneeId._id",
                    name: "$$assigneeId.full_name",
                    first_name: "$$assigneeId.first_name",
                    last_name: "$$assigneeId.last_name",
                    email: "$$assigneeId.email",
                    emp_img: "$$assigneeId.emp_img"
                  },
                  else: null // Or any other value you prefer for non-matching IDs
                }
              }
            }
          },
          ...(await getClientQuery(true, newAddedClients))
        }
      }
    ];

    const data = await Project.aggregate(mainQuery);
    return data[0];
  } catch (error) {
    console.log("🚀 ~ exports.getProjectDetailsForMail= ~ error:", error);
  }
};

// Archived to active Project :
exports.deleteProjects = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, false, true))
      },
      { new: true }
    );

    if (!project) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.PROJECT_DELETED,
      project
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Project status default data :
exports.checkDefaultProjectAndBugStatus = async (loginUserId) => {
  try {
    const common = {
      createdBy: loginUserId,
      updatedBy: loginUserId
    };
    // Check if bugs workflow status added or not (is a default for all project) ...
    const status = await BugsWorkflowStatus.find({ isDeleted: false });
    if (status && status.length == 0) {
      const BUG_STATUS = DEFAULT_DATA.BUG_WORKFLOW_STATUS;
      await BugsWorkflowStatus.insertMany([
        {
          title: BUG_STATUS.TODO,
          color: "#89CFF0",
          sequence: 1,
          ...common
        },
        {
          title: BUG_STATUS.IN_PROGRESS,
          color: "#89CFF0",
          sequence: 2,
          ...common
        },
        {
          title: BUG_STATUS.TO_BE_TESTED,
          color: "#89CFF0",
          sequence: 3,
          ...common
        },
        {
          title: BUG_STATUS.ON_HOLD,
          color: "#89CFF0",
          sequence: 4,
          ...common
        },
        {
          title: BUG_STATUS.DONE,
          color: "#89CFF0",
          sequence: 5,
          ...common
        }
      ]);
    }
    // Project status..
    const PROJECT_STATUS = DEFAULT_DATA.PROJECT_STATUS;
    const projectStatus = [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.ARCHIVED];
    for (let i = 0; i < projectStatus.length; i++) {
      const element = projectStatus[i];
      if (!(await projectStatusExists(element))) {
        const newData = new ProjectStatus({
          title: element,
          ...common
        });
        await newData.save();
      }
    }

    // Project workflow..
    const standardWorkflow = DEFAULT_DATA.WORKFLOW.STANDARD;
    if (!(await projectWorkFlowExists(standardWorkflow))) {
      const newData = new ProjectWorkFlow({
        project_workflow: standardWorkflow,
        isDefault: true,
        ...common
      });
      await newData.save();

      // save on default work flow status ..
      const WORKFLOW_STATUS = DEFAULT_DATA.WORKFLOW_STATUS;
      await ProjectWorkFlowStatus.insertMany([
        {
          workflow_id: newData._id,
          color: "#616161",
          title: WORKFLOW_STATUS.TODO,
          isDefault: true,
          sequence: 1,
          ...common
        },
        {
          workflow_id: newData._id,
          color: "#228B22",
          title: WORKFLOW_STATUS.DONE,
          sequence: 2,
          isDefault: true,
          ...common
        }
      ]);
    }
  } catch (error) {
    console.log(
      "🚀 ~ exports.checkDefaultProjectAndBugStatus= ~ error:",
      error
    );
  }
};

// Project overview data :
exports.getProjectOverviewData = async (req, res) => {
  try {
    const isAdmin = await checkUserIsAdmin(req.user._id);
    const isSuperAdmin = await checkUserIsSuperAdmin(req?.user?._id);
    const isManager = await checkLoginUserIsProjectManager(
      req.params.id,
      req.user._id
    );
    const isAccManager = await checkLoginUserIsProjectAccountManager(
      req.params.id,
      req.user._id
    );

    let commonQuery = [
      { $eq: ["$project_id", "$$projectId"] },
      { $eq: ["$isDeleted", false] }
    ];
    let taskQuery = commonQuery;
    let loggedHrQuery = commonQuery;

    if (!isManager && isSuperAdmin && !isAdmin && !isAccManager) {
      taskQuery = [
        ...taskQuery,
        {
          $or: [
            {
              $eq: ["$createdBy", new mongoose.Types.ObjectId(req.user._id)]
            },
            {
              $and: [
                {
                  $in: [new mongoose.Types.ObjectId(req.user._id), "$assignees"]
                },
                {
                  $in: [
                    new mongoose.Types.ObjectId(req.user._id),
                    "$mainTask.subscribers"
                  ]
                }
              ]
            },
            {
              $and: [
                {
                  $in: [
                    new mongoose.Types.ObjectId(req.user._id),
                    "$pms_clients"
                  ]
                },
                {
                  $in: [
                    new mongoose.Types.ObjectId(req.user._id),
                    "$mainTask.pms_clients"
                  ]
                }
              ]
            }
          ]
        }
      ];

      loggedHrQuery = [
        ...loggedHrQuery,
        {
          $or: [
            {
              $eq: ["$createdBy", new mongoose.Types.ObjectId(req.user._id)]
            },
            {
              $in: [new mongoose.Types.ObjectId(req.user._id), "$$pms_clients"]
            }
          ]
        }
      ];
    }
    const query = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.id),
          isDeleted: false
        }
      },
      {
        $lookup: {
          from: "projectstatuses",
          let: { project_status: "$project_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_status"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project_status"
        }
      },
      {
        $unwind: {
          path: "$project_status",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projecttypes",
          let: { project_type: "$project_type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_type"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project_type"
        }
      },
      {
        $unwind: {
          path: "$project_type",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          total_assignees: {
            $add: [
              {
                $size: "$assignees"
              },
              {
                $size: "$pms_clients"
              }
            ]
          }
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
          let: { manager: "$acc_manager" },
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
          as: "acc_manager"
        }
      },
      {
        $unwind: {
          path: "$acc_manager",
          preserveNullAndEmptyArrays: true
        }
      },
      ...(await getCreatedUpdatedDeletedByQuery()),
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

      //tech
      {
        $lookup: {
          from: "projecttechs",
          let: { technologyIds: "$technology" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ["$$technologyIds", null] },
                    { $ne: ["$$technologyIds", []] },
                    {
                      $in: [
                        "$_id",
                        {
                          $map: {
                            input: "$$technologyIds",
                            as: "id",
                            in: { $toObjectId: "$$id" }
                          }
                        }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: "technologyDetails"
        }
      },

      // {
      //   $lookup: {
      //     from: "projecttasks",
      //     let: { projectId: "$_id" },
      //     pipeline: [
      //       {
      //         $lookup: {
      //           from: "projectmaintasks",
      //           let: { mainTaskId: "$main_task_id" },
      //           pipeline: [
      //             {
      //               $match: {
      //                 $expr: {
      //                   $and: [
      //                     { $eq: ["$_id", "$$mainTaskId"] },
      //                     { $eq: ["$isDeleted", false] },
      //                   ],
      //                 },
      //               },
      //             },
      //           ],
      //           as: "mainTask",
      //         },
      //       },
      //       {
      //         $unwind: {
      //           path: "$mainTask",
      //           preserveNullAndEmptyArrays: false,
      //         },
      //       },
      //       {
      //         $match: {
      //           $expr: {
      //             $and: taskQuery,
      //           },
      //         },
      //       },
      //       {
      //         $lookup: {
      //           from: "workflowstatuses",
      //           let: { task_status: "$task_status" },
      //           pipeline: [
      //             {
      //               $match: {
      //                 $expr: {
      //                   $and: [
      //                     { $eq: ["$_id", "$$task_status"] },
      //                     { $eq: ["$isDeleted", false] },
      //                   ],
      //                 },
      //               },
      //             },
      //           ],
      //           as: "task_status",
      //         },
      //       },
      //       {
      //         $unwind: {
      //           path: "$task_status",
      //           preserveNullAndEmptyArrays: true,
      //         },
      //       },
      //       {
      //         $group: {
      //           _id: {
      //             $dateToString: {
      //               format: "%Y-%m-%d",
      //               date: "$createdAt",
      //             },
      //           },
      //           tasks: { $push: "$$ROOT" }, // Group tasks by creation date
      //         },
      //       },
      //       {
      //         $sort: { _id: 1 }, // Sort tasks by creation date in ascending order
      //       },
      //       {
      //         $lookup: {
      //           from: "projecttasks",
      //           let: { taskCreatedAt: "$_id" }, // Use the created date of each grouped task
      //           pipeline: [
      //             {
      //               $lookup: {
      //                 from: "projectmaintasks",
      //                 let: { mainTaskId: "$main_task_id" },
      //                 pipeline: [
      //                   {
      //                     $match: {
      //                       $expr: {
      //                         $and: [
      //                           { $eq: ["$_id", "$$mainTaskId"] },
      //                           { $eq: ["$isDeleted", false] },
      //                         ],
      //                       },
      //                     },
      //                   },
      //                 ],
      //                 as: "mainTask",
      //               },
      //             },
      //             {
      //               $unwind: {
      //                 path: "$mainTask",
      //                 preserveNullAndEmptyArrays: false,
      //               },
      //             },
      //             {
      //               $match: {
      //                 $expr: {
      //                   $and: [
      //                     ...taskQuery,
      //                     {
      //                       $lte: [
      //                         { $toDate: "$createdAt" },
      //                         { $toDate: "$$taskCreatedAt" },
      //                       ],
      //                     },
      //                   ],
      //                 },
      //               },
      //             },
      //             {
      //               $lookup: {
      //                 from: "workflowstatuses",
      //                 let: { task_status: "$task_status" },
      //                 pipeline: [
      //                   {
      //                     $match: {
      //                       $expr: {
      //                         $and: [
      //                           { $eq: ["$_id", "$$task_status"] },
      //                           { $eq: ["$isDeleted", false] },
      //                         ],
      //                       },
      //                     },
      //                   },
      //                 ],
      //                 as: "task_status",
      //               },
      //             },
      //             {
      //               $unwind: {
      //                 path: "$task_status",
      //                 preserveNullAndEmptyArrays: true,
      //               },
      //             },
      //           ],
      //           as: "historicTasks",
      //         },
      //       },
      //       {
      //         $addFields: {
      //           totalHistoricTasks: {
      //             $concatArrays: ["$historicTasks", "$tasks"],
      //           },
      //         },
      //       },
      //       {
      //         $project: {
      //           _id: 0,
      //           date: "$_id",
      //           project_tasks: "$totalHistoricTasks", // All task data
      //           total_task: { $size: "$totalHistoricTasks" },
      //           total_done_task: {
      //             $size: {
      //               $filter: {
      //                 input: "$totalHistoricTasks",
      //                 as: "task",
      //                 cond: {
      //                   $eq: ["$$task.task_status.title", "Done"],
      //                 },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     ],
      //     as: "tasks_summary",
      //   },
      // },
      {
        $lookup: {
          from: "projecttaskhourlogs",
          let: { projectId: "$_id", pms_clients: "$pms_clients" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: loggedHrQuery
                }
              }
            },
            {
              $group: {
                _id: "$logged_status",
                totalHours: {
                  $sum: {
                    $toInt: "$logged_hours"
                  }
                },
                totalMinutes: {
                  $sum: {
                    $toInt: "$logged_minutes"
                  }
                }
              }
            },
            {
              $addFields: {
                time_in_mins: {
                  $add: [
                    {
                      $multiply: [
                        {
                          $toDouble: "$totalHours"
                        },
                        60
                      ]
                    },
                    {
                      $toDouble: "$totalMinutes"
                    }
                  ]
                }
              }
            },
            {
              $facet: {
                existingData: [
                  {
                    $project: {
                      _id: 0,
                      logged_status: "$_id",
                      total_logged_hours: {
                        $floor: {
                          $divide: ["$time_in_mins", 60]
                        }
                      },
                      total_logged_minutes: {
                        $mod: ["$time_in_mins", 60]
                      }
                    }
                  }
                ],
                missingStatus: [
                  {
                    $group: {
                      _id: null,
                      status: { $addToSet: "$_id" }
                    }
                  },
                  {
                    $project: {
                      _id: 0,
                      logged_status: {
                        $setDifference: [
                          ["Billed", "Billable", "Non-billable", "Void"],
                          "$status"
                        ]
                      },
                      total_logged_hours: { $literal: 0 },
                      total_logged_minutes: { $literal: 0 }
                    }
                  },
                  { $unwind: "$logged_status" }
                ]
              }
            },
            {
              $project: {
                task_hours: {
                  $concatArrays: ["$existingData", "$missingStatus"]
                }
              }
            }
          ],
          as: "task_hours"
        }
      },
      {
        $unwind: {
          path: "$task_hours",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          totalLoggedTime: {
            $reduce: {
              input: "$task_hours.task_hours",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $add: [
                      {
                        $multiply: [
                          {
                            $toDouble: "$$this.total_logged_hours"
                          },
                          60
                        ]
                      },
                      {
                        $toDouble: "$$this.total_logged_minutes"
                      }
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      ...(await getClientQuery()),
      {
        $project: {
          _id: 1,
          title: 1,
          color: 1,
          isBillable: 1,
          descriptions: 1,
          project_type: {
            _id: 1,
            title: "$project_type.project_type"
          },
          project_status: {
            _id: 1,
            title: 1
          },
          estimatedHours: 1,
          start_date: 1,
          end_date: 1,
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
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1
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
                name: "$$assigneeId.full_name",
                emp_img: "$$assigneeId.emp_img"
              }
            }
          },
          ...(await getClientQuery(true)),

          total_assignees: 1,
          // technologyDetails:1,

          technologyDetails: 1,

          //
          tasks_summary: await this.fetchTasksInChunks(
            req.params.id,
            req.user._id
          ),
          logged_hours: "$task_hours.task_hours",
          total_logged_time: {
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
                  $mod: ["$totalLoggedTime", 60]
                }
              }
            ]
          }
        }
      }
    ];

    const data = await Project.aggregate(query);
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      data[0] || {}
    );
  } catch (error) {
    console.log("error ~  :", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.fetchTasksInChunks = async (projectId, userId, pageSize = 100) => {
  const isManager = await checkLoginUserIsProjectManager(projectId, userId);
  const isAccManager = await checkLoginUserIsProjectAccountManager(
    projectId,
    userId
  );
  const isSuperAdmin = await checkUserIsSuperAdmin(userId);
  const isAdmin = await checkUserIsAdmin(userId);

  let commonQuery = [
    { $eq: ["$project_id", new mongoose.Types.ObjectId(projectId)] },
    { $eq: ["$isDeleted", false] }
  ];

  let taskQuery = commonQuery;

  if (!isManager && !isSuperAdmin && !isAdmin && !isAccManager) {
    taskQuery = [
      ...taskQuery,
      {
        $or: [
          { $eq: ["$createdBy", new mongoose.Types.ObjectId(userId)] },
          { $in: [new mongoose.Types.ObjectId(userId), "$assignees"] },
          {
            $in: [new mongoose.Types.ObjectId(userId), "$mainTask.subscribers"]
          },
          { $in: [new mongoose.Types.ObjectId(userId), "$pms_clients"] },
          {
            $in: [new mongoose.Types.ObjectId(userId), "$mainTask.pms_clients"]
          }
        ]
      }
    ];
  }

  let tasksSummary = [];
  let page = 0;
  let tasksBatch;

  do {
    tasksBatch = await ProjectTasks.aggregate([
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
      { $unwind: "$mainTask" },
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
      { $unwind: "$task_status" },
      {
        $match: {
          $expr: {
            $and: taskQuery
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          tasks: { $push: "$$ROOT" }
        }
      },
      { $sort: { _id: 1 } },
      { $skip: page * pageSize },
      { $limit: pageSize },
      {
        $project: {
          _id: 0,
          date: "$_id",
          project_tasks: "$tasks",
          total_task: { $size: "$tasks" },
          total_done_task: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: {
                  $eq: [
                    "$$task.task_status.title",
                    DEFAULT_DATA.WORKFLOW_STATUS.DONE
                  ]
                }
              }
            }
          }
        }
      }
    ]).allowDiskUse(true);

    tasksSummary = tasksSummary.concat(tasksBatch);
    page++;
  } while (tasksBatch.length === pageSize);

  return tasksSummary;
};

// Project reports details for graphs
exports.getProjectsReports = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      technologies: Joi.array().optional(),
      types: Joi.array().optional(),
      managers: Joi.array().optional(),
      isExport: Joi.boolean().required()
    });

    const { value, error } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const cacheKey = generateCacheKey(value);

    const cached = getCache(cacheKey);
    if (cached) {
      const { data, metadata } = cached;
      return successResponse(
        res,
        statusCode.SUCCESS,
        messages.LISTING,
        data,
        metadata
      );
    }

    const pagination = getPagination({
      pageLimit: value?.limit,
      pageNum: value?.pageNo,
      sort: value?.sort,
      sortBy: value?.sortBy
    });
    let matchQuery = {
      isDeleted: false
    };
    if (value?.technologies && value?.technologies.length > 0) {
      matchQuery.technology = {
        $in: value?.technologies.map((ele) => new mongoose.Types.ObjectId(ele))
      };
    }
    if (value?.types && value?.types.length > 0) {
      matchQuery.project_type = {
        $in: value?.types.map((ele) => new mongoose.Types.ObjectId(ele))
      };
    }
    if (value?.managers && value?.managers.length > 0) {
      matchQuery.manager = {
        $in: value?.managers.map((ele) => new mongoose.Types.ObjectId(ele))
      };
    }
    let commonQuery = [
      { $eq: ["$project_id", "$$projectId"] },
      { $eq: ["$isDeleted", false] }
    ];
    let loggedHrQuery = commonQuery;

    let orFilter = [
      !(
        (await checkUserIsSuperAdmin(req?.user?._id)) ||
        req?.user?._id == "660a38c0768eaa003f5727c8"
      )
        ? {
            $or: [
              { "managers._id": new mongoose.Types.ObjectId(req.user._id) },
              { createdBy: new mongoose.Types.ObjectId(req.user._id) }
            ]
          }
        : {}
    ];
    matchQuery = {
      ...matchQuery,
      $and: orFilter
    };
    let mainQuery = [
      {
        $lookup: {
          from: "projecttechs",
          let: { technology: "$technology" },
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
          as: "tech"
        }
      },
      {
        $lookup: {
          from: "projecttypes",
          let: { project_type: "$project_type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_type"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "type"
        }
      },
      {
        $unwind: {
          path: "$type",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projectstatuses",
          let: { project_status: "$project_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_status"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "status"
        }
      },
      {
        $unwind: {
          path: "$status",
          preserveNullAndEmptyArrays: true
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
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "managers"
        }
      },
      {
        $unwind: {
          path: "$managers",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projecttaskhourlogs",
          let: { projectId: "$_id", pms_clients: "$pms_clients" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: loggedHrQuery
                }
              }
            },
            {
              $group: {
                _id: "$logged_status",
                totalHours: {
                  $sum: {
                    $toInt: "$logged_hours"
                  }
                },
                totalMinutes: {
                  $sum: {
                    $toInt: "$logged_minutes"
                  }
                }
              }
            },
            {
              $addFields: {
                time_in_mins: {
                  $add: [
                    {
                      $multiply: [
                        {
                          $toDouble: "$totalHours"
                        },
                        60
                      ]
                    },
                    {
                      $toDouble: "$totalMinutes"
                    }
                  ]
                }
              }
            },
            {
              $facet: {
                existingData: [
                  {
                    $project: {
                      _id: 0,
                      logged_status: "$_id",
                      total_logged_hours: {
                        $floor: {
                          $divide: ["$time_in_mins", 60]
                        }
                      },
                      total_logged_minutes: {
                        $mod: ["$time_in_mins", 60]
                      }
                    }
                  }
                ],
                missingStatus: [
                  {
                    $group: {
                      _id: null,
                      status: { $addToSet: "$_id" }
                    }
                  },
                  {
                    $project: {
                      _id: 0,
                      logged_status: {
                        $setDifference: [
                          ["Billed", "Billable", "Non-billable", "Void"],
                          "$status"
                        ]
                      },
                      total_logged_hours: { $literal: 0 },
                      total_logged_minutes: { $literal: 0 }
                    }
                  },
                  { $unwind: "$logged_status" }
                ]
              }
            },
            {
              $project: {
                task_hours: {
                  $concatArrays: ["$existingData", "$missingStatus"]
                }
              }
            }
          ],
          as: "task_hours"
        }
      },
      {
        $unwind: {
          path: "$task_hours",
          preserveNullAndEmptyArrays: true
        }
      },
      ...(await getProjectDefaultSettingQuery("_id")),
      {
        $addFields: {
          totalLoggedTime: {
            $reduce: {
              input: "$task_hours.task_hours",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $add: [
                      {
                        $multiply: [
                          {
                            $toDouble: "$$this.total_logged_hours"
                          },
                          60
                        ]
                      },
                      {
                        $toDouble: "$$this.total_logged_minutes"
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
        $match: {
          ...matchQuery,
          "status.title": DEFAULT_DATA.PROJECT_STATUS.ACTIVE
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          color: 1,
          descriptions: 1,
          technology: 1,
          technologyName: {
            $map: {
              input: "$tech",
              as: "t",
              in: "$$t.project_tech"
            }
          },
          // technologyName: "$tech.project_tech",
          project_type: 1,
          project_typeName: "$type.project_type",
          project_status: 1,
          project_statusName: "$status.title",
          manager: 1,
          managerName: "$managers.full_name",
          start_date: 1,
          end_date: 1,
          estimatedHours: 1,
          logged_hours: "$task_hours.task_hours",
          ...(await getProjectDefaultSettingQuery("_id", true)),
          total_logged_time: {
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
                  $mod: ["$totalLoggedTime", 60]
                }
              }
            ]
          }
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    let listQuery = getAggregationPagination(mainQuery, pagination);

    const [dataTotal, totalCountResult, data, techData] = await Promise.all([
      Project.aggregate(mainQuery),
      Project.aggregate(countQuery),
      Project.aggregate(listQuery, { allowDiskUse: true }),
      ProjectTech.find({
        ...(value?.technologies && value?.technologies.length > 0
          ? {
              _id: {
                $in: value?.technologies
              }
            }
          : {}),
        isDeleted: false
      })
    ]);

    // const dataTotal = await Project.aggregate(mainQuery);
    // const totalCountResult = await Project.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;
    let metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page
    };
    // const data = await Project.aggregate(listQuery);
    if (value?.isExport) {
      return dataTotal;
    }

    // to get the total projects as per manager
    const mgrTotalProjects = dataTotal.reduce((acc, curr) => {
      const { managerName } = curr;
      if (!acc[managerName]) {
        acc[managerName] = {
          managerName,
          managerName: curr.managerName,
          totalProjects: 0
        };
      }
      acc[managerName].totalProjects += 1;

      return acc;
    }, {});

    // const techData = await ProjectTech.find({
    //   // $or: [
    //   ...(value?.technologies && value?.technologies.length > 0
    //     ? {
    //       _id: {
    //         $in: value?.technologies,
    //       },
    //     }
    //     : {}),
    //   // { $or: [{ _id: { $in: value?.technologies } }, { isDeleted: false }] },
    //   isDeleted: false,
    //   // ],
    //   // _id: { $in: value?.technologies },
    //   // isDeleted: false,
    // });

    // to get the total projects as per technologies
    const techTotalProjects = dataTotal.reduce((acc, curr) => {
      const { technologyName } = curr;
      // Iterate through each technology name in the array
      technologyName.forEach((techName) => {
        if (techName) {
          if (value?.technologies.length > 0) {
            if (
              // techName == techData.map((ele) => ele.project_tech)
              techData.map((ele) => ele.project_tech).includes(techName)
            ) {
              if (!acc[techName]) {
                acc[techName] = {
                  technologyName: techName,
                  totalProjects: 0
                };
              }
              acc[techName].totalProjects += 1;
            }
          } else {
            if (!acc[techName]) {
              acc[techName] = {
                technologyName: techName,
                totalProjects: 0
              };
            }
            acc[techName].totalProjects += 1;
          }
        }
        // if (techName &&
        //   techName == techData.map((ele) => ele.project_tech)) {
        //   if (!acc[techName]) {
        //     acc[techName] = {
        //       technologyName: techName,
        //       totalProjects: 0,
        //     };
        //   }
        //   acc[techName].totalProjects += 1;
        // }
      });

      return acc;
    }, {});

    // to get the total projects as per types
    const typesTotalProjects = dataTotal.reduce((acc, curr) => {
      const { project_typeName } = curr;
      if (!acc[project_typeName]) {
        acc[project_typeName] = {
          project_typeName,
          project_typeName: curr.project_typeName,
          totalProjects: 0
        };
      }
      acc[project_typeName].totalProjects += 1;

      return acc;
    }, {});
    // const managerData =
    // await getManagerProjectStats(
    //   value?.managers,
    //   value?.technologies,
    //   value?.types
    // );
    // const techData =
    // await getTechProjectStats(
    //   value?.technologies,
    //   value?.types,
    //   value?.managers
    // );
    // const typeData =
    // await getTypeProjectStats(
    //   value?.types,
    //   value?.managers,
    //   value?.technologies
    // );
    const masterData = {
      data: data,
      managers: Object.values(mgrTotalProjects).sort(
        (a, b) => b.totalProjects - a.totalProjects
      ),
      technologies: Object.values(techTotalProjects).sort(
        (a, b) => b.totalProjects - a.totalProjects
      ),
      types: Object.values(typesTotalProjects).sort(
        (a, b) => b.totalProjects - a.totalProjects
      )
    };

    storeCache(cacheKey, masterData, metaData, 24 * 60 * 60);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      masterData,
      metaData
    );
  } catch (error) {
    console.log("e=>", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// async function getManagerProjectStats(managers, tech, type) {
//   try {
//     const managerStats = [];
//     let matchQuery = {
//       isDeleted: false,
//     };
//     if (tech && tech.length > 0) {
//       matchQuery.technology = {
//         $in: tech?.map((ele) => new mongoose.Types.ObjectId(ele)),
//       };
//     }
//     if (type && type.length > 0) {
//       matchQuery.project_type = {
//         $in: type?.map((ele) => new mongoose.Types.ObjectId(ele)),
//       };
//     }
//     const projects = await Project.countDocuments(matchQuery);
//     if (managers) {
//       for (const managerId of managers) {
//         const totalProjects = await Project.countDocuments({
//           manager: managerId,
//           project_type: {
//             $in: type?.map((ele) => new mongoose.Types.ObjectId(ele)),
//           },
//           technology: {
//             $in: tech?.map((ele) => new mongoose.Types.ObjectId(ele)),
//           },
//           isDeleted: false,
//         });
//         const totalProjectsPercentage = (totalProjects / projects) * 100;
//         if (totalProjects !== 0) {
//           managerStats.push({
//             managerId: managerId,
//             totalProjects: totalProjects,
//             percentageOfTotalProjects: totalProjectsPercentage.toFixed(2) + "%",
//           });
//         }
//       }
//     } else {
//       console.log("Managers NOT FOUND");
//       return [];
//     }
//     if (managerStats.length > 0) {
//       const emps = await Employees.find({
//         _id: managerStats?.map(
//           (ele) => new mongoose.Types.ObjectId(ele.managerId)
//         ),
//       })
//         .select("_id full_name")
//         .exec();
//       const managerNamesMap = {};
//       emps.forEach((emp) => {
//         managerNamesMap[emp._id.toString()] = emp.full_name;
//       });

//       // Add full_name to managerStats based on managerId
//       managerStats.forEach((manager) => {
//         manager.name = managerNamesMap[manager.managerId];
//       });
//       managerStats.sort((a, b) => b.totalProjects - a.totalProjects);
//     }

//     return managerStats;
//   } catch (error) {
//     console.log("Error:", error);
//     // return catchBlockErrorResponse(error.message);
//   }
// }

// async function getTechProjectStats(tech, type, mgr) {
//   try {
//     const techStats = [];

//     let matchQuery = {
//       isDeleted: false,
//     };
//     if (mgr && mgr.length > 0) {
//       matchQuery.technology = {
//         $in: mgr?.map((ele) => new mongoose.Types.ObjectId(ele)),
//       };
//     }
//     if (type && type.length > 0) {
//       matchQuery.project_type = {
//         $in: type?.map((ele) => new mongoose.Types.ObjectId(ele)),
//       };
//     }
//     const projects = await Project.countDocuments(matchQuery);

//     if (tech) {
//       for (const techId of tech) {
//         const totalProjects = await Project.countDocuments({
//           technology: techId,
//           project_type: {
//             $in: type?.map((ele) => new mongoose.Types.ObjectId(ele)),
//           },
//           manager: {
//             $in: mgr?.map((ele) => new mongoose.Types.ObjectId(ele)),
//           },
//           isDeleted: false,
//         });
//         const totalProjectsPercentage = (totalProjects / projects) * 100;
//         if (totalProjects !== 0) {
//           techStats.push({
//             technologyId: techId,
//             totalProjects: totalProjects,
//             percentageOfTotalProjects: totalProjectsPercentage.toFixed(2) + "%",
//           });
//         }
//       }
//     } else {
//       console.log("Technologies NOT FOUND");
//       return [];
//     }
//     if (techStats.length > 0) {
//       const emps = await Technologies.find({
//         _id: techStats?.map(
//           (ele) => new mongoose.Types.ObjectId(ele.technologyId)
//         ),
//       })
//         .select("_id project_tech")
//         .exec();
//       const techNamesMap = {};
//       emps.forEach((emp) => {
//         techNamesMap[emp._id.toString()] = emp.project_tech;
//       });

//       // Add project_tech to techStats based on techID
//       techStats.forEach((tech) => {
//         tech.name = techNamesMap[tech.technologyId];
//       });
//       techStats.sort((a, b) => b.totalProjects - a.totalProjects);
//     }

//     return techStats;
//   } catch (error) {
//     console.log("Error:", error);
//     // return catchBlockErrorResponse(error.message);
//   }
// }

// async function getTypeProjectStats(type, mgr, tech) {
//   try {
//     const typeStats = [];
//     let matchQuery = {
//       isDeleted: false,
//     };
//     if (tech && tech.length > 0) {
//       matchQuery.technology = {
//         $in: tech?.map((ele) => new mongoose.Types.ObjectId(ele)),
//       };
//     }
//     if (type && type.length > 0) {
//       matchQuery.manager = {
//         $in: mgr?.map((ele) => new mongoose.Types.ObjectId(ele)),
//       };
//     }
//     const projects = await Project.countDocuments(matchQuery);
//     if (type) {
//       for (const typesId of type) {
//         const totalProjects = await Project.countDocuments({
//           project_type: typesId,
//           manager: {
//             $in: mgr?.map((ele) => new mongoose.Types.ObjectId(ele)),
//           },
//           technology: {
//             $in: tech?.map((ele) => new mongoose.Types.ObjectId(ele)),
//           },
//           isDeleted: false,
//         });
//         const totalProjectsPercentage = (totalProjects / projects) * 100;
//         if (totalProjects !== 0) {
//           typeStats.push({
//             typeId: typesId,
//             totalProjects: totalProjects,
//             percentageOfTotalProjects: totalProjectsPercentage.toFixed(2) + "%",
//           });
//         }
//       }
//     } else {
//       console.log("Types NOT FOUND");
//       return [];
//     }
//     if (typeStats.length > 0) {
//       const emps = await Types.find({
//         _id: typeStats?.map((ele) => new mongoose.Types.ObjectId(ele.typeId)),
//       })
//         .select("_id project_type")
//         .exec();
//       const techNamesMap = {};
//       emps.forEach((emp) => {
//         techNamesMap[emp._id.toString()] = emp.project_type;
//       });

//       // Add project_tech to techStats based on techID
//       typeStats.forEach((tech) => {
//         tech.name = techNamesMap[tech.typeId];
//       });
//       typeStats.sort((a, b) => b.totalProjects - a.totalProjects);
//     }
//     return typeStats;
//   } catch (error) {
//     console.log("Error:", error);
//     // return catchBlockErrorResponse(error.message);
//   }
// }

exports.reportsCSV = async (req, res) => {
  try {
    const data = await this.getProjectsReports(req, res);
    console.log("dataTT", data);
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

exports.updateProjectStarred = async (req, res) => {
  try {
    const project_id = req?.params?.id;
    const validationSchema = Joi.object({
      isStarred: Joi.boolean().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const StarProjects = await ProjectStar.findOne({
      project_id: new mongoose.Types.ObjectId(project_id),
      createdBy: new mongoose.Types.ObjectId(req?.user?._id)
    });
    let project = null;
    if (StarProjects?._id) {
      project = await ProjectStar.updateOne(
        { _id: StarProjects._id },
        {
          $set: {
            isStarred: value?.isStarred,
            ...(await getRefModelFromLoginUser(req?.user, true))
          }
        }
      );
      if (project == null) {
        return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
      }
      return successResponse(res, statusCode.SUCCESS, messages.UPDATED, []);
    } else {
      project = new ProjectStar({
        isStarred: value.isStarred,
        project_id: project_id ? project_id : null,
        createdBy: req.user._id,
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user))
      });
      await project.save();
      if (project == null) {
        return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
      }
      return successResponse(res, statusCode.SUCCESS, messages.CREATED, []);
    }
  } catch (error) {
    console.log("🚀 ~ exports.updateProjectStarred= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Project Manage People :
exports.updateProjectsManagePeople = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      manager: Joi.string().optional().default(null),
      acc_manager: Joi.string().optional().default(null),
      assignees: Joi.array().default([]),
      pms_clients: Joi.array().default([])
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const projectData = await Project.findById(req.params.id)
      .populate("manager")
      .populate("acc_manager")
      .populate("assignees");

    const data = await Project.findByIdAndUpdate(
      req.params.id,
      {
        manager: value?.manager,
        acc_manager: value?.acc_manager || null,
        assignees:
          (value?.assignees &&
            value?.assignees.length > 0 &&
            value?.assignees.map((a) => new mongoose.Types.ObjectId(a))) ||
          [],
        pms_clients:
          (value?.pms_clients &&
            value?.pms_clients.length > 0 &&
            value?.pms_clients.map((a) => new mongoose.Types.ObjectId(a))) ||
          [] ||
          [],

        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user, true))
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }

    // updated project data...
    if (value?.manager !== projectData?.manager?._id.toString()) {
      const updatedData = await Project.findById(data._id)
        .populate("manager")
        .populate("updatedBy")
        .populate("assignees");

      // console.log("pdat",projectData.manager._id, "\nuda",updatedData.manager._id, (updatedData.manager._id.toString() != projectData.manager._id.toString()) )
      if (
        projectData.manager._id.toString() != updatedData.manager._id.toString()
      ) {
        await mailForUpdateProjectInfo({
          oldData: projectData,
          newData: updatedData
        });
      }
    }

    // update project default data..
    // await this.updateProjectDefaultData(value, projectData, req.user._id);

    // For send mail for new added subscribers..
    const assigneesData = getArrayChanges(
      projectData.assignees.map((a) => a._id.toString()),
      value?.assignees
    );

    // For send mail for new added client..
    const clientData = getArrayChanges(
      projectData.pms_clients.map((a) => a.toString()),
      value?.pms_clients
    );

    if (
      (assigneesData.added && assigneesData.added.length > 0) ||
      (clientData.added && clientData.added.length > 0)
    ) {
      const updatedData = await this.getProjectDetailsForMail(
        data._id,
        assigneesData.added,
        clientData.added
      );

      await newProjectAssigneesMail(updatedData);
    }
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.PROJECT_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
exports.addProjectRandomId = async (data) => {
  try {
    if (data && data.length > 0) {
      const projectWithoutId = data.filter(
        (d) => !d.projectId || d.projectId == ""
      );

      if (projectWithoutId && projectWithoutId.length > 0) {
        for (let i = 0; i < projectWithoutId.length; i++) {
          const element = projectWithoutId[i];
          await Project.findOneAndUpdate(
            { _id: element._id },
            {
              $set: {
                projectId: generateRandomId()
              }
            }
          );
        }
      }
    }
  } catch (error) {
    console.log("🚀 ~ exports.addProjectRandomId= ~ error:", error);
  }
};
