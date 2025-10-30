const { errorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");

class PrivateKeyValidation {
  validate(req, res, next) {
    try {
      const providedKey = req.body && req.body.private_key ? String(req.body.private_key) : null;
      const expectedKey = process.env.PRIVATE_KEY || "";

      if (!providedKey) {
        return errorResponse(res, statusCode.UNAUTHORIZED, "Unauthorized: private_key not provided");
      }

      if (!expectedKey || providedKey !== expectedKey) {
        return errorResponse(res, statusCode.FORBIDDEN, "Forbidden: Invalid private_key");
      }

      next();
    } catch (err) {
      return errorResponse(res, statusCode.SERVER_ERROR, "Server error while validating private_key");
    }
  }
}

module.exports = new PrivateKeyValidation();


