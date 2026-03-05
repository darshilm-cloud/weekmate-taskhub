const { emailSenderForPMS } = require("../helpers/common");

class ComplaintMail {
    newComplaintMail = async (data) => {
        try {
            let html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; width:70%;">
                    <p style="margin-top: 0; ">Hello ${data?.employee?.full_name},</p>
                    <p>Your ${data?.month} hours are approved please find details below.</p>
        
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; max-width:800px;">
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Tracked Hours</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">${data?.tracked_hours}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Approved Hours</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">${data?.approved_hours}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Notes</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">${data?.notes}</td>
                        </tr>
                       
                    </table>
                  <p>Please meet your Reporting Manager, if you any concern.</p>
        
                    <br>
                    <p style="margin: 0;">Thanks and Regards,</p>
                </div>
            </div>
        `;


            const mailData = {
                subject: `Hours Approved for ${data?.month}`,
                html,
            };

            let cc = [
                process.env.DIRECTOR_EMAIL,
                data?.manager?.email,
                data?.acc_manager?.email,
                data?.managers_rm?.email,
                data?.acc_managers_rm?.email,
            ];

            if (data?.escalation_level == "level2") {
                cc.push(process.env.CEO_EMAIL);
            }

            await emailSenderForPMS(data?.createdBy?.email, mailData, cc);
        } catch (error) {
            console.log("🚀 ~ ComplaintMail ~ newComplaintMail= ~ error:", error);
        }
    };
}

module.exports = new ComplaintMail();
