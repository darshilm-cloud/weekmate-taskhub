const { statusCode } = require("../helpers/constant");
const Joi = require("joi");
const {
  USER_EMAIL_EXIST,
  SERVER_ERROR,
  COMPANY_CREATED,
  USER_ADDED,
  USER_USERNAME_EXIST,
  UNAUTHORIZED,
  USER_NOT_FOUND,
  UPDATED,
  DELETED,
  LISTING,
  NOT_FOUND
} = require("../helpers/messages");
const {
  successResponse,
  errorResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const {
  ChannelModel,
  CompanyModel,
  employeeSchema,
  PMSRoles
} = require("../models");
const { isCompanyEmailTaken } = require("../helpers/companyEmailUniqueness");

const CONFIG_JSON = require("../settings/config.json");
const { searchDataArr } = require("../helpers/queryHelper");
const XLSX = require("xlsx");

const { validateFormatter } = require("../configs");
const {
  getAddUserSchema,
  getAddUserSchemaCSV,
  getEditUserSchema
} = require("../validation");
const messages = require("../helpers/messages");

const jsonDataFromFile = (fileObj) => {
  // read file from buffer
  const wb = XLSX.read(fileObj.buffer, {
    type: "buffer",
    cellDates: true // otherwise for csv 2021-04-12T12:00:00Z is converted to 44298.22928240741
  });

  const sheetNameList = wb.SheetNames;
  const sheet = wb.Sheets[sheetNameList[0]];

  const parsedJsonData = XLSX.utils.sheet_to_json(wb.Sheets[sheetNameList[0]]);

  const columnNames = [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell_address = { c: C, r: range.s.r }; // A1, B1, etc.
    const cell_ref = XLSX.utils.encode_cell(cell_address);
    const cell = sheet[cell_ref];
    if (cell && cell.t === "s") {
      columnNames.push(XLSX.utils.format_cell(cell));
    }
  }

  return { parse: parsedJsonData, cols: columnNames };
};

// Get users list by admin API
exports.getUsersList = async (req, res) => {
  try {
    // Get user's data from JWT decode
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    // Only allow admin to get user
    if (roleName != CONFIG_JSON.PMS_ROLES.ADMIN) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }
    // Only allow admin to get user
    if (!companyId) {
      return errorResponse(res, statusCode.SUCCESS, NOT_FOUND);
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

// Add users (employee) by admin API
exports.addUser = async (req, res) => {
  try {
    // Get user's data from JWT decode
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    // Only allow Admin to create user
    if (roleName !== CONFIG_JSON.PMS_ROLES.ADMIN) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { error, value } = validateFormatter(getAddUserSchema(), req.body);

    if (error) {
      console.log("Error: ",error)
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { email, firstName, lastName, password, companyId, pmsRoleId } = value;
    const isActivate = req.body.isActivate !== undefined ? req.body.isActivate : true;

    const companyObjectId = newObjectId(companyId);
    if (await isCompanyEmailTaken(companyObjectId, email)) {
      return errorResponse(res, statusCode.CONFLICT, USER_EMAIL_EXIST);
    }

    // Add user according company
    let employeeObject = {
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      password,
      pms_role_id: pmsRoleId,
      companyId: companyObjectId,
      isActivate
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

// Import employee CSV API
exports.addUsersByCsv = async (req, res) => {
  try {
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    if (roleName !== CONFIG_JSON.PMS_ROLES.ADMIN) {
      return errorResponse(res, 401, "Unauthorized");
    }

    if (
      !req.files ||
      !req.files.attachment ||
      req.files.attachment.length !== 1
    ) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.SINGLE_FILE);
    }

    const fileObj = req.files.attachment[0];
    const fileExt = fileObj.originalname.split(".").pop().toLowerCase();

    if (!["xlsx", "xls", "csv"].includes(fileExt)) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.FILE_EXT);
    }

    const dataPayload = jsonDataFromFile(fileObj);

    const requiredColumns = ["Email", "First Name", "Last Name", "Password"];
    if (!requiredColumns.every((col) => dataPayload.cols.includes(col))) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        messages.COLUMNS_MISMATCH
      );
    }

    // Clean data
    dataPayload.parse.forEach((item) => {
      item["Email"] = item["Email"].toString().trim();
      item["First Name"] = item["First Name"].toString().trim();
      item["Last Name"] = item["Last Name"].toString().trim();
      item["Password"] = item["Password"].toString().trim();
      if (item["Phone Number"]) item["Phone Number"] = item["Phone Number"].toString().trim();
      if (item["Role"]) item["Role"] = item["Role"].toString().trim();
    });

    const payloadSchema = Joi.array()
      .items(getAddUserSchemaCSV())
      .min(1)
      .required();

    const { error, value } = payloadSchema.validate(dataPayload.parse);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const defaultRoleData = await PMSRoles.findOne({
      role_name: "User",
      isDeleted: false
    });

    const insertedUsers = [];
    const duplicateUsers = [];
    const invalidUsers = [];
    const companyObjectId = newObjectId(companyId);

    for (const item of value) {
      try {
        if (await isCompanyEmailTaken(companyObjectId, item.Email)) {
          duplicateUsers.push({
            email: item.Email,
            reason: "Duplicate email in this company (employee or client)"
          });
          continue;
        }

        // Resolve role: use Role column if provided, otherwise default to "User"
        let resolvedRole = defaultRoleData;
        if (item["Role"] && item["Role"].trim()) {
          const csvRole = await PMSRoles.findOne({
            role_name: { $regex: new RegExp(`^${item["Role"].trim()}$`, "i") },
            isDeleted: false
          });
          if (csvRole) resolvedRole = csvRole;
        }

        const cleanedUser = {
          email: item.Email,
          first_name: item["First Name"],
          last_name: item["Last Name"],
          full_name: `${item["First Name"]} ${item["Last Name"]}`,
          password: item.Password,
          pms_role_id: resolvedRole?._id,
          companyId: companyObjectId,
          ...(item["Phone Number"] ? { phone_number: item["Phone Number"] } : {})
        };

        const user = new employeeSchema(cleanedUser);
        const saved = await user.save();

        insertedUsers.push({
          email: saved.email,
          full_name: `${saved.first_name} ${saved.last_name}`
        });
      } catch (err) {
        invalidUsers.push({
          email: item.Email,
          reason: err.message
        });
      }
    }

    const total =
      insertedUsers.length + duplicateUsers.length + invalidUsers.length;

    return successResponse(res, 200, `CSV processed successfully`, {
      insertedUsers,
      duplicateUsers,
      invalidUsers,
      summary: {
        insertedCount: insertedUsers.length,
        duplicateCount: duplicateUsers.length,
        invalidCount: invalidUsers.length,
        totalProcessed: total
      }
    });
  } catch (error) {
    console.error("CSV Upload Error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Edit users (employee) by admin API
exports.editUser = async (req, res) => {
  try {
    // Get user's data from JWT decode
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    // Only allow Admin to edit user
    if (roleName !== CONFIG_JSON.PMS_ROLES.ADMIN) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

    const { error, value } = validateFormatter(getEditUserSchema(), req.body);

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { userId } = req.params;

    const { email, firstName, lastName, companyId, isActivate, pmsRoleId, password } = value;

    const oldUserData = await employeeSchema.findById(newObjectId(userId)).lean();
    if (!oldUserData) {
      return errorResponse(res, statusCode.NOT_FOUND, USER_NOT_FOUND);
    }

    // Create an update object with only the fields that are present in the req
    const updateFields = {};

    if (email !== undefined) updateFields.email = email;
    if (firstName !== undefined) updateFields.first_name = firstName;
    if (lastName !== undefined) updateFields.last_name = lastName;
    if (firstName !== undefined && lastName !== undefined)
      updateFields.full_name = `${firstName} ${lastName}`;
    if (companyId !== undefined) updateFields.companyId = companyId;
    if (isActivate !== undefined) updateFields.isActivate = isActivate;
    if (pmsRoleId !== undefined) updateFields.pms_role_id = pmsRoleId;
    if (password !== undefined && String(password).trim() !== "") {
      updateFields.password = password;
    }
    // Add updatedAt timestamp
    updateFields.updatedAt = new Date();

    const nextCompanyId =
      updateFields.companyId !== undefined
        ? newObjectId(updateFields.companyId)
        : oldUserData.companyId;
    const nextEmail =
      updateFields.email !== undefined ? updateFields.email : oldUserData.email;
    const companyChanged =
      updateFields.companyId !== undefined &&
      String(updateFields.companyId) !== String(oldUserData.companyId);
    const emailChanged =
      updateFields.email !== undefined &&
      String(updateFields.email || "").trim().toLowerCase() !==
        String(oldUserData.email || "").trim().toLowerCase();
    if (emailChanged || companyChanged) {
      if (await isCompanyEmailTaken(nextCompanyId, nextEmail, { excludeEmployeeId: userId })) {
        return errorResponse(res, statusCode.CONFLICT, USER_EMAIL_EXIST);
      }
    }

    // Find and update the user with only the provided fields
    const updatedUser = await employeeSchema.findOneAndUpdate(
      { _id: newObjectId(userId) },
      { $set: updateFields },
      { new: true } // Return the updated document
    );

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

//Delete user (employee) API
exports.deleteUser = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Get user's data from JWT decode
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    // Only allow Admin to delete user
    if (roleName !== CONFIG_JSON.PMS_ROLES.ADMIN) {
      return errorResponse(res, statusCode.UNAUTHORIZED, UNAUTHORIZED);
    }

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
