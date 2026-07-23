const { authentication } = require("./authentications");

/**
 * The super-admin reporting endpoints are consumed two ways:
 *   - the WeekMate superadmin UI, which sends a user Bearer token (+ x-super-admin)
 *   - the superadmin report crons, which are server-to-server and have no user session
 *
 * Machine callers present the shared SUPER_ADMIN_API_KEY as `x-api-password`;
 * anything else falls through to the normal token check, so the UI is unaffected.
 * Mirrors HRMS's helpers.verifyUserTokenOrApiPassword, which uses the same header
 * and the same env var.
 *
 * Exported as plain functions rather than class methods: app.js destructures its
 * middleware imports, which would strip `this` from a class instance.
 */
const usedSuperAdminApiPassword = (req) => {
  const provided = req.headers["x-api-password"];
  const expected = process.env.SUPER_ADMIN_API_KEY;
  return Boolean(provided && expected && provided === expected);
};

const verifyTokenOrApiPassword = (req, res, next) => {
  if (usedSuperAdminApiPassword(req)) {
    return next();
  }
  return authentication(req, res, next);
};

module.exports = { usedSuperAdminApiPassword, verifyTokenOrApiPassword };
