const Joi = require("joi");
const crypto = require("crypto");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const PMSClient = mongoose.model("pmsclients");
const PMSRoles = mongoose.model("pms_roles");
const Role = mongoose.model("roles");
const Project = mongoose.model("projects");
const Employees = mongoose.model("employees");
const MailSettings = mongoose.model("mailsettings");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr,
  getAggregationPagination
} = require("../helpers/queryHelper");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const {
  getClientQuery,
  getUserName,
  getCompanyData
} = require("../helpers/common");
const _ = require("lodash");
const { generateCSV, generateXLSX } = require("../helpers/common");
const { pmswelcomeClientcontent } = require("../template/client_welcomeMail");
const config = require("../settings/config.json");
const XLSX = require("xlsx");
const { isCompanyEmailTaken } = require("../helpers/companyEmailUniqueness");
const { getAddClientSchemaCSV } = require("../validation");

// Check is exists..
exports.clientExists = async (reqData, id = null, companyId) => {
  try {
    let isExist = false;
    const data = await PMSClient.findOne({
      isDeleted: false,
      isSoftDeleted: false,
      isActivate: true,
      companyId: newObjectId(companyId),
      email: { $regex: new RegExp(`^${reqData?.email}$`, "i") },
      ...(id
        ? {
            _id: { $ne: id }
          }
        : {})
    });
    if (data) isExist = true;
    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.clientExists= ~ error:", error);
  }
};

exports.isEmpEmail = async (reqData, companyId) => {
  try {
    if (!reqData?.email || !companyId) return false;
    const escaped = String(reqData.email).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const data = await Employees.findOne({
      isDeleted: false,
      isSoftDeleted: false,
      companyId: newObjectId(companyId),
      email: { $regex: new RegExp(`^${escaped}$`, "i") }
    });
    return Boolean(data);
  } catch (error) {
    console.log("🚀 ~ exports.isEmpEmail= ~ error:", error);
    return false;
  }
};

//Add clients :
exports.addClients = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      full_name: Joi.string().required(),
      email: Joi.string().required(),
      client_img: Joi.string().allow("").optional(),
      phone_number: Joi.string().allow("").optional(),
      address: Joi.object().optional().default({}),
      extra_details: Joi.string().allow("").optional(),
      company_name: Joi.string().allow("").optional(),
      isActivate: Joi.boolean().optional().default(true),
      password: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (await this.clientExists(value, null, decodedCompanyId)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else if (await this.isEmpEmail(value, decodedCompanyId)) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        messages.ALREADY_EXISTS_IN_EMP_EMAIL
      );
    } else {
      // For pms role ...
      const role = await PMSRoles.findOne({
        role_name: config.PMS_ROLES.CLIENT,
        isDeleted: false
      });
      if (role) value.pms_role_id = new mongoose.Types.ObjectId(role._id);
      else {
        const newRole = new PMSRoles({
          role_name: config.PMS_ROLES.CLIENT,
          createdBy: req.user._id,
          updatedBy: req.user._id
        });
        newRole.save();
        value.pms_role_id = new mongoose.Types.ObjectId(newRole._id);
      }

      let data = new PMSClient({
        companyId: newObjectId(decodedCompanyId),
        first_name: value.first_name,
        last_name: value.last_name,
        full_name: value.full_name,
        email: value.email,
        client_img: value.client_img,
        phone_number: value.phone_number,
        address: value.address,
        extra_details: value.extra_details,
        company_name: value.company_name,
        plain_password: value?.password,
        password: value?.password,
        isActivate: value.isActivate,
        pms_role_id: value.pms_role_id,
        createdBy: req.user._id,
        updatedBy: req.user._id
      });
      await data.save();

      let mailSettingsData = new MailSettings({
        project_assigned: true,
        discussion_subscribed: true,
        discussion_tagged: true,
        maintask_subscribed: true,
        task_assigned: true,
        task_tagged_comments: true,
        bug_assigned: true,
        bug_tagged_comments: true,
        note_assigned: true,
        note_tagged_comments: true,
        file_subscribed: true,
        logged_hours: true,
        never: false,
        createdBy: data?._id,
        updatedBy: data?._id,
        isDeleted: false,
        createdByModel: "pmsclients",
        updatedByModel: "pmsclients"
      });

      await mailSettingsData.save();

      let companyData = await getCompanyData(decodedCompanyId);
      console.log("🚀 ~ exports.addClients= ~ companyData:", companyData)

      // Send welcome mail to client with their credentials and link to portal
      await pmswelcomeClientcontent(
        data,
        getUserName(req?.user),
        decodedCompanyId,
        companyData
      );

      return successResponse(
        res,
        statusCode.CREATED,
        messages.CLIENT_CREATED,
        {}
      );
    }
  } catch (error) {
    console.log("🚀 ~ exports.addClients= ~ error:", error);

    return catchBlockErrorResponse(res, error.message);
  }
};

// Get clients list...
exports.getClients = async (req, res) => {
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
      _id: Joi.string().optional().allow(""),
      user_id: Joi.string().optional().allow(""),
      isExport: Joi.boolean().default(false),
      isActivate: Joi.boolean().default(null),
      exportFileType: Joi.string()
        .optional()
        .valid("csv", "xlsx")
        .insensitive()
        .default("csv")
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
      sortBy: value.sortBy
    });

    let matchQuery = {
      isDeleted: false,
      isSoftDeleted: false,
      companyId: newObjectId(decodedCompanyId),
      ...(value.isActivate !== null && { isActivate: value.isActivate }),
      // for details
      ...(value._id && { _id: new mongoose.Types.ObjectId(value._id) }),
      // Apply filters..
      ...(value.user_id && { _id: new mongoose.Types.ObjectId(value.user_id) })
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(
          ["first_name", "last_name", "full_name", "email", "company_name"],
          value.search
        )
      };
    }

    const mainQuery = [
      { $match: matchQuery },
      {
        $project: {
          password: 0
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await PMSClient.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // Get analytics counts
    const analyticsQuery = [
      {
        $facet: {
          active: [
            { $match: { companyId: newObjectId(decodedCompanyId), isDeleted: false, isSoftDeleted: false, isActivate: true } },
            { $count: "count" }
          ],
          inactive: [
            { $match: { companyId: newObjectId(decodedCompanyId), isDeleted: false, isSoftDeleted: false, isActivate: false } },
            { $count: "count" }
          ]
        }
      }
    ];
    const analyticsResult = await PMSClient.aggregate(analyticsQuery);
    const activeCount = analyticsResult[0]?.active[0]?.count || 0;
    const inactiveCount = analyticsResult[0]?.inactive[0]?.count || 0;

    const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await PMSClient.aggregate(listQuery);

    let metaData = {};

    if (value?.isExport) {
      data = await this.exportPMSClientData(mainQuery, value.exportFileType);
    } else {
      metaData = {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        limit: pagination.limit,
        pageNo: pagination.page,
        totalPages:
          pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
        currentPage: pagination.page
      };
    }
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      value?._id ? data[0] : data,
      value?._id ? {} : metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Export clients data..
exports.exportPMSClientData = async (query, exportFileType) => {
  try {
    let result = [];
    const data = await PMSClient.aggregate([
      ...query,
      { $sort: { first_name: -1 } }
    ]).exec();

    // Loop through each item in the data
    for (let i = 0; i < data.length; i++) {
      let item = data[i];

      // Map the rest of the fields
      result.push({
        Name: item.full_name,
        Email: item.email,
        "Phone Number": item.phone_number,
        "Company Name": item.company_name,
        Status: item.isActivate == true ? "Active" : "Deactivate",
        "Extra Info": item.extra_details,
        "Created Date": moment(item.createdAt).format("DD-MMM-YYYY")
      });
    }

    const csvFields = [
      "Name",
      "Email",
      "Phone Number",
      "Company Name",
      "Status",
      "Extra Info",
      "Created Date"
    ];

    const exportFileTypeLower = _.toLower(exportFileType);

    if (exportFileTypeLower === "csv") {
      result = await generateCSV(result, csvFields);
    } else if (exportFileTypeLower === "xlsx") {
      result = await generateXLSX(csvData);
      // const linkSource = "data:text/csv;base64," + base64;
    }
    return result;
  } catch (error) {
    console.log("🚀 ~ exports.exportPMSClientData= ~ error:", error);
  }
};

//Update client data :
exports.updateClientData = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      full_name: Joi.string().required(),
      email: Joi.string().required(),
      client_img: Joi.string().allow("").optional(),
      phone_number: Joi.string().allow("").optional(),
      address: Joi.object().optional().default({}),
      extra_details: Joi.string().allow("").optional(),
      company_name: Joi.string().allow("").optional(),
      isActivate: Joi.boolean().optional()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (await this.clientExists(value, req.params.id, decodedCompanyId)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else if (await this.isEmpEmail(value, decodedCompanyId)) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        messages.ALREADY_EXISTS_IN_EMP_EMAIL
      );
    } else {
      if (value?.isActivate == false) {
        const projectData = await Project.findOne({
          isDeleted: false,
          pms_clients: req.params.id
        });

        if (projectData) {
          return errorResponse(
            res,
            statusCode.BAD_REQUEST,
            messages.CLIENT_NOT_DEACTIVE
          );
        }
      }

      // Get old data before update for logging
      const oldClientData = await PMSClient.findById(req.params.id).lean();

      const data = await PMSClient.findByIdAndUpdate(
        req.params.id,
        {
          first_name: value.first_name,
          last_name: value.last_name,
          full_name: value.full_name,
          email: value.email,
          client_img: value.client_img,
          phone_number: value.phone_number,
          address: value.address,
          extra_details: value.extra_details,
          company_name: value.company_name,
          isActivate: value?.isActivate,
          updatedBy: req.user._id,
          updatedAt: configs.utcDefault()
        },
        { new: true }
      );

      if (!data) {
        return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
      }

      // Get new data after update for logging
      const newClientData = data.toObject ? data.toObject() : data;

      // Log update activity
      try {
        const { logUpdate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
        const userInfo = await getUserInfoForLogging(req.user);
        if (userInfo && oldClientData && newClientData) {
          await logUpdate({
            companyId: userInfo.companyId,
            moduleName: "pmsClients",
            email: userInfo.email,
            createdBy: userInfo._id,
            updatedBy: userInfo._id,
            oldData: oldClientData,
            newData: newClientData,
            additionalData: {
              recordId: oldClientData._id.toString()
            }
          });
        }
      } catch (logError) {
        console.error("Error logging client update activity:", logError);
      }

      return successResponse(
        res,
        statusCode.SUCCESS,
        messages.CLIENT_UPDATED,
        data
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
//Update client status:
exports.updateClientStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      isActivate: Joi.boolean().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (value?.isActivate == false) {
      const projectData = await Project.findOne({
        isDeleted: false,
        pms_clients: req.params.id
      });

      if (projectData) {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          messages.CLIENT_NOT_DEACTIVE
        );
      }
    }

    const data = await PMSClient.findByIdAndUpdate(
      req.params.id,
      {
        isActivate: value.isActivate,
        updatedBy: req.user._id,
        updatedAt: configs.utcDefault()
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.CLIENT_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete clients.. :
exports.deleteClientData = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Check project associated with client ...
    const projectData = await Project.findOne({
      isDeleted: false,
      pms_clients: req.params.id
    });

    if (projectData) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        messages.CLIENT_NOT_DELETED
      );
    }

    // Get client data before deletion for logging
    const clientData = await PMSClient.findById(req.params.id).lean();

    const data = await PMSClient.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault()
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && clientData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "pmsClients",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: clientData,
        additionalData: {
          recordId: clientData._id.toString(),
          isSoftDelete: true
        }
      });
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.CLIENT_DELETED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project assigned client :
exports.getProjectsWiseAssignedClient = async (req, res) => {
  try {
    const query = [
      {
        $match: {
          isDeleted: false,
          _id: new mongoose.Types.ObjectId(req.params.projectId)
        }
      },
      ...(await getClientQuery()),
      {
        $unwind: {
          path: "$pms_clients",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: "$pms_clients._id",
          full_name: "$pms_clients.full_name",
          first_name: "$pms_clients.first_name",
          last_name: "$pms_clients.last_name",
          client_img: "$pms_clients.client_img"
        }
      },
      {
        $sort: {
          first_name: 1
        }
      }
    ];
    const data = await Project.aggregate(query);
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, []);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.updateClientPasswordWithMD5 = async () => {
  try {
    const clients = await PMSClient.find({
      // _id: new mongoose.Types.ObjectId("66602f5cfde706a7f944dd11"),
    }).select("_id full_name plain_password");

    for (let i = 0; i < clients.length; i++) {
      let { _id, full_name, plain_password } = clients[i];
      console.log("client ..  . .. . . . ", i, {
        _id,
        full_name,
        plain_password
      });

      if (plain_password && plain_password !== "") {
        const password = crypto
          .createHash("md5")
          .update(plain_password)
          .digest("hex");

        await PMSClient.updateOne(
          { _id: _id },
          {
            $set: {
              password: password
            }
          }
        );
      }
    }
    console.log("Done...");
    return;
  } catch (e) {
    console.log("Error. ....", e);
  }
};

// Import clients CSV API
exports.addClientsByCsv = async (req, res) => {
  try {
    const {
      _id: decodedUserId,
      pms_role_id: { role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    if (roleName !== config.PMS_ROLES.ADMIN) {
      return errorResponse(res, 401, "Unauthorized");
    }

    if (!req.files || !req.files.attachment || req.files.attachment.length !== 1) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.SINGLE_FILE);
    }

    const fileObj = req.files.attachment[0];
    const fileExt = fileObj.originalname.split(".").pop().toLowerCase();

    if (!["xlsx", "xls", "csv"].includes(fileExt)) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.FILE_EXT);
    }

    const wb = XLSX.read(fileObj.buffer, { type: "buffer", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

    const requiredColumns = ["First Name", "Last Name", "Email", "Password"];
    if (!requiredColumns.every((col) => cols.includes(col))) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.COLUMNS_MISMATCH);
    }

    // Clean data
    rows.forEach((item) => {
      item["First Name"] = item["First Name"].toString().trim();
      item["Last Name"] = item["Last Name"].toString().trim();
      item["Email"] = item["Email"].toString().trim();
      item["Password"] = item["Password"].toString().trim();
      if (item["Company Name"]) item["Company Name"] = item["Company Name"].toString().trim();
      if (item["Phone Number"]) item["Phone Number"] = item["Phone Number"].toString().trim();
    });

    const payloadSchema = Joi.array().items(getAddClientSchemaCSV()).min(1).required();
    const { error, value } = payloadSchema.validate(rows);
    if (error) {
      return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    }

    // Get or create the CLIENT pms role
    let clientRole = await PMSRoles.findOne({ role_name: config.PMS_ROLES.CLIENT, isDeleted: false });
    if (!clientRole) {
      clientRole = await new PMSRoles({
        role_name: config.PMS_ROLES.CLIENT,
        createdBy: decodedUserId,
        updatedBy: decodedUserId
      }).save();
    }

    const insertedClients = [];
    const duplicateClients = [];
    const invalidClients = [];
    const companyObjectId = newObjectId(decodedCompanyId);

    for (const item of value) {
      try {
        if (await isCompanyEmailTaken(companyObjectId, item.Email)) {
          duplicateClients.push({ email: item.Email, reason: "Email already exists in this company" });
          continue;
        }

        const client = new PMSClient({
          companyId: companyObjectId,
          first_name: item["First Name"],
          last_name: item["Last Name"],
          full_name: `${item["First Name"]} ${item["Last Name"]}`,
          email: item.Email,
          phone_number: item["Phone Number"] || "",
          company_name: item["Company Name"] || "",
          password: item.Password,
          plain_password: item.Password,
          pms_role_id: clientRole._id,
          isActivate: true,
          createdBy: decodedUserId,
          updatedBy: decodedUserId
        });

        const saved = await client.save();
        insertedClients.push({ email: saved.email, full_name: saved.full_name });
      } catch (err) {
        invalidClients.push({ email: item.Email, reason: err.message });
      }
    }

    const total = insertedClients.length + duplicateClients.length + invalidClients.length;

    return successResponse(res, 200, "CSV processed successfully", {
      insertedClients,
      duplicateClients,
      invalidClients,
      summary: {
        insertedCount: insertedClients.length,
        duplicateCount: duplicateClients.length,
        invalidCount: invalidClients.length,
        totalProcessed: total
      }
    });
  } catch (error) {
    console.error("Client CSV Upload Error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
