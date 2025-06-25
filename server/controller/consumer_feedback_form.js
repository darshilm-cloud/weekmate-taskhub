const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const ConsumerFeedBackForm = mongoose.model("consumer_feedback_forms");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const {
  getRefModelFromLoginUser,
  getCreatedUpdatedDeletedByQuery,
} = require("../helpers/common");
const { newFeedbackMail } = require("../template/consumer_feedback_mail");

//Add ConsumerFeedBack
exports.addConsumerFeedBack = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      complaint_id: Joi.required().required(),
      satisfaction: Joi.number().required(),
      rate_reviews: Joi.number().required(),
      additional_comments: Joi.string().optional().allow(""),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    let feedbackData = await ConsumerFeedBackForm.find({ complaint_id: new mongoose.Types.ObjectId(value?.complaint_id) });
    if (feedbackData && feedbackData.length > 0) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let data = new ConsumerFeedBackForm({
        complaint_id: value?.complaint_id || null,
        satisfaction: value?.satisfaction || null,
        rate_reviews: value?.rate_reviews || null,
        additional_comments: value?.additional_comments || false,
        ...(await getRefModelFromLoginUser(req?.user)),
      });
      await data.save();

      let emailDetails = await this.getFeedbacksDetailsForMail(data._id);
      await newFeedbackMail(emailDetails)

      return successResponse(
        res,
        statusCode.CREATED,
        messages.REVIEW_CREATED,
        data
      );
    }
  } catch (error) {
    console.log("🚀 ~ exports.addConsumerFeedBack= ~ error:", error)
    return catchBlockErrorResponse(res, error.message);
  }
};

// get ConsumerFeedBack details for mail ...
exports.getFeedbacksDetailsForMail = async (feedbackId) => {
  try {
    const mainQuery = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(feedbackId),
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
          as: "complaint",
        },
      },
      {
        $unwind: {
          path: "$complaint",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "projects",
          let: { project_id: "$complaint.project_id" },
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
          let: { acc_manager: "$project.acc_manager.reporting_manager" },
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
          as: "acc_managers_rm",
        },
      },
      {
        $unwind: {
          path: "$acc_managers_rm",
          preserveNullAndEmptyArrays: true,
        },
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
            technology: 1,
          },
          manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1,
          },
          managers_rm: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1,
          },
          acc_managers_rm: {
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
          technology: {
            _id: 1,
            project_tech: 1,
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
            email: 1,
          },
          complaint: {
            client_name: 1,
            client_email: 1,
            complaint: 1,
            priority: 1,
            escalation_level: 1,
            status: 1,
          },
          satisfaction: 1,
          rate_reviews: 1,
          additional_comments: 1,
          updatedAt: 1,
          createdAt: 1,
        },
      },
    ];

    const data = await ConsumerFeedBackForm.aggregate(mainQuery);
    return data[0];
  } catch (error) {
    console.log("🚀 ~ exports.getReviewsDetailsForMail= ~ error:", error)
  }
};

//Get ConsumerFeedBack
exports.getConsumerFeedBack = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      complaint_id: Joi.string().required(),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    let data = await ConsumerFeedBackForm.find({ complaint_id: new mongoose.Types.ObjectId(value?.complaint_id) });
    console.log("🚀 ~ exports.getConsumerFeedBack= ~ data:", data)
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      data
    );

  } catch (error) {
    console.log("🚀 ~ exports.addConsumerFeedBack= ~ error:", error)
    return catchBlockErrorResponse(res, error.message);
  }
};