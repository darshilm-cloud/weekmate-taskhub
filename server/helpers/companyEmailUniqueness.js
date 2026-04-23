const mongoose = require("mongoose");
// Register Mongoose models before model("name") lookups
require("../models");

const Employees = mongoose.model("employees");
const PMSClients = mongoose.model("pmsclients");

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * True if email is already used by a non-deleted employee or client in the company.
 * @param {import("mongoose").Types.ObjectId} companyObjectId
 * @param {string} email
 * @param {{ excludeEmployeeId?: string }} [options]
 */
const isCompanyEmailTaken = async (companyObjectId, email, options = {}) => {
  const { excludeEmployeeId } = options;
  const trimmed = String(email || "").trim();
  if (!trimmed) return false;
  const re = new RegExp(`^${escapeRegExp(trimmed)}$`, "i");
  const base = {
    companyId: companyObjectId,
    isDeleted: false,
    isSoftDeleted: false,
    email: re
  };
  const empQuery = excludeEmployeeId
    ? {
        ...base,
        _id: { $ne: new mongoose.Types.ObjectId(String(excludeEmployeeId)) }
      }
    : base;
  if (await Employees.findOne(empQuery).select("_id").lean()) return true;
  if (await PMSClients.findOne(base).select("_id").lean()) return true;
  return false;
};

module.exports = {
  isCompanyEmailTaken
};
