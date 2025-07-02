const { statusCode } = require("../helpers/constant");
const {
  COMPANY_CREATED,
  SERVER_ERROR,
  UNAUTHORIZED,
  LISTING,
  DELETED,
  COMPANY_NAME_EXIST,
  COMPANY_EMAIL_EXIST
} = require("../helpers/messages");
const {
  successResponse,
  errorResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const { CompanyModel, employeeSchema } = require("../models");
const { searchDataArr } = require("../helpers/queryHelper");
const CONFIG_JSON = require("../settings/config.json");
const Joi = require("joi");
const { createJWTToken } = require("../helpers/JWTToken");
const { validateFormatter } = require("../configs");
const { getAddCompanySchema, fileUploadSizeSchema } = require("../validation");

// Get Company list API
const getCompanyById = async (res, ID) => {
  ID = validObjectId(ID) ? ID : newObjectId(ID);
  const companyData = await CompanyModel.findOne({
    _id: ID,
    isDeleted: false
  });
  if (!companyData) {
    return errorResponse(res, statusCode.NOT_FOUND, NOT_FOUND);
  }
  return companyData;
};

// Get company list API
exports.getCompanyList = async (req, res) => {
  try {
    // Get user's data from JWT decode
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};
    console.log("🚀 ~ exports.getCompanyList= ~ req.user:", req.user, roleName);

    // Only allow SuperAdmin and admin to get company
    if (roleName == CONFIG_JSON.PMS_ROLES.USER) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    let companyIdByUser;
    if (companyId == "" || companyId == undefined) {
      companyIdByUser = await employeeSchema
        .findOne({ _id: decodedUserId }, { password: 0 })
        .lean();
    }

    const {
      page = 1,
      limit = 30,
      search = "",
      sort = "desc",
      sortBy = "createdAt"
    } = req.body;

    // Super admin gets all companies list & Admin gets own company list
    let matchQuery;

    if (!companyId) {
      matchQuery = {
        ...(roleName === CONFIG_JSON.PMS_ROLES.ADMIN
          ? { _id: companyIdByUser?.companyId }
          : {}),
        isDeleted: false
      };
    } else {
      matchQuery = {
        ...(roleName === CONFIG_JSON.PMS_ROLES.ADMIN
          ? { _id: newObjectId(companyId) }
          : {}),
        isDeleted: false
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
          from: "employees",
          let: { companyId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$companyId", "$$companyId"] },
                    { $ne: ["$isDeleted", true] } // exclude isDeleted: true
                  ]
                }
              }
            }
          ],
          as: "employees"
        }
      },
      {
        $addFields: {
          employeeCount: { $size: "$employees" }
        }
      },
      {
        $project: {
          employees: 0 // exclude employee array
        }
      },
      { $sort: { [sortBy]: sort == "desc" ? -1 : 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    const [companyData, totalCount] = await Promise.all([
      CompanyModel.aggregate(mainQuery),
      CompanyModel.countDocuments(matchQuery)
    ]);

    const metaData = {
      total: totalCount,
      limit: limit,
      pageNo: page,
      totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 1,
      currentPage: page
    };
    return successResponse(
      res,
      statusCode.SUCCESS,
      LISTING,
      companyData,
      metaData
    );
  } catch (error) {
    console.log("🚀 ~ exports.getCompany=async ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Add Company API
exports.addCompany = async (req, res) => {
  try {
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    // Only allow SuperAdmin and admin to add company
    if (roleName == CONFIG_JSON.PMS_ROLES.USER) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { error, value } = validateFormatter(getAddCompanySchema(), req.body);

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { companyEmail, companyName, logo, favicon } = value;
    console.log(logo, favicon, "ogo,favicon");
    const existingCompany = await CompanyModel.findOne({
      $or: [{ companyEmail }, { companyName }]
    });

    if (existingCompany) {
      let duplicateField = "";
      if (existingCompany.companyEmail === companyEmail) {
        duplicateField = COMPANY_EMAIL_EXIST;
      } else if (existingCompany.companyName === companyName) {
        duplicateField = COMPANY_NAME_EXIST;
      }

      return errorResponse(res, statusCode.BAD_REQUEST, duplicateField);
    }

    let companyObject = {
      companyEmail,
      companyName,
      companyLogoUrl: logo,
      companyFavIcoUrl: favicon
    };

    // Save company
    let saveCompany = await new CompanyModel(companyObject).save();

    // Update user's company association
    let companyIdByUser = await employeeSchema.findOneAndUpdate(
      {
        _id: decodedUserId
      },
      {
        $set: {
          companyId: saveCompany._id
        }
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
        fileUploadSize: saveCompany?.fileUploadSize
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
      return successResponse(res, statusCode.SUCCESS, COMPANY_CREATED, {
        saveCompany,
        resetToken,
        companyId: saveCompany?._id,
        fileUploadSize: saveCompany?.fileUploadSize
      });
    } else {
      return errorResponse(res, statusCode.SERVER_ERROR, SERVER_ERROR);
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

      return errorResponse(res, statusCode.BAD_REQUEST, message);
    }

    return catchBlockErrorResponse(res, error.message);
  }
};

// Edit Company API
exports.editCompany = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    // Only allow SuperAdmin and Admin to edit company
    if (roleName === CONFIG_JSON.PMS_ROLES.USER) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { companyId } = req.params;

    // Validate input
    const { error, value } = validateFormatter(getAddCompanySchema(), req.body); // same schema as addCompany
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { companyEmail, companyName, logo, favicon } = value;
    const existingCompany = await CompanyModel.findOne({
      _id: { $ne: companyId },
      $or: [{ companyEmail: companyEmail }, { companyName: companyName }]
    });

    if (existingCompany) {
      let duplicateField = "";

      if (existingCompany.companyEmail === companyEmail) {
        duplicateField = COMPANY_EMAIL_EXIST;
      } else if (existingCompany.companyName === companyName) {
        duplicateField = COMPANY_NAME_EXIST;
      }

      return errorResponse(res, statusCode.BAD_REQUEST, duplicateField);
    }

    // Fetch old company data to compare
    const oldCompany = await CompanyModel.findById(companyId);
    if (!oldCompany) {
      return errorResponse(res, statusCode.NOT_FOUND, "Company not found");
    }

    // Build update object
    const updateObject = {
      companyEmail,
      companyName,
      companyLogoUrl: logo,
      companyFavIcoUrl: favicon
    };

    // Update company
    const updatedCompany = await CompanyModel.findOneAndUpdate(
      { _id: companyId },
      { $set: updateObject },
      { new: true }
    );

    return successResponse(
      res,
      statusCode.SUCCESS,
      "Company updated successfully",
      {
        updatedCompany
      }
    );
  } catch (error) {
    console.log("🚀 ~ exports.editCompany= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Delete Company API
exports.deleteCompany = async (req, res) => {
  try {
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};
    
    // Only allow SuperAdmin and admin to delete company
    if (roleName == CONFIG_JSON.PMS_ROLES.USER) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { companyId } = req.params;

    let getCompanyData = await getCompanyById(res, companyId);

    // Check if getCompanyData is an error response or null
    if (!getCompanyData) {
      // If getCompanyById already sent a response, just return to end execution
      return;
    }
    getCompanyData.isDeleted = true;
    getCompanyData.isActive = false;

    await getCompanyData.save();

    return successResponse(res, statusCode.SUCCESS, DELETED);
  } catch (error) {
    console.log("🚀 ~ exports.deleteCompany ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Company file upload size API
exports.updateCompanyFileUploadSize = async (req, res) => {
  try {
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    if (
      ![
        CONFIG_JSON.PMS_ROLES.SUPER_ADMIN,
        CONFIG_JSON.PMS_ROLES.ADMIN
      ].includes(roleName)
    ) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { error, value } = validateFormatter(
      fileUploadSizeSchema(),
      req.body
    );
    if (error) {
      return errorResponse(
        res,
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
      return errorResponse(res, statusCode.NOT_FOUND, "Company not found");
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      "File upload size updated successfully",
      {
        updatedCompany
      }
    );
  } catch (error) {
    console.error("🚀 ~ updateCompanyFileUploadSize ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
