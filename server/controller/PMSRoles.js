const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
// var ObjectId = require("mongoose").Types.ObjectId;
const RolePermissions = mongoose.model("role_permissions");
const Employees = mongoose.model("employees");
const Resource = mongoose.model("resource");
const PMSRoles = mongoose.model("pms_roles");

const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const {
  getTotalCountQuery,
  getAggregationPagination,
  getPagination,
  searchDataArr,
} = require("../helpers/queryHelper");
const config = require("../settings/config.json");

exports.addPMSRole = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      role_name: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const newData = new PMSRoles({
      role_name: value.role_name,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    data = await newData.save();

    return successResponse(res, statusCode.CREATED, messages.CREATED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getRoles = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
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
      sortBy: value.sortBy,
    });

    let matchQuery = {
      isDeleted: false,
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["role_name"], value.search),
      };
    }

    const mainQuery = [
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          role_name: 1,
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await PMSRoles.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await PMSRoles.aggregate([
      ...mainQuery,
      {
        $sort: {
          role_name: 1,
        },
      },
    ]);

    const metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page,
    };

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, {});
  } catch (error) {
    console.log("🚀 ~ exports.getRoles= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getEmpRoles = async (req, res) => {
  try {
    const emp = await Employees.findOne({
      _id: new mongoose.Types.ObjectId(req.params.userId),
      isDeleted: false,
      isActivate: true,
    });

    if (!emp) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND, []);
    }

    let userRole = null;
    if (emp && emp?.pms_role_id) {
      userRole = emp?.pms_role_id?.toString();
    }

    const allRoles = await PMSRoles.find(
      { isDeleted: false, role_name:{$ne:config.PMS_ROLES.CLIENT} },
      { role_name: 1 }
    );
    let response = [];

    for (let i = 0; i < allRoles.length; i++) {
      const role = allRoles[i];

      const roleId = role._id.toString();
      const roleName = role.role_name;

      response.push({
        _id: roleId,
        name: roleName,
        isAccess: userRole ? (userRole == roleId ? true : false) : false,
      });
    }

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, response);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.updateEmpRoles = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      user_id: Joi.string().required(),
      pms_role_id: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const emp = await Employees.findOne({
      _id: new mongoose.Types.ObjectId(value.user_id),
      isDeleted: false,
      isActivate: true,
    });

    if (!emp) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND, []);
    }
    await Employees.findByIdAndUpdate(emp._id, {
      $set: {
        pms_role_id: new mongoose.Types.ObjectId(value.pms_role_id),
      },
    });

    return successResponse(res, statusCode.SUCCESS, messages.ROLE_UPDATED, []);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.addResourcePermission = async (req, res) => {
  try {
     // Decode user from token
     const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    console.log("[addResourcePermission] body:", JSON.stringify(req.body));

    const validationSchema = Joi.object({
      pms_role_id: Joi.string().required(),
      resource_ids: Joi.array().items(Joi.string()).optional().default([]),
      permission_names: Joi.array().items(Joi.string()).optional().default([]),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      console.log("[addResourcePermission] validation error:", error.details[0].message);
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    console.log("[addResourcePermission] validated:", JSON.stringify(value));

    const role = await PMSRoles.findOne({
      _id: new mongoose.Types.ObjectId(value.pms_role_id),
      isDeleted: false,
    });

    if (!role) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND, []);
    }

    // Resolve permission_names → resource IDs (find or create Resource records)
    const resolvedIds = [...value.resource_ids];
    if (value.permission_names && value.permission_names.length > 0) {
      for (const name of value.permission_names) {
        let resource = await Resource.findOne({ resource_name: name, isDeleted: false });
        if (!resource) {
          resource = new Resource({
            resource_name: name,
            createdBy: req.user._id,
            updatedBy: req.user._id,
          });
          await resource.save();
        }
        resolvedIds.push(resource._id.toString());
      }
    }

    console.log("[addResourcePermission] resolvedIds:", resolvedIds);

    // delete exists data..
    const deleted = await RolePermissions.deleteMany({
      companyId:newObjectId(decodedCompanyId),
      pms_role_id: new mongoose.Types.ObjectId(value.pms_role_id),
    });
    console.log("[addResourcePermission] deleted count:", deleted.deletedCount);

    if (resolvedIds.length > 0) {
      const obj = {
        pms_role_id: new mongoose.Types.ObjectId(value.pms_role_id),
        createdBy: req.user._id,
        updatedBy: req.user._id,
      };

      for (const id of resolvedIds) {
        const resource_id = new mongoose.Types.ObjectId(id);
        const isExist = await RolePermissions.findOne({
          companyId:newObjectId(decodedCompanyId),
          pms_role_id: new mongoose.Types.ObjectId(value.pms_role_id),
          resource_id,
          isDeleted: false,
        });

        if (!isExist) {
          const newData = new RolePermissions({
            companyId:newObjectId(decodedCompanyId),
            resource_id,
            ...obj,
          });
          await newData.save();
          console.log("[addResourcePermission] created RolePermission for resource_id:", id);
        }
      }
    }
    console.log("[addResourcePermission] DONE, total saved:", resolvedIds.length);
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.PERMISSION_UPDATED,
      []
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getRolePermissions = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const rolePermissions = await RolePermissions.find({
      companyId:newObjectId(decodedCompanyId),
      pms_role_id: new mongoose.Types.ObjectId(req.params.roleId),
      isDeleted: false,
    });

    console.log("[getRolePermissions] roleId:", req.params.roleId, "companyId:", decodedCompanyId, "found permissions:", rolePermissions.length);

    let resources = [];
    if (rolePermissions) {
      resources = rolePermissions?.map((p) => p.resource_id?.toString());
    }
    console.log("[getRolePermissions] active resource_ids:", resources);

    const allResource = await Resource.find({ isDeleted: false });
    let response = [];

    for (let i = 0; i < allResource.length; i++) {
      const resource = allResource[i];

      const resourceId = resource._id.toString();
      const resourceName = resource.resource_name;

      response.push({
        _id: resourceId,
        name: resourceName,
        isAccess: resources.includes(resource._id.toString()) ? true : false,
      });
    }

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, response);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.checkIsPMSClient = async (id = null, email = null) => {
  try {
    let isClient = true;

    const data = await Employees.findOne({
      isDeleted: false,
      isSoftDeleted: false,
      isActivate: true,
      ...(id ? { _id: new mongoose.Types.ObjectId(id) } : {}),
      ...(email ? { email: email } : {}),
    });

    if (data) {
      isClient = false;
    }
    return isClient;
  } catch (error) {
    console.log("🚀 ~ exports.checkIsPMSClient= ~ error:", error);
  }
};
