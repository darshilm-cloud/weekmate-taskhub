/**
 * Per-user column visibility for listing tables (mirrors HRMS's
 * controller/columnPreference.js). One GET on page load, one PUT per Save.
 */
const Joi = require("joi");
const mongoose = require("mongoose");
const ColumnPreference = require("../models/columnPreference");
const { successResponse, errorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");

const pageKeySchema = Joi.object({
  pageKey: Joi.string().trim().max(100).required(),
});

const bodySchema = Joi.object({
  visibleColumns: Joi.array().items(Joi.string().max(100)).max(200).required(),
});

const ownerFilter = (req, pageKey) => {
  const companyId = req.user?.companyId;
  return {
    companyId: companyId ? new mongoose.Types.ObjectId(companyId) : null,
    userId: new mongoose.Types.ObjectId(req.user._id),
    pageKey,
  };
};

/** GET /v1/column-preference/:pageKey — `visibleColumns` is null until the user saves. */
exports.getColumnPreference = async (req, res) => {
  try {
    const { error, value } = pageKeySchema.validate(req.params);
    if (error) return errorResponse(res, statusCode.BAD_REQUEST, error.message);
    if (!req.user?._id) return errorResponse(res, statusCode.BAD_REQUEST, "User context not found");

    const preference = await ColumnPreference.findOne(ownerFilter(req, value.pageKey))
      .select("visibleColumns")
      .lean();

    return successResponse(res, statusCode.SUCCESS, "Column preference fetched", {
      visibleColumns: preference?.visibleColumns || null,
    });
  } catch (err) {
    return errorResponse(res, statusCode.SERVER_ERROR, err?.message);
  }
};

/** PUT /v1/column-preference/:pageKey — upserts the user's selection for that page. */
exports.saveColumnPreference = async (req, res) => {
  try {
    const params = pageKeySchema.validate(req.params);
    if (params.error) return errorResponse(res, statusCode.BAD_REQUEST, params.error.message);
    const body = bodySchema.validate(req.body);
    if (body.error) return errorResponse(res, statusCode.BAD_REQUEST, body.error.message);
    if (!req.user?._id) return errorResponse(res, statusCode.BAD_REQUEST, "User context not found");

    const preference = await ColumnPreference.findOneAndUpdate(
      ownerFilter(req, params.value.pageKey),
      { $set: { visibleColumns: body.value.visibleColumns } },
      { new: true, upsert: true, lean: true }
    );

    return successResponse(res, statusCode.SUCCESS, "Column preference saved", {
      visibleColumns: preference.visibleColumns,
    });
  } catch (err) {
    return errorResponse(res, statusCode.SERVER_ERROR, err?.message);
  }
};
