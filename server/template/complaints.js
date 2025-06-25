const { emailSenderForPMS, getPCandAMunderCEOIDtoexcludeCEOformail } = require("../helpers/common");

class ComplaintMail {
    newComplaintMail = async (data) => {
        try {
            const getPriorityStyle = (priority) => {
                switch (priority.toLowerCase()) {
                    case 'critical':
                    case 'high':
                        return 'color: #fff; background-color: red; padding: 5px 10px; border-radius: 4px;';
                    case 'medium':
                        return 'color: #000; background-color: yellow; padding: 5px 10px; border-radius: 4px;';
                    case 'low':
                        return 'color: #fff; background-color: green; padding: 5px 10px; border-radius: 4px;';
                    default:
                        return ''; // No style for undefined priority
                }
            };

            const priorityStyle = getPriorityStyle(data?.priority);

            let html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; width:70%;">
                <h3 style="color: #187cb7;">New Complaint Received</h3>
                    <p style="margin-top: 0; ">Dear Team,</p>
                    <p>We have received the following complaint from <strong>${data?.client_name}</strong>.</p>
        
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; max-width:800px;">
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Complaint Description</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">${data?.complaint}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Reason</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">${data?.reason}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Client Name</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%; word-wrap: break-word; word-break: break-word;">${data?.client_name} (${data?.client_email})</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Priority</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; width: 70%;">
                                <span style="${priorityStyle}">${data?.priority.charAt(0).toUpperCase() + data?.priority.slice(1).toLowerCase()}</span>
                            </td>
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
                  <p>${data?.manager?.full_name} ${data?.managers_rm?.full_name && data?.managers_rm?.full_name != undefined && data?.managers_rm?.email != await getPCandAMunderCEOIDtoexcludeCEOformail() ? "and " + data?.managers_rm?.full_name : ""}, please work on this complaint as per the <a href="${process.env.SOP_LINK}" style="color: #187cb7; text-decoration: underline;">SOP</a> and update the status in <a href="${process.env.REACT_URL + 'add/complaintForm-action-details/' + data?._id}" style="color: #187cb7; text-decoration: underline;">TaskHub</a>.</p>
        
                    <br>
                    <p style="margin: 0;">Thanks and Regards,</p>
                    <p style="margin: 0;">Elsner Technologies Pvt. Ltd.</p>
                </div>
            </div>
        `;


            const mailData = {
                subject: `New Complaint received by ${data?.client_name} - ${data?.technology?.project_tech} - ${data?.priority.charAt(0).toUpperCase() + data?.priority.slice(1).toLowerCase()}.`,
                html,
            };

            let cc = [
                process.env.DIRECTOR_EMAIL,
                data?.manager?.email,
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
            if (data?.escalation_level == "level2") {
                cc.push(process.env.CEO_EMAIL);
            }
            if (['6627428b2cd9adde1a7ef5f8', '6641eb0b333ffa11fc45430f'].includes(data.technology._id.toString())) {
                cc.push(process.env.SHLOK_EMAIL)
              }
            //   console.log(data,'dataMail',process.env.CEO_EMAIL,
            //     process.env.DIRECTOR_EMAIL,
            //     data?.manager?.email);
            await emailSenderForPMS(data?.createdBy?.email, mailData, cc);
        } catch (error) {
            console.log("🚀 ~ ComplaintMail ~ newComplaintMail= ~ error:", error);
        }
    };
}

module.exports = new ComplaintMail();
