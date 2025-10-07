const { emailSenderForPMS } = require("../helpers/common");

exports.CompanyWelcomeMail = async (data) => {
  try {

    let html = `
     <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Welcome to Weekmate Taskhub</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
    <h2 style="color: #333333; font-weight: 700;">🎉 Welcome to Weekmate Taskhub 🚀</h2>
    <p>Dear <strong>${data.full_name}</strong>,</p>
    <p>Welcome aboard! We’re thrilled to have you join <strong>Weekmate Taskhub</strong> – your new all-in-one platform to manage projects, tasks, and collaborate efficiently with your team.</p>

    <p>With Taskhub, you can:</p>
    <ul style="list-style-type: none; padding-left: 0;">
      <li>✅ Create and manage projects</li>
      <li>✅ Assign tasks to your team</li>
      <li>✅ Track progress and deadlines</li>
    </ul>

    <p>Here’s what to do next:</p>
    <ul style="list-style-type: none; padding-left: 0;">
      <li>✅ Explore your dashboard</li>
      <li>✅ Add your team members</li>
      <li>✅ Set up your first project</li>
      <li>✅ Start assigning tasks and tracking progress</li>
    </ul>

    <p>Need help? Our support team is always here to ensure you get the most out of Taskhub.</p>

    <p>Let’s build better projects, together.</p>

    <p>Warm regards,<br>
       <strong>The Weekmate Team</strong></p>
  </div>
</body>
</html>


      `;

    const mailData = {
      subject: `🎉 Welcome to Weekmate Taskhub – Let’s Get Started!`,
      html
    };

    await emailSenderForPMS(null, data.email, mailData, []);
    return;
  } catch (e) {
    console.log("template/mail.js error at 525 ~> ", e);
  }
};
