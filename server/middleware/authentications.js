const jwt = require("jsonwebtoken");
const { errorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const { employeeSchema } = require("../models");

class Authentication {
  // Method to verify a JWT token
  authentication(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      // Using Response class for a detailed error response
      return errorResponse(res, statusCode.UNAUTHORIZED, messages.UNAUTHORIZED);
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,async (err, data) => {
      if (err) {
        // Using Response class for consistent error handling
        return errorResponse(res, statusCode.FORBIDDEN, messages.FORBIDDEN);
      }
      const userData = await employeeSchema
        .findById(data._id)
        .select("isDeleted isActivate")
        .lean();  // Returns plain JavaScript object, faster
      
      if (!userData || !userData.isActivate || userData.isDeleted) {
        return errorResponse(res, statusCode.UNAUTHORIZED, messages.UNAUTHORIZED);
      }

      req.user = data;
      next();
    });
  }
}

module.exports = new Authentication();
