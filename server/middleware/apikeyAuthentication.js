const jwt = require("jsonwebtoken");
const { errorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");

class APIKeyAuthentication {
  // Method to verify a JWT token
  apikeyauthentication(req, res, next) {
    const authHeader = req.headers["x-api-key"];
    const apikey = authHeader;
    if (!apikey) {
      // Using Response class for a detailed error response
      return errorResponse(
        res,
        statusCode.UNAUTHORIZED,
        messages.UNAUTHORIZED_KEY
      );
    }

    if (apikey != process.env.API_KEY) {
      return errorResponse(res, statusCode.FORBIDDEN, messages.FORBIDDEN_KEY);
    }
    // req.user = ""
    next();
  }
}

module.exports = new APIKeyAuthentication();
