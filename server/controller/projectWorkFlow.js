const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const ProjectWorkFlow = mongoose.model("projectworkflows");
const ProjectWorkFlowStatus = mongoose.model("workflowstatus");
const Project = mongoose.model("projects");
const { statusCode, DEFAULT_DATA } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const {
  getAggregationPagination,
  getTotalCountQuery,
  getPagination,
  searchDataArr
} = require("../helpers/queryHelper");

//Add Project Work Flow:
exports.addProjectWorkFlow = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      project_workflow: Joi.string().required(),
      status: Joi.string().optional().default("active")
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (!(await this.projectWorkFlowExists(value.project_workflow,null,decodedCompanyId))) {
      let ProjectWorkFlowData = new ProjectWorkFlow({
        companyId: newObjectId(decodedCompanyId),
        project_workflow: value.project_workflow,
        status: value.status,
        createdBy: req.user._id,
        updatedBy: req.user._id
      });
      const newData = await ProjectWorkFlowData.save();

      // save on default work flow status ..
      const WORKFLOW_STATUS = DEFAULT_DATA.WORKFLOW_STATUS;
      await ProjectWorkFlowStatus.insertMany([
        {
          workflow_id: newData._id,
          color: "#616161",
          title: WORKFLOW_STATUS.TODO,
          isDefault: true,
          sequence: 1,
          createdBy: req.user._id,
          updatedBy: req.user._id
        },
        {
          workflow_id: newData._id,
          color: "#228B22",
          title: WORKFLOW_STATUS.DONE,
          sequence: 2,
          isDefault: true,
          createdBy: req.user._id,
          updatedBy: req.user._id
        }
      ]);

      return successResponse(
        res,
        statusCode.CREATED,
        messages.CREATED,
        newData
      );
    } else {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        messages.ALREADY_EXISTS,
        null
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project Work Flow:
exports.getProjectWorkFlow = async (req, res) => {
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
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      isDropdown: Joi.boolean().optional().default(false),
      _id: Joi.string().optional()
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
      companyId: newObjectId(decodedCompanyId),
      ...(value.isDropdown ? { status: "active" } : {}),
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {})
    };
    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["project_workflow"], value.search)
      };
    }

    const query = [
      {
        $match: matchQuery
      },
      {
        $lookup: {
          from: "workflowstatuses",
          let: { workFlowId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$workflow_id", "$$workFlowId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            },
            {
              $sort: {
                sequence: 1
              }
            }
          ],
          as: "workflow_status"
        }
      }
    ];

    const totalCountQuery = getTotalCountQuery(query);
    const totalCountResult = await ProjectWorkFlow.aggregate(totalCountQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    let projectWorkFlowData = await ProjectWorkFlow.aggregate([
      ...getAggregationPagination(query, pagination),
      ...[
        {
          $sort: {
            isDefault: -1,
            _id: 1
          }
        }
      ]
    ]);

    if (value.isDropdown) {
      projectWorkFlowData = await ProjectWorkFlow.aggregate([
        ...query,
        {
          $sort: {
            isDefault: -1,
            _id: 1
          }
        }
      ]);
    }

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
      200,
      messages.LISTING,
      value._id ? projectWorkFlowData[0] : projectWorkFlowData,
      // !value._id && metaData
      !value._id && !value.isDropdown && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Check is exists..
exports.projectWorkFlowExists = async (title, id = null, companyId = null) => {
  try {
    let isExist = false;

    const data = await ProjectWorkFlow.aggregate([
      {
        $match: {
          isDeleted: false,
          companyId: newObjectId(companyId),
          ...(id
            ? {
                _id: { $ne: new mongoose.Types.ObjectId(id) }
              }
            : {})
        }
      },
      {
        $addFields: {
          project_workflowLower: { $toLower: "$project_workflow" } // Add a temporary field with lowercase title
        }
      },
      {
        $match: {
          project_workflowLower: title.trim().toLowerCase() // Match the lowercase title
        }
      }
    ]);
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectWorkFlowExists= ~ error:", error);
  }
};

//Update Project Work Flow:
exports.updateProjectWorkFlow = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      projectWorkFlowId: Joi.string().required(),
      project_workflow: Joi.string().required()
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
      !(await this.projectWorkFlowExists(
        value.project_workflow,
        value.projectWorkFlowId,
        decodedCompanyId
      ))
    ) {
      const updatedProjectWorkFlowData =
        await ProjectWorkFlow.findByIdAndUpdate(
          value.projectWorkFlowId,
          {
            project_workflow: value.project_workflow,
            updatedBy: req.user._id
          },
          { new: true }
        );

      if (!updatedProjectWorkFlowData) {
        return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
      }

      return successResponse(
        res,
        statusCode.SUCCESS,
        messages.UPDATED,
        updatedProjectWorkFlowData
      );
    } else {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        messages.ALREADY_EXISTS,
        []
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project Work Flow:
exports.deleteProjectWorkFlow = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    const validationSchema = Joi.object({
      projectWorkFlowId: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    // Get project with associated with workflow..
    const getProject = await Project.findOne({
      isDeleted: false,
      workFlow: new mongoose.Types.ObjectId(value.projectWorkFlowId)
    });

    if (getProject) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        messages.WORK_FLOW_NOT_DELETED
      );
    }

    // Get workflow data before deletion for logging
    const workflowData = await ProjectWorkFlow.findById(value.projectWorkFlowId).lean();
    
    const projectWorkFlowData = await ProjectWorkFlow.findByIdAndUpdate(
      value.projectWorkFlowId,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault()
      },
      { new: true }
    );

    if (!projectWorkFlowData) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }
    
    // Get workflow statuses before deletion for logging
    const workflowStatuses = await ProjectWorkFlowStatus.find({
      isDeleted: false,
      workflow_id: new mongoose.Types.ObjectId(value.projectWorkFlowId)
    }).lean();
    
    // Delete workflow status too..
    await ProjectWorkFlowStatus.updateMany(
      {
        isDeleted: false,
        workflow_id: new mongoose.Types.ObjectId(value.projectWorkFlowId)
      },
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault()
      }
    );
    
    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && workflowData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "projectWorkFlow",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: workflowData,
        additionalData: {
          recordId: workflowData._id.toString(),
          deletedStatusCount: workflowStatuses.length,
          isSoftDelete: true
        }
      });
    }
    
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.DELETED,
      projectWorkFlowData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
