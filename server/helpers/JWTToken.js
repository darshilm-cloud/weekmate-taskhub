const jwt = require('jsonwebtoken');
const { errorResponse } = require('./response');

class JWTAuthenticator {
  // Method to create a new JWT token
  createJWTToken(payload, expiresIn = "1h") {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn });
  }
}

module.exports = new JWTAuthenticator();
