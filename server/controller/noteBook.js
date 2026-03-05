const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const NoteBook = mongoose.model("notebook");
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
  checkLoginUserIsProjectManager,
  checkLoginUserIsProjectAccountManager
} = require("./projectMainTask");
const { checkUserIsAdmin } = require("./authentication");

// Check is exists..
exports.projectNoteBookExists = async (reqData, id = null) => {
  try {
    let isExist = false;

    const data = await NoteBook.aggregate([
      {
        $match: {
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
          titleLower: reqData?.title.trim().toLowerCase() // Match the lowercase title
        }
      }
    ]);
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectNoteBookExists= ~ error:", error);
  }
};

//AddNote Books :
exports.addNoteBook = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      isPinned: Joi.object({
        value: Joi.boolean().optional()
      }).optional(),
      project_id: Joi.string().allow("").optional()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (await this.projectNoteBookExists(value)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let data = new NoteBook({
        title: value.title,
        project_id: value.project_id,
        createdBy: req.user._id,
        updatedBy: req.user._id
      });

      if (value.isPinned && value.isPinned.value !== undefined) {
        data.isPinned = {
          value: value.isPinned.value,
          date: configs.utcDefault()
        };
      }

      await data.save();
      return successResponse(res, statusCode.CREATED, messages.CREATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//GetNote Books :
exports.getNoteBook = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      project_id: Joi.string().required(),
      _id: Joi.string().optional(),
      project_id: Joi.string().required()
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

    pagination.sort = {
      "isPinned.value": -1,
      "isPinned.date": -1
    };

    let matchQuery = {
      isDeleted: false,
      ...(value.project_id
        ? { project_id: new mongoose.Types.ObjectId(value.project_id) }
        : {}),
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {})
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["title", "isTop"], value.search)
      };
    }

    let noteQuery = [
      { $eq: ["$noteBook_id", "$$noteBookId"] },
      { $eq: ["$isDeleted", false] }
    ];

    const [isAdmin, isManager, isAccManager] = await Promise.all([
      checkUserIsAdmin(req.user._id),
      checkLoginUserIsProjectManager(value.project_id, req.user._id),
      checkLoginUserIsProjectAccountManager(value.project_id, req.user._id)
    ]);

    if (!isManager && !isAdmin && !isAccManager) {
      noteQuery = [
        ...noteQuery,
        {
          $or: [
            {
              $eq: ["$createdBy", new mongoose.Types.ObjectId(req.user._id)]
            },
            {
              $in: [new mongoose.Types.ObjectId(req.user._id), "$subscribers"]
            },
            {
              $in: [new mongoose.Types.ObjectId(req.user._id), "$pms_clients"]
            }
          ]
        }
      ];
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
          from: "notes_pms",
          let: { noteBookId: "$_id", pms_clients: "$project.pms_clients" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: noteQuery
                }
              }
            }
          ],
          as: "notes"
        }
      },

      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          project: {
            _id: 1,
            title: 1
          },
          isPinned: {
            value: 1,
            date: 1
          },
          // notes :1,
          total_notes: { $size: "$notes" }
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await NoteBook.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await NoteBook.aggregate([
      ...mainQuery,
      { $sort: pagination.sort }
    ]);

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
    return catchBlockErrorResponse(res, error.message);
  }
};

//GetNote Details Books :
exports.getNoteBookdetails = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      notebook_id: Joi.string().required(),
      project_id: Joi.string().required(),
      subscribers: Joi.array().optional()
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
      ...(value.project_id
        ? { project_id: new mongoose.Types.ObjectId(value.project_id) }
        : {}),
      ...(value.notebook_id
        ? { _id: new mongoose.Types.ObjectId(value.notebook_id) }
        : {})
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["title", "isTop"], value.search)
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
          from: "notes_pms",
          localField: "_id",
          foreignField: "noteBook_id",
          as: "Notes",
          let: { noteId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$noteBook_id", "$$noteId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ]
        }
      },
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          project: {
            _id: 1,
            title: 1
          },
          isPinned: {
            value: 1,
            date: 1
          },
          Notes: {
            _id: 1,
            title: 1,
            color: 1,
            project_id: 1,
            notesInfo: 1,
            subscribers: 1
          }
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await NoteBook.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await NoteBook.aggregate([
      ...mainQuery,
      { $sort: pagination.sort }
    ]);

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
    return catchBlockErrorResponse(res, error.message);
  }
};

//UpdateNote Books :
exports.updateNoteBook = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      isPinned: Joi.object({
        value: Joi.boolean().optional()
      }).optional()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (await this.projectNoteBookExists(value, req.params.id)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      const updateData = {
        title: value.title
      };
      if (value.isPinned) {
        updateData.isPinned = {
          value: value.isPinned.value,
          date: configs.utcDefault()
        };
      }
      const data = await NoteBook.findByIdAndUpdate(req.params.id, updateData, {
        new: true
      });
      if (!data) {
        return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
      }

      return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
//UpdateNote Books Pin to Top:
// exports.updateNoteBookPin = async (req, res) => {
//     try {
//         const validationSchema = Joi.object({
//             isPinned: Joi.object({
//                 value: Joi.boolean().optional(),
//             }).required()
//         });
//         const { error, value } = validationSchema.validate(req.body);
//         if (error) {
//             return errorResponse(
//                 res,
//                 statusCode.BAD_REQUEST,
//                 error.details[0].message
//             );
//         }

//         const data = await NoteBook.findByIdAndUpdate(
//             req.params.id,
//             {
//                 isPinned: {
//                     value: value.isPinned.value,
//                     date: configs.utcDefault()
//                 }
//             },
//             { new: true }
//         );

//         if (!data) {
//             return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
//         }

//         return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);

//     } catch (error) {
//         return catchBlockErrorResponse(res, error.message);
//     }
// };
//UpdateNote Books BookMark:
exports.updateNoteBookbookmark = async (req, res) => {
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
    const data = await NoteBook.findByIdAndUpdate(
      req.params.id,
      {
        isBookmark: value.isBookmark
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }

    return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
//Soft DeleteNote Books :
exports.deleteNoteBook = async (req, res) => {
  try {
    const data = await NoteBook.findByIdAndUpdate(
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

    return successResponse(res, statusCode.SUCCESS, messages.DELETED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
