const { emailSenderForPMS, getCompanyData } = require("../helpers/common");


class CompalaintStatusMail {
    newComplaintStatusMail = async (data, op,companyId) => {
        try {
            let companyData = await getCompanyData(companyId);

            const statusMap = {
                client_review: "Client Review",
                open: "Open",
                in_progress: "In Progress",
                resolved: "Resolved",
                reopened: "Reopened",
                customer_lost: "Customer Lost",
            };

            let status = statusMap[data?.status] || "Open";

            let firstline = op == "add" ? `            
            <p>The status for the complaint has been updated to <strong>${status}.</strong>`
                : op == "edit" ? `
            <p>The status for the complaint has been updated.</strong> `
                    : "The status for the complaint has been updated."
            let html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; width:70%; ">
                <h3 style="color: #187cb7;">Complaint Status Update</h3>
                    <p margin-top:0; >Dear Team,</p>
                    ${firstline}
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; max-width:800px; ">
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Status</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${status} </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Root Cause</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.root_cause || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Immediate Action</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.immediate_action || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Corrective Action</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.corrective_action || '-'}</td>
                        </tr>
                       <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Complaint</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.complaints?.complaint || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Project</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.project?.title || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Project Manager</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.manager?.full_name || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Account Manager</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">${data?.acc_manager?.full_name || '-'}</td>
                        </tr>

                    </table>

                    <p style="margin-bottom:0;">You can view the status in <a href="${process.env.REACT_URL + `add/complaintForm-action-details/${data?.complaints?._id}`}"  style="color: #187cb7; text-decoration: underline;">TaskHub</a>.
                    </p>
                    <br>
                    <p style="margin-bottom:0;">Thanks and Regards,</p>
                    <p style="margin: 0;">${companyData?.companyName || "Taskhub"}</p>
                </div>
            </div>
            `;
            const mailData = {
                subject: `
                ${data?.status=='resolved'?'Complaint resolution by':'New Complaint received by'} ${data?.complaints?.client_name} - ${data?.technology?.project_tech} - ${data?.complaints?.priority.charAt(0).toUpperCase() + data?.complaints?.priority.slice(1).toLowerCase()}.`,
                html,
            };

            let cc = [
                data?.manager?.email,
                data?.acc_manager?.email,
                // data?.managers_rm?.email,
                // data?.acc_managers_rm?.email
            ];
           
            if (!(["open", "in_progress"].includes(data?.status))) {
                cc.push(process.env.DIRECTOR_EMAIL);
                if (data?.complaints?.escalation_level === "level2") {
                    cc.push(process.env.CEO_EMAIL);
                }
            }

            await emailSenderForPMS(data?.createdBy?.email, mailData, cc);

            return;
        } catch (error) {
            console.log("🚀 ~ ProjectMail ~ newProjectManagerMail= ~ error:", error);
        }
    };

    newComplaintStatusResolutionFeedbackMailToClient = async (data, companyId) => {
        try {
            let companyData = await getCompanyData(companyId);
            let html = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; width: 70%;">
                        <p style="margin-top: 0;">Dear ${data?.complaints?.client_name},</p>

                        <p>
                            We have addressed and resolved your complaint as per the necessary changes. To help us improve, we kindly request that you provide feedback regarding the resolution.
                        </p>

                        <p>
                            Please click the following link to submit your feedback: 
                            <a href="${process.env.REACT_URL + `feedback/${data?.complaints?._id}`}" style="color: #187cb7; text-decoration: underline;">
                                TaskHub Feedback
                            </a>
                        </p>
                        
                        <br>
                        
                        <p style="margin-bottom: 0;">Thanks and regards,</p>
                        <p style="margin: 0;">${companyData?.companyName || "Taskhub"}</p>
                    </div>
                 </div>

            `;
            const mailData = {
                subject: `Resolution Feedback for complaint of project - ${data?.project?.title}.`,
                html,
            };
           
            await emailSenderForPMS(companyId,data?.complaints?.client_email, mailData);

            return;
        } catch (error) {
            console.log("🚀 ~ ProjectMail ~ newProjectManagerMail= ~ error:", error);
        }
    };
}

module.exports = new CompalaintStatusMail();
