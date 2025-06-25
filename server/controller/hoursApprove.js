const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const approvedHours = mongoose.model("approvedHours");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const { getRefModelFromLoginUser, } = require("../helpers/common");

//Add Approve hours :
exports.addApprovedHours = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      employee_id: Joi.string().required(),
      notes: Joi.string().optional().allow(""),
      approved_hours: Joi.string().required(),
      approved_minutes: Joi.string().optional().allow("").default("0"),
      hours: Joi.string().required(),
      minutes: Joi.string().required(),
      month: Joi.string().required(),
      year: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message,
        null
      );
    }

    console.log("----", value?.approved_minutes)
    // Convert total time and approved time into minutes
    const totalMinutes = parseInt(value.hours) * 60 + parseInt(value.minutes);
    const approvedMinutes =
      parseInt(value.approved_hours) * 60 + parseInt(value.approved_minutes);

    // Validate that approved time does not exceed total time
    if (approvedMinutes > totalMinutes) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        messages.APPROVED_TIME_EXCEED,
        null
      );
    }

    let data = new approvedHours({
      employee_id: value?.employee_id,
      approved_by: req.user._id,
      notes: value?.notes || " - ",
      approved_hours: value?.approved_hours,
      approved_minutes: value?.approved_minutes,
      hours: value?.hours,
      minutes: value?.minutes,
      month: value?.month,
      year: value?.year,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req.user)),
    });
    await data.save();
    if (await data.save()) {
      return successResponse(
        res,
        statusCode.CREATED,
        messages.APPROVED_HOURS_CREATED,
        data
      );
    } else {
      return errorResponse(res, statusCode.CONFLICT, null);
    }
    // }
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};
