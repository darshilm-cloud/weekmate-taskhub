const { emailSenderForPMS } = require("../helpers/common");

exports.OnboardMailForSupport = async (data) => {
  try {

    let html = `
     <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New User Joined Weekmate Taskhub</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
    <h2 style="color: #333333; font-weight: 700;">🎉 Awesome News – A New Member Joined Weekmate Taskhub!</h2>
    <p>Dear <strong>WeekMate Team</strong>,</p>

    <p>Great news! Someone just joined the <strong>Weekmate Taskhub</strong> family. 🎊</p>

    <p>Here are the details:</p>
    <div style="background-color: #f9f9f9; padding: 12px 16px; border-radius: 6px; border: 1px solid #e0e0e0;">
      <p>👤 <strong>Name:</strong> ${data.full_name}</p>
      <p>📧 <strong>Email:</strong> ${data.email}</p>
      <p>📞 <strong>Phone Number:</strong> ${data.phone_number}</p>
      <p>🏢 <strong>Company Name:</strong> ${data.companyName}</p>
    </div>

    <h4 style="margin-top: 20px; color: #333333;">Next Steps:</h4>
    <ul style="list-style-type: none; padding-left: 0;">
      <li>✅ Ensure the welcome email was sent successfully</li>
      <li>🔍 Review the new account in the admin panel</li>
      <li>📞 If needed, schedule a follow-up or demo call</li>
    </ul>

    <p>Let’s make sure they have an amazing first experience with Weekmate Taskhub! 🚀</p>

    <p>Warm regards,<br>
       <strong>The Weekmate Taskhub System</strong></p>
  </div>
</body>
</html>



      `;

    const mailData = {
      subject: `${data.full_name} Just Hopped on Weekmate – Let’s Welcome Them!`,
      html
    };

    await emailSenderForPMS(null, process.env.SUPPORT_MEMNEBRS, mailData, []);
    return;
  } catch (e) {
    console.log("template/mail.js error at 525 ~> ", e);
  }
};
