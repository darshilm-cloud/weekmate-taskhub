// models/TempRegistration.js
const mongoose = require('mongoose');

const CompanyRegistrationMailSchema = new mongoose.Schema({
  adminDetails: {
    fullName: String,
    userName: String,
    email: String,
    password: String,
    position: String
  },
  companyDetails: {
    companyName: String,
    companyEmail: String
  },
  verificationToken: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // 10 minutes in seconds
  }
});

CompanyRegistrationMailSchema.index(
    { "createdAt": 1 },
    { expireAfterSeconds: 600 }
)

// const CompanyRegistrationMailModel = mongoose.model('company_registration_mail_schema', CompanyRegistrationMailSchema);
module.exports = mongoose.model("company_registration_mail_schema", CompanyRegistrationMailSchema);
