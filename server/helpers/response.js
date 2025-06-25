const { statusCode } = require("./constant");
const resMsg = require("./messages");

class Response {
  successResponse(
    res,
    statusCode = 200,
    message,
    data,
    metadata,
    permissions = [],
    pms_role_id = ""
  ) {
    res.status(statusCode).send({
      statusCode: statusCode,
      status: 1,
      message: message,
      data: data ? data : [],
      metadata: metadata ? metadata : [],
      permissions,
      pms_role_id,
    });
  }
  errorResponse(
    res,
    status = statusCode.SERVER_ERROR,
    errMessage = resMsg.SERVER_ERROR,
    data = []
  ) {
    res.status(status).send({
      statusCode: status,
      status: 0,
      message: errMessage,
      data: data,
    });
  }
  catchBlockErrorResponse(
    res,
    errMessage = resMsg.SERVER_ERROR,
    status = statusCode.SERVER_ERROR,
    data = []
  ) {
    res.status(status).send({
      statusCode: status,
      status: 0,
      message: errMessage,
      data: data,
    });
  }
}

module.exports = new Response();
