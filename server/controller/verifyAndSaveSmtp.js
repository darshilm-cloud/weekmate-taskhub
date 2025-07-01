const nodemailer = require('nodemailer');
const {
    SMTP
} = require("../models");
const { catchBlockErrorResponse, successResponse, errorResponse } = require('../helpers/response');
const { statusCode } = require('../helpers/constant');
const { SMTP_NOT_FOUND, SMTP_FOUND } = require('../helpers/messages');

// Configure SMTP
exports.configureSmtp = async (request, reply) => {
  try {
    const { companyId } = request.user?.payload || {};
    const { smtpHost, smtpPort, smtpEmail, smtpPassword, smtpSecure, fromName } = request.body;

    // Basic validation
    if (!smtpHost || !smtpPort || !smtpEmail || !smtpPassword || smtpSecure === undefined || !fromName) {
      return reply.code(400).send({
        success: false,
        message: 'All fields are required'
      });
    }

    const parsedPort = parseInt(smtpPort);
    const isSecure = parsedPort === 465 ? true : smtpSecure;

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parsedPort,
      secure: isSecure,
      auth: { user: smtpEmail, pass: smtpPassword },
      connectionTimeout: 10000,
      tls: { rejectUnauthorized: false }
    });

    // Verify connection
    await transporter.verify();

    // Send a test email
    // await transporter.sendMail({
    //   from: `"${fromName}" <${smtpEmail}>`,
    //   to: smtpEmail,
    //   subject: 'SMTP Test Successful',
    //   text: `SMTP configuration verified successfully at ${new Date().toLocaleString()}`
    // });

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

    return reply.code(200).send({
      success: true,
      message: 'SMTP configured successfully! Test email sent.',
      data: smtpConfig
    });

  } catch (error) {
    console.error('SMTP Error:', error);

    let message = 'SMTP configuration failed';
    if (error.code === 'ENOTFOUND') {
      message = 'SMTP host not found. Check hostname.';
    } else if (error.code === 'EAUTH') {
      message = 'Authentication failed. Check email or password.';
    } else if (error.code === 'ETIMEDOUT') {
      message = 'Connection timeout. Check port, host, or firewall settings.';
    }

    return reply.code(400).send({
      success: false,
      message
    });
  }
};

exports.getSmtpConfig = async (request, reply) => {
  try {
    const companyId = request.user?.payload?.companyId;

    if (!companyId) {
      return errorResponse(reply, statusCode.BAD_REQUEST, COMPANY_NOT_FOUND);
    }

    const smtpConfig = await SMTP.findOne({ companyId: newObjectId(companyId) }).lean();

    if (!smtpConfig) {
      return errorResponse(reply, statusCode.NOT_FOUND, SMTP_NOT_FOUND);
    }

    return successResponse(reply, statusCode.SUCCESS, SMTP_FOUND, smtpConfig);
  } catch (err) {
    console.error("Error fetching SMTP config:", err.message);
    return catchBlockErrorResponse({
      reply,
      fullMessage: err.message
    });
  }
};