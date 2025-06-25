const mongoose = require("mongoose");
const MailSettings = mongoose.model("mailsettings");
const { emailSenderForPMS, getUserName } = require("../helpers/common");
const { mailsToQuarterHours } = require("../controller/quarterlyMails");


class ProjectMail {
  newProjectManagerMail = async (data) => {
    try {
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
                "> Elsner Technologies Pvt Ltd </h1>
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
                          data?.color
                        }; width: 16px; height: 16px; border-radius: 50%; display: inline-block; margin-right: 10px; "></span>
                        <span style=" font-size: 22px; color: #000000; line-height: 130%; font-weight: 500; ">${
                          data.title
                        }</span>
                      </td>
                    </tr>
                    <tr>
                      <td valign="top" style="padding: 15px 0 0 0">
                        <div style=" width: 30px; margin-right: 20px; display: inline-block; height: 30px; vertical-align: top; border-radius: 50%; overflow: hidden; ">
                          <img src=${
                            data?.manager && data.manager.emp_img !== ""
                              ? process.env.HRMS_IMG_SERVER_URL +
                                data.manager.emp_img
                              : process.env.UPLOADS_URL +
                                "defaultProfile/default-profile.png"
                          } alt="" width="30" height="30" style="border-radius: 50%; margin-right: 10px">
                        </div>
                        <div style=" display: inline-block; max-width: 450px; vertical-align: top; margin-right: 7px; line-height: 100%; font-size: 14px; ">
                          <div style=" white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 140px; "> ${
                            data?.manager ? getUserName(data.manager) : "-"
                          } </div>
                          <i style=" display: block; color: rgba(0, 0, 0, 0.5); font-size: 13px; ">Manager</i>
                        </div>
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
                            data?.createdBy && data.createdBy.emp_img !== ""
                              ? process.env.HRMS_IMG_SERVER_URL +
                                data.createdBy.emp_img
                              : process.env.UPLOADS_URL +
                                "defaultProfile/default-profile.png"
                          } width="30" height="30" style="border-radius: 50%; margin-right: 10px" />
                        </div>
                      </td>
                      <td valign="meddile" style="color: #333; font-weight: 200; font-size: 16px">
                        <b>${
                          data?.createdBy ? getUserName(data.createdBy) : "-"
                        }</b> has <b>assigned</b> you as a project manager:
                        <br><br/>
                        <b>Technology : </b> ${
                          data?.technology && data?.technology?.length > 0
                            ? data?.technology
                                ?.map((t) => t.project_tech)
                                .join(", ")
                            : "-"
                        }
                        <br>
                        <b>Estimated Hours : </b> ${
                          data?.estimatedHours ? data?.estimatedHours : "-"
                        }
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
                                      <td style="
                                          border-top: 1px solid #dfdfdf;
                                          border-bottom: 1px solid #dfdfdf;
                                          padding: 15px 0;
                                          line-height: 140%;
                                        ">
                                         <table cellspacing="0" cellpadding="0" border="0">
                                          <tbody>
                                            <tr>
                                              <td width="130" valign="middle" style="font-size: 14px">
                                                <img style="width: 16px; height: 16px; margin-right: 5px; vertical-align: top;" src="${
                                                  process.env.UPLOADS_URL
                                                }mailTemplatesImg/icon-calendar.png" />${
        data?.start_date ? moment(data?.start_date).format("DD MMM, YY") : "-"
      }

                                              </td>
                                              <td width="40px" align="left" valign="middle">
                                                <img style="width: 20px; max-width: 100%; max-height: 100%; " src="${
                                                  process.env.UPLOADS_URL
                                                }mailTemplatesImg/icon-arrow.png" />
                                              </td>
                                              <td width="130" valign="middle" style="font-size: 14px">
                                                <img style="width: 16px; height: 16px; margin-right: 5px; vertical-align: top;" src="${
                                                  process.env.UPLOADS_URL
                                                }mailTemplatesImg/icon-calendar.png" />${
        data?.end_date ? moment(data?.end_date).format("DD MMM, YY") : "-"
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
                                        ">
                                        <table cellspacing="0" cellpadding="0" border="0">
                                          <tbody>
                                            <tr>
                                              <td>
                                                <div style=" width: 30px; margin-right: 20px; display: inline-block; height: 30px; vertical-align: middle; border-radius: 50%; overflow: hidden; ">
                                                  <img src=${
                                                    data?.manager &&
                                                    data.manager.emp_img !== ""
                                                      ? process.env
                                                          .HRMS_IMG_SERVER_URL +
                                                        data.manager.emp_img
                                                      : process.env
                                                          .UPLOADS_URL +
                                                        "defaultProfile/default-profile.png"
                                                  } alt="" width="30" height="30" style="border-radius: 50%; margin-right: 10px">
                                                </div>
                                                <div style=" display: inline-block; max-width: 450px; vertical-align: middle; line-height: 100%; font-size: 14px; ">
                                                  <div style=" white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 300px; ">${
                                                    data?.manager
                                                      ? getUserName(
                                                          data.manager
                                                        )
                                                      : "-"
                                                  }</div>
                                                  <span style="display: inline-block; background-color: #9d9d9d; font-size: 11px; border-radius: 5px; padding: 2px 4px; text-transform: uppercase; font-weight: 300; color: #fff; line-height: 1;">Manager</span>
                                                  
                                                </div>
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
                                        <img style="width: 16px; height: 16px; margin-right: 5px; vertical-align: top;" src="${
                                          process.env.UPLOADS_URL
                                        }mailTemplatesImg/icon-workflow-status.png" />
                                        ${
                                          data?.project_status
                                            ? data.project_status.title
                                            : "-"
                                        }
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
                          process.env.REACT_URL + "project/app/" + data._id
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
                )}</b> has <b>assigned</b> you as a project manager: <b>${
        data?.title
      }</i>
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
        subject: `[${data.title}] You have been assigned as a project manager - ${data.projectId}`,
        html,
      };
      // to get mailSettings of mgr..
      const mailSettingsDataManager = await MailSettings.findOne({
        $or: [{ createdBy: data.manager }],
      });

      if (mailSettingsDataManager.project_assigned) {
        // to send mail to manager whose settings allow to send mail
        await emailSenderForPMS(data?.manager?.email, mailData, []);
      } else if (mailSettingsDataManager.quarterlyMail) {
        // to add the mailids and maildata to db for sending such mails after every 4 hours
        await mailsToQuarterHours([data?.manager?.email], mailData);
      }
      return;
    } catch (error) {
      console.log("🚀 ~ ProjectMail ~ newProjectManagerMail= ~ error:", error);
    }
  };

  newProjectAssigneesMail = async (data) => {
    try {
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
                "> Elsner Technologies Pvt Ltd </h1>
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
                          data?.color
                        }; width: 16px; height: 16px; border-radius: 50%; display: inline-block; margin-right: 10px; "></span>
                        <span style=" font-size: 22px; color: #000000; line-height: 130%; font-weight: 500; ">${
                          data?.title
                        }</span>
                      </td>
                    </tr>
                    <tr>
                      <td valign="top" style="padding: 15px 0 0 0">
                        <div style=" width: 30px; margin-right: 20px; display: inline-block; height: 30px; vertical-align: top; border-radius: 50%; overflow: hidden; ">
                          <img src=${
                            data?.manager && data.manager.emp_img !== ""
                              ? process.env.HRMS_IMG_SERVER_URL +
                                data.manager.emp_img
                              : process.env.UPLOADS_URL +
                                "defaultProfile/default-profile.png"
                          } alt="" width="30" height="30" style="border-radius: 50%; margin-right: 10px">
                        </div>
                        <div style=" display: inline-block; max-width: 450px; vertical-align: top; margin-right: 7px; line-height: 100%; font-size: 14px; ">
                          <div style=" white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 140px; "> ${
                            data?.manager ? getUserName(data.manager) : "-"
                          } </div>
                          <i style=" display: block; color: rgba(0, 0, 0, 0.5); font-size: 13px; ">Manager</i>
                        </div>
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
                            data?.createdBy && data.createdBy.emp_img !== ""
                              ? process.env.HRMS_IMG_SERVER_URL +
                                data.createdBy.emp_img
                              : process.env.UPLOADS_URL +
                                "defaultProfile/default-profile.png"
                          } style="
                              width: 30px;
                              height: 30px;
                              border-radius: 50%;
                            " />
                        </div>
                      </td>
                      <td valign="meddile" style="color: #333; font-weight: 200; font-size: 16px">
                        <b>${
                          data?.createdBy ? getUserName(data.createdBy) : "-"
                        }</b> has <b>assigned</b> you the project:
                        <br><br/>
                        <b>Technology : </b> ${
                          data?.technology && data?.technology?.length > 0
                            ? data?.technology
                                ?.map((t) => t.project_tech)
                                .join(", ")
                            : "-"
                        }
                        <br>
                        <b>Estimated Hours : </b> ${
                          data?.estimatedHours ? data?.estimatedHours : "-"
                        }
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
                                      <td style="
                                          border-top: 1px solid #dfdfdf;
                                          border-bottom: 1px solid #dfdfdf;
                                          padding: 15px 0;
                                          line-height: 140%;
                                        ">
                                         <table cellspacing="0" cellpadding="0" border="0">
                                          <tbody>
                                            <tr>
                                              <td width="130" valign="middle" style="font-size: 14px">
                                                <img style="width: 16px; height: 16px; margin-right: 5px; vertical-align: top;" src="${
                                                  process.env.UPLOADS_URL
                                                }mailTemplatesImg/icon-calendar.png" />${
        data?.start_date ? moment(data?.start_date).format("DD MMM, YY") : "-"
      }

                                              </td>
                                              <td width="40px" align="left" valign="middle">
                                                <img style="width: 20px; max-width: 100%; max-height: 100%; " src="${
                                                  process.env.UPLOADS_URL
                                                }mailTemplatesImg/icon-arrow.png" />
                                              </td>
                                              <td width="130" valign="middle" style="font-size: 14px">
                                                <img style="width: 16px; height: 16px; margin-right: 5px; vertical-align: top;" src="${
                                                  process.env.UPLOADS_URL
                                                }mailTemplatesImg/icon-calendar.png" />${
        data?.end_date ? moment(data?.end_date).format("DD MMM, YY") : "-"
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
                                        ">
                                        <table cellspacing="0" cellpadding="0" border="0">
                                          <tbody>
                                            <tr>
                                              <td>
                                                <div style=" width: 30px; margin-right: 20px; display: inline-block; height: 30px; vertical-align: middle; border-radius: 50%; overflow: hidden; ">
                                                  <img src=${
                                                    data?.manager &&
                                                    data.manager.emp_img !== ""
                                                      ? process.env
                                                          .HRMS_IMG_SERVER_URL +
                                                        data.manager.emp_img
                                                      : process.env
                                                          .UPLOADS_URL +
                                                        "defaultProfile/default-profile.png"
                                                  } alt="" width="30" height="30" style="border-radius: 50%; margin-right: 10px">
                                                </div>
                                                <div style=" display: inline-block; max-width: 450px; vertical-align: middle; line-height: 100%; font-size: 14px; ">
                                                  <div style=" white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 300px; ">${
                                                    data?.manager
                                                      ? getUserName(
                                                          data.manager
                                                        )
                                                      : "-"
                                                  }</div>
                                                  <span style="display: inline-block; background-color: #9d9d9d; font-size: 11px; border-radius: 5px; padding: 2px 4px; text-transform: uppercase; font-weight: 300; color: #fff; line-height: 1;">Manager</span>
                                                  
                                                </div>
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
                                        <img style="width: 20px; max-width: 100%; max-height: 100%; " src="${
                                          process.env.UPLOADS_URL
                                        }mailTemplatesImg/icon-workflow-status.png" />
                                        ${
                                          data?.project_status
                                            ? data.project_status.title
                                            : "-"
                                        }
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
                          process.env.REACT_URL + "project/app/" + data._id
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
                )}</b> has <b>assigned</b> you the Project: <b>${data.title}</i>
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
        subject: `[${data.title}] You have been assigned a project - ${data.projectId}`,
        html,
      };
      // to get mailSettings of assignees..
      const mailSettingsDataAssignee = await MailSettings.find({
        $or: [{ createdBy: { $in: data?.assignees?.map((ele) => ele?._id) } }],
      });
      // to get mailSettings of assignees as of project_assigned setting being true..
      let mailSettingsData = mailSettingsDataAssignee?.filter(
        (ele) => ele?.project_assigned
      );
      // to get mailSettings of assignees as of sending mail after 4 hours setting..
      let quarterlymailSettingsData = mailSettingsDataAssignee?.filter(
        (ele) => ele?.quarterlyMail
      );

      //to get that assignees mailids whose mail setting for project_assigned is true
      const assigneeMail = data?.assignees
        ?.filter((a) =>
          mailSettingsData?.some((mail) => mail?.createdBy?.equals(a?._id))
        )
        ?.map((a) => a?.email);

      //to get that assignees mailids whose mail setting for quarterlyMail is true
      const quarterlyassigneeMail = data?.assignees
        .filter((a) =>
          quarterlymailSettingsData?.some((mail) =>
            mail?.createdBy?.equals(a?._id)
          )
        )
        .map((a) => a?.email);

      const pmsClientsMails = data?.pms_clients
        ?.filter((a) => a._id != undefined)
        ?.map((a) => a?.email);

      await emailSenderForPMS([...pmsClientsMails], mailData, []);
      if (assigneeMail?.length > 0) {
        await emailSenderForPMS([...assigneeMail], mailData, []);
      }
      if (quarterlyassigneeMail?.length > 0) {
        await mailsToQuarterHours(quarterlyassigneeMail, mailData);
      }
      return;
    } catch (error) {
      console.log(
        "🚀 ~ ProjectMail ~ newProjectAssigneesMail= ~ error:",
        error
      );
    }
  };

  mailForUpdateProjectInfo = async (data) => {
    try {
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
                "> Elsner Technologies Pvt Ltd </h1>
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
                          data?.oldData?.color
                        };width:18px;height:18px;border-radius:50%;display:inline-block;margin-right:7px"></span>
                        <span style="font-size:22px;color:#000000;line-height:130%;font-weight:500">${
                          data?.oldData?.title
                        } </span>
                      </td>
                    </tr>
                    <tr>
                      <td valign="top" style="padding:15px 0 0 0">
                        <div style="width:30px;margin-right:20px;display:inline-block;height:30px;vertical-align:top;border-radius:50%;overflow:hidden">
                          <img src=${
                            data?.oldData?.manager &&
                            data?.oldData?.manager.emp_img !== ""
                              ? process.env.HRMS_IMG_SERVER_URL +
                                data?.oldData?.manager.emp_img
                              : process.env.UPLOADS_URL +
                                "defaultProfile/default-profile.png"
                          }  style="width:30px;height:30px;border-radius:50%">
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
                <table cellspacing="0" cellpadding="0" border="0" width="100%"></table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 0;border-top:1px solid #dfe0e0">
                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tbody>
                    <tr>
                      <td width="55" valign="top">
                        <div style="width:30px;height:30px;display:block;vertical-align:top;border-radius:50%;overflow:hidden">
                          <img src=${
                            data?.newData?.updatedBy &&
                            data?.newData?.updatedBy.emp_img !== ""
                              ? process.env.HRMS_IMG_SERVER_URL +
                                data?.newData?.updatedBy.emp_img
                              : process.env.UPLOADS_URL +
                                "defaultProfile/default-profile.png"
                          } style="width:30px;height:30px;border-radius:50%">
                        </div>
                      </td>
                      <td valign="meddile" style="color:#333;font-weight:200;font-size:16px">
                        <b>${getUserName(
                          data?.newData?.updatedBy
                        )}</b> has <b>updated</b> the information of project:
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
                              <td style="line-height:140%;font-size:14px">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tbody>
                                    <tr>
                                      <td width="47%" valign="top" align="center" height="30">
                                        <b>Old</b>
                                      </td>
                                      <td width="6%" align="center" valign="top"></td>
                                      <td width="47%" valign="top" align="center">
                                        <b>New</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td valign="top">
                                        <div style="border-radius:5px;border:2px solid #d3d3d3;padding:15px">
                                          <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tbody>
                                              <tr>
                                                <td style="padding-bottom:5px">
                                                  <span style="background-color:${
                                                    data?.oldData?.color
                                                  };width:14px;height:14px;border-radius:50%;display:inline-block;margin-right:7px"></span>
                                                  <span style="font-size:18px;color:#000000;line-height:130%;font-weight:500">${
                                                    data?.oldData?.title
                                                  }</span>
                                                </td>
                                              </tr>
                                              <tr>
                                                <td style="padding:10px 0 0;border-top:1px solid #eee;line-height:140%">
                                                  <b>Manager</b>
                                                  <br>
                                                  <span style="width:26px;height:26px;display:inline-block;vertical-align:middle;border-radius:50%;overflow:hidden;margin-right:5px;background-color:#1f1f1f;text-align:center;line-height:26px">
                                                    <img style="max-width:100%;max-height:100%" src=${
                                                      data?.oldData?.manager &&
                                                      data?.oldData?.manager
                                                        .emp_img !== ""
                                                        ? process.env
                                                            .HRMS_IMG_SERVER_URL +
                                                          data?.oldData?.manager
                                                            .emp_img
                                                        : process.env
                                                            .UPLOADS_URL +
                                                          "defaultProfile/default-profile.png"
                                                    }  >
                                                  </span>

                                                  ${getUserName(
                                                    data?.oldData?.manager
                                                  )}
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                      <td align="center" valign="top" style="padding-top:20px">
                                        <img style="width: 20px; height:20px;max-width:100%;max-height:100%" src=${
                                          process.env.UPLOADS_URL
                                        }mailTemplatesImg/icon-arrow-bold.png  >
                                      </td>
                                      <td valign="top">
                                        <div style="border-radius:5px;border:2px solid #d3d3d3;padding:15px">
                                          <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tbody>
                                              <tr>
                                                <td style="padding-bottom:5px">
                                                  <span style="background-color:${
                                                    data?.newData?.color
                                                  };width:14px;height:14px;border-radius:50%;display:inline-block;margin-right:7px"></span>
                                                  <span style="font-size:18px;color:#000000;line-height:130%;font-weight:500">${
                                                    data?.newData?.title
                                                  }</span>
                                                </td>
                                              </tr>
                                              <tr>
                                                <td style="padding:10px 0 0;border-top:1px solid #eee;line-height:140%">
                                                  <b>Manager</b>
                                                  <br>
                                                  <span style="width:26px;height:26px;display:inline-block;vertical-align:middle;border-radius:50%;overflow:hidden;margin-right:5px;background-color:#1f1f1f;text-align:center;line-height:26px">
                                                    <img style="max-width:100%;max-height:100%" src=${
                                                      data?.newData?.manager &&
                                                      data?.newData?.manager
                                                        .emp_img !== ""
                                                        ? process.env
                                                            .HRMS_IMG_SERVER_URL +
                                                          data?.newData?.manager
                                                            .emp_img
                                                        : process.env
                                                            .UPLOADS_URL +
                                                          "defaultProfile/default-profile.png"
                                                    }  >
                                                  </span>${getUserName(
                                                    data?.newData?.manager
                                                  )}
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
                        data?.oldData?._id
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
                <b>This email was sent to you because:</b>
                <br>
                <b>${getUserName(
                  data?.newData?.updatedBy
                )}</b> has <b>updated </b>the information of the project: <b>${
        data?.oldData?.title
      }</b>
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
        subject: `Alert! [${data?.oldData?.title}] Information of the project has been updated - ${data?.oldData?.projectId}`,
        html,
      };
      const mailIds = [
        ...new Set([
          // ...data?.oldData?.assignees.map((a) => a.email),
          data?.oldData?.manager?.email,
          // ...data?.newData?.assignees.map((n) => n.email),
          data?.newData?.manager?.email,
        ]),
      ];

      await emailSenderForPMS(mailIds, mailData, []);
      return;
    } catch (error) {
      console.log(
        "🚀 ~ ProjectMail ~ newProjectAssigneesMail= ~ error:",
        error
      );
    }
  };
}

module.exports = new ProjectMail();
