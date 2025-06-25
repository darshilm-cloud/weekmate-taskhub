const jwt = require("jsonwebtoken");
const { errorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");

class Authentication {
  // Method to verify a JWT token
  authentication(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      // Using Response class for a detailed error response
      return errorResponse(res, statusCode.UNAUTHORIZED, messages.UNAUTHORIZED);
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
      if (err) {
        // Using Response class for consistent error handling
        return errorResponse(res, statusCode.FORBIDDEN, messages.FORBIDDEN);
      }
      req.user = data;
      next();
    });
  }
}

module.exports = new Authentication();
