const { statusCode } = require("../helpers/constant");
const {
  successResponse,
  errorResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const { CompanyModel, employeeSchema, PMSRoles } = require("../models");
const CONFIG_JSON = require("../settings/config.json");
const CompanyRegistrationMail = require("../models/CompanyRegistrationMail");
const nodemailer = require("nodemailer");
const { getRegistrationSchema } = require("../validation");
const { validateFormatter } = require("../configs");
const {
  addDefaultProjectStatus,
  addDefaultPermission
} = require("../helpers/common");
const { CompanyWelcomeMail } = require("../template/companyWelcomeMail");
const { dataForJWT, getUserPermissions } = require("./authentication");
const { createJWTToken } = require("../helpers/JWTToken");
const { OnboardMailForSupport } = require("../template/OnboardMailtoSupport");

// Register a company details API
exports.registerAdminAndCompanyOld = async (req, res) => {
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
      companyDetails: { companyName, companyDomain }
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

    // 🔍 Check if company name already exists in main database
    const existingCompanyDomain = await CompanyModel.findOne({ companyDomain });
    if (existingCompanyDomain) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        "Company domain or slug already exists, please try with different slug or domain"
      );
    }

    // 🔍 Check if admin email exists in temporary registrations
    const existingTempEmail = await CompanyRegistrationMail.findOne({
      "adminDetails.email": email
    });
    if (existingTempEmail) {
      return successResponse(
        res,
        statusCode.SUCCESS,
        "Please check your email. We have already sent a verification link to complete your registration.",
        {
          message: "Verification email already sent",
          email: email
        }
      );
    }

    // 📧 Generate verification token
    const crypto = require("crypto");
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // 💾 Store temporary registration data
    const tempRegistration = await new CompanyRegistrationMail({
      adminDetails: { first_name, last_name, email, password },
      companyDetails: { companyName, companyDomain },
      verificationToken
    }).save();

    // 📧 Send verification email
    const verificationLink = `${process.env.HOST_ORIGIN_URL}/${companyDomain}/signin/${verificationToken}`;

    // Replace this with your email service
    await sendVerificationEmail({
      to: email,
      subject: "Verify Your Company Registration",
      verificationLink,
      companyName,
      fullName: `${first_name} ${last_name}`,
      companyDomain
    });

    // ✅ Success response
    return successResponse(
      res,
      statusCode.SUCCESS,
      "Registration initiated successfully. Please check your email to verify and complete the registration.",
      {
        message: "Verification email sent",
        email: email
      }
    );
  } catch (err) {
    console.log(err.message, "err.message", err);
    return catchBlockErrorResponse(res, err.message);
  }
};

// Verify the company details API
exports.verifyAndCompleteRegistration = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        "Verification token is required."
      );
    }

    // 🔍 Find the temporary registration
    const tempRegistration = await CompanyRegistrationMail.findOne({
      verificationToken: token
    });

    if (!tempRegistration) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        "Email is already verified or token expired"
      );
    }

    const {
      adminDetails: { first_name, last_name, email, password },
      companyDetails: { companyName, companyDomain }
    } = tempRegistration;

    // Double-check if user/company was created while token was pending
    const existingUser = await employeeSchema.findOne({ email });
    if (existingUser) {
      await CompanyRegistrationMail.deleteOne({ _id: tempRegistration._id });
      return errorResponse(
        res,
        statusCode.CONFLICT,
        "Admin email already exists."
      );
    }

    // ✅ Create company
    const company = await new CompanyModel({
      companyName,
      companyDomain
    }).save();

    // 🔍 Find admin role
    const role = await PMSRoles.findOne({
      role_name: CONFIG_JSON.PMS_ROLES.ADMIN
    });

    // ✅ Create admin user
    const newUser = await new employeeSchema({
      first_name,
      last_name,
      full_name: `${first_name} ${last_name}`,
      email,
      password,
      companyId: company._id,
      pms_role_id: role._id,
      isActivate: true,
      isAdmin: true
    }).save();

    // 🔄 Aggregate enriched user details
    const userDetails = await employeeSchema.aggregate([
      { $match: { _id: newUser._id } },
      {
        $lookup: {
          from: "pms_roles",
          localField: "pms_role_id",
          foreignField: "_id",
          as: "pms_role"
        }
      },
      { $unwind: "$pms_role" },
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
          last_name: 1,
          first_name: 1,
          email: 1,
          status: 1,
          isActivate: 1,
          isAdmin: 1,
          createdAt: 1,
          updatedAt: 1,
          position: 1,
          roleId: "$pms_role._id",
          roleName: "$pms_role.role_name",
          companyId: "$companyDetails._id",
          companyName: "$companyDetails.companyName"
        }
      }
    ]);

    const enrichedUser = userDetails[0];

    //Add default permission for users
    await addDefaultPermission(company._id, newUser._id);

    // Add default project status for company
    await addDefaultProjectStatus(company._id, newUser._id);

    // 🗑️ Clean up temporary registration
    await CompanyRegistrationMail.deleteOne({ _id: tempRegistration._id });

    // ✅ Success response
    return successResponse(
      res,
      statusCode.SUCCESS,
      "Registration completed successfully",
      {
        user: enrichedUser
      }
    );
  } catch (err) {
    console.log(err.message, "err.message", err);
    return catchBlockErrorResponse(res, err.message);
  }
};

// Register a company and admin directly (without verification)
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
      adminDetails: {
        first_name,
        last_name,
        email,
        phone_number,
        country_code,
        password,
        position
      },
      companyDetails: { companyName, companyDomain, companyId }
    } = value;

    // 🔍 Check if admin email already exists
    const existingUser = await employeeSchema.findOne({ email });
    if (existingUser) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        "Admin email already exists."
      );
    }
    // 🔍 Check if admin email already exists
    const existingPhoneNumber = await employeeSchema.findOne({ phone_number });
    if (existingPhoneNumber) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        "Admin phone number already exists."
      );
    }

    // 🔍 Check if company name already exists
    const existingCompanyName = await CompanyModel.findOne({ companyName });
    if (existingCompanyName) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        "Company name already exists."
      );
    }

    // 🔍 Check if company domain already exists
    const existingCompanyDomain = await CompanyModel.findOne({ companyDomain });
    if (existingCompanyDomain) {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        "Company domain or slug already exists, please try with different slug or domain"
      );
    }

    const data = {
      companyName,
      companyDomain
    }

    if(companyId) {
      data._id = companyId
    }
    // ✅ Create company directly
    const company = await new CompanyModel(data).save();

    // 🔍 Find admin role
    const role = await PMSRoles.findOne({
      role_name: CONFIG_JSON.PMS_ROLES.ADMIN
    });

    if (!role) {
      // Rollback company creation if role not found
      await CompanyModel.deleteOne({ _id: company._id });
      return errorResponse(
        res,
        statusCode.INTERNAL_SERVER_ERROR,
        "Admin role not found in system."
      );
    }

    // ✅ Create admin user directly (email pre-verified)
    const newUser = await new employeeSchema({
      first_name,
      last_name,
      full_name: `${first_name} ${last_name}`,
      email,
      phone_number,
      password,
      companyId: company._id,
      pms_role_id: role._id,
      isActivate: true,
      isAdmin: true,
      emailVerified: true, // Mark email as verified directly
      emailVerifiedAt: new Date() // Set verification timestamp
    }).save();

    // 🔄 Aggregate enriched user details
    const userDetails = await employeeSchema.aggregate([
      { $match: { _id: newUser._id } },
      {
        $lookup: {
          from: "pms_roles",
          localField: "pms_role_id",
          foreignField: "_id",
          as: "pms_role"
        }
      },
      { $unwind: "$pms_role" },
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
          last_name: 1,
          first_name: 1,
          full_name: 1,
          email: 1,
          phone_number: 1,
          status: 1,
          isActivate: 1,
          isAdmin: 1,
          emailVerified: 1,
          createdAt: 1,
          updatedAt: 1,
          position: 1,
          roleId: "$pms_role._id",
          roleName: "$pms_role.role_name",
          companyId: "$companyDetails._id",
          companyName: "$companyDetails.companyName",
          companyDomain: "$companyDetails.companyDomain"
        }
      }
    ]);

    const enrichedUser = userDetails[0];

    // Add default permissions for users
    await addDefaultPermission(company._id, newUser._id);

    // Add default project status for company
    await addDefaultProjectStatus(company._id, newUser._id);

    // 📧 Optional: Send welcome email (without verification requirement)
    try {
      await CompanyWelcomeMail(enrichedUser);
      await OnboardMailForSupport(enrichedUser);
      // 🌐 Make a POST API call
      const payload = {
        country_code,
        selectedProducts: ["PMS"],
        email,
        companyName,
        phoneNumber: phone_number,
        jobTitle: position,
        fullName: `${first_name} ${last_name}`
      };

      const response = await fetch(process.env.RESELLER_PANNEL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log("API Response:", result);
    } catch (emailError) {
      // Log email error but don't fail the registration
      console.log("Welcome email failed to send:", emailError.message);
    }

    const user = await dataForJWT(newUser);

    const auth_token = createJWTToken(
      user,
      157680000 // 5 year
    );
    // Get login user permissions..
    let permissions = await getUserPermissions(user._id, user.companyId);

    return successResponse(
      res,
      statusCode.SUCCESS,
      "Company account created successfully. You can now login to your account.",
      { user, auth_token },
      {},
      permissions,
      user?.pms_role_id?._id
    );
  } catch (err) {
    console.log(err.message, "err.message", err);

    // Enhanced error handling with rollback
    if (err.name === "ValidationError") {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        "Validation failed: " + err.message
      );
    }

    return catchBlockErrorResponse(res, err.message);
  }
};

// Email service function (replace with your email provider)
async function sendVerificationEmail({
  to,
  subject,
  verificationLink,
  companyName,
  fullName
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
      &copy; ${new Date().getFullYear()} Taskhub. All rights reserved.
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
      pass: process.env.SMTP_PASS
    }
  });

  let datatransporter = await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: to,
    subject: subject,
    html: emailContent
  });
  console.log(datatransporter, "datatransporter");
}
