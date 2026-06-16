/**
 * Linked products – proxies the WeekMate Registration API for the products linked to the
 * current company, used by the TaskHub "Connected products" launcher. Backend only.
 *
 * Mirrors the HRMS/Payroll/CRM implementations: resolves the company domain from the
 * logged-in user's company, then asks Registration which OTHER products this company has
 * selected. Uses the built-in fetch (Node 18+) so no new dependency is needed.
 */
const mongoose = require("mongoose");
const { successResponse, errorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const Company = mongoose.model("companies");

// Base URL only (no path). Code appends /api/linked-products.
const _registrationBase =
  (process.env.REGISTRATION_API_URL || process.env.WEEKMATE_REGISTRATION_URL || "").trim();
const REGISTRATION_API_URL = _registrationBase ? new URL("/", _registrationBase).origin : "";
const REGISTRATION_API_KEY =
  (process.env.REGISTRATION_API_KEY || process.env.WEEKMATE_REGISTRATION_API_KEY || "").trim();
const CURRENT_PRODUCT_NAME = process.env.CURRENT_PRODUCT_NAME || "TaskHub";

/**
 * GET /v1/linked-products – list the OTHER products this company has connected.
 * Always resolves to 200 with a (possibly empty) array so a Registration outage never
 * breaks the header.
 */
exports.getLinkedProducts = async (req, res) => {
  try {
    // The TaskHub auth token carries the populated company doc; fall back to a lookup by
    // companyId so the launcher still works if the token is slim.
    let companyDomain =
      req.user?.companyDetails?.companyDomain || req.user?.companyDomain || "";

    if (!companyDomain && req.user?.companyId) {
      const company = await Company.findById(req.user.companyId)
        .select("companyDomain")
        .lean();
      companyDomain = company?.companyDomain || "";
    }

    if (!companyDomain) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Company context not found");
    }

    if (!REGISTRATION_API_URL) {
      return successResponse(res, statusCode.SUCCESS, "Linked products not configured", []);
    }

    const url = new URL(`${REGISTRATION_API_URL}/api/linked-products`);
    url.searchParams.set("companyDomain", companyDomain);
    url.searchParams.set("currentProduct", CURRENT_PRODUCT_NAME);

    const headers = {};
    if (REGISTRATION_API_KEY) headers["x-api-key"] = REGISTRATION_API_KEY;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let body = {};
    try {
      const response = await fetch(url, { headers, signal: controller.signal });
      body = await response.json().catch(() => ({}));
    } finally {
      clearTimeout(timer);
    }

    let list = body?.data || [];
    if (!Array.isArray(list)) list = [];

    return successResponse(
      res,
      statusCode.SUCCESS,
      "Linked products fetched successfully",
      list
    );
  } catch (error) {
    console.log("🚀 ~ getLinkedProducts ~ error:", error?.message);
    // Never block the header on a Registration outage — return an empty list.
    return successResponse(res, statusCode.SUCCESS, "Linked products unavailable", []);
  }
};
