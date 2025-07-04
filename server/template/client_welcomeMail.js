const { emailSenderForPMS, getUserName } = require("../helpers/common");

exports.pmswelcomeClientcontent = async (userData, name) => {
  try {
    const mailData = {
      subject: `Welcome to TaskHub`,
      html: ` <img  width="180" src="${process.env.UPLOADS_URL}elsner_details/task_hub_logo.png" alt="Elsner Technologies Pvt Ltd."/>
            <p><strong>Hi ${getUserName(userData)}</strong>,<br>
            Welcome aboard! I've just added you to Elsner PMS. 
            <br>We can now plan work, discuss ideas, organize documents, take notes, deliver projects, make announcements, stay on top of our schedule, and get more done in less time.
            <br>
            <table> 
                <tr style="background-color:#f9f9f9">
                <td width="125" style="padding:10px;border-bottom:1px solid #e9e9e9;border-right:1px solid #e9e9e9"> Log In link : </td> <td> <a href= ${process.env.REACT_URL} > pms.elsner.com </a> </td></tr>
                <tr style="background-color:#fff"> <td  style="padding:10px;border-bottom:1px solid #e9e9e9;border-right:1px solid #e9e9e9"> Login Id : </td> <td> ${userData.email} </td> </tr>
                <tr> <td  style="padding:10px;border-bottom:1px solid #e9e9e9;border-right:1px solid #e9e9e9"> Password : </td> <td> ${userData.plain_password} </td> </tr>
            </table>
                <br><br>
                Regards,&nbsp;<br>
                <strong>${name}</strong> </p>`,
    };
    await emailSenderForPMS(userData.email, mailData, []);
    console.log("sent");
    return;
  } catch (e) {
    return e;
  }
};
