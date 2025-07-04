const mongoose = require("mongoose");
const CommentsModel = mongoose.model("bugscomments");
const ProjectBugModel = mongoose.model("projecttaskbugs");
const configs = require("../configs");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const { sendmailForNewBugComments } = require("./sendEmail");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const Joi = require("joi");
const { filesManageInDB } = require("./fileUploads");
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
      comment: Joi.string().optional().allow(""),
      bug_id: Joi.string().required(),
      attachments: Joi.array().optional().default([]),
      taggedUsers: Joi.array().optional().default([]),
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

    let data = new CommentsModel({
      comment: value.comment,
      bug_id: value.bug_id,
      attachments: value.attachments,
      taggedUsers: value.taggedUsers,
      employee_id: req.user._id,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user)),
    });

    const newData = await data.save();

    // save  files,..
    if (value?.attachments && value.attachments.length > 0) {
      // get project id..
      const details = value.bug_id
        ? await ProjectBugModel.findById(
            new mongoose.Types.ObjectId(value.bug_id)
          )
        : {};

      await filesManageInDB(
        value.attachments,
        req.user,
        details?.project_id,
        value?.folder_id,
        null,
        null,
        newData._id
      );
    }
    // Mail for new comments add in bug..
    await sendmailForNewBugComments(newData._id, decodedCompanyId);

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
      bug_id: Joi.string().required(),
      comment_id: Joi.string().optional(),
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
    };
    if (value.bug_id) {
      matchQuery.bug_id = new mongoose.Types.ObjectId(value.bug_id);
    } else if (value.comment_id) {
      matchQuery.comment_id = new mongoose.Types.ObjectId(value.comment_id);
    }

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
      //               { $eq: ["$isDeleted", false] },
      //               { $eq: ["$isSoftDeleted", false] },
      //               { $eq: ["$isActivate", true] },
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
        $lookup: {
          from: "employees",
          let: { taggedUsersIds: "$taggedUsers" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$taggedUsersIds"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
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
          // sender: { $ifNull: [{ $first: "$employees.full_name" }, ""] },
          // sender_id: { $ifNull: [{ $first: "$employees._id" }, ""] },
          // profile_pic: { $ifNull: [{ $first: "$employees.emp_img" }, ""] }, //{ $ifNull: ["$employees.emp_img", ""] },
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
          createdAt: 1,
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
          isDeleted: { $ifNull: ["$isDeleted", false] },
          bug_id: { $ifNull: ["$bug_id", ""] },
        },
      },
    ];
    const data = await CommentsModel.aggregate(queryDoc).exec();
    // console.log(data)
    return successResponse(res, statusCode.SUCCESS, messages.SUCCESS, data);
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.commentsDetails = async (req, res, next) => {
  try {
    const validationSchema = Joi.object({
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
    const data = await CommentsModel.aggregate(queryDoc).exec();
    return successResponse(res, statusCode.SUCCESS, messages.SUCCESS, data[0]);
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.editComment = async (req, res, next) => {
  try {
    const validationSchema = Joi.object({
      comment: Joi.string().required(),
      bug_id: Joi.string().required(),
      attachments: Joi.array().optional().default([]),
      taggedUsers: Joi.array().optional().default([]),
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

    // if (
    //   value?.attachments &&
    //   value.attachments.length > 0 &&
    //   !value.folder_id
    // ) {
    //   return errorResponse(
    //     res,
    //     statusCode.BAD_REQUEST,
    //     messages.FOLDER_REQUIRED
    //   );
    // }
    const getData = await CommentsModel.findById(
      new mongoose.Types.ObjectId(req.params.id)
    );

    // let updated Data;
    const updatedData = await CommentsModel.findByIdAndUpdate(
      req.params.id,
      {
        comment: value.comment,
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

    // get task || sub task id..
    const details = updatedData.bug_id
      ? await ProjectBugModel.findById(
          new mongoose.Types.ObjectId(updatedData.bug_id)
        )
      : {};

    await filesManageInDB(
      value.attachments,
      req.user,
      details?.project_id,
      value?.folder_id,
      null,
      null,
      updatedData._id
    );

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.UPDATED,
      updatedData
    );
  } catch (error) {
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
    const new_data = await CommentsModel.findByIdAndUpdate(
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
    const deletecomment_id = await CommentsModel.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, false, true)),
      },
      { new: true }
    ).exec();

    const data = await CommentsModel.findById(req.params.id).exec();
    if (data && deletecomment_id) {
      return successResponse(res, statusCode.CREATED, messages.DELETED, data);
    } else {
      return successResponse(
        res,
        statusCode.NO_CONTENT,
        messages.NOT_FOUND,
        data
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
