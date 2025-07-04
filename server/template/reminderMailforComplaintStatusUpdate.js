const { emailSenderForPMS } = require("../helpers/common");

class ReminderMail {
  newReminderMailforStatusUpdate = async (data, companyId) => {
    try {
      let html = `
           <div style="font-family: Arial, sans-serif; color: #333;">
                <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; width: 70%;">
                    <p style="margin-top: 0;">Dear ${data?.manager?.full_name},</p>
                    <p>We would like to gently remind you that it has been 5 working days since the status of the complaint has been updated. The status is still pending and has not yet changed to "Client Review," "Resolved," or "Customer Lost." Please ensure that the status is updated accordingly.</p>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Complaint Description</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">${data?.complaint}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Client Name</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">${data?.client_name} (${data?.client_email})</td>
                        </tr>
                         <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Project</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.project?.title}</td>
                        </tr>
                    <br>
                    <p style="margin: 0;">Thank and regards,</p>
                    <p style="margin: 0;">Elsner Technologies Pvt. Ltd.</p>
                </div>
            </div>

        `;

      const mailData = {
        subject: `New Complaint received by ${data?.client_name} - ${
          data?.technology?.project_tech
        } - ${
          data?.priority.charAt(0).toUpperCase() +
          data?.priority.slice(1).toLowerCase()
        }.`,
        html
      };

      let cc = [
        data?.acc_manager?.email
        // data?.managers_rm?.email,
        // data?.acc_managers_rm?.email,
      ];

      await emailSenderForPMS(companyId, data?.manager?.email, mailData, cc);
    } catch (error) {
      console.log("🚀 ~ ComplaintMail ~ newComplaintMail= ~ error:", error);
    }
  };
}

module.exports = new ReminderMail();
