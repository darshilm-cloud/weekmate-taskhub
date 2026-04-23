const nodemailer = require('nodemailer');
const {
    SMTP
} = require("../models");
const { catchBlockErrorResponse, successResponse, errorResponse } = require('../helpers/response');
const { statusCode } = require('../helpers/constant');
const { LISTING } = require('../helpers/messages');
const { getSMTPConfigSchema } = require('../validation');
const { validateFormatter } = require('../configs');

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

     const { smtpHost, smtpPort, smtpEmail, smtpPassword, smtpSecure, fromName } = value;


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

    // Check if config exists
    const existingConfig = await SMTP.findOne({ companyId });

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

    return successResponse(res, statusCode.SUCCESS, 'SMTP configured successfully!', smtpConfig);

  } catch (error) {
    console.error('SMTP Error:', error);

    let message = 'SMTP configuration failed';
    if (error.code === 'ENOTFOUND') {
      message = 'SMTP host not found. Check hostname.';
    } else if (error.code === 'EAUTH') {
      message = 'Authentication failed. Check email or app password.';
    } else if (error.code === 'ETIMEDOUT') {
      message = 'Connection timeout. Check port, host, or firewall.';
    } else {
      message = `SMTP Error: ${error.message || 'Unknown error'}`;
    }

    return errorResponse(res, statusCode.BAD_REQUEST, message);
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

    return successResponse(res, statusCode.SUCCESS, LISTING, smtpConfig);
  } catch (err) {
    console.error("Error fetching SMTP config:", err.message);
    return catchBlockErrorResponse(
      res,
      err.message
    );
  }
};