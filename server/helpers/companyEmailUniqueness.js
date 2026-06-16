const mongoose = require("mongoose");
// Register Mongoose models before model("name") lookups
require("../models");

const Employees = mongoose.model("employees");
const PMSClients = mongoose.model("pmsclients");

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Check if email is already taken - returns detailed info about where
 * @param {import("mongoose").Types.ObjectId} companyObjectId
 * @param {string} email
 * @param {{ excludeEmployeeId?: string, excludeClientId?: string }} [options]
 * @returns {Object} { isTaken: boolean, inSameCompany: boolean }
 */
const checkEmailTaken = async (companyObjectId, email, options = {}) => {
  const { excludeEmployeeId, excludeClientId } = options;
  const trimmed = String(email || "").trim();
  if (!trimmed) return { isTaken: false, inSameCompany: false };
  
  const escapedEmail = escapeRegExp(trimmed);
  const re = new RegExp("^" + escapedEmail + "$", "i");

  // Check in employees - current company
  const empInCompanyQuery = {
    isDeleted: false,
    isSoftDeleted: false,
    companyId: companyObjectId,
    email: re,
    ...(excludeEmployeeId ? { _id: { $ne: new mongoose.Types.ObjectId(String(excludeEmployeeId)) } } : {})
  };
  const empInCompany = await Employees.findOne(empInCompanyQuery).select("_id").lean();
  if (empInCompany) return { isTaken: true, inSameCompany: true };

  // Check in clients - current company
  const clientInCompanyQuery = {
    isDeleted: false,
    isSoftDeleted: false,
    companyId: companyObjectId,
    email: re,
    ...(excludeClientId ? { _id: { $ne: new mongoose.Types.ObjectId(String(excludeClientId)) } } : {})
  };
  const clientInCompany = await PMSClients.findOne(clientInCompanyQuery).select("_id").lean();
  if (clientInCompany) return { isTaken: true, inSameCompany: true };

  // Check in employees - other companies
  const empInOtherCompanyQuery = {
    isDeleted: false,
    isSoftDeleted: false,
    companyId: { $ne: companyObjectId },
    email: re
  };
  const empInOther = await Employees.findOne(empInOtherCompanyQuery).select("_id").lean();
  if (empInOther) return { isTaken: true, inSameCompany: false };

  // Check in clients - other companies
  const clientInOtherCompanyQuery = {
    isDeleted: false,
    isSoftDeleted: false,
    companyId: { $ne: companyObjectId },
    email: re
  };
  const clientInOther = await PMSClients.findOne(clientInOtherCompanyQuery).select("_id").lean();
  if (clientInOther) return { isTaken: true, inSameCompany: false };

  return { isTaken: false, inSameCompany: false };
};

/**
 * Legacy function - kept for backward compatibility
 * True if email is already used by a non-deleted employee or client anywhere in the database.
 */
const isCompanyEmailTaken = async (companyObjectId, email, options = {}) => {
  const result = await checkEmailTaken(companyObjectId, email, options);
  return result.isTaken;
};

module.exports = {
  isCompanyEmailTaken,
  checkEmailTaken
};