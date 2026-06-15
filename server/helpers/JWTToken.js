const jwt = require('jsonwebtoken');
const { errorResponse } = require('./response');

class JWTAuthenticator {
  // Method to create a new JWT token
  createJWTToken(payload, expiresIn = "1h") {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn });
  }

  // Slim cross-product SSO token. Carries only the minimal claims a sibling
  // WeekMate app needs to identify the user (email + tenant + admin flag) — no
  // names or profile blob. Signed with the shared ACCESS_TOKEN_SECRET
  // (WEEKMATE@123$) so every connected product can verify it.
  createSsoToken({ email, companyId, isAdmin = false }, expiresIn = "1y") {
    return jwt.sign(
      {
        user: { email, companyId, company_id: companyId, isAdmin },
        source: "taskhub"
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn }
    );
  }
}

module.exports = new JWTAuthenticator();
