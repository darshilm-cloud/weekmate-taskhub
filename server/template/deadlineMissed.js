const { emailSenderForPMS, getUserName } = require("../helpers/common");

// single project wise mail
exports.projectDeadlineMissedMail = async (data) => {
  try {
    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Projects Overdue</title>
      </head>
      <body>
      Hello <b>${getUserName(data?.manager)},</b>
     <br>
    <p>Unfortunately, we need to notify you that there is a project under your supervision that has missed its deadline:</p>
          <ul>
          <li>
          <strong>Project :</strong> 
          <a href="${
            process.env.REACT_URL + "project/app/" + data?._id
          }" target="_blank">${data?.title}
            </a>
          <br>
          - Type: ${data?.project_type?.project_type || "-"}<br>
          - Technology: ${
            data?.technology && data?.technology?.length > 0
              ? data?.technology?.map((t) => t.project_tech).join(", ")
              : "-"
          }<br>
          - Deadline: ${
            data.end_date ? moment(data.end_date).format("DD MMM YYYY") : "-"
          }
      </li>
          </ul>
          <p>Please take immediate action to address these missed deadlines.</p>
          <p>Thank you.</p>
      </body>
      </html>
      `;

    let mailIds = [data?.manager?.email];

    const mailData = {
      subject: `Action Required: [${data?.title}] Missed Project Deadline - ${data?.projectId}`,
      html
    };

    await emailSenderForPMS(data?.manager?.companyId, mailIds, mailData, []);
    return;
  } catch (error) {
    console.log("🚀 ~ exports.projectDeadlineMissedMail= ~ error:", error);
  }
};

exports.taskDeadlineMissedMail = async (data) => {
  try {
    let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Projects Overdue</title>
        </head>
        <body>
        Hello <b>${getUserName(data?.manager)},</b>
       <br>
      <p>Unfortunately, we need to notify you that there are project tasks under your supervision that have missed their deadlines:</p>
            <ul>
              ${
                data.tasks?.length > 0
                  ? data.tasks
                      .map(
                        (task) => `
                          <li>
                              <strong>Task :</strong> 
                              <a href="${
                                process.env.REACT_URL +
                                "project/app/" +
                                data?._id +
                                `?tab=Tasks&listID=${task.mainTask._id}&taskID=${task._id}`
                              }" target="_blank">${task?.title} <i>(${
                          task?.taskId
                        })</i>
                                </a>
                              <br>
                              - Status: ${task?.task_status?.title || "-"}<br>
                              - Deadline: ${
                                task?.due_date
                                  ? moment(task?.end_date).format("DD MMM YYYY")
                                  : "-"
                              }
                          </li>
                        `
                      )
                      .join("<br>")
                  : ""
              }
            </ul>
            <p>Please take immediate action to address these missed deadlines.</p>
            <p>Thank you.</p>
        </body>
        </html>
        `;

    let mailIds = [data?.manager?.email];

    const mailData = {
      subject: `Action Required: [${data?.title}] Missed Tasks Deadline - ${data?.projectId}`,
      html
    };

    await emailSenderForPMS(data?.manager?.companyId, mailIds, mailData, []);
    return;
  } catch (error) {
    console.log("🚀 ~ exports.projectDeadlineMissedMail= ~ error:", error);
  }
};
