const nodemailer = require('nodemailer');
const {
    SMTP
} = require("../models");
const { catchBlockErrorResponse, successResponse, errorResponse } = require('../helpers/response');
const { statusCode } = require('../helpers/constant');
const { LISTING } = require('../helpers/messages');
const { getSMTPConfigSchema } = require('../validation');
const { validateFormatter } = require('../configs');

// The saved password never goes back to the browser — only whether one exists.
const toClientConfig = (config) => {
  if (!config) return config;
  const { smtpPassword, ...rest } = typeof config.toObject === "function" ? config.toObject() : config;
  return { ...rest, smtpPasswordSet: Boolean(smtpPassword) };
};

const describeSmtpError = (error) => {
  if (error.code === 'ENOTFOUND') return 'SMTP host not found. Check hostname.';
  if (error.code === 'EAUTH') return 'Authentication failed. Check email or app password.';
  if (error.code === 'ETIMEDOUT') return 'Connection timeout. Check port, host, or firewall.';
  return `SMTP Error: ${error.message || 'Unknown error'}`;
};

// Configure SMTP
exports.configureSmtp = async (req, res) => {
  try {
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    const { error, value } = validateFormatter(getSMTPConfigSchema(), req.body);

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const { smtpHost, smtpPort, smtpEmail, smtpSecure, fromName = "" } = value;

    // Blank password = keep the saved one (the client never receives it).
    const existingConfig = await SMTP.findOne({ companyId });
    const smtpPassword = value.smtpPassword || existingConfig?.smtpPassword;
    if (!smtpPassword) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Password is required");
    }


    const parsedPort = parseInt(smtpPort);
    // secure: true for port 465, false for 587/25
    const isSecure = parsedPort === 465;

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parsedPort,
      secure: isSecure,
      auth: { user: smtpEmail, pass: smtpPassword },
      connectionTimeout: 10000, // 10 seconds
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection
    await transporter.verify();

    transporter.close();

    let smtpConfig;

    if (existingConfig) {
      // Update existing config
      smtpConfig = await SMTP.findOneAndUpdate(
        { companyId },
        {
          smtpHost,
          smtpPort: parsedPort,
          smtpEmail,
          smtpPassword,
          smtpSecure: isSecure,
          fromName
        },
        { new: true }
      );
    } else {
      // Create new config
      smtpConfig = await SMTP.create({
        companyId,
        smtpHost,
        smtpPort: parsedPort,
        smtpEmail,
        smtpPassword,
        smtpSecure: isSecure,
        fromName
      });
    }

    return successResponse(res, statusCode.SUCCESS, 'SMTP configured successfully!', toClientConfig(smtpConfig));

  } catch (error) {
    console.error('SMTP Error:', error);

    return errorResponse(res, statusCode.BAD_REQUEST, describeSmtpError(error));
  }
};

// Get SMTP config API
exports.getSmtpConfig = async (req, res) => {
  try {
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId
    } = req.user || {};

    if (!companyId) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Company not found");
    }

    const smtpConfig = await SMTP.findOne({ companyId: newObjectId(companyId) }).lean();

    if (!smtpConfig) {
      return errorResponse(res, statusCode.NOT_FOUND, "SMTP not found");
    }

    return successResponse(res, statusCode.SUCCESS, LISTING, toClientConfig(smtpConfig));
  } catch (err) {
    console.error("Error fetching SMTP config:", err.message);
    return catchBlockErrorResponse(
      res,
      err.message
    );
  }
};

// Live check of the saved SMTP settings (Settings page "Connected" status).
exports.verifySmtp = async (req, res) => {
  try {
    const { companyId } = req.user || {};
    if (!companyId) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Company not found");
    }

    const config = await SMTP.findOne({ companyId: newObjectId(companyId) }).lean();
    if (!config) {
      return errorResponse(res, statusCode.NOT_FOUND, "SMTP not found");
    }

    const parsedPort = parseInt(config.smtpPort);
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parsedPort,
      secure: parsedPort === 465,
      auth: { user: config.smtpEmail, pass: config.smtpPassword },
      connectionTimeout: 10000,
      tls: { rejectUnauthorized: false }
    });

    try {
      await transporter.verify();
      return successResponse(res, statusCode.SUCCESS, "SMTP connection verified", { connected: true });
    } catch (error) {
      return successResponse(res, statusCode.SUCCESS, "SMTP connection failed", {
        connected: false,
        reason: describeSmtpError(error)
      });
    } finally {
      transporter.close();
    }
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};
