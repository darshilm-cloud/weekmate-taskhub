const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const mongoose = require("mongoose");
const _ = require("lodash");

const ProjectExpanses = require("../models/projectexpanses");
const {
  getRefModelFromLoginUser,
  getCreatedUpdatedDeletedByQuery,
  generateCSV
} = require("../helpers/common");
const { checkUserIsAdmin } = require("./authentication");

const {
  getPagination,
  getTotalCountQuery,
  searchDataArr,
  getAggregationPagination
} = require("../helpers/queryHelper");
const messages = require("../helpers/messages");
const multer = require("multer");
const fs = require("fs");
const configs = require("../configs");

const path = require("path");
const {
  newProjectExpecesMail,
  approveProjectExpecesMail,
  paidProjectExpecesMail
} = require("../template/projectexpanss");
const pmsClients = require("../models/pmsClients");

const uploadPath = "public/projectexpense";
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({
  storage
}).array("projectexpences", 5);

exports.addProjectExpense = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        console.error("File upload error:", err);
        return res.status(400).json({
          status: "error",
          message: err.message
        });
      }

      try {
        const {
          _id: decodedUserId,
          pms_role_id: { _id: roleId, role_name: roleName } = {},
          companyId: decodedCompanyId
        } = req.user || {};

        const allowedRoles = ["PC", "TL", "Admin"];
        const staticEmployeeId = process.env.ACCOUNTANT_ID;

        if (
          !allowedRoles.includes(roleName) &&
          decodedUserId.toString() !== staticEmployeeId
        ) {
          return errorResponse(
            res,
            statusCode.UNAUTHORIZED,
            "You do not have permission to add project expenses."
          );
        }

        const validationSchema = Joi.object({
          project_id: Joi.string().required(),
          purchase_request_details: Joi.string().required(),
          cost_in_usd: Joi.number().required(),
          need_to_bill_customer: Joi.boolean(),
          billing_cycle: Joi.string().optional(),
          is_recuring: Joi.boolean()
        }).unknown(true);

        const { error, value } = validationSchema.validate(req.body);
        if (error) {
          return errorResponse(
            res,
            statusCode.BAD_REQUEST,
            error.details[0].message
          );
        }

        let fileNames = [];
        if (req.files && req.files.length > 0) {
          fileNames = req.files.map((file) => path.basename(file.path));
        }

        let data = new ProjectExpanses({
          companyId: newObjectId(decodedCompanyId),
          project_id: value?.project_id,
          purchase_request_details:
            value?.purchase_request_details.replace(/\n/g, "<br>") || null,
          cost_in_usd: value.cost_in_usd,
          need_to_bill_customer: value.need_to_bill_customer,
          createdBy: req.user._id,
          updatedBy: req.user._id,
          billing_cycle: value?.billing_cycle,
          is_recuring: value?.is_recuring,
          projectexpences: fileNames,
          ...(await getRefModelFromLoginUser(req?.user))
        });

        await data.save();
        let emailDetails = await this.getReviewsDetailsForMail(data._id);
        await newProjectExpecesMail(emailDetails, req?.user, decodedCompanyId);

        return successResponse(
          res,
          statusCode.CREATED,
          messages.PROJECTEXPENSE_CREATED,
          data
        );
      } catch (innerError) {
        return catchBlockErrorResponse(res, innerError.message);
      }
    });
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getProjectExpenses = async (req, res) => {
  try {
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
      project_id: Joi.array().items(Joi.string()).optional(),
      technology: Joi.array().items(Joi.string()).optional(),
      manager_id: Joi.array().items(Joi.string()).optional(),
      acc_manager_id: Joi.array().items(Joi.string()).optional(),
      priority: Joi.string().optional(),
      status: Joi.string().optional(),
      need_to_bill_customer: Joi.string().valid("All", "Yes", "No").optional(),
      createdBy: Joi.array().items(Joi.string()).optional(),
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

    const userId = req.user._id;
    const userRole = roleName;

    const allowedRoles = ["Admin"];
    const restrictedRoles = ["TL", "PC"];

    const hasFullAccess = allowedRoles.includes(userRole);
    const hasLimitedAccess = restrictedRoles.includes(userRole);

    let orFilter = {};

    let matchQuery = {
      isDeleted: false,
      companyId: newObjectId(decodedCompanyId),
      ...(value._id && { _id: new mongoose.Types.ObjectId(value._id) }),
      ...(value.priority && { priority: value.priority }),
      ...(value.status && { status: value.status }),
      ...(value.technology?.length && {
        "technology._id": {
          $in: value.technology.map((s) => new mongoose.Types.ObjectId(s))
        }
      }),
      ...(value.manager_id?.length && {
        "manager._id": {
          $in: value.manager_id.map((s) => new mongoose.Types.ObjectId(s))
        }
      }),
      ...(value.acc_manager_id?.length && {
        "acc_manager._id": {
          $in: value.acc_manager_id.map((s) => new mongoose.Types.ObjectId(s))
        }
      }),
      ...(value.project_id?.length && {
        "project._id": {
          $in: value.project_id.map((s) => new mongoose.Types.ObjectId(s))
        }
      }),
      ...(value.createdBy?.length && {
        createdBy: {
          $in: value.createdBy.map((id) => new mongoose.Types.ObjectId(id))
        }
      }),
    };

    if (value.need_to_bill_customer === "Yes") {
      matchQuery.need_to_bill_customer = true;
    } else if (value.need_to_bill_customer === "No") {
      matchQuery.need_to_bill_customer = false;
    }

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(
          [
            "complaint",
            ...(value.isSearch
              ? []
              : ["manager.full_name", "acc_manager.full_name", "project.title"])
          ],
          value.search
        )
      };
    }

    if (!hasFullAccess) {
      if (hasLimitedAccess) {
        orFilter = {
          $or: [{ createdBy: new mongoose.Types.ObjectId(userId) }]
        };
        matchQuery = { ...matchQuery, ...orFilter };
      }
    }

    const mainQuery = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "projects",
          let: { project_id: "$project_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },

      // ✅ FIX 1: $ifNull added to handle missing/null technology array
      {
        $lookup: {
          from: "projecttechs",
          let: { technology: "$project.technology" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", { $ifNull: ["$$technology", []] }] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "technology"
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { manager: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "employees",
          let: { acc_manager: "$project.acc_manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$acc_manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "acc_manager"
        }
      },
      { $unwind: { path: "$acc_manager", preserveNullAndEmptyArrays: true } },

      ...(!hasFullAccess && !hasLimitedAccess ? [{
        $match: {
          $or: [
            { "manager._id": new mongoose.Types.ObjectId(userId) },
            { "acc_manager._id": new mongoose.Types.ObjectId(userId) },
            { createdBy: new mongoose.Types.ObjectId(userId) },
            { "project.assignees": new mongoose.Types.ObjectId(userId) }
          ]
        }
      }] : []),

      ...(await getCreatedUpdatedDeletedByQuery()),
      {
        $project: {
          _id: 1,
          project: {
            _id: 1,
            title: 1,
            manager: 1,
            acc_manager: 1,
            technology: 1
          },
          manager: { _id: 1, full_name: 1, emp_img: 1 },
          acc_manager: { _id: 1, full_name: 1, emp_img: 1 },
          technology: { _id: 1, project_tech: 1 },
          createdBy: { _id: 1, full_name: 1, emp_img: 1, client_img: 1 },
          project_id: 1,
          purchase_request_details: 1,
          client_name: 1,
          need_to_bill_customer: 1,
          client_nda_sign: 1,
          updatedAt: 1,
          createdAt: 1,
          isDeleted: 1,
          cost_in_usd: 1,
          status: 1,
          projectexpences: 1,
          details: 1,
          billing_cycle: 1,
          is_recuring: 1,
          nature_Of_expense: 1
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await ProjectExpanses.aggregate(countQuery);
    const totalCount = totalCountResult[0]?.count || 0;

    let listQuery = value.isSearch
      ? [...mainQuery, { $sort: pagination.sort }]
      : await getAggregationPagination(mainQuery, pagination);
    let data = await ProjectExpanses.aggregate(listQuery);

    const metaData = !value.isSearch
      ? {
          total: totalCount,
          limit: pagination.limit,
          pageNo: pagination.page,
          totalPages:
            pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
          currentPage: pagination.page
        }
      : {};

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      value._id ? data[0] : data,
      !value._id && metaData
    );
  } catch (error) {
    console.log("🚀 ~ exports.getProjectExpenses ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.updateProjectExpense = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        console.error("File upload error:", err);
        return res.status(400).json({
          status: "error",
          message: err.message
        });
      }

      try {
        const {
          _id: decodedUserId,
          pms_role_id: { _id: roleId, role_name: roleName } = {},
          companyId: decodedCompanyId
        } = req.user || {};

        const staticAccountantId = process.env.ACCOUNTANT_ID?.split(",") || [];
        const userRole = roleName;
        const userId = decodedUserId.toString();

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
          return errorResponse(
            res,
            statusCode.BAD_REQUEST,
            "Invalid expense ID"
          );
        }
        const expenseId = new mongoose.Types.ObjectId(req.params.id);

        const existingExpense = await ProjectExpanses.findById(expenseId);
        if (!existingExpense) {
          return errorResponse(res, statusCode.NOT_FOUND, "Expense not found");
        }

        const isCreator = existingExpense.createdBy.toString() === userId;
        const isAdmin = userRole === "Admin";
        const isAccountant = staticAccountantId.includes(userId);

        const validationSchema = Joi.object({
          project_id: Joi.string().optional(),
          purchase_request_details: Joi.string().optional(),
          cost_in_usd: Joi.number().optional(),
          need_to_bill_customer: Joi.boolean().optional(),
          status: Joi.string()
            .valid("Approved", "Rejected", "Paid", "Pending")
            .optional(),
          details: Joi.string().optional(),
          nature_Of_expense: Joi.string().optional(),
          billing_cycle: Joi.string().optional(),
          is_recuring: Joi.boolean()
        });

        const { error, value } = validationSchema.validate(req.body);
        if (error) {
          return errorResponse(
            res,
            statusCode.BAD_REQUEST,
            error.details[0].message
          );
        }

        let fileNames = existingExpense.projectexpences || [];

        if (req.files && req.files.length > 0) {
          const uploadedFileNames = req.files.map((file) =>
            path.basename(file.path)
          );
          fileNames = [...fileNames, ...uploadedFileNames];
        }

        let updateFields = {
          updatedBy: userId,
          billing_cycle: value?.billing_cycle,
          is_recuring: value?.is_recuring
        };

        if (isAdmin) {
          updateFields = {
            ...value,
            projectexpences: fileNames,
            updatedBy: userId,
            details: value.details
          };
        } else if (isAccountant) {
          if (value.status === "Paid") {
            updateFields.status = value.status;
            updateFields.projectexpences = fileNames;
            updateFields.details = value.details;
            updateFields.nature_Of_expense = value.nature_Of_expense;
          } else {
            return errorResponse(
              res,
              statusCode.FORBIDDEN,
              "Accountants can only update status to Paid"
            );
          }
        } else if (isCreator) {
          const { status, ...otherFields } = value;
          updateFields = { ...otherFields, updatedBy: userId };
        } else {
          return errorResponse(
            res,
            statusCode.FORBIDDEN,
            "You do not have permission to update this expense"
          );
        }

        const oldExpenseData = existingExpense.toObject
          ? existingExpense.toObject()
          : existingExpense;

        const updatedExpense = await ProjectExpanses.findByIdAndUpdate(
          expenseId,
          updateFields,
          { new: true }
        );

        if (!updatedExpense) {
          return errorResponse(
            res,
            statusCode.BAD_REQUEST,
            "Failed to update expense"
          );
        }

        const newExpenseData = updatedExpense.toObject
          ? updatedExpense.toObject()
          : updatedExpense;

        try {
          const {
            logUpdate,
            getUserInfoForLogging
          } = require("../helpers/activityLoggerHelper");
          const userInfo = await getUserInfoForLogging(req.user);
          if (userInfo && oldExpenseData && newExpenseData) {
            await logUpdate({
              companyId: userInfo.companyId,
              moduleName: "projectexpanses",
              email: userInfo.email,
              createdBy: userInfo._id,
              updatedBy: userInfo._id,
              oldData: oldExpenseData,
              newData: newExpenseData,
              additionalData: {
                recordId: oldExpenseData._id.toString(),
                project_id: oldExpenseData.project_id?.toString()
              }
            });
          }
        } catch (logError) {
          console.error("Error logging expense update activity:", logError);
        }

        if (value.status && ["Approved"].includes(value.status)) {
          let emailDetails = await this.getReviewsDetailsForMail(
            updatedExpense._id
          );
          await approveProjectExpecesMail(
            emailDetails,
            req.user,
            decodedCompanyId
          );
        }
        if (value.status && ["Paid"].includes(value.status)) {
          let emailDetails = await this.getReviewsDetailsForMail(
            updatedExpense._id
          );
          await paidProjectExpecesMail(
            emailDetails,
            req.user,
            decodedCompanyId
          );
        }

        return successResponse(
          res,
          statusCode.SUCCESS,
          messages.PROJECTEXPENSE_UPDATED,
          updatedExpense
        );
      } catch (error) {
        console.error("Error in updateProjectExpense:", error);
        return catchBlockErrorResponse(res, error.message);
      }
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return catchBlockErrorResponse(res, "An unexpected error occurred");
  }
};

exports.deleteProjectExpense = async (req, res) => {
  try {
    const {
      logDelete,
      getUserInfoForLogging
    } = require("../helpers/activityLoggerHelper");

    const staticAccountantId = process.env.ACCOUNTANT_ID || null;
    const userRole = req.user.pms_role_id.role_name;
    const userId = req.user._id.toString();

    const existingExpense = await ProjectExpanses.findById(
      req.params.id
    ).lean();
    if (!existingExpense) {
      return errorResponse(res, statusCode.NOT_FOUND, "Expense not found");
    }

    const isCreator = existingExpense.createdBy.toString() === userId;
    const isAllowedRole = ["Admin"].includes(userRole);
    const isAccountant = staticAccountantId !== null && userId === staticAccountantId;

    if (!isAllowedRole && !isCreator && !isAccountant) {
      return errorResponse(
        res,
        statusCode.FORBIDDEN,
        messages.PROJECTEXPENSE_DELETED_DENIED
      );
    }

    const expenseModel = await ProjectExpanses.findById(req.params.id);
    expenseModel.isDeleted = true;
    expenseModel.deletedBy = req.user._id;
    expenseModel.deletedAt = configs.utcDefault();
    expenseModel.updatedBy = userId;
    await expenseModel.save();

    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && existingExpense) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "projectexpanses",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: existingExpense,
        additionalData: {
          recordId: existingExpense._id.toString(),
          project_id: existingExpense.project_id?.toString(),
          isSoftDelete: true
        }
      });
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.PROJECTEXPENSE_DELETED,
      expenseModel
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getReviewsDetailsForMail = async (reviewId) => {
  try {
    const mainQuery = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(reviewId)
        }
      },
      {
        $lookup: {
          from: "projects",
          let: { project_id: "$project_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },

      // ✅ FIX 2: $ifNull added to handle missing/null technology array
      {
        $lookup: {
          from: "projecttechs",
          let: { technology: "$project.technology" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", { $ifNull: ["$$technology", []] }] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "technology"
        }
      },
      {
        $unwind: {
          path: "$technology",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { manager: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { acc_manager: "$project.acc_manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$acc_manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "acc_manager"
        }
      },
      {
        $unwind: {
          path: "$acc_manager",
          preserveNullAndEmptyArrays: true
        }
      },
      ...(await getCreatedUpdatedDeletedByQuery()),
      {
        $project: {
          _id: 1,
          project: {
            _id: 1,
            title: 1,
            manager: 1,
            acc_manager: 1,
            technology: 1
          },
          manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1
          },
          acc_manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1
          },
          technology: {
            _id: 1,
            project_tech: 1
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
            email: 1
          },
          updatedBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
            email: 1
          },
          project_id: 1,
          client_name: 1,
          need_to_bill_customer: 1,
          purchase_request_details: 1,
          cost_in_usd: 1,
          updatedAt: 1,
          createdAt: 1,
          billing_cycle: 1,
          is_recuring: 1
        }
      }
    ];

    const data = await ProjectExpanses.aggregate(mainQuery);
    return data[0];
  } catch (error) {
    console.log("🚀 ~ exports.getReviewsDetailsForMail= ~ error:", error);
  }
};

exports.exportProjectExpenses = async (req, res) => {
  try {
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    let result = [];
    const validationSchema = Joi.object({
      isExport: Joi.boolean().default(false),
      exportFileType: Joi.string()
        .optional()
        .valid("csv", "xlsx")
        .insensitive()
        .default("csv")
    });

    const { error, value } = validationSchema.validate(req.body);

    const userRole = roleName;

    const allowedRoles = ["Admin"];
    const restrictedRoles = ["TL", "PC"];

    const hasFullAccess = allowedRoles.includes(userRole);
    const hasLimitedAccess = restrictedRoles.includes(userRole);

    let orFilter = {};
    let matchQuery = {
      isDeleted: false,
      companyId: newObjectId(decodedCompanyId)
    };

    if (!hasFullAccess) {
      if (hasLimitedAccess) {
        orFilter = {
          $or: [{ createdBy: newObjectId(decodedUserId) }]
        };
      }
    }

    matchQuery = { ...matchQuery, ...orFilter };

    const data = await ProjectExpanses.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "projects",
          localField: "project_id",
          foreignField: "_id",
          as: "projectDetails"
        }
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdDetails"
        }
      },
      {
        $unwind: {
          path: "$createdDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          projectName: "$projectDetails.title",
          cost: "$cost_in_usd",
          need_to_bill_customer: "$need_to_bill_customer",
          CreatedBy: "$createdDetails.full_name",
          createdAt: "$createdAt",
          status: "$status",
          billing_cycle: "$billing_cycle",
          purchase_request_details: "$purchase_request_details",
          details: "$details",
          nature_Of_expense: "$nature_Of_expense"
        }
      },
      { $sort: { createdAt: -1 } }
    ]).exec();

    if (data.length === 0) {
      return errorResponse(res, statusCode.NOT_FOUND, "No data found");
    }

    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      result.push({
        "Project Name": item?.projectName,
        "Cost in USD": `$ ${item.cost}`,
        "Need To Bill Customer": item.need_to_bill_customer ? "Yes" : "No",
        Creator: item?.CreatedBy,
        "Creation Date": moment(item.createdAt).format("DD, MMM, YYYY"),
        Status: item?.status,
        "Blling Cycle": item?.billing_cycle ? item?.billing_cycle : "-",
        "Purchase Request Details": item?.purchase_request_details
          ? item?.purchase_request_details.replace(/<br\s*\/?>/g, "\n")
          : "-",
        Details: item?.details,
        "Nature Of Expense": item?.nature_Of_expense
          ? item?.nature_Of_expense
          : "-"
      });
    }

    const csvFields = [
      "Project Name",
      "Cost in USD",
      "Need To Bill Customer",
      "Creator",
      "Creation Date",
      "Status",
      "Blling Cycle",
      "Purchase Request Details",
      "Details",
      "Nature Of Expense"
    ];

    const exportFileTypeLower = _.toLower(value.exportFileType);

    if (exportFileTypeLower === "csv") {
      result = await generateCSV(result, csvFields);
    }

    return res.status(200).json({
      status: "success",
      message: "Project Expenses exported successfully",
      data: result
    });
  } catch (error) {
    console.log("🚀 ~ exports.exportPMSClientData= ~ error:", error);
  }
};