const { statusCode } = require("../helpers/constant");
const {
  successResponse,
  errorResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const { CompanyModel, employeeSchema, PMSRoles } = require("../models");
const CONFIG_JSON = require("../settings/config.json");
const CompanyRegistrationMail = require("../models/CompanyRegistrationMail");
const nodemailer = require("nodemailer");
const Joi = require("joi");

const validateFormatter = (schema, data) => {
  const options = {
    abortEarly: false, // Return all errors, not just the first
    allowUnknown: true, // Allow unknown fields in the req
  };

  const { error, value } = schema.validate(data, options);
  if (error) {
    // Remove double quotes from error messages and convert to uppercase
    error.details.forEach((detail) => {
      detail.message = detail.message.replace(/\"/g, ""); // Format message
    });
  }
  return { error, value };
};

const getRegistrationSchema = () => {
  return Joi.object({
    adminDetails: Joi.object({
      first_name: Joi.string().required().label("First name is required"),
      last_name: Joi.string().required().label("Last name is required"),
      email: Joi.string().email().trim().required().messages({
        "string.empty": "Email is required",
        "string.email": "Invalid email format",
      }),
      password: Joi.string().trim().min(8).required().messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 8 characters long",
      })
    }).required(),

    companyDetails: Joi.object({
      companyName: Joi.string().required().label("Company name is required"),
      companyEmail: Joi.string().email().required().messages({
        "string.empty": "Email is required",
        "string.email": "Invalid email format",
      })
    }).required(),
  });
};

// Register a company details API
exports.registerAdminAndCompany = async (req, res) => {
  try {
    const { error, value } = validateFormatter(
      getRegistrationSchema(),
      req.body
    );
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const {
      adminDetails: { first_name, last_name, email, password },
      companyDetails: { companyName, companyEmail },
    } = value;

    // 🔍 Check if admin email already exists in main database
    const existingUser = await employeeSchema.findOne({ email });
    if (existingUser) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        "Admin email already exists."
      );
    }

  
    // 🔍 Check if company name already exists in main database
    const existingCompanyName = await CompanyModel.findOne({ companyName });
    if (existingCompanyName) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        "Company name already exists."
      );
    }

    // 🔍 Check if company email already exists in main database
    const existingCompanyEmail = await CompanyModel.findOne({ companyEmail });
    if (existingCompanyEmail) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        "Company email already exists."
      );
    }


    // 🔍 Check if admin email exists in temporary registrations
    const existingTempEmail = await CompanyRegistrationMail.findOne({
      "adminDetails.email": email,
    });
    if (existingTempEmail) {
      return successResponse(
        res,
        statusCode.SUCCESS,
        "Please check your email. We have already sent a verification link to complete your registration.",
        {
          message: "Verification email already sent",
          email: email,
        }
      );
    }

    // 📧 Generate verification token
    const crypto = require("crypto");
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // 💾 Store temporary registration data
    const tempRegistration = await new CompanyRegistrationMail({
      adminDetails: { first_name, last_name, email, password },
      companyDetails: { companyName, companyEmail },
      verificationToken,
    }).save();

    // 📧 Send verification email
    const verificationLink = `${process.env.HOST_ORIGIN_URL}/${verificationToken}`;

    // Replace this with your email service
    await sendVerificationEmail({
      to: email,
      subject: "Verify Your Company Registration",
      verificationLink,
      companyName,
      fullName: `${first_name} ${last_name}`
    });

    // ✅ Success response
    return successResponse(
      res,
      statusCode.SUCCESS,
      "Registration initiated successfully. Please check your email to verify and complete the registration.",
      {
        message: "Verification email sent",
        email: email,
      }
    );
  } catch (err) {
    console.log(err.message, "err.message", err);
    return catchBlockErrorResponse(
      res,
      err.message,
    );
  }
};

// Verify the company details API
exports.verifyAndCompleteRegistration = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Verification token is required.");
    }

    // 🔍 Find the temporary registration
    const tempRegistration = await CompanyRegistrationMail.findOne({ 
      verificationToken: token 
    });

    if (!tempRegistration) {
      return errorResponse(res, statusCode.BAD_REQUEST, 
        "Email is already verified or token expired");
    }

    const {
      adminDetails: { first_name, last_name, email, password },
      companyDetails: { companyName, companyEmail }
    } = tempRegistration;

    // Double-check if user/company was created while token was pending
    const existingUser = await employeeSchema.findOne({ email });
    if (existingUser) {
      await CompanyRegistrationMail.deleteOne({ _id: tempRegistration._id });
      return errorResponse(res, statusCode.CONFLICT, "Admin email already exists.");
    }

    const existingCompany = await CompanyModel.findOne({
      $or: [{ companyEmail }]
    });

    if (existingCompany) {
      await CompanyRegistrationMail.deleteOne({ _id: tempRegistration._id });
      return errorResponse(res, statusCode.CONFLICT, "Company name already exists.");
    }

    // ✅ Create company
    const company = await new CompanyModel({
      companyName,
      companyEmail
    }).save();

    // 🔍 Find admin role
    const role = await PMSRoles.findOne({ role_name: CONFIG_JSON.PMS_ROLES.ADMIN });

    // ✅ Create admin user
    const newUser = await new employeeSchema({
      first_name,
      last_name,
      email,
      password,
      companyId: company._id,
      pms_role_id: role._id,
      isActive: true,
      isAdmin:true
    }).save();

    // 🔄 Aggregate enriched user details
    const userDetails = await employeeSchema.aggregate([
      { $match: { _id: newUser._id } },
      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          as: "roles"
        }
      },
      { $unwind: "$roles" },
      {
        $lookup: {
          from: "companies",
          localField: "companyId",
          foreignField: "_id",
          as: "companyDetails"
        }
      },
      { $unwind: "$companyDetails" },
      {
        $project: {
          _id: 1,
          lastName: 1,
          firstName: 1,
          email: 1,
          status: 1,
          isActive: 1,
          lastActiveTime: 1,
          createdAt: 1,
          updatedAt: 1,
          position: 1,
          roleId: "$roles._id",
          roleName: "$roles.roleName",
          companyId: "$companyDetails._id",
          companyName: "$companyDetails.companyName",
          companyEmail: "$companyDetails.companyEmail",
        }
      }
    ]);

    const enrichedUser = userDetails[0];

    // 🗑️ Clean up temporary registration
    await CompanyRegistrationMail.deleteOne({ _id: tempRegistration._id });

    
    // ✅ Success response
    return successResponse(res, statusCode.SUCCESS, "Registration completed successfully", {
      user: enrichedUser
    });

  } catch (err) {
    console.log(err.message, 'err.message', err);
    return catchBlockErrorResponse(
      res,
      err.message
    );
  }
};

// Email service function (replace with your email provider)
async function sendVerificationEmail({
  to,
  subject,
  verificationLink,
  companyName,
  fullName,
}) {
  // Replace this with your email service (SendGrid, AWS SES, Nodemailer, etc.)
  const emailContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
    <h2 style="color: #2e6bba;">Welcome, ${fullName}!</h2>
    
    <p style="font-size: 16px; color: #333;">
      Thank you for registering your company <strong>"${companyName}"</strong> with us.
    </p>

    <p style="font-size: 16px; color: #333;">
      To complete your registration, please verify your email address by clicking the button below:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationLink}" target="_blank" style="
        background-color: #2e6bba;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
        font-size: 16px;
        display: inline-block;">
        Verify Your Email
      </a>
    </div>

    <p style="font-size: 14px; color: #666;">
      🔒 This verification link will expire in <strong>10 minutes</strong> for your security.
    </p>

    <p style="font-size: 14px; color: #666;">
      If you did not initiate this registration, you can safely ignore this email.
    </p>

    <hr style="margin: 30px 0;" />

    <p style="font-size: 12px; color: #999; text-align: center;">
      &copy; ${new Date().getFullYear()} Econnect. All rights reserved.
    </p>
  </div>
`;

  // Your email sending logic here
  console.log("Sending email to:", to);
  console.log("Verification link:", verificationLink);

  // Example with nodemailer (uncomment and configure):

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true", // convert to boolean
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  let datatransporter = await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: to,
    subject: subject,
    html: emailContent,
  });
  console.log(datatransporter, "datatransporter");
}