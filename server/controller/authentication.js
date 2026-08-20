const {
  successResponse,
  catchBlockErrorResponse,
  errorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const nodeCrypto = require("crypto");
const RolePermissions = mongoose.model("role_permissions");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const { checkIsPMSClient } = require("./PMSRoles");
const Joi = require("joi");
const { createJWTToken, createSsoToken } = require("../helpers/JWTToken");
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
const { logLogin, logLogout, extractIpFromRequest } = require("../helpers/activityLoggerHelper");
const { isCompanyAccessBlocked } = require("../helpers/companyAccess");

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

    // Cross-product SSO tokens are slim ({ user: { email, companyId, isAdmin } })
    // and carry no _id, so resolve the real user document by email across both
    // Employees and PMSClients before building the session.
    const payloadUser =
      decodedToken.user || decodedToken.admin || decodedToken;
    const loginUser = await this.getDataForLoginUser({
      email: payloadUser?.email
    });
    if (!loginUser) {
      return errorResponse(
        res,
        statusCode.NOT_FOUND,
        messages.LOGIN_USER_NOT_FOUND
      );
    }

    // Block SSO sign-in when the company's TaskHub access was deactivated/deleted
    // in the central app. Super Admins have no tenant to gate, so skip them.
    if (
      loginUser?.pms_role_id?.role_name !== config.PMS_ROLES.SUPER_ADMIN &&
      (await isCompanyAccessBlocked(loginUser.companyId))
    ) {
      return errorResponse(
        res,
        statusCode.FORBIDDEN,
        messages.COMPANY_ACCESS_REVOKED
      );
    }

    const user = await this.dataForJWT(loginUser);
    // issue a long-lived token just like login
    const pmsUserToken = createJWTToken(
      user,
      157680000 // 5 year
    );

    // Mirror the cookie so this app can re-set / refresh the shared SSO token.
    const roleName = user?.pms_role_id?.role_name;
    const ssoToken = createSsoToken({
      email: user.email,
      companyId: user.companyId,
      isAdmin:
        roleName === config.PMS_ROLES.ADMIN ||
        roleName === config.PMS_ROLES.SUPER_ADMIN
    });

    // Get login user permissions..
    const permissions = await this.getUserPermissions(
      user?._id,
      user?.companyId
    );

    // Log login activity to keep parity with normal login flow
    await logLogin({
      _id: user._id,
      email: user.email,
      companyId: user.companyId
    }, extractIpFromRequest(req));

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.USER_LOGIN,
      { user, auth_token: pmsUserToken, ssoToken },
      {},
      permissions,
      user?.pms_role_id?._id || ""
    );
  } catch (error) {
    console.log("🚀 ~ exports.authenticationGetData= ~ error:", error);
    return errorResponse(res, statusCode.SERVER_ERROR, error.message);
  }
};

exports.getUserPermissions = async (userId, companyId) => {
  try {
    const loginUser = await this.getDataForLoginUser({ _id: userId });
    let permission = [];

    if (loginUser && loginUser?.pms_role_id) {
      const getPermissions = await RolePermissions.find({
        companyId: companyId,
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

    // Check email existence first (no status filters) so we can give a precise
    // error. Matched case-insensitively (lowercase both sides) to stay consistent
    // with getDataForLoginUser and cover legacy mixed-case rows.
    const emailMatch = {
      $expr: { $eq: [{ $toLower: "$email" }, value.email.trim().toLowerCase()] }
    };
    const emailExists =
      (await Employees.findOne(emailMatch)) ||
      (await PMSClients.findOne(emailMatch));

    if (!emailExists) {
      return errorResponse(
        res,
        statusCode.NOT_FOUND,
        "Your login id is invalid."
      );
    }

    const loginUser = await this.getDataForLoginUser(value);
    console.log("🚀 ~ loginUser:", loginUser)
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

    // Block login when the company's TaskHub access was deactivated/deleted in
    // the central app. Super Admins have no tenant to gate, so skip them.
    if (
      loginUser?.pms_role_id?.role_name !== config.PMS_ROLES.SUPER_ADMIN &&
      (await isCompanyAccessBlocked(loginUser.companyId))
    ) {
      return errorResponse(
        res,
        statusCode.FORBIDDEN,
        messages.COMPANY_ACCESS_REVOKED
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
          console.log("🚀 ~ user:", user)
          const auth_token = createJWTToken(
            user,
            157680000 // 5 year
          );
          const ssoToken = createSsoToken({
            email: user.email,
            companyId: user.companyId,
            isAdmin:
              user?.pms_role_id?.role_name === config.PMS_ROLES.ADMIN ||
              user?.pms_role_id?.role_name === config.PMS_ROLES.SUPER_ADMIN
          });
          // Get login user permissions..
          let permissions = await module.exports.getUserPermissions(
            user._id,
            user.companyId
          );
          
          // Log login activity
          await logLogin({
            _id: user._id,
            email: user.email,
            companyId: user.companyId
          }, extractIpFromRequest(req));

          return successResponse(
            res,
            statusCode.SUCCESS,
            messages.USER_LOGIN,
            { user, auth_token, ssoToken },
            {},
            permissions,
            user?.pms_role_id?._id
          );
        }
      );
    } else {
      // if (!value?.slug) {
      //   return errorResponse(
      //     res,
      //     statusCode.BAD_REQUEST,
      //     "Please login with your company url"
      //   );
      // } else {
        // let getCompanyDetails = await Company.findOne({
        //   // companyDomain: value.slug,
        //   isActive: true
        // });

        // if (getCompanyDetails) {
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

              // if (
              //   user?.companyDetails?.companyDomain !==
              //   getCompanyDetails?.companyDomain
              // ) {
              //   return errorResponse(
              //     res,
              //     statusCode.NOT_FOUND,
              //     "You are not register in company"
              //   );
              // }

              const auth_token = createJWTToken(
                user,
                157680000 // 5 year
              );
              const ssoToken = createSsoToken({
                email: user.email,
                companyId: user.companyId,
                isAdmin:
                  user?.pms_role_id?.role_name === config.PMS_ROLES.ADMIN ||
                  user?.pms_role_id?.role_name === config.PMS_ROLES.SUPER_ADMIN
              });
              // Get login user permissions..
              let permissions = await module.exports.getUserPermissions(
                user._id,
                user.companyId
              );

              // Log login activity
              await logLogin({
                _id: user._id,
                email: user.email,
                companyId: user.companyId
              }, extractIpFromRequest(req));

              return successResponse(
                res,
                statusCode.SUCCESS,
                messages.USER_LOGIN,
                { user, auth_token, ssoToken },
                {},
                permissions,
                user?.pms_role_id?._id
              );
            }
          );
        // } else {
          // return errorResponse(
          //   res,
          //   statusCode.NOT_FOUND,
          //   "Company not found or you are not register in company"
          // );
        // }
      // }
    }
  } catch (error) {
    console.log("🚀 ~ exports.login= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getDataForLoginUser = async (reqBody) => {
  try {

    let userData = null;
    // Match email case-insensitively: lowercase the incoming value AND the stored
    // value ($toLower on "$email") so sign-in succeeds regardless of the casing
    // used at signup vs login, and even for legacy mixed-case rows in the DB.
    const emailLower = reqBody?.email
      ? String(reqBody.email).trim().toLowerCase()
      : null;
    let obj = {
      isDeleted: false,
      isSoftDeleted: false,
      isActivate: true,
      ...(reqBody?._id
        ? { _id: new mongoose.Types.ObjectId(reqBody?._id) }
        : {}),
      ...(emailLower
        ? { $expr: { $eq: [{ $toLower: "$email" }, emailLower] } }
        : {})
    };
    userData = await Employees.findOne(obj).populate("pms_role_id", "role_name");

    if (!userData) {
      userData = await PMSClients.findOne(obj).populate("pms_role_id", "role_name");
    }

    return userData;
  } catch (error) {
    console.log("🚀 ~ exports.getDataForLoginUser=async ~ error:", error);
  }
};

exports.dataForJWT = async (userData) => {
  try {
    let data = userData
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
    if( userData == null){
      userData = await Employees.findOne({
        email: data.email
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
      email: Joi.string().required(),
      companySlug: Joi.string().allow("").optional(),
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
    // Password-reset token. Generated with a CSPRNG, not Math.random(): this is
    // a credential, and Math.random() is predictable from prior outputs.
    // randomInt is rejection-sampled, so the digits stay uniform.
    var emailResetToken = "";
    var useCharacters = "1234567890";
    for (var i = 0; i < 6; i++) {
      emailResetToken += useCharacters.charAt(
        nodeCrypto.randomInt(useCharacters.length)
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
        forgetPasswordContent(userData, authToken, value.companySlug),
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

    return isAdmin;
  } catch (error) {
    console.log("🚀 ~ exports.checkUserIsAdmin= ~ error:", error);
    return false;
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
      loginUser?.pms_role_id?.role_name === config.PMS_ROLES.ADMIN
    )
      isSuperAdmin = true;

    return isSuperAdmin;
  } catch (error) {
    console.log("🚀 ~ exports.checkUserIsSuperAdmin= ~ error:", error);
  }
};

// Logout API
exports.logout = async (req, res) => {
  try {
    // Get user info from req.user (set by authentication middleware)
    if (!req.user || !req.user._id) {
      return errorResponse(
        res,
        statusCode.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    const userData = await module.exports.getDataForLoginUser({ _id: req.user._id });
    
    if (!userData) {
      return errorResponse(
        res,
        statusCode.NOT_FOUND,
        "User not found"
      );
    }

    // Get user data for logging
    const user = await module.exports.dataForJWT(userData);

    // Log logout activity
    await logLogout({
      _id: user._id,
      email: user.email,
      companyId: user.companyId
    }, extractIpFromRequest(req));

    return successResponse(
      res,
      statusCode.SUCCESS,
      "Logout successful"
    );
  } catch (error) {
    console.log("🚀 ~ exports.logout= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
