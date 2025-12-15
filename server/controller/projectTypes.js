const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const ProjectType = mongoose.model("projecttypes");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr
} = require("../helpers/queryHelper");
const configs = require("../configs");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");

// Check is exists..
exports.projectTypeExists = async (
  projectType,
  id = null,
  companyId = null
) => {
  try {
    let isExist = false;

    const data = await ProjectType.aggregate([
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
          project_typeLower: { $toLower: "$project_type" } // Add a temporary field with lowercase title
        }
      },
      {
        $match: {
          project_typeLower: projectType.trim().toLowerCase() // Match the lowercase title
        }
      }
    ]);
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectTypeExists= ~ error:", error);
  }
};

//Add Project Types:
exports.addProjectTypes = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      project_type: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    if (
      await this.projectTypeExists(value.project_type, null, decodedCompanyId)
    ) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let ProjectTypeData = new ProjectType({
        companyId: newObjectId(decodedCompanyId),
        project_type: value.project_type,
        createdBy: req.user._id,
        updatedBy: req.user._id
      });
      await ProjectTypeData.save();
      return successResponse(
        res,
        200,
        "Data save sucessfully!",
        ProjectTypeData
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project Types:
exports.getProjectTypes = async (req, res) => {
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
        ...searchDataArr(["project_type"], value.search)
      };
    }

    const mainQuery = [{ $match: matchQuery }];
    const totalCountQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await ProjectType.aggregate(totalCountQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    let projectTypes = await ProjectType.find(matchQuery)
      .limit(pagination.limit)
      .skip(pagination.skip)
      .sort(pagination.sort);

    if (value.isDropdown) {
      projectTypes = await ProjectType.find(matchQuery).sort(pagination.sort);
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
      "Data fetched successfully!",
      value._id ? projectTypes[0] : projectTypes,
      !value._id && !value.isDropdown && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Project Types:
exports.updateProjectType = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      projectTypeId: Joi.string().required(),
      project_type: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    if (
      await this.projectTypeExists(
        value.project_type,
        value.projectTypeId,
        decodedCompanyId
      )
    ) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      // Get old data before update for logging
      const oldTypeData = await ProjectType.findById(value.projectTypeId).lean();

      const updatedProjectType = await ProjectType.findByIdAndUpdate(
        value.projectTypeId,
        {
          project_type: value.project_type,
          updatedBy: req.user._id // assuming you have user id in req.user
        },
        { new: true }
      );

      if (!updatedProjectType) {
        return errorResponse(res, 404, "Project type not found");
      }

      // Get new data after update for logging
      const newTypeData = updatedProjectType.toObject ? updatedProjectType.toObject() : updatedProjectType;

      // Log update activity
      try {
        const { logUpdate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
        const userInfo = await getUserInfoForLogging(req.user);
        if (userInfo && oldTypeData && newTypeData) {
          await logUpdate({
            companyId: userInfo.companyId,
            moduleName: "projectTypes",
            email: userInfo.email,
            createdBy: userInfo._id,
            updatedBy: userInfo._id,
            oldData: oldTypeData,
            newData: newTypeData,
            additionalData: {
              recordId: oldTypeData._id.toString()
            }
          });
        }
      } catch (logError) {
        console.error("Error logging project type update activity:", logError);
      }

      return successResponse(
        res,
        200,
        "Data updated successfully!",
        updatedProjectType
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project Types:
exports.deleteProjectType = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    const validationSchema = Joi.object({
      projectTypeId: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    // Get type data before deletion for logging
    const typeData = await ProjectType.findById(value.projectTypeId).lean();

    const projectType = await ProjectType.findByIdAndUpdate(
      value.projectTypeId,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault() // assuming you have user id in req.user
      },
      { new: true }
    );

    if (!projectType) {
      return errorResponse(res, 404, "Project type not found");
    }

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && typeData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "projectTypes",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: typeData,
        additionalData: {
          recordId: typeData._id.toString(),
          isSoftDelete: true
        }
      });
    }

    return successResponse(
      res,
      200,
      "Project type deleted successfully!",
      projectType
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getProjectTypeSlug = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const projectTypeSlug = await ProjectType.find({
      isDeleted: false
    })
      .sort({ _id: -1 })
      .select("_id slug");

    const slug = projectTypeSlug
      .filter((p) => p.slug !== "")
      .map((p) => p.slug)
      .join("|");

    return successResponse(res, 200, messages.LISTING, { slug });
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
