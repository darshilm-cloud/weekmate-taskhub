const { emailSenderForPMS, getPCandAMunderCEOIDtoexcludeCEOformail } = require("../helpers/common");

class FeedBacksMail {
    newFeedbackMail = async (data) => {
        console.log("🚀 ~ FeedBacksMail ~ newFeedbackMail= ~ data:", data)
        try {
            let html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; width:70%;">
                    <p style="margin-top: 0; ">Dear Team,</p>
                    <p>We have received the following consumer resolution feedback for complaint from <strong>${data?.complaint?.client_name}</strong>.</p>
        
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; max-width:800px;">
                      
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;">
                                <strong>How satisfied are you with the resolution of your complaint?</strong>
                            </td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">
                                ${data?.satisfaction} stars
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;">
                                <strong>How would you rate the time it took to resolve your complaint?</strong>
                            </td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">
                                ${data?.rate_reviews} stars
                            </td>
                        </tr>   

                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Additional Comments</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">${data?.additional_comments}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Client Name</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">${data?.complaint?.client_name} (${data?.complaint?.client_email})</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Project</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.project?.title}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Technology</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.technology?.project_tech}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Project Manager</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.manager?.full_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Account Manager</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.acc_manager?.full_name}</td>
                        </tr>
                    </table>
                    <br>
                    <p style="margin: 0;">Thanks and Regards,</p>
                    <p style="margin: 0;">Elsner Technologies Pvt. Ltd.</p>
                </div>
            </div>
        `;


            const mailData = {
                subject: `Resolution Feedback recevied for complaint by ${data?.client_name} for project, ${data?.project?.title}`,
                html,
            };

            let cc = [
                process.env.DIRECTOR_EMAIL,
                data?.acc_manager?.email,
                // data?.managers_rm?.email,
                // data?.acc_managers_rm?.email,
            ];
            if (data?.managers_rm?.email != await getPCandAMunderCEOIDtoexcludeCEOformail()) {
                cc.push(data?.managers_rm?.email);
            }
            if (data?.acc_managers_rm?.email != await getPCandAMunderCEOIDtoexcludeCEOformail()) {
                cc.push(data?.acc_managers_rm?.email);
            }
            if (data?.complaint?.escalation_level == "level2") {
                cc.push(process.env.CEO_EMAIL);
            }


            await emailSenderForPMS(data?.manager?.email, mailData, cc);
        } catch (error) {
            console.log("🚀 ~ ComplaintMail ~ newComplaintMail= ~ error:", error);
        }
    };

}

module.exports = new FeedBacksMail();
