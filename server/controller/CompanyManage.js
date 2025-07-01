const { statusCode } = require("../helpers/constant");
const {
  COMPANY_CREATED,
  SERVER_ERROR,
  UNAUTHORIZED,
  LISTING,
  DELETED,
  COMPANY_NAME_EXIST,
  COMPANY_EMAIL_EXIST,
} = require("../helpers/messages");
const {
  successResponse,
  errorResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const { CompanyModel, employeeSchema } = require("../models");
const { searchDataArr } = require("../helpers/queryHelper");
const CONFIG_JSON = require("../settings/config.json");
const Joi = require("joi");
const { createJWTToken } = require("../helpers/JWTToken"); 

// Get Company list API
const getCompanyById = async (reply, ID) => {
  ID = validObjectId(ID) ? ID : newObjectId(ID);
  const companyData = await CompanyModel.findOne({
    _id: ID,
    isDeleted: false
  });
  if (!companyData) {
    return errorResponse(reply, statusCode.NOT_FOUND, NOT_FOUND);
  }
  return companyData;
};

const validateFormatter = (schema, data) => {
  const options = {
    abortEarly: false, // Return all errors, not just the first
    allowUnknown: true, // Allow unknown fields in the request
  };

  const { error, value } = schema.validate(data, options);
  if (error) {
    // Remove double quotes from error messages and convert to uppercase
    error.details.forEach((detail) => {
      detail.message = detail.message.replace(/\"/g, ""); // Format message
    });
  }
  return { error, value };
};

const getAddCompanySchema = () => {
  return Joi.object({
    companyEmail: this.emailValidator("Company email is required"),
    companyName: Joi.string().required(),
    domain: Joi.string().required(),
  });
};

const fileUploadSizeSchema = () => {
  return Joi.object({
    fileUploadSize: Joi.number().min(1).max(80).required().messages({
      "number.base": "File upload size must be a number.",
      "number.min": "File upload size must be at least 1 MB.",
      "number.max": "File upload size must be at most 80 MB.",
      "any.required": "File upload size is required.",
    }),
  });
};

exports.getCompanyList = async (request, reply) => {
  try {
    // Get user's data from JWT decode
    const {
      payload: { _id: decodedUserId, roleId, roleName, companyId } = {},
    } = request.user || {};

    // Only allow SuperAdmin and admin to get company
    if (roleName == CONFIG_JSON.PMS_ROLES.USER) {
      return errorResponse(reply, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    let companyIdByUser;
    if (companyId == "" || companyId == undefined) {
      companyIdByUser = await employeeSchema.findById(
        { _id: decodedUserId },
        { password: 0 }
      ).lean();
    }

    const {
      page = 1,
      limit = 30,
      search = "",
      sort = "desc",
      sortBy = "createdAt",
    } = request.body;

    // Super admin gets all companies list & Admin gets own company list
    let matchQuery;

    if (!companyId) {
      matchQuery = {
        ...(roleName === CONFIG_JSON.PMS_ROLES.ADMIN
          ? { _id: companyIdByUser?.companyId }
          : {}),
        isDeleted: false,
      };
    } else {
      matchQuery = {
        ...(roleName === CONFIG_JSON.PMS_ROLES.ADMIN
          ? { _id: newObjectId(companyId) }
          : {}),
        isDeleted: false,
      };
    }

    let orFilter = [];

    if (search.length > 0) {
      orFilter = [...orFilter, searchDataArr(["companyName"], search)];
    }

    if (orFilter.length > 0) {
      matchQuery = { ...matchQuery, $and: orFilter };
    }

    const mainQuery = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "users",
          let: { companyId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$companyId", "$$companyId"] },
                    { $ne: ["$isDeleted", true] }, // exclude isDeleted: true
                  ],
                },
              },
            },
          ],
          as: "employees",
        },
      },
      {
        $addFields: {
          employeeCount: { $size: "$employees" },
        },
      },
      {
        $project: {
          employees: 0, // exclude employee array
        },
      },
      { $sort: { [sortBy]: sort == "desc" ? -1 : 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const [companyData, totalCount] = await Promise.all([
      CompanyModel.aggregate(mainQuery),
      CompanyModel.countDocuments(matchQuery),
    ]);

    const metaData = {
      total: totalCount,
      limit: limit,
      pageNo: page,
      totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 1,
      currentPage: page,
    };
    return successResponse(
      reply,
      statusCode.SUCCESS,
      LISTING,
      companyData,
      metaData
    );
  } catch (error) {
    console.log("🚀 ~ exports.getCompany=async ~ error:", error);
    return catchBlockErrorResponse({
      reply,
      fullMessage: error.message,
    });
  }
};

// Add Company API
exports.addCompany = async (request, reply) => {
  try {
    // Get user's data from JWT decode
    const {
      payload: { _id: decodedUserId, roleId, roleName, companyId } = {},
    } = request.user || {};

    // Only allow SuperAdmin and admin to add company
    if (roleName == CONFIG_JSON.PMS_ROLES.USER) {
      return errorResponse(reply, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { error, value } = validateFormatter(
      getAddCompanySchema(),
      request.body
    );

    if (error) {
      return errorResponse(
        reply,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { companyEmail, companyName, logo, favicon } = value;
    console.log(logo, favicon, "ogo,favicon");
    const existingCompany = await CompanyModel.findOne({
      $or: [{ companyEmail }, { companyName }],
    });

    if (existingCompany) {
      let duplicateField = "";
      if (existingCompany.companyEmail === companyEmail) {
        duplicateField = COMPANY_EMAIL_EXIST;
      } else if (existingCompany.companyName === companyName) {
        duplicateField = COMPANY_NAME_EXIST;
      }

      return errorResponse(reply, statusCode.BAD_REQUEST, duplicateField);
    }

    let companyObject = {
      companyEmail,
      companyName,
      companyLogoUrl: logo,
      companyFavIcoUrl: favicon,
    };

    // Save company
    let saveCompany = await new CompanyModel(companyObject).save();

    // Update user's company association
    let companyIdByUser = await employeeSchema.findOneAndUpdate(
      {
        _id: decodedUserId,
      },
      {
        $set: {
          companyId: saveCompany._id,
        },
      }
    );

    let resetTokenPayload;
    let resetToken;
    
    if (!companyId) {
      resetTokenPayload = {
        _id: companyIdByUser?._id,
        fullName: companyIdByUser?.fullName,
        userName: companyIdByUser?.userName,
        email: companyIdByUser?.email,
        status: companyIdByUser?.status,
        isActive: companyIdByUser?.isActive,
        customStatus: companyIdByUser?.customStatus ?? null,
        customStatusEmoji: companyIdByUser?.customStatusEmoji ?? null,
        muteUsers: companyIdByUser?.muteUsers || [],
        lastActiveTime: companyIdByUser?.lastActiveTime,
        isLeft: companyIdByUser?.isLeft ?? false,
        createdAt: companyIdByUser?.createdAt,
        updatedAt: companyIdByUser?.updatedAt,
        position: companyIdByUser?.position || "",
        avatarUrl: companyIdByUser?.avatarUrl || "",
        thumbnailAvatarUrl: companyIdByUser?.thumbnailAvatarUrl || "",
        roleId: companyIdByUser?.roleId,
        roleName: roleName,
        companyId: saveCompany?._id,
        companyName: saveCompany?.companyName,
        companyEmail: saveCompany?.companyEmail,
        companyLogoUrl: saveCompany?.companyLogoUrl,
        companyFavIcoUrl: saveCompany?.companyFavIcoUrl,
        deffaultchannels: saveCompany?.deffaultchannels,
        fileUploadSize: saveCompany?.fileUploadSize,
      };

      resetToken = createJWTToken(resetTokenPayload);
      console.log(
        resetToken,
        "resetToken test",
        companyIdByUser,
        "companyIdByUser",
        saveCompany,
        "saveCompany"
      );
    }

    console.log(resetToken, "resetTokenTest");

    if (saveCompany) {
      return successResponse(reply, statusCode.SUCCESS, COMPANY_CREATED, {
        saveCompany,
        resetToken,
        companyId: saveCompany?._id,
        fileUploadSize: saveCompany?.fileUploadSize,
      });
    } else {
      return errorResponse(reply, statusCode.SERVER_ERROR, SERVER_ERROR);
    }
  } catch (error) {
    console.error("🚀 ~ exports.addCompany ~ error:", error);

    let message = "Something went wrong while adding the company.";

    // Handle Mongo duplicate key error
    if (error.code === 11000) {
      if (error.keyPattern?.companyEmail) {
        message = COMPANY_EMAIL_EXIST;
      } else if (error.keyPattern?.companyName) {
        message = COMPANY_NAME_EXIST;
      } else {
        message = `Duplicate entry detected: ${JSON.stringify(error.keyValue)}`;
      }

      return errorResponse(reply, statusCode.BAD_REQUEST, message);
    }

    return catchBlockErrorResponse({
      reply,
      fullMessage: error.message,
    });
  }
};

// Edit Company API
exports.editCompany = async (request, reply) => {
  try {
    // Decode user from token
    const { payload: { _id: decodedUserId, roleId, roleName } = {} } =
      request.user || {};

    // Only allow SuperAdmin and Admin to edit company
    if (roleName === CONFIG_JSON.PMS_ROLES.USER) {
      return errorResponse(reply, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { companyId } = request.params;

    // Validate input
    const { error, value } = validateFormatter(
      getAddCompanySchema(),
      request.body
    ); // same schema as addCompany
    if (error) {
      return errorResponse(
        reply,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { companyEmail, companyName, logo, favicon } = value;
    const existingCompany = await CompanyModel.findOne({
      _id: { $ne: companyId },
      $or: [
        { companyEmail: companyEmail },
        { companyName: companyName },
      ],
    });

    if (existingCompany) {
      let duplicateField = "";

      if (existingCompany.companyEmail === companyEmail) {
        duplicateField = COMPANY_EMAIL_EXIST;
      } else if (existingCompany.companyName === companyName) {
        duplicateField = COMPANY_NAME_EXIST;
      }

      return errorResponse(reply, statusCode.BAD_REQUEST, duplicateField);
    }
    
    // Fetch old company data to compare
    const oldCompany = await CompanyModel.findById(companyId);
    if (!oldCompany) {
      return errorResponse(reply, statusCode.NOT_FOUND, "Company not found");
    }

    // Build update object
    const updateObject = {
      companyEmail,
      companyName,
      companyLogoUrl: logo,
      companyFavIcoUrl: favicon,
    };

    // Update company
    const updatedCompany = await CompanyModel.findOneAndUpdate(
      { _id: companyId },
      { $set: updateObject },
      { new: true }
    );

    return successResponse(
      reply,
      statusCode.SUCCESS,
      "Company updated successfully",
      {
        updatedCompany,
      }
    );
  } catch (error) {
    console.log("🚀 ~ exports.editCompany= ~ error:", error);
    return catchBlockErrorResponse({
      reply,
      fullMessage: error.message,
    });
  }
};

// Delete Company API
exports.deleteCompany = async (request, reply) => {
  try {
    // Get user's data from JWT decode
    const { payload: { _id: decodedUserId, roleId, roleName } = {} } =
      request.user || {};

    // Only allow SuperAdmin and admin to delete company
    if (roleName == CONFIG_JSON.PMS_ROLES.USER) {
      return errorResponse(reply, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { companyId } = request.params;

    let getCompanyData = await getCompanyById(reply, companyId);

    // Check if getCompanyData is an error response or null
    if (!getCompanyData) {
      // If getCompanyById already sent a response, just return to end execution
      return;
    }
    getCompanyData.isDeleted = true;
    getCompanyData.isActive = false;

    await getCompanyData.save();

    return successResponse(reply, statusCode.SUCCESS, DELETED);
  } catch (error) {
    console.log("🚀 ~ exports.deleteCompany ~ error:", error);
    return catchBlockErrorResponse({
      reply,
      fullMessage: error.message,
    });
  }
};

exports.updateCompanyFileUploadSize = async (request, reply) => {
  try {
    const { payload: { roleName, companyId } = {} } = request.user || {};

    if (
      ![CONFIG_JSON.PMS_ROLES.SUPER_ADMIN, CONFIG_JSON.PMS_ROLES.ADMIN].includes(
        roleName
      )
    ) {
      return errorResponse(reply, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { error, value } = validateFormatter(
      fileUploadSizeSchema(),
      request.body
    );
    if (error) {
      return errorResponse(
        reply,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    // Convert MB to KB
    const fileSizeInKB = value.fileUploadSize * 1024;

    const updatedCompany = await CompanyModel.findOneAndUpdate(
      { _id: companyId },
      { $set: { fileUploadSize: fileSizeInKB } },
      { new: true }
    );

    if (!updatedCompany) {
      return errorResponse(reply, statusCode.NOT_FOUND, "Company not found");
    }

    return successResponse(
      reply,
      statusCode.SUCCESS,
      "File upload size updated successfully",
      {
        updatedCompany,
      }
    );
  } catch (error) {
    console.error("🚀 ~ updateCompanyFileUploadSize ~ error:", error);
    return catchBlockErrorResponse({
      reply,
      fullMessage: error.message,
    });
  }
};