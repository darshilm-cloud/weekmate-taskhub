const mongoose = require("mongoose");
const { errorResponse, catchBlockErrorResponse } = require("./response");
const { statusCode } = require("./constant");

// resource_name → resource _id, refreshed every few minutes (resources only
// change on deploy / startup bootstrap).
const RESOURCE_CACHE_MS = 5 * 60 * 1000;
let resourceIds = null;
let resourceIdsAt = 0;

const getResourceIds = async () => {
  if (resourceIds && Date.now() - resourceIdsAt < RESOURCE_CACHE_MS) return resourceIds;
  const Resource = mongoose.model("resource");
  const rows = await Resource.find({ isDeleted: false }).select("_id resource_name").lean();
  resourceIds = Object.fromEntries(rows.map((row) => [row.resource_name, String(row._id)]));
  resourceIdsAt = Date.now();
  return resourceIds;
};

const resetResourceIdCache = () => {
  resourceIds = null;
};

/**
 * Express middleware: the caller's role must hold at least one of `names`
 * (Permission Management). Admins always pass. `allow(req)` can let a
 * request through regardless (e.g. editing your own profile).
 */
const requirePermission = (names, { allow } = {}) => {
  const guard = async (req, res, next) => {
  try {
    if (!req.user?._id) return next(); // not a user request (API key / super admin routes)
    if (typeof allow === "function" && allow(req)) return next();

    // Lazy: authentication.js requires many models at load time.
    const { getUserAccessContext } = require("../controller/authentication");
    const { roleName, permissions } = await getUserAccessContext(req.user._id, req.user.companyId);
    if (roleName === "Admin") return next();

    const ids = await getResourceIds();
    const held = new Set(permissions);
    if ((Array.isArray(names) ? names : [names]).some((name) => ids[name] && held.has(ids[name]))) {
      return next();
    }
    // permissionDenied tells the client this 403 is a refused action, not an
    // expired session (it logs out on other 401/403s).
    return res.status(statusCode.FORBIDDEN).send({
      statusCode: statusCode.FORBIDDEN,
      status: 0,
      permissionDenied: true,
      message: "You don't have permission to perform this action.",
      data: [],
    });
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
  };
  // Read by scripts/checkPermissions.js to list which route needs what.
  guard.permissionNames = Array.isArray(names) ? names : [names];
  guard.hasAllowOverride = typeof allow === "function";
  return guard;
};

/**
 * Express middleware: only a Super Admin token may pass. For the platform
 * tools (super-admin users, company add/delete) that no company role - not
 * even a company Admin - should reach.
 */
const requireSuperAdmin = () => {
  const guard = (req, res, next) => {
    if (req.user?.pms_role_id?.role_name === "Super Admin") return next();
    return res.status(statusCode.FORBIDDEN).send({
      statusCode: statusCode.FORBIDDEN,
      status: 0,
      permissionDenied: true,
      message: "You don't have permission to perform this action.",
      data: [],
    });
  };
  // Read by scripts/checkPermissions.js.
  guard.requiredRole = "Super Admin";
  return guard;
};

module.exports = { requirePermission, requireSuperAdmin, resetResourceIdCache };
