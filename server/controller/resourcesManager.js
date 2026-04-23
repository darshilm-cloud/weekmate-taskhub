const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const Resources = mongoose.model("resource");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr,
} = require("../helpers/queryHelper");
const configs = require("../configs");
const { updatePermission } = require("../helpers/updatePermission");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");

// Check is exists..
exports.resourceExists = async (resourceName, id = null) => {
  try {
    let isExist = false;
    // const data = await Resources.findOne({
    //   // resource_name: resourceName?.trim()?.toLowerCase(),
    //   resource_name: { $regex: new RegExp(`^${resourceName}$`, "i") },
    //   isDeleted: false,
    //   ...(id
    //     ? {
    //         _id: { $ne: id },
    //       }
    //     : {}),
    // });
    // console.log("🚀 ~ exports.resourceExists= ~ data:", data);
    // if (data) isExist = true;

    const data = await Resources.aggregate([
      {
        $match: {
          isDeleted: false,
          ...(id
            ? {
                // _id: { $ne: new mongoose.Types.ObjectId(id) },
                _id: { $ne: new mongoose.Types.ObjectId(id) },
              }
            : {}),
        },
      },
      {
        $addFields: {
          resource_nameLower: { $toLower: "$resource_name" }, // Add a temporary field with lowercase title
        },
      },
      {
        $match: {
          resource_nameLower: resourceName.trim().toLowerCase(), // Match the lowercase title
        },
      },
    ]);
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.resourceExists= ~ error:", error);
  }
};

//Add updatePermission() function into all function for update permission.json file:

exports.addResource = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      resource_name: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    if (await this.resourceExists(value.resource_name)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let AddResourcesData = new Resources({
        resource_name: value.resource_name,
        createdBy: req.user._id,
        updatedBy: req.user._id,
      });
      let data = await AddResourcesData.save();
      await updatePermission();
      return successResponse(res, 200, "Data save sucessfully!", data, ``);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getResource = async (req, res) => {
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
      return errorResponse(res, 400, error.details[0].message);
    }

    const pagination = getPagination({
      pageLimit: value.limit,
      pageNum: value.pageNo,
      sort: value.sort,
      sortBy: value.sortBy,
    });

    let matchQuery = { isDeleted: false };
    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["resource_name"], value.search),
      };
    }

    const mainQuery = [{ $match: matchQuery }];
    const totalCountQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await Resources.aggregate(totalCountQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    const ReourceData = await Resources.find(matchQuery)
      .limit(pagination.limit)
      .skip(pagination.skip)
      .sort(pagination.sort);

    const metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page,
    };

    await updatePermission();
    return successResponse(
      res,
      200,
      "Data fetched successfully!",
      ReourceData,
      metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.updateResource = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      resourceId: Joi.string().required(),
      resource_name: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    const existing = await Resources.findById(value.resourceId);
    if (!existing) return errorResponse(res, 404, "Resource not found");
    if (existing.isDefault) return errorResponse(res, 403, "Default resources cannot be edited");

    if (await this.resourceExists(value.resource_name, value.resourceId)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      const updateResourceData = await Resources.findByIdAndUpdate(
        value.resourceId,
        {
          resource_name: value.resource_name,
          updatedBy: req.user._id,
        },
        { new: true }
      );

      if (!updateResourceData) {
        return errorResponse(res, 404, "Resource not found");
      }
      await updatePermission();
      return successResponse(
        res,
        200,
        "Data updated successfully!",
        updateResourceData
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      resourceId: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    const existing = await Resources.findById(value.resourceId);
    if (!existing) return errorResponse(res, 404, "Resource type not found");
    if (existing.isDefault) return errorResponse(res, 403, "Default resources cannot be deleted");

    const ResourceData = await Resources.findByIdAndUpdate(
      value.resourceId,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
      },
      { new: true }
    );

    if (!ResourceData) {
      return errorResponse(res, 404, "Resource type not found");
    }
    await updatePermission();
    return successResponse(
      res,
      200,
      "Resource deleted successfully!",
      ResourceData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
