const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const MailSettings = mongoose.model("mailsettings");
const {
  getRefModelFromLoginUser,
  getCreatedUpdatedDeletedByQuery,
} = require("../helpers/common");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");

exports.addmailSettings = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_assigned: Joi.boolean().optional(),
      discussion_subscribed: Joi.boolean().optional(),
      discussion_tagged: Joi.boolean().optional(),
      maintask_subscribed: Joi.boolean().optional(),
      task_assigned: Joi.boolean().optional(),
      task_tagged_comments: Joi.boolean().optional(),
      bug_assigned: Joi.boolean().optional(),
      bug_tagged_comments: Joi.boolean().optional(),
      note_assigned: Joi.boolean().optional(),
      note_tagged_comments: Joi.boolean().optional(),
      file_subscribed: Joi.boolean().optional(),
      logged_hours: Joi.boolean().optional(),
      never: Joi.boolean().optional(),
      quarterlyMail: Joi.boolean().optional(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
   
    if (value?.never != undefined && value?.never) {
      let data = new MailSettings({
        project_assigned: false,
        discussion_subscribed: false,
        discussion_tagged: false,
        maintask_subscribed: false,
        task_assigned: false,
        task_tagged_comments: false,
        bug_assigned: false,
        bug_tagged_comments: false,
        note_assigned: false,
        note_tagged_comments: false,
        file_subscribed: false,
        logged_hours: false,
        never: true,
        quarterlyMail: false,
        createdBy: req.user._id,
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user)),
      });

      await data.save();
      return successResponse(res, statusCode.CREATED, messages.CREATED, data);

    } else {
      let data = new MailSettings({
        project_assigned: value?.project_assigned,
        discussion_subscribed: value?.discussion_subscribed,
        discussion_tagged: value?.discussion_tagged,
        maintask_subscribed: value?.maintask_subscribed,
        task_assigned: value?.task_assigned,
        task_tagged_comments: value?.task_tagged_comments,
        bug_assigned: value?.bug_assigned,
        bug_tagged_comments: value?.bug_tagged_comments,
        note_assigned: value?.note_assigned,
        note_tagged_comments: value?.note_tagged_comments,
        file_subscribed: value?.file_subscribed,
        logged_hours: value?.logged_hours,
        quarterlyMail: value?.quarterlyMail,
        never: false,
        createdBy: req.user._id,
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user)),
      });

      await data.save();
      return successResponse(res, statusCode.CREATED, messages.CREATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.editmailSettings = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_assigned: Joi.boolean().optional(),
      discussion_subscribed: Joi.boolean().optional(),
      discussion_tagged: Joi.boolean().optional(),
      maintask_subscribed: Joi.boolean().optional(),
      task_assigned: Joi.boolean().optional(),
      task_tagged_comments: Joi.boolean().optional(),
      bug_assigned: Joi.boolean().optional(),
      bug_tagged_comments: Joi.boolean().optional(),
      note_assigned: Joi.boolean().optional(),
      note_tagged_comments: Joi.boolean().optional(),
      file_subscribed: Joi.boolean().optional(),
      logged_hours: Joi.boolean().optional(),
      never: Joi.boolean().optional(),
      quarterlyMail: Joi.boolean().optional(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const mailsettingsData = await MailSettings.findOne({
      isDeleted: false,
      createdBy: new mongoose.Types.ObjectId(req.user?._id)
    })
    if (mailsettingsData != undefined && mailsettingsData._id) {
      let data = await MailSettings.updateOne(
        { createdBy: new mongoose.Types.ObjectId(req.user?._id) },
        {
          $set: {
            project_assigned: value?.project_assigned || false,
            discussion_subscribed: value?.discussion_subscribed || false,
            discussion_tagged: value?.discussion_tagged || false,
            maintask_subscribed: value?.maintask_subscribed || false,
            task_assigned: value?.task_assigned || false,
            task_tagged_comments: value?.task_tagged_comments || false,
            bug_assigned: value?.bug_assigned || false,
            bug_tagged_comments: value?.bug_tagged_comments || false,
            note_assigned: value?.note_assigned || false,
            note_tagged_comments: value?.note_tagged_comments || false,
            file_subscribed: value?.file_subscribed || false,
            logged_hours: value?.logged_hours || false,
            never: value?.never || false,
            quarterlyMail: value?.quarterlyMail || false,
            updatedBy: req.user._id,
          },
        },
        { new: true }
      );

      return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
    } else {
      this.addmailSettings(req, res)

    }

  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.mailSettingsDetails = async (req, res) => {
  try {
    const mainQuery = [
      ...(await getCreatedUpdatedDeletedByQuery()),
      {
        $match: {
          "createdBy._id": new mongoose.Types.ObjectId(req?.user?._id),
        },
      },
      {
        $project: {
          project_assigned: 1,
          discussion_subscribed: 1,
          discussion_tagged: 1,
          maintask_subscribed: 1,
          task_assigned: 1,
          task_tagged_comments: 1,
          bug_assigned: 1,
          bug_tagged_comments: 1,
          note_assigned: 1,
          note_tagged_comments: 1,
          file_subscribed: 1,
          never : 1,
          quarterlyMail: 1,
          logged_hours: 1,
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
          },
        },
      },
    ];
    const data = await MailSettings.aggregate(mainQuery);
    
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data[0]);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
