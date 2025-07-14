const {
  successResponse,
  catchBlockErrorResponse,
  errorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const RolePermissions = mongoose.model("role_permissions");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const { checkIsPMSClient } = require("./PMSRoles");
const Joi = require("joi");
const { createJWTToken } = require("../helpers/JWTToken");
const { emailSenderForPMS } = require("../helpers/common");
const Employees = mongoose.model("employees");
const PMSClients = mongoose.model("pmsclients");
const Company = mongoose.model("companies");
const config = require("../settings/config.json");
const {
  forgetPasswordContent,
  resetPasswordContent
} = require("../template/clientPasswordMails");
const { getLoginSchema } = require("../validation");
const { validateFormatter } = require("../configs");

exports.authenticationGetData = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      token: Joi.string().required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    // Your secret key used for signing the token
    const token = value.token;

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await this.dataForJWT(decodedToken.user);

    const pmsUserToken = createJWTToken(
      user,
      157680000 // 5 year
    );

    // Get login user permissions..
    let permissions = await this.getUserPermissions(decodedToken.user._id);
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.USER_LOGIN,
      { user: user, auth_token: pmsUserToken },
      {},
      permissions,
      user?.pms_role_id?._id || ""
    );
  } catch (error) {
    console.log("🚀 ~ exports.authenticationGetData= ~ error:", error);
    return errorResponse(res, statusCode.SERVER_ERROR, error.message);
  }
};

exports.getUserPermissions = async (userId) => {
  try {
    const loginUser = await this.getDataForLoginUser({ _id: userId });
    let permission = [];

    if (loginUser && loginUser?.pms_role_id) {
      const getPermissions = await RolePermissions.find({
        pms_role_id: new mongoose.Types.ObjectId(loginUser.pms_role_id),
        isDeleted: false
      });

      if (getPermissions && getPermissions.length > 0) {
        permission = getPermissions.map((p) => p.resource_id);
      }
    }
    return permission;
  } catch (error) {
    console.log("🚀 ~ exports.getUserPermissions= ~ error:", error);
  }
};

// Login API
exports.login = async (req, res, next) => {
  try {
    const { error, value } = validateFormatter(getLoginSchema(), req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const loginUser = await this.getDataForLoginUser(value);
    if (!loginUser) {
      return errorResponse(
        res,
        statusCode.NOT_FOUND,
        messages.LOGIN_USER_NOT_FOUND
      );
    }

    // Check if user is active or not...
    if (!loginUser.isActivate) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        messages.ACCOUNT_DEACTIVATE
      );
    }

    if (loginUser?.pms_role_id?.role_name === config.PMS_ROLES.SUPER_ADMIN) {
      // Verify user password..
      loginUser.comparePassword(
        value.password,
        async function (error, isMatch) {
          if (error || !isMatch) {
            return errorResponse(
              res,
              statusCode.BAD_REQUEST,
              messages.PASSWORD_INVALID
            );
          }

          const user = await module.exports.dataForJWT(loginUser);
          const auth_token = createJWTToken(
            user,
            157680000 // 5 year
          );
          // Get login user permissions..
          let permissions = await module.exports.getUserPermissions(user._id);
          return successResponse(
            res,
            statusCode.SUCCESS,
            messages.USER_LOGIN,
            { user, auth_token },
            {},
            permissions,
            user?.pms_role_id?._id
          );
        }
      );
    } else {
      if (!value?.slug) {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          "Please login with your company url"
        );
      } else {
        let getCompanyDetails = await Company.findOne({
          companyDomain: value.slug,
          isActive: true
        });

        if (getCompanyDetails) {
          // Verify user password..
          loginUser.comparePassword(
            value.password,
            async function (error, isMatch) {
              if (error || !isMatch) {
                return errorResponse(
                  res,
                  statusCode.BAD_REQUEST,
                  messages.PASSWORD_INVALID
                );
              }

              await Employees.findByIdAndUpdate(loginUser._id, {
                $push: {
                  loginActivity: {
                    $each: [new Date()],
                    $slice: -5 // keep only last 5 entries
                  }
                }
              });

              const user = await module.exports.dataForJWT(loginUser);

              if (
                user?.companyDetails?.companyDomain !==
                getCompanyDetails?.companyDomain
              ) {
                return errorResponse(
                  res,
                  statusCode.NOT_FOUND,
                  "You are not register in company"
                );
              }

              const auth_token = createJWTToken(
                user,
                157680000 // 5 year
              );
              // Get login user permissions..
              let permissions = await module.exports.getUserPermissions(
                user._id
              );
              return successResponse(
                res,
                statusCode.SUCCESS,
                messages.USER_LOGIN,
                { user, auth_token },
                {},
                permissions,
                user?.pms_role_id?._id
              );
            }
          );
        } else {
          return errorResponse(
            res,
            statusCode.NOT_FOUND,
            "Company not found or you are not register in company"
          );
        }
      }
    }
  } catch (error) {
    console.log("🚀 ~ exports.login= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getDataForLoginUser = async (reqBody) => {
  try {
    let userData = null;
    let obj = {
      isDeleted: false,
      isSoftDeleted: false,
      ...(reqBody?._id
        ? { _id: new mongoose.Types.ObjectId(reqBody?._id) }
        : {})
    };
    userData = await Employees.findOne({
      ...obj,
      ...(reqBody.email ? { email: reqBody.email } : {})
    })
      .populate("pms_role_id", "role_name")
      .exec();

    if (!userData) {
      userData = await PMSClients.findOne({
        ...obj,
        ...(reqBody.email ? { email: reqBody.email } : {})
      })
        .populate("pms_role_id", "role_name")
        .exec();
    }

    return userData;
  } catch (error) {
    console.log("🚀 ~ exports.getDataForLoginUser=async ~ error:", error);
  }
};

exports.dataForJWT = async (userData) => {
  try {
    if (userData?.pms_role_id?.role_name == "Client") {
      userData = await PMSClients.findOne({
        _id: new mongoose.Types.ObjectId(userData._id)
      })
        .populate("pms_role_id", "role_name")
        .populate("companyId")
        .exec();
    } else {
      userData = await Employees.findOne({
        _id: new mongoose.Types.ObjectId(userData._id)
      })
        .populate("pms_role_id", "role_name")
        .populate("companyId")
        .exec();
    }

    return {
      _id: userData._id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      phone_number: userData.phone_number,
      companyId: userData?.companyId?._id,
      companyDetails: userData.companyId,
      ...(userData.full_name ? { full_name: userData.full_name } : {}),
      ...(userData.emp_img ? { emp_img: userData.emp_img } : {}),
      ...(userData.pms_role_id ? { pms_role_id: userData.pms_role_id } : {})
    };
  } catch (error) {
    console.log("🚀 ~dataForJWT :  error:", error);
  }
};

exports.updatePassword = async (req, res) => {
  const validationSchema = Joi.object({
    oldpassword: Joi.string().required(),
    newPassword: Joi.string().required()
  });

  const { error, value } = validationSchema.validate(req.body);
  if (error) {
    return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
  }

   // Decode user from token
   const {
    _id: decodedUserId,
    pms_role_id: { _id: roleId, role_name: roleName } = {},
    companyId: decodedCompanyId
  } = req.user || {};

  let userData = null;

  // Check in Employees
  userData = await Employees.findById(decodedUserId);

  if (!userData) {
    // If not found in Employees, check in PMSClients
    userData = await PMSClients.findById(decodedUserId);
  }
  
  
  userData.comparePassword(value.newPassword, async function (error, isMatch) {
    if (isMatch) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.PASSWORD_SAME);
    }

    userData.comparePassword(
      value.oldpassword,
      async function (error, isMatch) {
        if (error || !isMatch) {
          return errorResponse(
            res,
            statusCode.NOT_FOUND,
            messages.PASSWORD_WRONG
          );
        } else {
          userData.password = value.newPassword;
          const result = await userData.save();

          if (result) {
            return successResponse(
              res,
              statusCode.SUCCESS,
              messages.PASSWORD_CHANGED_SUCCESS
            );
          }
        }
      }
    );
  });
};

exports.forgotPassword = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      email: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    let userData = null;

    // Check in Employees
    userData = await Employees.findOne({
      email: value.email.toLowerCase(),
      isSoftDeleted: false,
      isActivate: true
    });

    if (!userData) {
      // If not found in Employees, check in PMSClients
      userData = await PMSClients.findOne({
        email: value.email.toLowerCase(),
        isSoftDeleted: false,
        isActivate: true
      });
    }

    if (!userData) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.EMAIL_INVALID);
    }
    var emailResetToken = "";
    var useCharacters = "1234567890";
    for (var i = 0; i < 6; i++) {
      emailResetToken += useCharacters.charAt(
        Math.floor(Math.random() * useCharacters.length)
      );
    }
    let jwtData = {
      passwordResetToken: emailResetToken
    };

    userData.resetCode = jwtData.passwordResetToken;
    const result = await userData.save();

    if (result) {
      const authToken = jwt.sign(jwtData, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h"
      });
      await emailSenderForPMS(
        result.companyId,
        userData.email,
        forgetPasswordContent(userData, authToken),
        []
      );

      return successResponse(res, statusCode.SUCCESS, messages.MAIL_SENT);
    }
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.jwtTokenVerifier = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        reject("Failed to authenticate token.");
      } else {
        resolve(decoded);
      }
    });
  });
};

exports.resetPassword = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      password: Joi.string().required(),
      emailResetToken: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    let passwordResetToken = null;

    const decoded = await this.jwtTokenVerifier(value.emailResetToken);

    if (decoded && decoded.passwordResetToken) {
      passwordResetToken = decoded.passwordResetToken;
    }

    if (passwordResetToken) {
      let userData = null;

      // Check in Employees
      userData = await Employees.findOne({
        resetCode: passwordResetToken
      });

      if (!userData) {
        // If not found in Employees, check in PMSClients
        userData = await PMSClients.findOne({
          resetCode: passwordResetToken
        });
      }

      if (userData) {
        userData.resetCode = null;
        userData.password = value.password;
        const result = await userData.save();

        if (result) {
          await emailSenderForPMS(
            result.companyId,
            userData.email,
            resetPasswordContent(userData),
            []
          );

          return successResponse(
            res,
            statusCode.SUCCESS,
            messages.PASSWORD_CHANGED_SUCCESS
          );
        } else {
          return errorResponse(
            res,
            statusCode.BAD_REQUEST,
            messages.BAD_REQUEST
          );
        }
      } else {
        return errorResponse(res, statusCode.FORBIDDEN, messages.RESET_TOKEN);
      }
    } else {
      return errorResponse(res, statusCode.FORBIDDEN, messages.EXPIRED_TOKEN);
    }
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.checkUserIsAdmin = async (userId) => {
  try {
    let isAdmin = false;
    const loginUser = await this.getDataForLoginUser({
      _id: userId
    });

    if (
      loginUser &&
      loginUser?.pms_role_id?.role_name === config.PMS_ROLES.ADMIN
    )
      isAdmin = true;
    console.log("🚀 ~ exports.checkUserIsAdmin= ~ isAdmin:", isAdmin);

    return isAdmin;
  } catch (error) {
    console.log("🚀 ~ exports.checkUserIsAdmin= ~ error:", error);
  }
};

exports.checkUserIsSuperAdmin = async (userId) => {
  try {
    let isSuperAdmin = false;
    const loginUser = await this.getDataForLoginUser({
      _id: userId
    });

    if (
      loginUser &&
      loginUser?.pms_role_id?.role_name === config.PMS_ROLES.SUPER_ADMIN
    )
      isSuperAdmin = true;
    console.log(
      "🚀 ~ exports.checkUserIsSuperAdmin= ~ isSuperAdmin:",
      isSuperAdmin
    );

    return isSuperAdmin;
  } catch (error) {
    console.log("🚀 ~ exports.checkUserIsSuperAdmin= ~ error:", error);
  }
};
