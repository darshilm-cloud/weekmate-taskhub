const { emailSenderForPMS } = require("../helpers/common");


class CompalaintComplaintsMail {
    newComplaintCommentsMail = async (data,companyId) => {
        try {
            let attachmentLine = data?.attachments && data?.attachments?.length > 0 ? `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Attachment</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd; width: 70%;"><a href ="${process.env.REACT_URL + 'public/' + data?.attachments[0].path}" style="color: #187cb7; text-decoration: underline;"> File </a> </td>
            </tr>
            ` : "";
            let html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; width: 70%;">
                <h3 style="color: #187cb7;">New Comment Added</h3>
                    <p>Dear Team,</p>
                    <p>A comment has been added to complaint.

                     <table style="width: 100%; border-collapse: collapse; margin: 20px 0; max-width: 800px;">
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Comment</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.comment}</td>
                        </tr>
                         
                        ${attachmentLine}
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Complaint</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">${data?.complaints?.complaint}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Project</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.project?.title}</td>
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
                    <p style="margin-bottom: 0;">Thanks and Regards,</p>
                    <p style="margin: 0;">Elsner Technologies Pvt. Ltd.</p>
                </div>
            </div>
            `;

            const mailData = {
                subject: `New Complaint received by ${data?.complaints?.client_name} - ${data?.technology?.project_tech} - ${data?.complaints?.priority.charAt(0).toUpperCase() + data?.complaints?.priority.slice(1).toLowerCase()}.`,
                html,
            };

            let cc = [data?.manager?.email, data?.acc_manager?.email,];

            await emailSenderForPMS(companyId,data?.createdBy?.email, mailData, cc);

            return;
        } catch (error) {
            console.log("🚀 ~ ProjectMail ~ newProjectManagerMail= ~ error:", error);
        }
    };

}

module.exports = new CompalaintComplaintsMail();
