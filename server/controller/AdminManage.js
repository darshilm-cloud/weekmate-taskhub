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

    // Clean data
    dataPayload.parse.forEach((item) => {
      item["Email"] = item["Email"].toString().trim();
      item["First Name"] = item["First Name"].toString().trim();
      item["Last Name"] = item["Last Name"].toString().trim();
      item["Password"] = item["Password"].toString().trim();
    });

    const requiredColumns = ["Email", "First Name", "Last Name", "Password"];
    if (!requiredColumns.every((col) => dataPayload.cols.includes(col))) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        messages.COLUMNS_MISMATCH
      );
    }

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

    const roleData = await PMSRoles.findOne({
      role_name: "User",
      isDeleted: false
    });

    const insertedUsers = [];
    const duplicateUsers = [];
    const invalidUsers = [];

    for (const item of value) {
      try {
        const existing = await employeeSchema.findOne({
          email: item.Email,
          isDeleted: false
        });

        if (existing) {
          duplicateUsers.push({
            email: item.Email,
            reason: "Duplicate email"
          });
          continue;
        }

        const cleanedUser = {
          email: item.Email,
          first_name: item["First Name"],
          last_name: item["Last Name"],
          password: item.Password, // Optional: await bcrypt.hash(item.Password, 10)
          pms_role_id: roleData._id,
          companyId: companyId
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

    const { email, firstName, lastName, companyId, isActivate } = value;

    // Create an update object with only the fields that are present in the req
    const updateFields = {};

    if (email !== undefined) updateFields.email = email;
    if (firstName !== undefined) updateFields.first_name = firstName;
    if (lastName !== undefined) updateFields.last_name = lastName;
    if (companyId !== undefined) updateFields.companyId = companyId;
    if (isActivate !== undefined) updateFields.isActivate = isActivate;

    // Add updatedAt timestamp
    updateFields.updatedAt = new Date();

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

    return successResponse(res, statusCode.SUCCESS, UPDATED, updatedUser);
  } catch (error) {
    console.log("🚀 ~ exports.editUser=async ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Delete user (employee) API
exports.deleteUser = async (req, res) => {
  try {
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

    userData.isDeleted = true;
    userData.isActivate = false;

    await userData.save();

    return successResponse(res, statusCode.SUCCESS, DELETED);
  } catch (error) {
    console.log("🚀 ~ exports.deleteUser ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
