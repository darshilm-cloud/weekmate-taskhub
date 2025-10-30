const mongoose = require("mongoose");
const messages = require("../helpers/messages");
const { statusCode } = require("../helpers/constant");
const { successResponse, errorResponse } = require("../helpers/response");
const Models = require("../models");

class MaintenanceController {
  async deleteCompanyData(req, res) {
    try {
      const { companyId } = req.body || {};

      if (!companyId || !global.validObjectId(companyId)) {
        return errorResponse(res, statusCode.BAD_REQUEST, "Invalid or missing companyId");
      }

      const companyObjectId = global.newObjectId(companyId);

      const session = await mongoose.startSession();
      await session.withTransaction(async () => {
        const modelEntries = Object.entries(Models);

        for (const [, model] of modelEntries) {
          if (!model || !model.schema || !model.schema.paths) continue;

          const hasCompanyIdPath = Object.prototype.hasOwnProperty.call(model.schema.paths, "companyId");

          if (hasCompanyIdPath) {
            await model.deleteMany({ companyId: companyObjectId }).session(session);
          }
        }

        if (Models.CompanyModel) {
          await Models.CompanyModel.deleteOne({ _id: companyObjectId }).session(session);
        }
      });
      session.endSession();

      return successResponse(res, statusCode.SUCCESS, messages.DELETED, { companyId });
    } catch (err) {
      return errorResponse(res, statusCode.SERVER_ERROR, err && err.message ? err.message : messages.SERVER_ERROR);
    }
  }
}

module.exports = new MaintenanceController();


