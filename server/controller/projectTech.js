const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const ProjectTechnologies = mongoose.model("projecttechs");
const Employees = mongoose.model("employees");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr
} = require("../helpers/queryHelper");
const configs = require("../configs");
const messages = require("../helpers/messages");
const { statusCode } = require("../helpers/constant");

// Check is exists..
exports.projectTechExists = async (projectTech, id = null,companyId) => {
  try {
    let isExist = false;
  
    const data = await ProjectTechnologies.aggregate([
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
          projectTechLower: { $toLower: "$project_tech" } // Add a temporary field with lowercase title
        }
      },
      {
        $match: {
          projectTechLower: projectTech.trim().toLowerCase() // Match the lowercase title
        }
      }
    ]);
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectTechExists= ~ error:", error);
  }
};

//Add Project Tech:
exports.addProjectTech = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      project_tech: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    if (await this.projectTechExists(value.project_tech,null,decodedCompanyId)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let ProjectTechData = new ProjectTechnologies({
        companyId: newObjectId(decodedCompanyId),
        project_tech: value.project_tech,
        createdBy: decodedUserId,
        updatedBy: decodedUserId
      });
      await ProjectTechData.save();
      return successResponse(
        res,
        200,
        "Data save sucessfully!",
        ProjectTechData
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project Tech:
exports.getProjectTech = async (req, res) => {
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
      _id: Joi.string().optional(),
      isDropdown: Joi.boolean().default(false)
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
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
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {})
    };
    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["project_tech"], value.search)
      };
    }

    const mainQuery = [{ $match: matchQuery }];
    const totalCountQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await ProjectTechnologies.aggregate(
      totalCountQuery
    );
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    let projectTech = await ProjectTechnologies.find(matchQuery)
      .limit(pagination.limit)
      .skip(pagination.skip)
      .sort(pagination.sort);

    if (value.isDropdown) {
      projectTech = await ProjectTechnologies.find(matchQuery).sort(
        pagination.sort
      );
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
      value._id ? projectTech[0] : projectTech,
      // !value._id && metaData
      !value._id && !value.isDropdown && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Project Tech:
exports.updateProjectTech = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      projectTechId: Joi.string().required(),
      project_tech: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    if (await this.projectTechExists(value.project_tech, req.params.id, decodedCompanyId)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      const updatedProjectTech = await ProjectTechnologies.findByIdAndUpdate(
        value.projectTechId,
        {
          project_tech: value.project_tech,
          updatedBy: decodedUserId // assuming you have user id in req.user
        },
        { new: true }
      );

      if (!updatedProjectTech) {
        return errorResponse(res, 404, "Project tech not found");
      }

      return successResponse(
        res,
        200,
        "Data updated successfully!",
        updatedProjectTech
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project Tech:
exports.deleteProjectTech = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      projectTechId: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    // Get tech data before deletion for logging
    const techData = await ProjectTechnologies.findById(value.projectTechId).lean();

    const projectTech = await ProjectTechnologies.findByIdAndUpdate(
      value.projectTechId,
      {
        isDeleted: true,
        deletedBy: decodedUserId,
        deletedAt: configs.utcDefault() // assuming you have user id in req.user
      },
      { new: true }
    );

    if (!projectTech) {
      return errorResponse(res, 404, "Project Tech not found");
    }

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && techData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "projectTech",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: techData,
        additionalData: {
          recordId: techData._id.toString(),
          isSoftDelete: true
        }
      });
    }

    return successResponse(
      res,
      200,
      "Project tech deleted successfully!",
      projectTech
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
