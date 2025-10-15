const Joi = require("joi");

class Validator {
  emailValidator = () => {
    return Joi.string().email().trim().required().messages({
      "string.empty": "Email is required",
      "string.email": "Invalid email format"
    });
  };

  passwordValidator = (Message) => {
    return Joi.string().min(8).trim().required().messages({
      "string.empty": Message,
      "string.min": "Password must be at least 8 characters long"
    });
  };

  getResetPasswordSchema = () => {
    return Joi.object({
      token: Joi.string().required().messages({
        "any.required": "Token is required",
        "string.base": "Token must be a string"
      }),
      newPassword: Joi.string().min(6).required().messages({
        "any.required": "New password is required",
        "string.min": "Password must be at least 6 characters"
      })
    });
  };

  /**
   * Get the schema for admin and company registration
   * @returns {Object} Joi schema object
   */
  getRegistrationSchema = () => {
    return Joi.object({
      adminDetails: Joi.object({
        first_name: Joi.string().required().label("First name is required"),
        last_name: Joi.string().required().label("Last name is required"),
        email: Joi.string().email().trim().required().messages({
          "string.empty": "Email is required",
          "string.email": "Invalid email format"
        }),
        phone_number: Joi.string().trim().required().messages({
          "string.empty": "Phone Number is required",
        }),
        password: Joi.string().trim().min(8).required().messages({
          "string.empty": "Password is required",
          "string.min": "Password must be at least 8 characters long"
        })
      }).required(),

      companyDetails: Joi.object({
        companyName: Joi.string().required().label("Company name is required"),
        companyDomain: Joi.string().required().label("Company slug is required"),
      }).required()
    });
  };

  /**
   * Get the schema for user login validation
   * @returns {Object} Joi schema object
   */
  getLoginSchema = () => {
    return Joi.object({
      email: this.emailValidator("Email is required"),
      password: this.passwordValidator("Password is required"),
      slug: Joi.string().optional(), // For mobile device identification
      deviceId: Joi.string().optional(), // For mobile device identification
      fcmToken: Joi.string().optional() // FCM token for push notifications
    });
  };

  /**
   * Get the schema for user edit phone number OTP verify validation
   * @returns {Object} Joi schema object
   */
  getChangePasswordSchema = () => {
    return Joi.object({
      oldPassword: this.passwordValidator("Old password is required"),
      newPassword: this.passwordValidator("New password is required")
    });
  };

  /**
   * Get the schema for password validation
   * @returns {Object} Joi schema object
   */
  getPasswordSchema = () => {
    return Joi.object({
      newPassword: this.passwordValidator("Password is required")
    });
  };

  /**
   * Get the schema for user add validation
   * @returns {Object} Joi schema object
   */
  getAddUserSchema = () => {
    return Joi.object({
      email: this.emailValidator("Email is required"),
      password: this.passwordValidator("Password is required"),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      companyId: Joi.string().required("Company ID is required"),
      pmsRoleId: Joi.string().required("Role is required"),
    });
  };

   /**
   * Get the schema for user edit validation
   * @returns {Object} Joi schema object
   */
   getEditUserSchema = () => {
    return Joi.object({
      email: this.emailValidator("Email is required"),
      companyId: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      isActivate: Joi.boolean().required(),
      pmsRoleId: Joi.string().required("Role is required"),
    });
  };

  getEditEmpSchema = () => {
    return Joi.object({
      email: this.emailValidator("Email is required"),
      companyId: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      isActivate: Joi.boolean().required(),
    });
  };

  getAddCompanySchema = () => {
    return Joi.object({
      companyName: Joi.string().required()
    });
  };

  fileUploadSizeSchema = () => {
    return Joi.object({
      fileUploadSize: Joi.number().min(1).max(80).required().messages({
        "number.base": "File upload size must be a number.",
        "number.min": "File upload size must be at least 1 MB.",
        "number.max": "File upload size must be at most 80 MB.",
        "any.required": "File upload size is required."
      })
    });
  };

  getAddUserSchemaCSV = () => {
    return Joi.object({
      Email: this.emailValidator("Email is required"),
      Password: this.passwordValidator("Password is required"),
      "First Name": Joi.string().trim().required(),
      "Last Name": Joi.string().trim().required().replace(/\s+/g, "_")
    });
  };

   /**
   * Get the schema for admin add validation
   * @returns {Object} Joi schema object
   */
   getAddAdminSchema = () => {
    return Joi.object({
      email: this.emailValidator("Email is required"),
      password: this.passwordValidator("Password is required"),
      firstName: Joi.string().required(),
      lastName: Joi.string().required()
    });
  };

  getEditAdminSchema = () => {
    return Joi.object({
      email: this.emailValidator("Email is required"),
      password: Joi.string().optional(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      isActivate: Joi.boolean().optional()
    });
  };

  getSMTPConfigSchema = () => {
    return Joi.object({
      smtpHost: Joi.string().required(),
      smtpPort: Joi.number().required(),
      smtpEmail: Joi.string().required(),
      smtpPassword: Joi.string().required(),
      smtpSecure: Joi.boolean().required(),
      fromName: Joi.string().required(),
    });
  };
}

module.exports = new Validator();
