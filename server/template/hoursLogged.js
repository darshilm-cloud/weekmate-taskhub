const mongoose = require("mongoose");
const MailSettings = mongoose.model("mailsettings");
const ejs = require("ejs");
const moment = require("moment");
const { emailSenderForPMS, getUserName } = require("../helpers/common");
const { mailsToQuarterHours } = require("../controller/quarterlyMails");


class TaskHoursLogged {
  taskHoursLoggedMail = async (data) => {
    try {
      let html = ``;

      html = `
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
        h6,
        p {
            margin: 0;
            line-height: 1.8;
        }

        table,
        tr,
        td {

            border-collapse: collapse;
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

        @media screen and (max-width: 575px) {
            .header h1 {
                font-size: 22px !important;
            }

            .main-content-table tbody span {
                font-size: 14px !important;
            }

            .mail-detail {
                font-size: 14px !important;
            }

            .time-log-estimate td {
                padding-top: 10px;
                display: block;
                text-align: center;
            }

            .side-sp {
                width: 0;
            }

            .mail-btn {
                text-align: center !important;
                padding: 10px !important;
                font-size: 13px !important;
            }

            .footer-font {
                font-size: 10px !important;
            }
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
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"
                style="background-color:#ffffff">
                <tbody>
                    <tr>
                        <td style="padding:10px 0">
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tbody>
                                    <tr>
                                        <td>
                                            <span
                                                style="background-color:${
                                                  data?.project?.color
                                                };width:18px;height:18px;border-radius:50%;display:inline-block;margin-right:7px"></span>
                                            <span
                                                style="font-size:22px;color:#000000;line-height:130%;font-weight:500">${
                                                  data?.project?.title
                                                }<span>
                                                    
                                                </span>
                                                </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td valign="top" style="padding:15px 0 0 0">
                                            <div
                                                style="width:30px;margin-right:20px;display:inline-block;height:30px;vertical-align:top;border-radius:50%;overflow:hidden">
                                                <img src="${
                                                  data?.manager &&
                                                  data?.manager.emp_img !== ""
                                                    ? process.env
                                                        .HRMS_IMG_SERVER_URL +
                                                      data?.manager.emp_img
                                                    : process.env.UPLOADS_URL +
                                                      "defaultProfile/default-profile.png"
                                                }" style="width:30px;height:30px;border-radius:50%">
                                            </div>
                                            <div
                                                style="display:inline-block;max-width:450px;vertical-align:top;margin-right:7px;line-height:100%;font-size:14px">
                                                <div
                                                    style="white-space:nowrap;text-overflow:ellipsis;overflow:hidden;max-width:140px">
                                                    ${getUserName(
                                                      data?.manager
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
                                        <td valign="middle" align="left" height="30"
                                            style="padding-right:15px;white-space:nowrap;font-size:14px">
                                            <b>List:</b>
                                        </td>
                                        <td valign="middle" align="left" width="100%" style="font-size:14px">${
                                          data?.main_task?.title
                                        }</td>

                                    </tr>
                                    <tr>
                                        <td valign="middle" align="left" height="30"
                                            style="padding-right:15px;white-space:nowrap;font-size:14px">
                                            <b>Stag:</b>
                                        </td>
                                        <td valign="middle" align="left" width="100%" style="font-size:14px">
                                            ${data?.task_status?.title}</td>

                                    </tr>
                                    <tr>
                                        <td valign="middle" align="left" height="30"
                                            style="padding-right:15px;white-space:nowrap;font-size:14px">
                                            <b>Task:</b>
                                        </td>
                                        <td valign="middle" align="left" width="100%" style="font-size:14px">${
                                          data?.task?.title
                                        }</td>

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
                                              <div
                                                style="width:30px;height:30px;display:block; vertical-align:top; border-radius:50%;overflow:hidden">
                                                <img src=${
                                                  data?.createdBy &&
                                                  data?.createdBy?.emp_img !==
                                                    ""
                                                    ? process.env
                                                        .HRMS_IMG_SERVER_URL +
                                                      data?.createdBy?.emp_img
                                                    : process.env.UPLOADS_URL +
                                                      "defaultProfile/default-profile.png"
                                                } style="width:30px;height:30px;border-radius:50%">
                                            </div>
                                            
                                        </td>
                                        <td class="mail-detail" valign="meddile"
                                            style="color:#333;font-weight:200;font-size:16px">
                                            <b>${getUserName(
                                              data?.employee
                                            )}</b> has logged time${
        parseInt(data?.total_logged_hours) * 60 +
          parseInt(data?.total_logged_minutes) >
        parseInt(data?.task?.estimated_hours) * 60 +
          parseInt(data?.task?.estimated_minutes)
          ? " that <b>exceeds the estimated time</b> of the task:"
          : " in task."
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
                                        <td class="side-sp" width="55" valign="top" align="left"></td>
                                        <td valign="middle">
                                            <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                                <tbody>
                                                    <tr>
                                                        <td style="padding-bottom:20px">
                                                            <div class="time-log-table"
                                                                style="background-color:#fdfdfd;padding:15px;border-radius:5px;">
                                                                <table cellspacing="0" cellpadding="0" border="0"
                                                                    width="100%">
                                                                    <tr>
                                                                        <td>
                                                                            <table
                                                                                style="width: 100%;box-shadow: 1px 2px 3px 0px rgba(150, 147, 147, 0.63);">
                                                                                <tr>

                                                                                    <td
                                                                                        style=" border: 1px solid #dfe0e0; width: 60%; padding: 10px ; font-size: 14px;">
                                                                                        <p><b> Time
                                                                                                logged</b></p>
                                                                                    </td>
                                                                                    <td
                                                                                        style=" border: 1px solid
                                                                                        #dfe0e0; padding: 10px;font-size: 14px;">
                                                                                        <p><b>Date</b></p>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>

                                                                                    <td
                                                                                        style=" border: 1px solid  #dfe0e0; padding: 10px;font-size: 14px;">
                                                                                        <p><b> ${
                                                                                          data?.logged_hours
                                                                                        }hours ${
        data?.logged_minutes
      }mins</b></p>
                                                                                    </td>
                                                                                    <td
                                                                                        style=" border: 1px solid  #dfe0e0;padding: 10px;font-size: 14px;">
                                                                                        ${moment(
                                                                                          data?.logged_date
                                                                                        ).format(
                                                                                          "DD MMM, YY"
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="line-height:140%;font-size:14px"></td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <div class="time-log-estimate"
                                                                style="background-color:#fdfdfd;padding:15px;">
                                                                <table cellspacing="0" cellpadding="0" border="0"
                                                                    width="100%"
                                                                    style="border: 1px solid  #dfe0e0;  box-shadow: 1px 2px 3px 0px rgba(150, 147, 147, 0.63);">
                                                                    <tbody>
                                                                        <tr>
                                                                            
                                                                                    ${
                                                                                      parseInt(
                                                                                        data?.total_logged_hours
                                                                                      ) *
                                                                                        60 +
                                                                                        parseInt(
                                                                                          data?.total_logged_minutes
                                                                                        ) >
                                                                                      parseInt(
                                                                                        data
                                                                                          ?.task
                                                                                          ?.estimated_hours
                                                                                      ) *
                                                                                        60 +
                                                                                        parseInt(
                                                                                          data
                                                                                            ?.task
                                                                                            ?.estimated_minutes
                                                                                        )
                                                                                        ? `
                                                                                          <td style=" padding: 10px;"><img
                                                                                    style=" max-width: 30px; border-radius: 100%; display:block; margin: auto; "
                                                                                    src='${process.env.UPLOADS_URL}/mailTemplatesImg/icon-worning.jpg'
                                                                                    alt="warning"></td>
                                                                                          `
                                                                                        : ``
                                                                                    }
                                                                            <td style="font-size: 14px; padding: 10px;">
                                                                                <p> <b>Time estimate</b> </p>
                                                                                <p>${
                                                                                  data
                                                                                    ?.task
                                                                                    ?.estimated_hours
                                                                                    ? data
                                                                                        ?.task
                                                                                        ?.estimated_hours
                                                                                    : "00"
                                                                                }hours ${
        data?.task?.estimated_minutes ? data?.task?.estimated_minutes : "00"
      }minutes</p>
                                                                            </td>
                                                                            <td
                                                                                style=" border: 1px solid  #dfe0e0 ; font-size: 14px;padding-left: 10px;">
                                                                                <p> <b>Total Time logged</b></p>
                                                                                <p>${
                                                                                  data?.total_logged_hours
                                                                                    ? data?.total_logged_hours
                                                                                    : "00"
                                                                                }hours ${
        data?.total_logged_minutes ? data?.total_logged_minutes : "00"
      }minutes</p>
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
                                          data?.project?._id +
                                          `?tab=Time`
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
                        <td class="footer-font"
                            style="font-size:13px;padding:20px 10px 15px;line-height:130%;border-top:1px solid #dfe0e0;color:#a6a6a6">
                            <span class="im">
                                <b>This email was sent to you because:</b>
                                <br>
                            </span>
                            You are the manager od of the project '${
                              data?.project?.title
                            }'
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

      const subject =
        parseInt(data?.total_logged_hours) * 60 +
          parseInt(data?.total_logged_minutes) >
        parseInt(data?.task?.estimated_hours) * 60 +
          parseInt(data?.task?.estimated_minutes)
          ? `Alert! [${data?.project?.title}] Time logged on a task has exceeded its estimated time - ${data?.project?.projectId}`
          : `[${data?.project?.title}] Time logged on a task - ${data?.project?.projectId}`;

      let subjectData = ejs.render(subject, { data });
      let htmlData = ejs.render(html, { data });
      let emailBody = {
        subject: subjectData,
        html: htmlData,
      };
      const mailSettingsData = await MailSettings.findOne({
        createdBy: data?.manager?._id,
      });

      if (mailSettingsData.logged_hours) {
        // to send mail whose setting allows ..
        await emailSenderForPMS(data?.manager?.email, emailBody, []);
      }
      if (mailSettingsData.quarterlyMail) {
        // to add the mailids of subscribers and maildata to db for sending such mails after every 4 hours
        await mailsToQuarterHours(data?.manager?.email, emailBody);
      }
      return;
    } catch (error) {
      console.log("🚀 ~ TaskHoursLogged ~ hoursLoggedMail= ~ error:", error);
    }
  };

  subTaskHoursLoggedMail = async (data) => {
    try {
      let html = ``;

      html = `
      <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">

    <style>
        body {
            margin: 0;
            background: #f4f5f5;
            line-height: 30px;
            padding: 20px 0;
            font-size: 16px;
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

        .main-wrapper-block {
            width: 100%;
            max-width: 650px;
            margin: auto;
            padding: 0 15px;
            background: #FAF9F6;
        }

        header h1 {
            color: #038fde;
            font-size: 30px;
            padding-bottom: 5px;
            font-weight: 600;
        }

        .title-block {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .title-block h3 {
            font-size: 22px;
            font-weight: 500;
        }

        .main-template-wrapper>p {
            font-size: 14px;
        }

        .template-content {
            border-top: 1px solid #dfe0e0;
            padding: 15px 0 30px;
            display: flex;
            gap: 20px;
            border-bottom: 1px solid #dfe0e0;
            margin-bottom: 20px;
        }

        .content-item-block h5 {
            font-size: 14px;
        }

        .inner-content>p {
            padding: 0 0 20px;
        }

        .content-item-block {
            display: flex;
            gap: 20px;
        }

        .content-item-block-styled {
            display: flex;
            gap: 20px;
            background-color: #fdfdfd;
            padding: 15px;
            border-radius: 5px;
            border-left: 1px solid #f3f3f3;
            border-top: 1px solid #f3f3f3;
            border-bottom: 1px solid #d2d2d2;
            border-right: 1px solid #d2d2d2;
            margin: 20px 0;
        }

        button.btn {
            color: #fff;
            display: inline-block;
            font-size: 17px;
            padding: 10px 25px;
            border-radius: 4px;
            text-decoration: none;
            background: linear-gradient(45deg, #187CB7, #36A0DF);
            border: none;
            margin: 20px 0 0;
            cursor: pointer;
        }

        .content-item-block-styled h6 {
            font-size: 16px;
        }

        span.styled-text {
            color: #000;
            background: #f8e066;
            padding: 3px;
        }

        .template-footer {
            color: #a6a6a6;
            line-height: 21px;
            font-size: 14px;
        }

        footer {
            color: #999;
            font-size: 12px;
            line-height: 20px;
            padding: 20px 0;
        }

        footer a {
            color: #999;
            text-decoration: none;
            font-size: 12px;
        }

        .label-block {
            border-top: 1px solid #dfe0e0;
            border-bottom: 1px solid #dfe0e0;
            padding: 15px 0;
            line-height: 15px;
            margin: 15px 0;
        }

        .label-block p {
            border-radius: 5px;
            background: #dd1d21;
            display: inline-block;
            padding: 3px 7px;
            font-size: 12px;
            color: #fff;
            letter-spacing: 0.5px;
        }

        .inner-content>div p {
            font-size: 14px;
            line-height: 15px;
        }

        .inner-content h4 {
            font-size: 14px;
        }

        .inner-content {
    width: calc(100% - 60px);
}

.title-block h3 a {
    font-size: 22px;
}

.content-item-block-styled table {
    width: 100%;
    text-align: left;
}
    </style>
</head>

<body>
    <div class="main-wrapper-block">
        <header>
            <h1>Elsner Technologies Pvt Ltd</h1>
        </header>
        <div class="main-template-wrapper">
            <div class="title-block">
                <div style="width: 16px; height: 16px; border-radius: 50%; margin-top: 14px; background-color: ${
                  data?.project?.color
                };">
                </div>
                <h3>${data?.project?.title}</h3>
            </div>
            <div style="display: flex; align-items: center; gap: 20px; margin: 10px 0;">
                <img src=${
                  data?.manager && data?.manager.emp_img !== ""
                    ? process.env.HRMS_IMG_SERVER_URL + data?.manager.emp_img
                    : process.env.UPLOADS_URL +
                      "defaultProfile/default-profile.png"
                } alt="" width="40"
                    height="40" style="border-radius: 50%;">
                <div style="font-size: 14px; line-height: 20px;">
                    <p>${getUserName(data?.manager)}</p>
                    <p style="color: #999;"><i>Manager</i></p>
                </div>
            </div>
            <p><b style="width: 50px; display: inline-block;">List:</b> ${
              data?.main_task?.title
            }</p>
            <p><b style="width: 50px; display: inline-block;">Stage:</b> ${
              data?.sub_task_status?.title
            }</p>
            <p><b style="width: 50px; display: inline-block;">Task:</b> ${
              data?.task?.title
            }</p>
            <p><b style="width: 80px; display: inline-block;">Sub Task:</b> ${
              data?.subtask?.title
            }</p>
            <div class="template-content">
                <div class="inner-image">
                    <img src="https://cdn-icons-png.flaticon.com/512/219/219969.png" alt="img" width="40" height="40"
                        style="border-radius: 50%;">
                </div>
                <div class="inner-content">
                    <p style="padding-top: 5px;"><b>${getUserName(
                      data?.employee
                    )}</b> has logged time${
        parseInt(data?.logged_hours) * 60 + parseInt(data?.logged_minutes) >
        parseInt(data?.task?.estimated_hours) * 60 +
          parseInt(data?.task?.estimated_minutes)
          ? " that <b>exceeds the estimated time</b> of the sub task:"
          : " in sub task."
      }</p>
                    <div>
                        <div class="content-item-block-styled">
                            <table>
                                <tr>
                                    <th>Time Logged</th>
                                    <th>Date</th>
                                </tr>
                                <tr>
                                    <th>
                                        ${
                                          data?.subtask?.estimated_hours
                                        }hours ${
        data?.subtask?.estimated_minutes
      }minutes
                                    </th>
                                    <td>${moment(data?.logged_date).format(
                                      "DD MMM, YY"
                                    )}</td>
                                </tr> 
                            </table>
                        </div>
                        <div class="content-item-block-styled" style="display: flex; align-items: center; gap: 70px; margin-top: 40px;">
                            <div style="display: flex; align-items: center; gap: 20px; margin-right: 170px;">
                                <div>
                                    <i class="fa fa-exclamation-triangle" aria-hidden="true" style="font-size: 25px; color: #dd1d21; vertical-align: middle;"></i>
                                </div>
                                <div>
                                    <h4>Time estimate</h4>
                                    <p>${data?.subtask.estimated_hours}hours ${
        data?.subtask.estimated_minutes
      }minutes</p>
                                </div>
                            </div>
                            <div>
                                <h4>Total time logged</h4>
                                <p>${data?.logged_hours}hours ${
        data?.logged_minutes
      }minutes</p>
                            </div>
                        </div>
                    </div>
                    <button class="btn" type="button">View in <span class="styled-text"> <a href="${
                      process.env.REACT_URL +
                      "project/app/" +
                      data?.project?._id +
                      `?tab=Time`
                    }">PMS</a></span></button>
                </div>
            </div>
            <div class="template-footer">
                <p><b>This email sent to you because:</b></p>
                <p>You are the manager of the project: '${
                  data?.project?.title
                }'</p>
            </div>
        </div>
        <footer>
            <p><span class="styled-text"> @ProofHub</span> LLC, 440 N Brranca Ave #8090,
                Covina, CA 91723, US</p>
            <a href="#">Manage your email notification preferences</a> <a href="#">Unsubscribe</a>
        </footer>
    </div>
</body>

</html>
      `;

      let subjectData = ejs.render(
        `Sub Task hours logged in ${data?.project.title} project - ${data?.project?.projectId}`,
        { data }
      );
      let htmlData = ejs.render(html, { data });
      let emailBody = {
        subject: subjectData,
        html: htmlData,
      };
      await emailSenderForPMS(data?.manager.email, emailBody, []);
      return;
    } catch (error) {
      console.log("🚀 ~ TaskHoursLogged ~ hoursLoggedMail= ~ error:", error);
    }
  };
}

module.exports = new TaskHoursLogged();
