const { statusCode } = require("../helpers/constant");
const {
  UNAUTHORIZED,
  LISTING,
  DELETED,
  SERVER_ERROR
} = require("../helpers/messages");
const {
  successResponse,
  errorResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const { getAddAdminSchema, getEditAdminSchema } = require("../validation");
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

    // Only allow SuperAdmin to create company
    if (roleName !== CONFIG_JSON.PMS_ROLES.SUPER_ADMIN) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const {
      page = 1,
      limit = 30,
      search = "",
      sort = "desc",
      sortBy = "createdAt"
    } = req.body;

    let matchQuery = {
      isDeleted: false,
      isAdmin: true
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
          companyEmail: { $ifNull: ["$companyDetails.companyEmail", ""] },
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

    // Only allow SuperAdmin to create company
    if (roleName !== CONFIG_JSON.PMS_ROLES.SUPER_ADMIN) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

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

    // Only allow SuperAdmin to edit admin
    if (roleName !== CONFIG_JSON.PMS_ROLES.SUPER_ADMIN) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { error, value } = validateFormatter(getEditAdminSchema(), req.body); // Reuse same schema

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { email, firstName, lastName, password } = value;
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

    existingUser.email = email;
    existingUser.first_name = firstName;
    existingUser.last_name = lastName;

    if (password) {
      existingUser.password = password;
    }

    const updatedUser = await existingUser.save();

    // // Prepare update object
    // const updateData = {
    //   email,
    //   first_name: firstName,
    //   last_name: lastName,
    // };

    // if (password) {
    //   const hashedPassword = crypto
    //     .createHash(HASH_ALGORITHM)
    //     .update(password)
    //     .digest("hex");

    //   updateData.password = hashedPassword;
    // }

    // const updatedUser = await employeeSchema.findByIdAndUpdate(
    //   { _id: adminId },
    //   updateData,
    //   {
    //     new: true
    //   }
    // );

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
    // Get user's data from JWT decode
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    // Only allow SuperAdmin to create company
    if (roleName !== CONFIG_JSON.PMS_ROLES.SUPER_ADMIN) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { userId } = req.params;

    let userData = await employeeSchema.findById({ _id: newObjectId(userId) });

    if (!userData) {
      return;
    }

    userData.isDeleted = true;
    userData.isActivate = false;

    await userData.save();

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

    if (roleName === CONFIG_JSON.PMS_ROLES.USER) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    let totalEmployees = 0;
    let totalAdmins = 0;

    const commonFilter = {
      isActivate: true,
      isDeleted: false
    };

    // Get role data
    let userRoleData = await PMSRoles.findOne({
      role_name: "User",
      isDeleted: false
    });

    let adminRoleData = await PMSRoles.findOne({
      role_name: "Admin",
      isDeleted: false
    });
    console.log(
      "🚀 ~ exports.getDashboardData= ~ adminRoleData:",
      adminRoleData
    );

    if (roleName === CONFIG_JSON.PMS_ROLES.SUPER_ADMIN) {
      const [employeeCount, adminCount] = await Promise.all([
        employeeSchema.countDocuments({
          ...commonFilter,
          pms_role_id: userRoleData._id
        }),
        employeeSchema.countDocuments({
          ...commonFilter,
          pms_role_id: adminRoleData._id
        })
      ]);

      totalEmployees = employeeCount;
      totalAdmins = adminCount;
    } else if (roleName === CONFIG_JSON.PMS_ROLES.ADMIN) {
      if (!companyId) {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          "Company ID is required for admin role"
        );
      }

      totalEmployees = await employeeSchema.countDocuments({
        ...commonFilter,
        companyId
      });
    }

    const responseData = {
      totalEmployees,
      ...(roleName === CONFIG_JSON.PMS_ROLES.SUPER_ADMIN && { totalAdmins })
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
