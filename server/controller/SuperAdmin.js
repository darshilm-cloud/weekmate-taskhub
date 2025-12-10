const { statusCode } = require("../helpers/constant");
const {
  UNAUTHORIZED,
  UPDATED,
  LISTING,
  DELETED,
  SERVER_ERROR
} = require("../helpers/messages");
const {
  successResponse,
  errorResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const {
  getAddAdminSchema,
  getEditAdminSchema,
  getEditUserSchema,
  getEditEmpSchema
} = require("../validation");
const CONFIG_JSON = require("../settings/config.json");
const { employeeSchema, PMSRoles } = require("../models");
const { searchDataArr } = require("../helpers/queryHelper");
const crypto = require("crypto");
const { validateFormatter } = require("../configs");

// Get Admin list API
exports.getAdminList = async (req, res) => {
  try {
    // Get user's data from JWT decode
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    console.log(req.user);

    const {
      page = 1,
      limit = 30,
      search = "",
      sort = "desc",
      sortBy = "createdAt"
    } = req.body;

    let matchQuery = {
      isDeleted: false,
      isActivate: true
    };

    let orFilter = [];

    if (search.length > 0) {
      orFilter = [
        ...orFilter,
        searchDataArr(["first_name", "last_name", "email"], search)
      ];
    }

    if (orFilter.length > 0) {
      matchQuery = { ...matchQuery, $and: orFilter };
    }

    let roleData = await PMSRoles.findOne({
      role_name: "Admin",
      isDeleted: false
    });

    matchQuery = {
      ...matchQuery,
      pms_role_id: roleData._id
    };

    const mainQuery = [
      { $match: matchQuery },
      { $sort: { [sortBy]: sort == "desc" ? -1 : 1 } },
      {
        $lookup: {
          from: "companies",
          localField: "companyId",
          foreignField: "_id",
          as: "companyDetails"
        }
      },
      {
        $unwind: {
          path: "$companyDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { companyId: "$companyId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$companyId", "$$companyId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isActivate", true] },
                    { $ne: ["$roleId", { $toObjectId: roleData._id }] }
                  ]
                }
              }
            },
            {
              $count: "totalEmployees"
            }
          ],
          as: "employeeCount"
        }
      },
      {
        $addFields: {
          "companyDetails.totalEmployeeCount": {
            $ifNull: [{ $arrayElemAt: ["$employeeCount.totalEmployees", 0] }, 0]
          }
        }
      },
      {
        $project: {
          _id: 1,
          email: 1,
          isActivate: 1,
          createdAt: 1,
          updatedAt: 1,
          first_name: 1,
          last_name: 1,
          loginActivity: 1,
          companyId: { $ifNull: ["$companyDetails._id", ""] },
          companyName: { $ifNull: ["$companyDetails.companyName", ""] },
          companyFileSize: { $ifNull: ["$companyDetails.fileSize", ""] },
          companyDataSize: { $ifNull: ["$companyDetails.dataSize", ""] },
          totalEmp: "$companyDetails.totalEmployeeCount"
        }
      },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    const [adminData, totalCount] = await Promise.all([
      employeeSchema.aggregate(mainQuery),
      employeeSchema.countDocuments(matchQuery)
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
      adminData,
      metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Add admin API
exports.addAdmin = async (req, res) => {
  try {
    // Get user's data from JWT decode
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    const { error, value } = validateFormatter(getAddAdminSchema(), req.body);

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { email, firstName, lastName, password } = value;

    // Check for admin email and username exist
    let isEmailExists = await employeeSchema.findOne({
      email
    });

    if (isEmailExists) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        "Admin email already exist"
      );
    }

    // Get role data
    let roleData = await PMSRoles.findOne({
      role_name: "Admin",
      isDeleted: false
    });

    // Add admin (user) according company
    let userObject = {
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      password,
      pms_role_id: roleData._id,
      isActivate: true,
      isAdmin: true
    };

    let saveUser = await new employeeSchema(userObject).save();

    await saveUser.save();

    if (saveUser) {
      return successResponse(
        res,
        statusCode.SUCCESS,
        "Admin added successfully",
        saveUser
      );
    } else {
      return errorResponse(res, statusCode.SERVER_ERROR, SERVER_ERROR);
    }
  } catch (error) {
    console.log("🚀 ~ exports.getCompanyList=async ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Edit admin API
exports.editAdmin = async (req, res) => {
  try {
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    const { error, value } = validateFormatter(getEditAdminSchema(), req.body); // Reuse same schema

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { email, firstName, lastName, password, isActivate } = value;
    const { adminId } = req.params;

    // Check if admin exists
    const existingUser = await employeeSchema.findById(adminId);
    if (!existingUser) {
      return errorResponse(res, statusCode.NOT_FOUND, "Admin not found");
    }

    // Check for email uniqueness excluding the current user
    const emailExists = await employeeSchema.findOne({
      email,
      _id: { $ne: adminId }
    });

    if (emailExists) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        "Admin email already exist"
      );
    }

    // Get old data before update for logging
    const oldAdminData = existingUser.toObject ? existingUser.toObject() : existingUser;

    existingUser.email = email;
    existingUser.first_name = firstName;
    existingUser.last_name = lastName;
    existingUser.isActivate = isActivate;

    if (password) {
      existingUser.password = password;
    }

    const updatedUser = await existingUser.save();

    // Get new data after update for logging
    const newAdminData = updatedUser.toObject ? updatedUser.toObject() : updatedUser;

    // Log update activity
    try {
      const { logUpdate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
      const userInfo = await getUserInfoForLogging(req.user);
      if (userInfo && oldAdminData && newAdminData) {
        // Remove password from logged data
        delete oldAdminData.password;
        delete newAdminData.password;
        await logUpdate({
          companyId: userInfo.companyId,
          moduleName: "employees",
          email: userInfo.email,
          createdBy: userInfo._id,
          updatedBy: userInfo._id,
          oldData: oldAdminData,
          newData: newAdminData,
          additionalData: {
            recordId: oldAdminData._id.toString(),
            isAdmin: true
          }
        });
      }
    } catch (logError) {
      console.error("Error logging admin update activity:", logError);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      "Admin updated successfully",
      updatedUser
    );
  } catch (error) {
    console.log("🚀 ~ exports.editAdmin=async ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Delete admin API
exports.deleteAdmin = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    console.log("RUNN");
    // Get user's data from JWT decode
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    const { userId } = req.params;

    let userData = await employeeSchema.findById({ _id: newObjectId(userId) });

    if (!userData) {
      return errorResponse(res, statusCode.NOT_FOUND, "User not found");
    }

    // Get user data before deletion for logging
    const userDataForLog = userData.toObject ? userData.toObject() : userData;

    userData.isDeleted = true;
    userData.isActivate = false;

    await userData.save();

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && userDataForLog) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "employees",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: userDataForLog,
        additionalData: {
          recordId: userDataForLog._id.toString(),
          deletedUserEmail: userDataForLog.email,
          isSoftDelete: true
        }
      });
    }

    return successResponse(res, statusCode.SUCCESS, DELETED);
  } catch (error) {
    console.log("🚀 ~ exports.getCompanyList=async ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Get dashboard data API
exports.getDashboardData = async (req, res) => {
  try {
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    let totalEmployees = 0;
    let totalAdmins = 0;

    let commonFilter = {
      isActivate: true,
      isDeleted: false
    };
    if (companyId) {
      commonFilter = {
        ...commonFilter,
        companyId: newObjectId(companyId)
      };
    }

    // Get role data
    let userRoleData = await PMSRoles.findOne({
      role_name: "User",
      isDeleted: false
    });

    let adminRoleData = await PMSRoles.findOne({
      role_name: "Admin",
      isDeleted: false
    });

    const [employeeCount, adminCount] = await Promise.all([
      employeeSchema.countDocuments({
        ...commonFilter
        // pms_role_id: { $ne: adminRoleData._id }
      }),
      employeeSchema.countDocuments({
        ...commonFilter,
        pms_role_id: adminRoleData._id
      })
    ]);

    totalEmployees = employeeCount;
    totalAdmins = adminCount;

    const responseData = {
      totalEmployees,
      totalAdmins
    };

    return successResponse(
      res,
      statusCode.SUCCESS,
      "Dashboard data fetched successfully",
      responseData
    );
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Get users list by super admin API
exports.getUsersList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 30,
      search = "",
      sort = "desc",
      sortBy = "createdAt",
      companyId = null
    } = req.body;

    if (!companyId) {
      return errorResponse(res, statusCode.SUCCESS, NOT_FOUND);
    }

    let matchQuery = {
      isDeleted: false,
      companyId: newObjectId(companyId)
    };

    let orFilter = [];

    if (search.length > 0) {
      orFilter = [
        ...orFilter,
        searchDataArr(["first_name", "last_name", "email"], search)
      ];
    }

    if (orFilter.length > 0) {
      matchQuery = { ...matchQuery, $and: orFilter };
    }

    const mainQuery = [
      { $match: matchQuery },
      { $sort: { [sortBy]: sort == "desc" ? -1 : 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    const [userData, totalCount] = await Promise.all([
      employeeSchema.aggregate(mainQuery),
      employeeSchema.countDocuments(matchQuery)
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
      userData,
      metaData
    );
  } catch (error) {
    console.log("🚀 ~ exports.getUsersList=async ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Add users (employee) by super admin API
exports.addUser = async (req, res) => {
  try {
    const { error, value } = validateFormatter(getAddUserSchema(), req.body);

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { email, firstName, lastName, password, companyId } = value;

    // Check for user email and username exist
    let isEmailExists = await employeeSchema.findOne({
      email
    });

    if (isEmailExists) {
      return errorResponse(res, statusCode.CONFLICT, USER_EMAIL_EXIST);
    }

    const roleData = await PMSRoles.findOne({
      role_name: "User",
      isDeleted: false
    });

    // Add user according company
    let employeeObject = {
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      password,
      pms_role_id: roleData._id,
      companyId: newObjectId(companyId)
    };

    let saveEmployee = await new employeeSchema(employeeObject).save();

    if (saveEmployee) {
      return successResponse(res, statusCode.SUCCESS, USER_ADDED, saveEmployee);
    } else {
      return errorResponse(res, statusCode.SERVER_ERROR, SERVER_ERROR);
    }
  } catch (error) {
    console.log("🚀 ~ exports.getCompanyList=async ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Edit users (employee) by super admin API
exports.editUser = async (req, res) => {
  try {
    const { error, value } = validateFormatter(getEditEmpSchema(), req.body);

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { userId } = req.params;

    const { email, firstName, lastName, companyId, isActivate } = value;

    // Create an update object with only the fields that are present in the req
    const updateFields = {};

    if (email !== undefined) updateFields.email = email;
    if (firstName !== undefined) updateFields.first_name = firstName;
    if (lastName !== undefined) updateFields.last_name = lastName;
    if (firstName !== undefined && lastName !== undefined)
      updateFields.full_name = `${firstName} ${lastName}`;
    if (companyId !== undefined) updateFields.companyId = companyId;
    if (isActivate !== undefined) updateFields.isActivate = isActivate;

    // Add updatedAt timestamp
    updateFields.updatedAt = new Date();

    // Get old data before update for logging
    const oldUserData = await employeeSchema.findById(newObjectId(userId)).lean();

    // Find and update the user with only the provided fields
    const updatedUser = await employeeSchema.findOneAndUpdate(
      { _id: newObjectId(userId) },
      { $set: updateFields },
      { new: true } // Return the updated document
    );

    // Check if user exists
    if (!updatedUser) {
      return errorResponse(res, statusCode.NOT_FOUND, USER_NOT_FOUND);
    }

    // Get new data after update for logging
    const newUserData = updatedUser.toObject ? updatedUser.toObject() : updatedUser;

    // Log update activity
    try {
      const { logUpdate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
      const userInfo = await getUserInfoForLogging(req.user);
      if (userInfo && oldUserData && newUserData) {
        // Remove password from logged data
        delete oldUserData.password;
        delete newUserData.password;
        await logUpdate({
          companyId: userInfo.companyId,
          moduleName: "employees",
          email: userInfo.email,
          createdBy: userInfo._id,
          updatedBy: userInfo._id,
          oldData: oldUserData,
          newData: newUserData,
          additionalData: {
            recordId: oldUserData._id.toString()
          }
        });
      }
    } catch (logError) {
      console.error("Error logging user update activity:", logError);
    }

    return successResponse(res, statusCode.SUCCESS, UPDATED, updatedUser);
  } catch (error) {
    console.log("🚀 ~ exports.editUser=async ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Delete user (employee) by super admin API
exports.deleteUser = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    const { userId } = req.params;

    let userData = await employeeSchema.findOne({ _id: newObjectId(userId) });

    if (!userData) {
      return errorResponse(res, statusCode.NOT_FOUND, USER_NOT_FOUND);
    }

    // Get user data before deletion for logging
    const userDataForLog = userData.toObject ? userData.toObject() : userData;

    userData.isDeleted = true;
    userData.isActivate = false;

    await userData.save();

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && userDataForLog) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "employees",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: userDataForLog,
        additionalData: {
          recordId: userDataForLog._id.toString(),
          deletedUserEmail: userDataForLog.email,
          isSoftDelete: true
        }
      });
    }

    return successResponse(res, statusCode.SUCCESS, DELETED);
  } catch (error) {
    console.log("🚀 ~ exports.deleteUser ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
