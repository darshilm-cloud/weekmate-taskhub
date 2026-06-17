const jwt = require("jsonwebtoken");
const { errorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const { employeeSchema } = require("../models");
const config = require("../settings/config.json");
const { isCompanyAccessBlocked } = require("../helpers/companyAccess");

class Authentication {
  // Method to verify a JWT token
  authentication(req, res, next) {
    const authHeader = req.headers["authorization"];
    const isSuperAdmin = req.headers["x-super-admin"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      // Using Response class for a detailed error response
      return errorResponse(res, statusCode.UNAUTHORIZED, messages.UNAUTHORIZED);
    }

    return new Promise((resolve, reject) => {
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,async (err, data) => {
        if (err) {
          // Using Response class for consistent error handling
          return errorResponse(res, statusCode.FORBIDDEN, messages.FORBIDDEN);
        }
        // const userData = await employeeSchema
        //   .findById(data._id)
        //   .select("isDeleted isActivate")
        //   .lean();  // Returns plain JavaScript object, faster
        
        // if (!userData || !userData.isActivate || userData.isDeleted) {
        //   return errorResponse(res, statusCode.UNAUTHORIZED, messages.UNAUTHORIZED);
        // }
  
        if(isSuperAdmin){
          req.user = data;
          next()
          return resolve();
        }

        // Reject sessions whose company was deactivated/deleted centrally
        // (app.weekmate.in). Super Admins have no tenant to gate, so skip them.
        const roleName = data?.pms_role_id?.role_name;
        if (roleName !== config.PMS_ROLES.SUPER_ADMIN && data?.companyId) {
          const blocked = await isCompanyAccessBlocked(data.companyId);
          if (blocked) {
            errorResponse(res, statusCode.FORBIDDEN, messages.COMPANY_ACCESS_REVOKED);
            return resolve();
          }
        }

        req.user = data;
        next()
        return resolve();
      });
    })

   
  }
}

module.exports = new Authentication();
