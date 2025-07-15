const { emailSenderForPMS, getCompanyData } = require("../helpers/common");

class ReviewsMail {
  newReviewsMail = async (data, companyId) => {
    try {
      let companyData = await getCompanyData(data?.manager?.companyId);

      let html = `
            <div style="font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; background-color: #f4f4f8; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  <div style="background-color: #03497a; color: #fff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">🎉 Congratulations, Team! 🎉</h1>
    <p style="margin: 5px 0 0; font-size: 16px;">Positive feedback received from <strong style="text-transform: capitalize;">${data?.client_name}</strong></p>
  </div>

  <div style="padding: 20px; background-color: #fff;">
    <p style="margin: 0 0 20px; font-size: 16px;">Here’s the feedback and project details:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 0;">
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold; width: 30%;">Feedback</td>
        <td style="padding: 12px; border: 1px solid #eaeaea; word-break: break-word;">${data?.feedback}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Project</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">${data?.project?.title}</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Technology</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">${data?.technology?.project_tech}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Project Manager</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">${data?.manager?.full_name}</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Account Manager</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">${data?.acc_manager?.full_name}</td>
      </tr>
    </table>
    
    <p style="margin: 20px 0 0; font-size: 14px; color: #555;">Keep up the excellent work!</p>
  </div>

  <div style="padding: 20px; background-color: #f9f9f9; ">
    <p style="margin: 0; font-size: 14px; color: #555;">Thanks and Regards,</p>
    <p style="margin: 5px 0 0; font-weight: bold; font-size: 14px;">${companyData?.companyName || "Taskhub"}</p>
  </div>
</div>
        `;

      const mailData = {
        subject: ` New Positive Feedback by ${data?.client_name} - ${data?.technology?.project_tech}`,
        html
      };

      let cc = [
        process.env.CEO_EMAIL,
        process.env.DIRECTOR_EMAIL,
        data?.manager?.email,
        data?.acc_manager?.email,
        data?.managers_rm?.email,
        data?.acc_managers_rm?.email
      ];
      await emailSenderForPMS(companyId, data?.createdBy?.email, mailData, cc);
    } catch (error) {
      console.log("🚀 ~ ComplaintMail ~ newComplaintMail= ~ error:", error);
    }
  };
}

module.exports = new ReviewsMail();
