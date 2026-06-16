const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const AppSettings = mongoose.model("pms_app_settings");

const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");

exports.addEditAppSetting = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      logo_mode: Joi.string().required(),
      login_logo: Joi.string().required(),
      header_logo: Joi.string().required(),
      fav_icon: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const obj = {
      title: value.title,
      logo_mode: value.logo_mode,
      login_logo: value.login_logo,
      header_logo: value.header_logo,
      fav_icon: value.fav_icon,
      updatedBy: req.user._id,
      updatedAt: configs.utcDefault(),
    };

    const getSetting = await AppSettings.findOne({ isDeleted: false });
    let isCreate = false;
    if (!getSetting) {
      const addSetting = new AppSettings({
        ...obj,
        createdBy: req.user._id,
        createdAt: configs.utcDefault(),
      });
      await addSetting.save();
      isCreate = true;
    } else {
      await AppSettings.findByIdAndUpdate(getSetting._id, obj);
    }

    setImmediate(async () => {
      try {
        const { logCreate, logUpdate, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
        const userInfo = await getUserInfoForLogging(req);
        if (userInfo) {
          if (isCreate) {
            await logCreate({
              companyId: userInfo.companyId,
              moduleName: "systemSettings",
              email: userInfo.email,
              createdBy: userInfo._id,
              additionalData: { recordName: value.title || null },
              ipAddress: userInfo.ipAddress,
            });
          } else {
            await logUpdate({
              companyId: userInfo.companyId,
              moduleName: "systemSettings",
              email: userInfo.email,
              createdBy: userInfo._id,
              updatedBy: userInfo._id,
              oldData: { title: getSetting.title, logo_mode: getSetting.logo_mode },
              newData: { title: value.title, logo_mode: value.logo_mode },
              additionalData: { recordName: value.title || null },
              ipAddress: userInfo.ipAddress,
            });
          }
        }
      } catch (e) {}
    });

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.APP_SETTING_UPDATED,
      {}
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getAppSetting = async (req, res) => {
  try {
    const getSetting = await AppSettings.findOne({ isDeleted: false });

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      getSetting || {}
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
