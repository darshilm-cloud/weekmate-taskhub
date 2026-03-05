const mongoose = require('mongoose');
const NotesCommentsModel = mongoose.model("NotesComments");
const NoteModel = mongoose.model("notes_pms");
const configs = require("../configs");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const Joi = require("joi");
const { filesManageInDB } = require("./fileUploads");
const { sendmailNoteComments } = require("./sendEmail");
const {
  getRefModelFromLoginUser,
  getCreatedUpdatedDeletedByQuery,
} = require("../helpers/common");

exports.addComment = async (req, res, next) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};
    
    const validationSchema = Joi.object({
      comment: Joi.allow("").optional().default(""),
      note_id: Joi.any(),
      attachments: Joi.any().optional(),
      taggedUsers: Joi.any().optional().default([]),
      folder_id: Joi.string().optional().default(null),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (
      value?.attachments &&
      value.attachments.length > 0 &&
      !value.folder_id
    ) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        messages.FOLDER_REQUIRED
      );
    }

    const noteDetails = await NoteModel.findById(value.note_id);
    let data = new NotesCommentsModel({
      comment: value.comment,
      note_id: value.note_id ? value.note_id : null,
      //   attachments: value.attachments,
      employee_id: req.user._id,
      taggedUsers: value.taggedUsers,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user)),
    });

    const newData = await data.save();
    // await sendmailForTask(newData._id);

    // save  files,..
    if (value?.attachments && value.attachments.length > 0) {
      await filesManageInDB(
        value.attachments,
        req.user,
        noteDetails?.project_id,
        value.folder_id,
        null,
        null,
        newData._id
      );
    }
    // Mail for new comments add in task..
    await sendmailNoteComments(newData._id,decodedCompanyId);

    return successResponse(res, statusCode.CREATED, messages.CREATED, data);
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.CommentsList = async (req, res, next) => {
  try {
    const validationSchema = Joi.object({
      pageNum: Joi.number().default(1),
      pageLimit: Joi.number().default(10),
      note_id: Joi.any(),
      comment_id: Joi.any(),
    });
    const { error, value } = validationSchema.validate(req.body);

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const pageNum = value.pageNum;
    const limit = value.pageLimit;

    let matchQuery = {
      isDeleted: false,
      ...(value.note_id
        ? { note_id: new mongoose.Types.ObjectId(value.note_id) }
        : {}),
    };
    let queryDoc = [
      // {
      //   $lookup: {
      //     from: "employees",
      //     let: { employee_id: "$employee_id" },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $and: [
      //               { $eq: ["$_id", "$$employee_id"] },
      //               // { $eq: ["$isDeleted", false] },
      //               // { $eq: ["$isSoftDeleted", false] },
      //               // { $eq: ["$isActivate", true] },
      //             ],
      //           },
      //         },
      //       },
      //     ],
      //     as: "employees",
      //   },
      // },
      ...(await getCreatedUpdatedDeletedByQuery()),
      {
        $lookup: {
          from: "employees",
          localField: "status_history.updatedBy",
          foreignField: "_id",
          as: "historyupdatedBy",
        },
      },
      {
        $match: matchQuery,
      },
      {
        $lookup: {
          from: "fileuploads",
          let: { comment_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$comments_id", "$$comment_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "attachments",
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { taggedUsers: "$taggedUsers" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$taggedUsers"] },
                    // { $eq: ["$isDeleted", false] },
                    // { $eq: ["$isSoftDeleted", false] },
                    // { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "taggedUsers",
        },
      },
      {
        $project: {
          _id: "$_id",
          comment: { $ifNull: ["$comment", ""] },
          sender: { $ifNull: ["$createdBy.full_name", ""] },
          sender_id: { $ifNull: ["$createdBy._id", ""] },
          profile_pic: { $ifNull: ["$createdBy.emp_img", ""] },
          // employee_id: 1,
          // sender: { $ifNull: [{ $first: "$employees.full_name" }, ""] },
          // sender_id: { $ifNull: [{ $first: "$employees._id" }, ""] },
          // profile_pic: { $ifNull: [{ $first: "$employees.emp_img" }, ""] },
          createdAt: 1,
          isResolve: 1,
          attachments: {
            $map: {
              input: "$attachments",
              as: "attachment",
              in: {
                _id: "$$attachment._id",
                name: "$$attachment.name",
                file_type: "$$attachment.file_type",
                path: "$$attachment.path",
              },
            },
          },
          isResolve: 1,
          status_history: {
            isResolve: 1,
            updatedBy: { $first: "$historyupdatedBy.full_name" },
            updatedAt: 1,
          },
          taggedUsers: {
            $map: {
              input: {
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$taggedUsers" },
                      { $ne: ["$taggedUsers", []] },
                    ],
                  },
                  then: "$taggedUsers",
                  else: [],
                },
              },
              as: "taggedUsers",
              in: {
                _id: "$$taggedUsers._id",
                emp_img: "$$taggedUsers.emp_img",
                name: "$$taggedUsers.full_name",
              },
            },
          },
        },
      },
    ];
    const data = await NotesCommentsModel.aggregate(queryDoc).exec();
    return successResponse(res, statusCode.SUCCESS, messages.SUCCESS, data);
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.historyComments = async (req, res, next) => {
  try {
    const validationSchema = Joi.object({
      pageNum: Joi.number().default(1),
      pageLimit: Joi.number().default(10),
      comment_id: Joi.required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const pageNum = value.pageNum;
    const limit = value.pageLimit;
    let matchQuery = {
      isDeleted: false,
      ...(value.comment_id
        ? { _id: new mongoose.Types.ObjectId(value.comment_id) }
        : {}),
    };
    let queryDoc = [
      {
        $lookup: {
          from: "fileuploads",
          let: { comments_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$comments_id", "$$comments_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "attachments",
        },
      },
      {
        $match: matchQuery,
      },
      {
        $project: {
          _id: 1,
          comment: { $ifNull: ["$comment", ""] },
          taggedUsers: 1,
          attachments: {
            $map: {
              input: "$attachments",
              as: "attachment",
              in: {
                _id: "$$attachment._id",
                name: "$$attachment.name",
                file_type: "$$attachment.file_type",
                path: "$$attachment.path",
              },
            },
          },
        },
      },
    ];
    const data = await NotesCommentsModel.aggregate(queryDoc).exec();
    return successResponse(res, statusCode.SUCCESS, messages.SUCCESS, data[0]);
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.editComment = async (req, res, next) => {
  try {
    const validationSchema = Joi.object({
      note_id: Joi.string().required(),
      comment: Joi.allow("").optional().default(""),
      attachments: Joi.any().optional(),
      folder_id: Joi.any().optional(),
      taggedUsers: Joi.array().optional().default([]),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    // if (
    //   value?.attachments &&
    //   value.attachments.length > 0 &&
    //   !value.folder_id
    // ) {
    //   console.log("111111")
    //   return errorResponse(
    //     res,
    //     statusCode.BAD_REQUEST,
    //     messages.FOLDER_REQUIRED
    //   );
    // }

    const getData = await NotesCommentsModel.findById(
      new mongoose.Types.ObjectId(req.params.id)
    );

    // Get old data before update for logging
    const oldCommentData = getData.toObject ? getData.toObject() : getData;

    const updatedData = await NotesCommentsModel.findByIdAndUpdate(
      req.params.id,
      {
        comment: value.comment,
        // taggedUsers :value.taggedUsers,
        taggedUsers: [
          ...(value.comment.includes("@") ? getData.taggedUsers : []),
          ...(value.taggedUsers.length > 0
            ? value.taggedUsers.map((t) => new mongoose.Types.ObjectId(t))
            : []),
        ],
        updatedAt: configs.utcDefault(),
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user, true)),
      },
      { new: true }
    );
    const noteDetails = await NoteModel.findById(updatedData.note_id);
    await filesManageInDB(
      value.attachments,
      req.user,
      noteDetails.project_id,
      value.folder_id,
      null,
      null,
      updatedData._id
    );

    // Get new data after update for logging
    const newCommentData = updatedData.toObject ? updatedData.toObject() : updatedData;

    // Log update activity
    try {
      const { logUpdate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
      const userInfo = await getUserInfoForLogging(req.user);
      if (userInfo && oldCommentData && newCommentData) {
        await logUpdate({
          companyId: userInfo.companyId,
          moduleName: "notesComments",
          email: userInfo.email,
          createdBy: userInfo._id,
          updatedBy: userInfo._id,
          oldData: oldCommentData,
          newData: newCommentData,
          additionalData: {
            recordId: oldCommentData._id.toString()
          }
        });
      }
    } catch (logError) {
      console.error("Error logging notes comment update activity:", logError);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.UPDATED,
      updatedData
    );
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.editCommentResolve = async (req, res, next) => {
  try {
    const validationSchema = Joi.object({
      isResolve: Joi.boolean().optional().default(false),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    // if (value.isResolve) {
    const new_data = await NotesCommentsModel.findByIdAndUpdate(
      req.params.id,
      {
        isResolve: value.isResolve,
        updated_At: configs.utcDefault(),
        updatedBy: req.user._id,
        $push: {
          status_history: {
            isResolve: value.isResolve,
            updatedAt: configs.utcDefault(),
            updatedBy: req.user._id,
          },
        },
      },
      { new: true }
    );

    // }

    if (new_data) {
      return successResponse(
        res,
        statusCode.CREATED,
        messages.UPDATED,
        new_data
      );
    }
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Get comment data before deletion for logging
    const commentData = await NotesCommentsModel.findById(req.params.id).lean();
    
    const deletecomment_id = await NotesCommentsModel.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: configs.utcDefault(),
        deletedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user, false, true)),
      },
      { new: true }
    ).exec();
    const data = await NotesCommentsModel.findByIdAndUpdate(
      req.params.id
    ).exec();
    
    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && commentData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "notesComments",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: commentData,
        additionalData: {
          recordId: commentData._id.toString(),
          note_id: commentData.note_id?.toString(),
          isSoftDelete: true
        }
      });
    }
    
    if (data && deletecomment_id) {
      return successResponse(res, statusCode.CREATED, messages.DELETED, data);
    } else {
      return successResponse(res, statusCode.SUCCESS, messages.DELETED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

