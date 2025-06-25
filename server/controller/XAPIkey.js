const mongoose = require("mongoose");
const XAPIkey = mongoose.model("xapikeys");
const {
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");


exports.addXAPIkey = async (req, res) => {
  try {
    let data = new XAPIkey({
      api_key: req?.body?.api_key,
      isDeleted: false,
    });

    await data.save();

    return successResponse(res, statusCode.CREATED, messages.CREATED, data);
  } catch (error) {
    console.log("🚀 ~ exports.mailsToQuarterHours= ~ error:", error)    
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.updateXAPIkey = async (req, res) => {
  try {
    let data = await XAPIkey.updateOne(
      {
        _id: new mongoose.Types.ObjectId(req?.body?.id),
      },
      {
        $set: {
          api_key: req?.body?.api_key,
          key_for: req?.body?.key_for
        },
      },
      { new: true }
    );

    return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
  } catch (error) {
    console.log("🚀 ~ exports.updateSentMails= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getXAPIkey = async (req, res) => {
  try {
    const data = await XAPIkey.findOne({
      isDeleted: false,
    });

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    console.log("🚀 ~ exports.getQuarterlyMails= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
