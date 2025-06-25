const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const DiscussionsTopicsDetails = mongoose.model("discussionstopicsdetails");
const { searchDataArr } = require("../helpers/queryHelper");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const { filesManageInDB } = require("./fileUploads");
const {
  getArrayChanges,
  getRefModelFromLoginUser,
  getCreatedUpdatedDeletedByQuery,
} = require("../helpers/common");
const { sendmailForNewCommentsInTopic } = require("./sendEmail");
const { checkLoginUserIsProjectManager ,checkLoginUserIsProjectAccountManager } = require("./projectMainTask");
const { checkUserIsAdmin, checkUserIsSuperAdmin } = require("./authentication");

//Add Discussions Topic Details :
exports.addDiscussionsTopicsDetails = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().optional().allow("").default(""),
      project_id: Joi.string().required(),
      topic_id: Joi.string().required(),
      taggedUsers: Joi.array().optional().default([]),
      attachments: Joi.any().optional(),
      folder_id: Joi.any().optional(),
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

    // Add topic details
    let topicsDetails = new DiscussionsTopicsDetails({
      topic_id: value.topic_id,
      title: value.title || "",
      project_id: value.project_id,
      taggedUsers: value.taggedUsers,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user)),
    });
    await topicsDetails.save();

    // save  files,..
    if (value?.attachments && value.attachments.length > 0) {
      await filesManageInDB(
        value.attachments,
        req.user,
        value.project_id,
        value.folder_id,
        null,
        null,
        null,
        null,
        null,
        topicsDetails._id
      );
    }

    // send mail to subcribers..
    if (value?.taggedUsers && value?.taggedUsers.length > 0) {
      await sendmailForNewCommentsInTopic(topicsDetails._id);
    }

    return successResponse(
      res,
      statusCode.CREATED,
      messages.CREATED,
      topicsDetails
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Discussions Topic Details :
exports.getDiscussionsTopicsDetails = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      topic_id: Joi.string().required(),
      search: Joi.string().allow("").optional(),
      _id: Joi.string().optional(),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const isAdmin = await checkUserIsAdmin(req.user._id);
    const isSuperAdmin = await checkUserIsSuperAdmin(req?.user?._id)
    const isManager = await checkLoginUserIsProjectManager(
      value.project_id,
      req.user._id
    );
    const isAccManager = await checkLoginUserIsProjectAccountManager(
      value.project_id,
      req.user._id
    );

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value.project_id),
      topic_id: new mongoose.Types.ObjectId(value.topic_id),
      // For details
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {}),
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["title"], value.search),
      };
    }

    const mainQuery = [
      {
        $lookup: {
          from: "fileuploads",
          let: { discussion_topic_details_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$discussion_topic_details_id",
                        "$$discussion_topic_details_id",
                      ],
                    },
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
          let: { taggedUsersIds: { $ifNull: ["$taggedUsers", []] } },
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
      ...(await getCreatedUpdatedDeletedByQuery()),
      { $match: matchQuery },
      { $sort: { createdAt: 1 } },
      {
        $project: {
          _id: 1,
          title: 1,
          isDefault: 1,
          createdAt: 1,
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
          },
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
              as: "taggedUsersId",
              in: {
                _id: "$$taggedUsersId._id",
                emp_img: "$$taggedUsersId.emp_img",
                name: "$$taggedUsersId.full_name",
              },
            },
          },
        },
      },
    ];

    const data = await DiscussionsTopicsDetails.aggregate(mainQuery);

    data.filter((ele) => {
      if (ele?.createdBy?._id == req.user?._id || isManager || isSuperAdmin || isAccManager) {
        ele.isDeletable = true;
        ele.isEditable = true;
      } else {
        ele.isDeletable = false;
        ele.isEditable = false;
      }
    });


    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      value._id ? data[0] : data,
      []
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Discussions Topic Details :
exports.updateDiscussionsTopicsDetails = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().optional().allow("").default(""),
      project_id: Joi.string().required(),
      topic_id: Joi.string().required(),
      taggedUsers: Joi.array().optional().default([]),
      attachments: Joi.any().optional(),
      folder_id: Joi.any().optional(),
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

    const getData = await DiscussionsTopicsDetails.findById(req.params.id);

    if (getData.isDefault == true) {
      {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          messages.CAN_NOT_UPDATE
        );
      }
    }

    const data = await DiscussionsTopicsDetails.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id), isDefault: false },
      {
        topic_id: value.topic_id,
        title: value.title,
        project_id: value.project_id,
        taggedUsers: value.taggedUsers,
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user, true)),
      },
      { new: true }
    );

    await filesManageInDB(
      value.attachments,
      req.user,
      value.project_id,
      value.folder_id,
      null,
      null,
      null,
      null,
      null,
      req.params.id
    );

    // For send mail for new added taggedUsers..
    const newTaggedUsers = getArrayChanges(
      getData.taggedUsers.map((a) => a.toString()),
      value.taggedUsers
    );

    if (newTaggedUsers.added && newTaggedUsers.added.length > 0) {
      await sendmailForNewCommentsInTopic(req.params.id, newTaggedUsers.added);
    }

    return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Discussions Topic Details :
exports.deleteDiscussionsTopicsDetails = async (req, res) => {
  try {
    const getData = await DiscussionsTopicsDetails.findById(req.params.id);

    if (getData.isDefault == true) {
      {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          messages.CAN_NOT_DELETE
        );
      }
    }
    const data = await DiscussionsTopicsDetails.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id), isDefault: false },
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, false, true)),
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
