const mongoose = require("mongoose");
const MailSettings = mongoose.model("mailsettings");
const { emailSenderForPMS, getUserName, getCompanyData } = require("../helpers/common");
const { mailsToQuarterHours } = require("../controller/quarterlyMails");


exports.topicSubscriberMail = async (data,companyId) => {
  try {
    let companyData = await getCompanyData(companyId);

    let topicIcon = `${process.env.UPLOADS_URL}/mailTemplatesImg/icon-topic.png`;

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
                            ? process.env.UPLOADS_URL +
                              data?.manager.emp_img
                            : process.env.UPLOADS_URL +
                              "defaultProfile/default-profile.png"
                        } alt="" width="30" height="30" style="border-radius: 50%; margin-right: 10px">
                      </div>
                      <div style=" display: inline-block; max-width: 450px; vertical-align: top; margin-right: 7px; line-height: 100%; font-size: 14px; ">
                        <div style=" white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 140px; "> ${
                          data?.manager ? getUserName(data?.manager) : "-"
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
                          data?.createdBy && data?.createdBy.emp_img !== ""
                            ? process.env.UPLOADS_URL +
                              data?.createdBy.emp_img
                            : process.env.UPLOADS_URL +
                              "defaultProfile/default-profile.png"
                        } width="30" height="30" style="border-radius: 50%; margin-right: 10px" />
                      </div>
                    </td>
                    <td valign="meddile" style="color: #333; font-weight: 200; font-size: 16px">
                      <b>${
                        data?.createdBy ? getUserName(data?.createdBy) : "-"
                      }</b> has <b>subscribed</b> you to the topic:
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
          <div style="background-color:#fdfdfd;padding:15px;border-radius:5px;border-left:1px solid #f3f3f3;border-top:1px solid #f3f3f3;border-bottom:1px solid #d2d2d2;border-right:1px solid #d2d2d2">
                                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                                    <tbody><tr><td width="70" align="left">
                                                        <img src="${topicIcon}" style="margin-left:5px" class="CToWUd" data-bit="iit">
                                                    </td><td style="font-size:16px" valign="middle"><div style="font-weight:600;margin-bottom:5px;font-size:18px">${
                                                      data?.title
                                                    }</div></td>
                                                    </tr>
                                                </tbody></table>
                                            </div>
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
                        `?tab=Discussion`
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
              )}</b> has <b>subscribed</b> you to the topic: <b>${
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
      subject: `[${data?.project?.title}] You have been subscribed to a topic - ${data?.project?.projectId}`,
      html,
    };
    // to get mailSettings of mgr..
    const mailSettingsDataMgr = await MailSettings.findOne({
      createdBy: data.project.manager,
    });

    // to get mailSettings of subscribers..
    const mailSettingsData = await MailSettings.find({
      createdBy: { $in: data?.subscribers.map((ele) => ele._id) },
    });

    // to get mailSettings of subscribers as of discussion_subscribed setting being true..
    let mailsData = mailSettingsData.filter((ele) => ele.discussion_subscribed);

    // to get mailSettings of subscribers as of sending mail after 4 hours setting.
    let quarterlymailsData = mailSettingsData.filter(
      (ele) => ele.quarterlyMail
    );

    // to get that subscribers mailids whose mail setting for discussion_subscribed is true
    let mailIds = data?.subscribers
      .filter((s) => mailsData.some((mail) => mail.createdBy.equals(s._id)))
      .map((subscriber) => subscriber.email);

    let clientsmailIds = data?.pms_clients
    .filter((s) => s._id != undefined)
    .map((subscriber) => subscriber.email);
    
    //to get that subscribers mailids whose mail setting for quarterlyMail is true
    let quarterlymailIds = data?.subscribers
      .filter((s) =>
        quarterlymailsData.some((mail) => mail.createdBy.equals(s._id))
      )
      .map((subscriber) => subscriber.email);

    // to check that manager is not included in the subscribers list ..
    mailIds = mailIds.filter((ele) => ele != data?.manager?.email);
    quarterlymailIds = quarterlymailIds.filter(
      (ele) => ele != data?.manager?.email
    );

    if(clientsmailIds.length > 0){
      await emailSenderForPMS(companyId,[...clientsmailIds], mailData, []);
    }
    // For Subscribers:
    if (mailIds.length > 0) {
      // to send mail to subscribers whose settings allow to send mail
      // and not to manager whose setting is off/false
      await emailSenderForPMS(companyId,[...mailIds], mailData, []);
    }
    if (quarterlymailIds.length > 0) {
      // to add the mailids of subscribers and maildata to db for sending such mails after every 4 hours
      await mailsToQuarterHours(quarterlymailIds, mailData,companyId);
    }

    // For Managers:
    if (mailSettingsDataMgr && mailSettingsDataMgr.discussion_subscribed) {
      // to send mail to manager and subscribers whose settings allow to send mail
      await emailSenderForPMS(companyId,[data?.manager?.email], mailData, []);
    } else if (mailSettingsDataMgr && mailSettingsDataMgr.quarterlyMail) {
      // to add the mailid of manager and maildata to db for sending such mails after every 4 hours
      await mailsToQuarterHours([data?.manager?.email], mailData,companyId);
    }
    return;
  } catch (error) {
    console.log("🚀 ~ exports.topicSubscriberMail= ~ error:", error);
  }
};
