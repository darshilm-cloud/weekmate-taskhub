const mongoose = require("mongoose");
const MailSettings = mongoose.model("mailsettings");
const moment = require("moment");
const { emailSenderForPMS, getUserName, getCompanyData } = require("../helpers/common");
const { mailsToQuarterHours } = require("../controller/quarterlyMails");

exports.assigneesMail = async (data, newAddedAssignees = [], companyId) => {
  try {
    let companyData = await getCompanyData(companyId);

    let arrowIcon = `${process.env.UPLOADS_URL}/mailTemplatesImg/icon-arrow.png`;
    let privateIcon = `${process.env.UPLOADS_URL}/mailTemplatesImg/icon-private.png`;
    let roundIcon = `${process.env.UPLOADS_URL}/mailTemplatesImg/icon-round.png`;
    let roundListIcon = `${process.env.UPLOADS_URL}/mailTemplatesImg/icon-round-list.png`;

    let html = `
      <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
    <style>
      body {
        margin: 0;
        background: #FAF9F6;
        line-height: 30px;
        padding: 20px 0;
        font-size: 16px;
        /* font-family: 'Noir Pro'; */
        font-family: Arial, Helvetica, sans-serif;
        color: #202124;
      }

      p {
        margin: 0;
      }

      h1,
      h3,
      h4,
      h5,
      h6 {
        margin: 0;
        line-height: 1.8;
      }

      a {
        color: #038fde;
        font-size: 14px;
        font-weight: 600;
      }

      .main-template-wrapper {
        background: #fff;
        padding: 20px;
      }
    </style>
  </head>
  <body>
    <div class="main-wrapper" style=" max-width: 640px;
    margin: 0 auto;
    padding: 0 20px;">
      <table class="header">
        <tbody>
          <tr>
            <td>
              <h1 style="
                  color: #038fde;
                  font-size: 30px;
                  padding-bottom: 5px;
                  font-weight: 600;
                "> ${companyData?.companyName || "Taskhub"} </h1>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="main-content-table" style=" padding: 0 20px; background-color: #fff; ">
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background-color: #ffffff" class="main-table">
          <tbody>
            <tr>
              <td style="padding: 10px 0">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tbody>
                    <tr>
                      <td>
                        <span style=" background-color: ${
                          data?.project?.color
                        }; width: 16px; height: 16px; border-radius: 50%; display: inline-block; margin-right: 10px; "></span>
                        <span style=" font-size: 22px; color: #000000; line-height: 130%; font-weight: 500; ">${
                          data?.project?.title
                        }</span>
                      </td>
                    </tr>
                    <tr>
                      <td valign="top" style="padding: 15px 0 0 0">
                        <div style=" width: 30px; margin-right: 20px; display: inline-block; height: 30px; vertical-align: top; border-radius: 50%; overflow: hidden; ">
                          <img src=${
                            data?.manager && data?.manager.emp_img !== ""
                              ? process.env.HRMS_IMG_SERVER_URL +
                                data?.manager.emp_img
                              : process.env.UPLOADS_URL +
                                "defaultProfile/default-profile.png"
                          } alt="" width="30" height="30" style="border-radius: 50%; margin-right: 10px">
                        </div>
                        <div style=" display: inline-block; max-width: 450px; vertical-align: top; margin-right: 7px; line-height: 100%; font-size: 14px; ">
                          <div style=" white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 140px; ">${getUserName(
                            data?.manager
                          )}</div>
                          <i style=" display: block; color: rgba(0, 0, 0, 0.5); font-size: 13px; ">Manager</i>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 10px">
                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tbody>
                    <tr>
                      <td valign="middle" align="left" height="30" style=" padding-right: 15px; white-space: nowrap; font-size: 14px; ">
                        <b>List:</b>
                      </td>
                      <td valign="middle" align="left" width="100%" style="font-size: 14px">
                      ${
                        data?.mainTask?.isPrivateList
                          ? `<img src='${privateIcon}' alt="private Icon" style="margin-right: 5px; vertical-align: middle" />`
                          : ""
                      }
                       ${data?.mainTask?.title}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 0; border-top: 1px solid #dfe0e0">
                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tbody>
                    <tr>
                      <td width="55" valign="top">
                        <div style="
                            width: 30px;
                            height: 30px;
                            display: block;
                            vertical-align: top;
                            border-radius: 50%;
                            overflow: hidden;
                          ">
                          <img src=${
                            data?.createdBy && data?.createdBy.emp_img !== ""
                              ? process.env.HRMS_IMG_SERVER_URL +
                                data?.createdBy.emp_img
                              : process.env.UPLOADS_URL +
                                "defaultProfile/default-profile.png"
                          } width="30" height="30" style="border-radius: 50%; margin-right: 10px" />
                        </div>
                      </td>
                      <td valign="meddile" style="color: #333; font-weight: 200; font-size: 16px">
                        <b>${getUserName(
                          data?.createdBy
                        )}</b> has <b>assigned</b> you the task:
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tbody>
                    <tr>
                      <td width="55" valign="top" align="left"></td>
                      <td valign="middle">
                        <table cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tbody>
                            <tr>
                              <td style="line-height: 140%; font-size: 14px">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tbody>
                                    <tr>
                                      <td>
                                        <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                          <tbody>
                                            <tr>
                                              <td width="45" valign="top">
                                                <img src="${roundIcon}" alt="round Icon" width="30" height="30" style="
                                                    max-width: 100%;
                                                    max-height: 100%;
                                                  " />
                                              </td>
                                              <td style="
                                                  line-height: 130%;
                                                  padding: 0 0 10px;
                                                  font-size: 14px;
                                                ">
                                                <b>${data?.title} <i>(${
      data?.taskId
    })</i>
                                                </b>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td>&nbsp;</td>
                                              <td style="
                                                  line-height: 130%;
                                                  padding: 0 0 20px;
                                                  font-size: 14px;
                                                ">
                                                <div>${
                                                  data?.descriptions !== ""
                                                    ? data?.descriptions
                                                    : ""
                                                } </div>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <div style="
                                            background-color: #fdfdfd;
                                            padding: 15px;
                                            border-radius: 5px;
                                            border-left: 1px solid #f3f3f3;
                                            border-top: 1px solid #f3f3f3;
                                            border-bottom: 1px solid #d2d2d2;
                                            border-right: 1px solid #d2d2d2;
                                          ">
                                          <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tbody>
                                              <tr>
                                                <td width="45" align="left">
                                                  <img src="${roundListIcon}" alt="round List Icon" width="34" height="34" style="
                                                      max-width: 100%;
                                                      max-height: 100%;
                                                    " />
                                                </td>
                                                <td valign="middle" style="font-size: 14px">
                                                  <b style="font-size: 16px">Stage</b>
                                                  <br />${
                                                    data?.task_status?.title
                                                  }
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="
                                          border-bottom: 1px solid #dfdfdf;
                                          padding: 15px 0;
                                          line-height: 140%;
                                        ">
                                        <table cellspacing="0" cellpadding="0" border="0">
                                          <tbody>
                                            <tr>
                                              <td width="150" valign="middle" style="font-size: 14px">
                                                <b style="font-size: 16px">Start date</b>
                                                <br /> ${
                                                  data?.start_date
                                                    ? moment(
                                                        data?.start_date
                                                      ).format("DD MMM, YY")
                                                    : "-"
                                                }
                                              </td>
                                              <td width="100" align="left" valign="middle">
                                                <img style="
                                                    max-width: 100%;
                                                    max-height: 100%;
                                                  " src="${arrowIcon}" alt="arrow Icon"/>
                                              </td>
                                              <td width="150" valign="middle" style="font-size: 14px">
                                                <b style="font-size: 16px">Due date</b>
                                                <br /> ${
                                                  data?.due_date
                                                    ? moment(
                                                        data?.due_date
                                                      ).format("DD MMM, YY")
                                                    : "-"
                                                }
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="
                                          border-bottom: 1px solid #dfdfdf;
                                          padding: 15px 0;
                                          line-height: 140%;
                                          font-size: 14px;
                                        ">
                                        <b style="font-size: 16px">Estimated time</b>
                                        <br /> ${data?.estimated_hours} hours ${
      data?.estimated_minutes
    } minutes
                                      </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                                <tbody>
                                                <tr>
                                                <td colspan="2" style="padding:15px 0 5px 0;font-size:16px"> <b>Assignees:</b> </td>
                                            </tr>
                                                ${
                                                  data?.assignees?.length > 0
                                                    ? data?.assignees
                                                        .map(
                                                          (a) => `
                                                        <tr>
                                                        <td colspan="2" valign="middle" style="padding:10px 0;border-bottom:1px solid #dfdfdf;font-size:14px"><div style="width:26px;height:26px;display:inline-block;vertical-align:middle;border-radius:50%;overflow:hidden;font-weight:600;font-size:14px;text-transform:uppercase;color:#fff;background:#187cb7;text-align:center;line-height:26px">                            <img src=${
                                                          a && a.emp_img !== ""
                                                            ? process.env
                                                                .HRMS_IMG_SERVER_URL +
                                                              a.emp_img
                                                            : process.env
                                                                .UPLOADS_URL +
                                                              "defaultProfile/default-profile.png"
                                                        }
                                                              alt="img" width="30" height="30" style="border-radius: 50%;"> </div>&nbsp; ${getUserName(
                                                                a
                                                              )}
                                                        </td>
                                                    </tr>
                                                        `
                                                        )
                                                        .join("")
                                                    : ""
                                                }
                                                </tbody></table>
                                        </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 35px 0 25px">
                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tbody>
                    <tr>
                      <td width="55" valign="top" align="left"></td>
                      <td valign="middle">
                      <a href="${
                        process.env.REACT_URL +
                        "project/app/" +
                        data?.project?._id +
                        `?tab=Tasks&listID=${data.mainTask._id}&taskID=${data._id}`
                      }" style="
                          color: #fff;
                          display: inline-block;
                          font-size: 17px;
                          padding: 10px 25px;
                          border-radius: 4px;
                          text-decoration: none;
                          background-color: #187cb7;
                        " target="_blank">View in TaskHub
                      </a>
                      </td>
                    </tr>
                   
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="
                  font-size: 13px;
                  padding: 20px 10px 15px;
                  line-height: 130%;
                  border-top: 1px solid #dfe0e0;
                  color: #a6a6a6;
                ">
                <b>This email was sent to you because:</b>
                <br />
                <b>${getUserName(
                  data?.createdBy
                )}</b> has <b>assigned</b> you the task: <b>${
      data?.title
    } <i>(${data?.taskId})</i>
                </b>
                <br />
              </td>
            </tr>
          
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>
      `;
    const mailData = {
      subject: `[${data?.project?.title}] You have been assigned a task - ${data?.project?.projectId}`,
      html
    };
    //  to get that if Manager is creating task then he shall not recive mail...

    if (data.createdBy?.email !== data.manager?.email) {
      // to get mailSettings of  project manager(PC)..
      const mailSettingsManager = await MailSettings.findOne({
        createdBy: data?.manager?._id
      });

      // to get mailSettings of project manager(PC) as of task_assigned setting being true..
      let mailSettingsDataManager = mailSettingsManager?.task_assigned;

      // to get mailSettings of project manager(PC) as of sending mail after 4 hours setting.
      let quarterlymailsDataManager = mailSettingsManager?.quarterlyMail;
      if (mailSettingsDataManager) {
        // to send mail to Project Manager (PC) whose task_assigned settings allow to send mail
        await emailSenderForPMS(companyId, data?.manager?.email, mailData, []);
      }
      if (quarterlymailsDataManager) {
        // to add the mailid of PC(project manager) and maildata to db for sending such mails after every 4 hours
        await mailsToQuarterHours(data?.manager?.email, mailData, companyId);
      }
    }

    data.assignees = data?.assignees.filter((s) => s !== null);

    // to get mailSettings of assignees..
    const mailSettings = await MailSettings.find({
      createdBy: { $in: data?.assignees?.map((ele) => ele._id) }
    });

    // to get mailSettings of assignees as of task_assigned setting being true..
    let mailSettingsData = mailSettings.filter((ele) => ele.task_assigned);

    // to get mailSettings of assignees as of sending mail after 4 hours setting.
    let quarterlymailsData = mailSettings.filter((ele) => ele.quarterlyMail);

    let mailIds = [];
    let quarterlymailIds = [];

    if (newAddedAssignees.length > 0) {
      // edit time
      // to get that assignees mailids whose mail setting for task_assigned is true
      mailIds = data?.assignees
        .filter(
          (d) =>
            d !== null &&
            newAddedAssignees.includes(d._id.toString()) &&
            mailSettingsData?.some((mail) => mail.createdBy.equals(d._id))
        )
        .map((a) => a.email);
      //to get that assignees mailids whose mail setting for quarterlyMail is true
      quarterlymailIds = data?.assignees
        .filter(
          (d) =>
            d !== null &&
            newAddedAssignees.includes(d._id.toString()) &&
            quarterlymailsData?.some((mail) => mail.createdBy.equals(d._id))
        )
        .map((a) => a.email);
    } else {
      // newly add time
      // to get that assignees mailids whose mail setting for task_assigned is true
      mailIds = data?.assignees
        .filter(
          (d) =>
            d !== null &&
            mailSettingsData?.some((mail) => mail.createdBy.equals(d._id))
        )
        .map((a) => a.email);

      //to get that assignees mailids whose mail setting for quarterlyMail is true
      quarterlymailIds = data?.assignees
        .filter(
          (d) =>
            d !== null &&
            quarterlymailsData?.some((mail) => mail.createdBy.equals(d._id))
        )
        .map((a) => a.email);
    }

    // Filter out the manager's email from the assignees' mail IDs
    mailIds = mailIds.filter((email) => email !== data?.manager?.email);
    quarterlymailIds = quarterlymailIds.filter(
      (email) => email !== data?.manager?.email
    );

    if (mailIds.length > 0) {
      // to send mail to assignees whose settings allow to send mail
      await emailSenderForPMS(companyId, mailIds, mailData, []);
    }
    if (quarterlymailIds.length > 0) {
      // to add the mailids of assignees and maildata to db for sending such mails after every 4 hours
      await mailsToQuarterHours(quarterlymailIds, mailData, companyId);
    }
    return;
  } catch (e) {
    console.log("template/mail.js error at 525 ~> ", e);
  }
};

exports.taskStatusUpdateMail = async (data, companyId) => {
  try {
    let companyData = await getCompanyData(companyId);

    let stageIcon = `${process.env.UPLOADS_URL}/mailTemplatesImg/icon-stage.png`;
    let arrowIcon = `${process.env.UPLOADS_URL}/mailTemplatesImg/icon-arrow.png`;
    let privateIcon = `${process.env.UPLOADS_URL}/mailTemplatesImg/icon-private.png`;
    let roundIcon = `${process.env.UPLOADS_URL}/mailTemplatesImg/icon-round.png`;

    let html = `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
    <style>
      body {
        margin: 0;
        background: #f4f5f5;
        line-height: 30px;
        padding: 20px 0;
        font-size: 16px;
        /* font-family: 'Noir Pro'; */
        font-family: Arial, Helvetica, sans-serif;
        color: #202124;
      }

      p {
        margin: 0;
      }

      h1,
      h3,
      h4,
      h5,
      h6 {
        margin: 0;
        line-height: 1.8;
      }

      a {
        color: #038fde;
        font-size: 14px;
        font-weight: 600;
      }

      .main-template-wrapper {
        background: #fff;
        padding: 20px;
      }
    </style>
  </head>
  <body>
    <div class="main-wrapper" style=" max-width: 640px;
    margin: 0 auto;
    padding: 0 20px;">
      <table class="header">
        <tbody>
          <tr>
            <td>
              <h1 style="
                  color: #038fde;
                  font-size: 30px;
                  padding-bottom: 5px;
                  font-weight: 600;
                "> ${companyData?.companyName || "Taskhub"} </h1>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="main-content-table" style=" padding: 0 20px; background-color: #fff; ">
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background-color:#ffffff">
          <tbody>
            <tr>
              <td style="padding:10px 0">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tbody>
                    <tr>
                      <td>
                        <span style="background-color:${
                          data?.oldData?.project?.color
                        };width:18px;height:18px;border-radius:50%;display:inline-block;margin-right:7px"></span>
                        <span style="font-size:22px;color:#000000;line-height:130%;font-weight:500">${
                          data?.oldData?.project?.title
                        }</span>
                      </td>
                    </tr>
                    <tr>
                      <td valign="top" style="padding:15px 0 0 0">
                        <div style="width:30px;margin-right:20px;display:inline-block;height:30px;vertical-align:top;border-radius:50%;overflow:hidden">
                          <img src="${
                            data?.oldData?.manager &&
                            data?.oldData?.manager.emp_img !== ""
                              ? process.env.HRMS_IMG_SERVER_URL +
                                data?.oldData?.manager.emp_img
                              : process.env.UPLOADS_URL +
                                "defaultProfile/default-profile.png"
                          }" style="width:30px;height:30px;border-radius:50%"  >
                        </div>
                        <div style="display:inline-block;max-width:450px;vertical-align:top;margin-right:7px;line-height:100%;font-size:14px">
                          <div style="white-space:nowrap;text-overflow:ellipsis;overflow:hidden;max-width:140px">${getUserName(
                            data?.oldData?.manager
                          )}</div>
                          <i style="display:block;color:rgba(0,0,0,.5);font-size:13px">Manager</i>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:10px">
                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tbody>
                    <tr>
                      <td valign="middle" align="left" height="30" style="padding-right:15px;white-space:nowrap;font-size:14px">
                        <b>List:</b>
                      </td>
                      <td valign="middle" align="left" width="100%" style="font-size:14px">
                      ${
                        data?.oldData?.mainTask?.isPrivateList
                          ? `<img src='${privateIcon}' alt="private Icon" style="margin-right: 5px; vertical-align: middle" />`
                          : ""
                      }
                       ${data?.oldData?.mainTask?.title}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 0;border-top:1px solid #dfe0e0">
                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tbody>
                    <tr>
                      <td width="55" valign="top">
                        <div style="width:30px;height:30px;display:block;vertical-align:top;border-radius:50%;overflow:hidden">
                          <img src="${
                            data?.newData?.updatedBy &&
                            data?.newData?.updatedBy.emp_img !== ""
                              ? process.env.HRMS_IMG_SERVER_URL +
                                data?.newData?.updatedBy.emp_img
                              : process.env.UPLOADS_URL +
                                "defaultProfile/default-profile.png"
                          } " style="width:30px;height:30px;border-radius:50%"  >
                        </div>
                      </td>
                      <td valign="meddile" style="color:#333;font-weight:200;font-size:16px">
                        <b>${getUserName(
                          data?.newData?.updatedBy
                        )}</b> has <b>changed the stage</b> of the task:
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tbody>
                    <tr>
                      <td width="55" valign="top" align="left"></td>
                      <td valign="middle">
                        <table cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tbody>
                            <tr>
                              <td style="padding-bottom:20px">
                                <div style="background-color:#fdfdfd;padding:15px;border-radius:5px;border-left:1px solid #f3f3f3;border-top:1px solid #f3f3f3;border-bottom:1px solid #d2d2d2;border-right:1px solid #d2d2d2">
                                  <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tbody>
                                      <tr>
                                        <td width="70" align="left">
                                          <img src="${roundIcon}" style="margin-left:5px; width: 30px; height: 30px; vertical-align: middle;">
                                        </td>
                                        <td style="font-size:16px" valign="middle">${
                                          data?.oldData?.title
                                        } <i>(${data?.oldData?.taskId})</i>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td style="line-height:140%;font-size:14px"></td>
                            </tr>
                            <tr>
                              <td>
                                <div style="background-color:#fdfdfd;padding:15px;border-radius:5px;border-left:1px solid #f3f3f3;border-top:1px solid #f3f3f3;border-bottom:1px solid #d2d2d2;border-right:1px solid #d2d2d2">
                                  <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tbody>
                                      <tr>
                                        <td width="45" align="left">
                                          <img src="${stageIcon}" style="margin-left:5px; width: 30px; height: 30px; vertical-align: middle;">
                                        </td>
                                        <td valign="middle" style="font-size:14px; line-height: 1.2;">
                                          <b style="font-size:16px">Stage</b>
                                          <br> ${
                                            data?.oldData?.task_status?.title
                                          }
                                        </td>
                                        <td width="70" align="left">
                                          <img src="${arrowIcon}" style="margin-left:5px; width: 30px; height: 30px; vertical-align: middle;">
                                        </td>
                                        <td width="45" align="left">
                                          <img src="${stageIcon}" style="margin-left:5px; width: 30px; height: 30px; vertical-align: middle;">
                                        </td>
                                        <td valign="middle" style="font-size:14px; line-height: 1.2;">
                                          <b style="font-size:16px">Stage</b>
                                          <br> ${
                                            data?.newData?.task_status?.title
                                          }
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:35px 0 25px">
                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tbody>
                    <tr>
                      <td width="55" valign="top" align="left"></td>
                      <td valign="middle">
                      <a href="${
                        process.env.REACT_URL +
                        "project/app/" +
                        data?.oldData?.project?._id
                      }" style="
                          color: #fff;
                          display: inline-block;
                          font-size: 17px;
                          padding: 10px 25px;
                          border-radius: 4px;
                          text-decoration: none;
                          background-color: #187cb7;
                        " target="_blank">View in TaskHub
                      </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;padding:20px 10px 15px;line-height:130%;border-top:1px solid #dfe0e0;color:#a6a6a6">
                <span class="im">
                  <b>This email was sent to you because:</b>
                  <br>
                </span>
                <b>${getUserName(
                  data?.newData?.updatedBy
                )}</b> has <b>changed the stage</b> of the task: <b>${
      data?.oldData?.title
    } <i>(${data?.oldData?.taskId})</i>
                </b>
                <br>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>
    `;
    const mailData = {
      subject: `[${data?.oldData?.project?.title}] The stage of a task has been changed - ${data?.oldData?.project?.projectId}`,
      html
    };

    data.oldData.assignees = data.oldData.assignees.filter((s) => s !== null);

    // to get mailSettings of assignees..
    const mailSettings = await MailSettings.find({
      createdBy: { $in: data?.oldData?.assignees?.map((ele) => ele._id) }
    });

    // to get mailSettings of mgr..
    const mailSettingsDataManager = await MailSettings.findOne({
      createdBy: data?.oldData?.manager?._id
    });

    // to get mailSettings of assignees as of task_assigned setting being true..
    let mailSettingsData = mailSettings.filter((ele) => ele.task_assigned);

    // to get mailSettings of assignees as of sending mail after 4 hours setting.
    let quarterlymailsData = mailSettings.filter((ele) => ele.quarterlyMail);

    // to get that taggedUsers and manager mailids whose mail setting for task_tagged_comments is true
    let uniqueMails = new Set(
      data?.oldData?.assignees
        ?.filter((s) =>
          mailSettingsData?.some((mail) => mail?.createdBy?.equals(s?._id))
        )
        ?.map((mail) => mail.email)
    );
    let quarterlyuniqueMails = new Set(
      data?.oldData?.assignees
        ?.filter((s) =>
          quarterlymailsData?.some((mail) => mail?.createdBy?.equals(s?._id))
        )
        ?.map((mail) => mail?.email)
    );

    let mailIds = [...uniqueMails];

    let quarterlymailIds = [...quarterlyuniqueMails];
    

    if (mailIds?.length > 0) {
      // to send mail to all whose settings allow to send mail
      await emailSenderForPMS(companyId, mailIds, mailData, []);
    }
    if (quarterlymailIds?.length > 0) {
      // to add the mailids of subscribers and maildata to db for sending such mails after every 4 hours
      await mailsToQuarterHours(quarterlymailIds, mailData, companyId);
    }
    if (mailSettingsDataManager?.task_assigned) {
      await emailSenderForPMS(companyId, data?.manager?.email, mailData, []);
    }
    if (mailSettingsDataManager?.quarterlyMail) {
      // to add the mailids of subscribers and maildata to db for sending such mails after every 4 hours
      await mailsToQuarterHours(data?.manager?.email, mailData, companyId);
    }

    return;
  } catch (e) {
    console.log("🚀 ~ exports.taskStatusUpdateMail= ~ e:", e);
  }
};
