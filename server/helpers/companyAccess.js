const mongoose = require("mongoose");
const cacheStore = require("../middleware/cacheStore");

// How long (seconds) a company's access decision is cached. Keeps the per-request
// check off the hot path (one DB read per company per TTL) while bounding how long
// a just-deactivated company can keep working to at most this window.
const COMPANY_ACCESS_TTL = 60;

/**
 * Decide whether a company's access to TaskHub has been revoked centrally.
 *
 * When a product is deactivated or deleted in the central app (app.weekmate.in),
 * the company is either hard-deleted from TaskHub (its doc is removed) or flagged
 * `isActive: false` / `isDeleted: true`. TaskHub must stop honouring existing
 * sessions in those cases — otherwise users keep working with their long-lived
 * JWTs after access was withdrawn.
 *
 * Fail-open on unexpected errors (returns `false`) so a transient DB hiccup never
 * locks every tenant out; only a definitive "gone / inactive / deleted" result
 * blocks. Missing companyId (e.g. a super admin with no tenant) is never blocked.
 *
 * @param {string|import("mongoose").Types.ObjectId} companyId
 * @returns {Promise<boolean>} true when the request/login should be rejected
 */
async function isCompanyAccessBlocked(companyId) {
  if (!companyId) return false;

  const key = `company-access:${String(companyId)}`;
  const cached = cacheStore.getCache(key);
  if (cached) return cached.data.blocked;

  try {
    const Company = mongoose.model("companies");
    const company = await Company.findById(companyId)
      .select("isActive isDeleted")
      .lean();

    const blocked =
      !company || company.isActive === false || company.isDeleted === true;

    cacheStore.storeCache(key, { blocked }, null, COMPANY_ACCESS_TTL);
    return blocked;
  } catch (error) {
    console.error(
      "🚀 ~ isCompanyAccessBlocked ~ check failed (allowing request):",
      error?.message
    );
    return false;
  }
}

module.exports = { isCompanyAccessBlocked, COMPANY_ACCESS_TTL };
