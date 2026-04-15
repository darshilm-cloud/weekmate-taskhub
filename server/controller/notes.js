const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const Notes = mongoose.model("notes_pms");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr,
  getAggregationPagination
} = require("../helpers/queryHelper");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const { noteSubscribersMail } = require("./sendEmail");
const {
  getArrayChanges,
  getClientQuery,
  getRefModelFromLoginUser
} = require("../helpers/common");
const {
  checkLoginUserIsProjectManager,
  checkLoginUserIsProjectAccountManager
} = require("./projectMainTask");
const { checkUserIsAdmin } = require("./authentication");
const { checkIsPMSClient } = require("./PMSRoles");

// Check is exists..
exports.projectNoteExists = async (reqData, id = null) => {
  try {
    let isExist = false;
    // const data = await Notes.findOne({
    //   isDeleted: false,
    //   // title: reqData?.title?.trim()?.toLowerCase(),
    //   title: { $regex: new RegExp(`^${reqData?.title}$`, "i") },
    //   project_id: new mongoose.Types.ObjectId(reqData.project_id),
    //   noteBook_id: new mongoose.Types.ObjectId(reqData.noteBook_id),
    //   ...(id
    //     ? {
    //         _id: { $ne: id },
    //       }
    //     : {}),
    // });
    // if (data) isExist = true;

    const data = await Notes.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(reqData?.companyId),
          project_id: new mongoose.Types.ObjectId(reqData?.project_id),
          isDeleted: false,
          ...(id
            ? {
                _id: { $ne: new mongoose.Types.ObjectId(id) }
              }
            : {})
        }
      },
      {
        $addFields: {
          titleLower: { $toLower: "$title" } // Add a temporary field with lowercase title
        }
      },
      {
        $match: {
          titleLower: reqData?.title?.trim().toLowerCase() // Match the lowercase title
        }
      }
    ]);
    console.log("🚀 ~ exports.projectNoteExists= ~ data:", data);
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectNoteExists= ~ error:", error);
  }
};

//Add Project Notes :
exports.addNotes = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      title: Joi.string().required(),
      notesInfo: Joi.string().optional().allow(""),
      color: Joi.string().allow("").optional(),
      isPrivate: Joi.boolean().optional().default(false),
      project_id: Joi.string().required(),
      noteBook_id: Joi.string().allow("", null).optional(),
      subscribers: Joi.array().allow("").optional(),
      pms_clients: Joi.array().optional().default([])
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (await this.projectNoteExists({ ...value, companyId: decodedCompanyId })) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let data = new Notes({
        companyId: decodedCompanyId,
        title: value.title,
        notesInfo: value.notesInfo,
        project_id: value.project_id,
        ...(value.noteBook_id ? { noteBook_id: value.noteBook_id } : {}),
        isPrivate: value.isPrivate,
        color: value.color,
        subscribers: value.subscribers || [],
        pms_clients: value.pms_clients || [],
        createdBy: req.user._id,
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user))
      });
      await data.save();

      // send mail to note subscribers..
      if (
        (value?.subscribers && value?.subscribers.length > 0) ||
        (value?.pms_clients && value?.pms_clients.length > 0)
      ) {
        await noteSubscribersMail(data._id, [], [], decodedCompanyId);
      }
      return successResponse(
        res,
        statusCode.CREATED,
        messages.NOTE_CREATED,
        data
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project Notes :
exports.getNotes = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional().allow(""),
      project_id: Joi.string().optional().allow(""),
      notebook_id: Joi.string().optional().default(null),
      subscribers: Joi.array().optional(),
      isBookmark: Joi.boolean().optional(),
      tab: Joi.string().valid("all", "created", "shared").default("all")
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

    const [isAdmin, isManager, isAccManager] = await Promise.all([
      checkUserIsAdmin(req.user._id),
      value.project_id ? checkLoginUserIsProjectManager(value.project_id, req.user._id) : Promise.resolve(false),
      value.project_id ? checkLoginUserIsProjectAccountManager(value.project_id, req.user._id) : Promise.resolve(false)
    ]);

    const { companyId: decodedCompanyId, _id: currentUserId } = req.user;
    const currentUserIdObj = new mongoose.Types.ObjectId(currentUserId);

    let matchQuery = {
      $or: [
        { companyId: new mongoose.Types.ObjectId(decodedCompanyId) },
        { companyId: { $exists: false } }
      ],
      isDeleted: false,
    };

    // Permission Match: Regular users only see notes they have access to
    if (!isAdmin && !isManager && !isAccManager) {
      matchQuery = {
        ...matchQuery,
        $or: [
          { createdBy: currentUserIdObj },
          { subscribers: currentUserIdObj },
          { pms_clients: currentUserIdObj },
          { subscribers: { $size: 0 } } // Public/unassigned notes (if applicable)
        ]
      };
    }

    // Tab Filtering
    if (value.tab === "created") {
      matchQuery.createdBy = currentUserIdObj;
    } else if (value.tab === "shared") {
      matchQuery = {
        ...matchQuery,
        $and: [
          {
            $or: [
              { subscribers: currentUserIdObj },
              { pms_clients: currentUserIdObj }
            ]
          },
          { createdBy: { $ne: currentUserIdObj } }
        ]
      };
    }

    // Other filters
    if (value.notebook_id) matchQuery.noteBook_id = new mongoose.Types.ObjectId(value.notebook_id);
    if (value.project_id) matchQuery.project_id = new mongoose.Types.ObjectId(value.project_id);
    if (value._id) matchQuery._id = new mongoose.Types.ObjectId(value._id);
    if (value.isBookmark !== undefined) matchQuery.isBookmark = value.isBookmark;

    if (value.subscribers && value.subscribers.length > 0) {
      if (value.subscribers.includes("unassigned")) {
        matchQuery.subscribers = { $eq: [] };
      } else if (!value.subscribers.includes("all")) {
        matchQuery.subscribers = {
          $in: value.subscribers.map((s) => new mongoose.Types.ObjectId(s))
        };
      }
    }

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["title"], value.search)
      };
    }

    const mainQuery = [
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
      {
        $lookup: {
          from: "notebooks",
          let: { noteBook_id: "$noteBook_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$noteBook_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "nbook"
        }
      },
      {
        $unwind: {
          path: "$nbook",
          preserveNullAndEmptyArrays: true
        }
      },
      { $match: matchQuery },
      {
        $lookup: {
          from: "employees",
          let: { subscribers: "$subscribers" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$subscribers"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            },
            {
              $project: {
                _id: "$_id",
                full_name: "$full_name",
                email: "$email",
                emp_img: "$emp_img"
              }
            }
          ],
          as: "subscriberDetails"
        }
      },
      ...(await getClientQuery()),
      {
        $addFields: {
          ...(await getClientQuery(true))
        }
      },
      // { $sort: { isPrivate: -1, _id: -1 } },
      {
        $project: {
          _id: 1,
          title: 1,
          notesInfo: 1,
          color: 1,
          isBookmark: 1,
          createdAt: 1,
          createdBy: 1,
          subscribers: "$subscriberDetails",
          ...(await getClientQuery(true)),
          client_sub: {
            $concatArrays: ["$subscriberDetails", "$pms_clients"]
          },
          project: {
            _id: 1,
            title: 1
          },
          notebook: {
            _id: "$nbook._id",
            title: "$nbook.title"
          },
          isPrivate: 1
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await Notes.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await Notes.aggregate(listQuery);

    data.filter((ele) => {
      if (
        ele.createdBy == req.user?._id ||
        isAdmin ||
        isManager ||
        isAccManager
      ) {
        ele.isDeletable = true;
        ele.isEditable = true;
      } else {
        ele.isDeletable = false;
        ele.isEditable = false;
      }
    });

    const metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page
    };

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      value._id ? data[0] : data,
      !value._id && metaData
    );
  } catch (error) {
    console.log("🚀 ~ exports.getNotes= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Project Notes :
exports.updateNotes = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      notebook_id: Joi.string().optional().default(null),
      title: Joi.string().optional(),
      notesInfo: Joi.string().optional().allow(""),
      color: Joi.string().optional(),
      subscribers: Joi.array().optional(),
      pms_clients: Joi.array().default([]),
      isPrivate: Joi.boolean().optional(),
      project_id: Joi.optional()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (await this.projectNoteExists(value, req.params.id)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      const getData = await Notes.findById(req.params.id);
      const data = await Notes.findByIdAndUpdate(
        req.params.id,
        {
          noteBook_id: value.notebook_id,
          title: value.title,
          notesInfo: value.notesInfo,
          color: value.color,
          subscribers: value.subscribers || [],
          pms_clients: value.pms_clients || [],
          isPrivate: value.isPrivate || false,
          updatedBy: req?.user?._id,
          updatedAt: configs.utcDefault(),
          ...(await getRefModelFromLoginUser(req?.user, true))
        },
        { new: true }
      );

      if (!data) {
        return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
      }
      // For send mail for new added subscribers..
      const subscribersData = getArrayChanges(
        getData.subscribers.map((a) => a.toString()),
        value.subscribers
      );

      const clientsData = getArrayChanges(
        getData.pms_clients.map((a) => a.toString()),
        value.pms_clients
      );

      if (
        (subscribersData.added && subscribersData.added.length > 0) ||
        (clientsData.added && clientsData.added.length > 0)
      ) {
        await noteSubscribersMail(
          req.params.id,
          subscribersData.added,
          clientsData.added,
          decodedCompanyId
        );
      }
      return successResponse(
        res,
        statusCode.SUCCESS,
        messages.NOTE_UPDATED,
        data
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
//UpdateNote  BookMark:
exports.updateNotesbookmark = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      isBookmark: Joi.boolean().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const data = await Notes.findByIdAndUpdate(
      req.params.id,
      {
        isBookmark: value.isBookmark,
        updatedBy: req?.user?._id,
        updatedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, true))
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.NOTE_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project Notes :
exports.deleteNotes = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Get the note data before deletion for logging
    const noteData = await Notes.findById(req.params.id).lean();
    
    const data = await Notes.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, false, true))
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && noteData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "notes",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: noteData,
        additionalData: {
          recordId: noteData._id.toString(),
          isSoftDelete: true
        }
      });
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.NOTE_DELETED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
