const { getUserName } = require("../helpers/common")

exports.forgetPasswordContent = (userData, authToken) => ({
  subject: "Reset your password",
  html: `<p>Hi <strong> ${getUserName(userData)} </strong>,<br>
      You recently requested to reset your password for your <strong>${userData.email}</strong> account. Use the link given below to reset your password.<br>
      Link: <a href='${process.env.HOST_URL}/reset-password/${authToken}'> click to reset your account</a><br />
      If you did not request a password reset, please ignore this email or&nbsp;contact support&nbsp;if you have questions.<br>
      <br>
      Thanks,&nbsp;<br>
      <strong>HR Team</strong>​</p>`,
});

exports.resetPasswordContent = (userData) => ({
  subject: "Account Reset password",
  html: `<p>Hi <strong> ${getUserName(userData)} </strong>,<br>
      Your password for your <strong> ${userData.email} </strong> account is updated successfully.<br>
      <br>
      Thanks,&nbsp;<br>
      The <strong>[EEMS]</strong> Team​​​​​​​</p>`,
});
