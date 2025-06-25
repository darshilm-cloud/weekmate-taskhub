const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const DiscussionsTopics = mongoose.model("discussionstopics");
const DiscussionsTopicsDetails = mongoose.model("discussionstopicsdetails");
const { searchDataArr } = require("../helpers/queryHelper");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const { filesManageInDB } = require("./fileUploads");
const {
  getArrayChanges,
  getCreatedUpdatedDeletedByQuery,
  getClientQuery,
  getRefModelFromLoginUser,
} = require("../helpers/common");
const { discussionsTopicSubscribersMail } = require("./sendEmail");
const { checkLoginUserIsProjectManager, checkLoginUserIsProjectAccountManager } = require("./projectMainTask");
const { checkUserIsAdmin, checkUserIsSuperAdmin } = require("./authentication");

// Check is exists..
exports.projectDiscussionTopicExists = async (reqData, id = null) => {
  try {
    let isExist = false;
    // const data = await DiscussionsTopics.findOne({
    //   isDeleted: false,
    //   // title: reqData?.title?.trim()?.toLowerCase(),
    //   title: { $regex: new RegExp(`^${reqData?.title}$`, "i") },
    //   project_id: new mongoose.Types.ObjectId(reqData.project_id),
    //   ...(id
    //     ? {
    //         _id: { $ne: id },
    //       }
    //     : {}),
    // });
    // if (data) isExist = true;

    const data = await DiscussionsTopics.aggregate([
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(reqData?.project_id),
          isDeleted: false,
          ...(id
            ? {
                _id: { $ne: new mongoose.Types.ObjectId(id) },
              }
            : {}),
        },
      },
      {
        $addFields: {
          titleLower: { $toLower: "$title" }, // Add a temporary field with lowercase title
        },
      },
      {
        $match: {
          titleLower: reqData?.title.trim().toLowerCase(), // Match the lowercase title
        },
      },
    ]);
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectDiscussionTopicExists= ~ error:", error);
  }
};

//Add Discussions Topic :
exports.addDiscussionsTopics = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      project_id: Joi.string().required(),
      status: Joi.string().optional().default("active"),
      descriptions: Joi.string().optional().allow("").default(""),
      subscribers: Joi.array().optional(),
      pms_clients: Joi.array().optional().default([]),
      isPinToTop: Joi.boolean().optional().default(false),
      isPrivate: Joi.boolean().optional().default(false),
      isBookMark: Joi.boolean().optional().default(false),
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

    if (await this.projectDiscussionTopicExists(value)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let data = new DiscussionsTopics({
        title: value.title,
        project_id: value.project_id,
        status: value.status,
        descriptions: value.descriptions || "",
        subscribers: value.subscribers || [],
        pms_clients: value.pms_clients || [],
        isPinToTop: value.isPinToTop,
        isPrivate: value.isPrivate,
        isBookMark: value.isBookMark,
        createdBy: req.user._id,
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user)),
      });
      const newData = await data.save();

      // Add default topic
      let topicsDetails = new DiscussionsTopicsDetails({
        topic_id: newData._id,
        title: "Added this topic",
        isDefault: true,
        project_id: value.project_id,
        taggedUsers: [],
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
          newData._id
        );
      }

      // send mail to subscribers..
      if (
        (value?.subscribers && value?.subscribers.length > 0) ||
        (value?.pms_clients && value?.pms_clients.length > 0)
      ) {
        await discussionsTopicSubscribersMail(newData._id, []);
      }

      return successResponse(res, statusCode.CREATED, messages.CREATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Discussions Topic :
exports.getDiscussionsTopics = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      search: Joi.string().allow("").optional(),
      // sort: Joi.string().default("_id"),
      // sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
      project_id: Joi.string().required(),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value.project_id),
      // For details
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {}),
    };

    const isAdmin = await checkUserIsAdmin(req?.user?._id);
    const isSuperAdmin = await checkUserIsSuperAdmin(req?.user?._id);
    const isManager = await checkLoginUserIsProjectManager(
      value.project_id,
      req.user._id
    );
    const isAccManager = await checkLoginUserIsProjectAccountManager(
      value.project_id,
      req.user._id
    );
    if (!isManager && !isSuperAdmin && !isAdmin && !isAccManager) {
      matchQuery = {
        ...matchQuery,
        $expr: {
          $or: [
            {
              $eq: ["$isPrivate", false],
            },
            {
              $or: [
                {
                  $eq: [
                    "$createdBy",
                    new mongoose.Types.ObjectId(req.user._id),
                  ],
                },
                {
                  $in: [
                    new mongoose.Types.ObjectId(req.user._id),
                    "$subscribers",
                  ],
                },
                {
                  $in: [
                    new mongoose.Types.ObjectId(req.user._id),
                    "$pms_clients",
                  ],
                },
              ],
            },
          ],
        },
      };
    }

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["title"], value.search),
      };
    }

    const mainQuery = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "projects",
          localField: "project_id",
          foreignField: "_id",
          as: "project",
        },
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "fileuploads",
          let: { discussion_topic_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$discussion_topic_id", "$$discussion_topic_id"] },
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
          let: { subscribersIds: { $ifNull: ["$subscribers", []] } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$subscribersIds"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "subscribers",
        },
      },
      ...(await getClientQuery()),
      ...(await getCreatedUpdatedDeletedByQuery()),

      {
        $sort: {
          isPinToTop: -1,
          isPrivate: -1,
          _id: -1,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          status: 1,
          descriptions: 1,
          isPinToTop: 1,
          isPrivate: 1,
          isBookMark: 1,
          createdAt: 1,
          project: {
            _id: 1,
            title: 1,
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
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
          subscribers: {
            $map: {
              input: {
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$subscribers" },
                      { $ne: ["$subscribers", []] },
                    ],
                  },
                  then: "$subscribers",
                  else: [],
                },
              },
              as: "subscribersId",
              in: {
                _id: "$$subscribersId._id",
                emp_img: "$$subscribersId.emp_img",
                name: "$$subscribersId.full_name",
              },
            },
          },
          ...(await getClientQuery(true)),
        },
      },
    ];

    const data = await DiscussionsTopics.aggregate(mainQuery);

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
    console.log("🚀 ~ exports.getDiscussionsTopics= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Discussions Topic :
exports.updateDiscussionsTopics = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      project_id: Joi.string().required(),
      status: Joi.string().optional().default("active"),
      descriptions: Joi.string().optional().allow("").default(""),
      subscribers: Joi.array().optional(),
      pms_clients: Joi.array().optional().default([]),
      isPinToTop: Joi.boolean().optional().default(false),
      isPrivate: Joi.boolean().optional().default(false),
      isBookMark: Joi.boolean().optional().default(false),
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

    if (await this.projectDiscussionTopicExists(value, req.params.id)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      const getData = await DiscussionsTopics.findById(req.params.id);

      const data = await DiscussionsTopics.findByIdAndUpdate(
        req.params.id,
        {
          title: value.title,
          project_id: value.project_id,
          status: value.status,
          descriptions: value.descriptions || "",
          subscribers: value.subscribers || [],
          pms_clients: value.pms_clients || [],
          isPinToTop: value.isPinToTop,
          isPrivate: value.isPrivate,
          isBookMark: value.isBookMark,
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
        req.params.id
      );

      // For send mail for new added subscribers..
      const subscriberData = getArrayChanges(
        getData.subscribers.map((a) => a.toString()),
        value.subscribers
      );

      // For send mail for new added client..
      const clientsData = getArrayChanges(
        getData.pms_clients.map((a) => a.toString()),
        value.pms_clients
      );

      if (
        (subscriberData.added && subscriberData.added.length > 0) ||
        (clientsData.added && clientsData.added.length > 0)
      ) {
        await discussionsTopicSubscribersMail(
          req.params.id,
          subscriberData.added,
          clientsData.added
        );
      }

      return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// update isPinToTop...
exports.updateDiscussionsTopicPinToTop = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      isPinToTop: Joi.boolean().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const data = await DiscussionsTopics.findByIdAndUpdate(
      req.params.id,
      {
        isPinToTop: value.isPinToTop,
        updatedBy: req.user._id,
        updatedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, true)),
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Discussions Topic :
exports.deleteDiscussionsTopics = async (req, res) => {
  try {
    const data = await DiscussionsTopics.findByIdAndUpdate(
      req.params.id,
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

    await DiscussionsTopicsDetails.updateMany(
      {
        topic_id: new mongoose.Types.ObjectId(req.params.id),
        isDeleted: false,
      },
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, false, true)),
      },
      { new: true }
    );

    return successResponse(res, statusCode.SUCCESS, messages.DELETED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
