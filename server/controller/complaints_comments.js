const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const ComplaintsComments = mongoose.model("complaints_comments");
const { } = require("../helpers/queryHelper");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const { filesManageInDB } = require("./fileUploads");
const configs = require("../configs");
const {
  getRefModelFromLoginUser,
  getCreatedUpdatedDeletedByQuery,
} = require("../helpers/common");
const { newComplaintCommentsMail } = require("../template/complaints_comments");

//Add Complaint
exports.addComplaintComments = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      complaint_id: Joi.string().required(),
      comment: Joi.string().required(),
      attachments: Joi.any().optional(),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    let data = new ComplaintsComments({
      complaint_id: value?.complaint_id || null,
      comment: value?.comment || null,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req?.user)),
    });
    await data.save();

    if (value?.attachments && value.attachments.length > 0) {
      await filesManageInDB(
        value.attachments,
        req.user,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        data._id
      );
    }
    let emailDetails = await this.getComplaintCommentsDetailsForMail(data._id);
    await newComplaintCommentsMail(emailDetails, decodedCompanyId)

    return successResponse(
      res,
      statusCode.CREATED,
      messages.COMPLAINT_COMMENTS_CREATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Complaint :
exports.getComplaintComments = async (req, res) => {
  try {
    const mainQuery = [
      {
        $match: {
          isDeleted: false,
          complaint_id: new mongoose.Types.ObjectId(req.params.complaintID),
        },
      },
      {
        $lookup: {
          from: "fileuploads",
          let: { complaint_comments_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$complaint_comment_id", "$$complaint_comments_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "attachments",
        },
      },

      ...(await getCreatedUpdatedDeletedByQuery()),
      {
        $project: {
          _id: 1,
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
          complaint_id: 1,
          comment: 1,
          updatedAt: 1,
          createdAt: 1,
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
    ];

    let data = await ComplaintsComments.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, {});
  } catch (error) {
    console.log("🚀 ~ exports.getProjects= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Complaint :
exports.updateComplaintComments = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      comment: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    // Get old data before update for logging
    const oldCommentData = await ComplaintsComments.findById(req.params.id).lean();

    const data = await ComplaintsComments.findByIdAndUpdate(
      req.params.id,
      {
        comment: value?.comment || null,
        updatedBy: req.user._id || null,
        ...(await getRefModelFromLoginUser(req?.user, true)),
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }

    // Get new data after update for logging
    const newCommentData = data.toObject ? data.toObject() : data;

    // Log update activity
    try {
      const { logUpdate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
      const userInfo = await getUserInfoForLogging(req.user);
      if (userInfo && oldCommentData && newCommentData) {
        await logUpdate({
          companyId: userInfo.companyId,
          moduleName: "complaints_comments",
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
      console.error("Error logging complaint comment update activity:", logError);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.COMPLAINT_COMMENTS_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Archived to active Complaint :
exports.deleteComplaintComments = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Get the complaint comment data before deletion for logging
    const commentData = await ComplaintsComments.findById(req.params.id).lean();
    
    const complaint_comment = await ComplaintsComments.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, false, true)),
      },
      { new: true }
    );

    if (!complaint_comment) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && commentData) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "complaints_comments",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: commentData,
        additionalData: {
          recordId: commentData._id.toString(),
          complaint_id: commentData.complaint_id?.toString(),
          isSoftDelete: true
        }
      });
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.COMPLAINT_COMMENTS_DELETED,
      complaint_comment
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// get complaint details for mail ...
exports.getComplaintCommentsDetailsForMail = async (commentId) => {
  try {
    const mainQuery = [
      {
        $match: {
          isDeleted: false,
          _id: new mongoose.Types.ObjectId(commentId),
        },
      },
      {
        $lookup: {
          from: "complaints",
          let: { complaint_id: "$complaint_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$complaint_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "complaints",
        },
      },
      {
        $unwind: {
          path: "$complaints",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "projects",
          let: { project_id: "$complaints.project_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
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
          from: "projecttechs",
          let: { technology: "$project.technology" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$technology"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "technology",
        },
      },
      {
        $unwind: {
          path: "$technology",
          preserveNullAndEmptyArrays: true,
        },
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
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "manager",
        },
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { manager: "$project.manager.reporting_manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "managers_rm",
        },
      },
      {
        $unwind: {
          path: "$managers_rm",
          preserveNullAndEmptyArrays: true,
        },
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
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "acc_manager",
        },
      },
      {
        $unwind: {
          path: "$acc_manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { manager: "$project.acc_manager.reporting_manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "acc_managers_rm",
        },
      },
      {
        $unwind: {
          path: "$acc_managers_rm",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "fileuploads",
          let: { complaint_comments_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$complaint_comment_id", "$$complaint_comments_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "attachments",
        },
      },
      ...(await getCreatedUpdatedDeletedByQuery()),
      {
        $project: {
          _id: 1,
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
            email: 1,
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
          project: {
            _id: 1,
            title: 1,
            manager: 1,
            acc_manager: 1,
            technology: 1,
          },
          technology: {
            _id: 1,
            project_tech: 1,
          },
          manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1,
          },
          acc_manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1,
          },
          managers_rm: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1
          },
          acc_managers_rm: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1
          },
          complaints: {
            _id: 1,
            project_id: 1,
            complaint: 1,
            status: 1,
            client_name: 1,
            client_email: 1,
            priority: 1,
            escalation_level: 1,
          },
          complaint_id: 1,
          comment: 1,
          updatedAt: 1,
          createdAt: 1,
        },
      },
    ];

    const data = await ComplaintsComments.aggregate(mainQuery);
    return data[0];
  } catch (error) {
    console.log("🚀 ~ exports.getProjectDetailsForMail= ~ error:", error);
  }
};
