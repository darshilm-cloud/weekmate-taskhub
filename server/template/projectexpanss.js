const { emailSenderForPMS } = require("../helpers/common");

class ProjectExpansseMail {
  newProjectExpecesMail = async (data, lognusername, companyId) => {
    try {
      let html = `
<div style="font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; background-color: #f4f4f8; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  
  <!-- Header Section -->
  <div style="background-color: #03497a; color: #fff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 20px;"> Project Expense Request for ${
      data?.project?.title
    } </h1>
  </div>

  <!-- Email Body -->
  <div style="padding: 20px; background-color: #fff;">
    <p style="margin: 0 0 15px; font-size: 16px;">Dear <strong>Harshal Shah & Chirag Rawal</strong>,</p>
    
    <p style="margin: 0 0 15px; font-size: 16px;">
      <strong>${
        data?.createdBy?.full_name
          ? data?.createdBy?.full_name
          : lognusername?.full_name
      }</strong> has requested a new purchase for the project <strong>${
        data?.project?.title
      }</strong>.
      Please review the request and approve/reject the request <span><a href=${
        process.env.REACT_URL
      }edit/projectexpenseform/${data?._id}>here</a></span>.
    </p>

    <!-- Expense Details Table -->
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold; width: 40%;">Purchase Request Details</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">${
          data?.purchase_request_details
        }</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Cost</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">$${
          data?.cost_in_usd
        }</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Need to Bill Customer?</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">${
          data?.need_to_bill_customer ? "Yes" : "No"
        }</td>
      </tr>
${
  data?.is_recuring
    ? `
<tr style="background-color: #f9f9f9;">
  <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Is Recurring?</td>
  <td style="padding: 12px; border: 1px solid #eaeaea;text-transform: capitalize">
    Yes ${data.billing_cycle ? ` ~ ${data.billing_cycle}` : ""}
  </td>
</tr>`
    : ""
}

     
    </table>

    <p style="margin-top: 20px; font-size: 14px; color: #555;">Please take necessary action at the earliest.</p>
  </div>

  <!-- Footer Section -->
  <div style="padding: 20px; background-color: #f9f9f9;">
    <p style="margin: 0; font-size: 14px; color: #555;">Thanks and Regards,</p>
    <p style="margin: 5px 0 0; font-weight: bold; font-size: 14px;">Elsner Technologies Pvt. Ltd.</p>
  </div>
</div>
`;

      const mailData = {
        subject: `Expense Request for  ${data?.project?.title}  ~  ${
          " " + data?._id
        }`,
        html
      };

      let cc = [
        data?.createdBy?.email,
        data?.manager?.email,
        // process.env.ACCOUNTANT_EMAIL_ID,
        data?.acc_manager?.email,
        data?.createdBy_rm?.email
      ];
      let to = [process.env.CEO_EMAIL, process.env.DIRECTOR_EMAIL];

      await emailSenderForPMS(companyId, to, mailData, cc);
    } catch (error) {
      console.log("🚀 ~ ComplaintMail ~ newComplaintMail= ~ error:", error);
    }
  };

  approveProjectExpecesMail = async (data, updatedName, companyId) => {
    try {
      console.log(data, "DAtatat", updatedName);

      let html = `
<div style="font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; background-color: #f4f4f8; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  
  <!-- Header Section -->
  <div style="background-color: #03497a; color: #fff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 20px;">Approved - Project Expense Request for ${
      data?.project?.title
    } </h1>
  </div>

  <!-- Email Body -->
  <div style="padding: 20px; background-color: #fff;">
    <p style="margin: 0 0 15px; font-size: 16px;">Dear <strong>Account Team</strong>,</p>
    
    <p style="margin: 0 0 15px; font-size: 16px;">
      <strong>${
        updatedName?.full_name
      }</strong> has approved the purchase for the project 
      <strong>${
        data?.project?.title
      }</strong>. Please proceed with the purchase and update the status along with the invoice <span><a href=${
        process.env.REACT_URL
      }edit/projectexpenseform/${data?._id}>here</a></span>.
    </p>

    <!-- Expense Details Table -->
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold; width: 40%;">Purchase Request Details</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">${
          data?.purchase_request_details
        }</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Cost</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">$${
          data?.cost_in_usd
        }</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Need to Bill Customer?</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">${
          data?.need_to_bill_customer ? "Yes" : "No"
        }</td>
      </tr>
      ${
        data?.is_recuring
          ? `
<tr style="background-color: #f9f9f9;">
  <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Is Recurring?</td>
  <td style="padding: 12px; border: 1px solid #eaeaea;text-transform: capitalize">
    Yes ${data.billing_cycle ? ` ~ ${data.billing_cycle}` : ""}
  </td>
</tr>`
          : ""
      }
    </table>

    <!-- Conditional Billing Message -->
    ${
      data?.need_to_bill_customer
        ? `
    <p style="margin-top: 20px; font-size: 16px; color: #d9534f; font-weight: bold;">
      @AM: Please add $${data?.cost_in_usd} to the customer in the next invoice.
    </p>`
        : ""
    }

    <p style="margin-top: 20px; font-size: 14px; color: #555;">Please take necessary action at the earliest.</p>
  </div>

  <!-- Footer Section -->
  <div style="padding: 20px; background-color: #f9f9f9;">
    <p style="margin: 0; font-size: 14px; color: #555;">Thanks and Regards,</p>
    <p style="margin: 5px 0 0; font-weight: bold; font-size: 14px;">Elsner Technologies Pvt. Ltd.</p>
  </div>
</div>
`;

      const mailData = {
        subject: `Expense Request for ${data?.project?.title}  ~  ${
          " " + data?._id
        }`,
        html
      };

      let cc = [
        data?.manager?.email,
        process.env.ACCOUNTANT_EMAIL_ID,
        process.env.CEO_EMAIL,
        process.env.DIRECTOR_EMAIL,
        data?.createdBy?.email,
        data?.acc_manager?.email,
        // data?.managers_rm?.email,
        data?.createdBy_rm?.email
        // data?.acc_managers_rm?.email,
      ];
      let to = [
        process.env.ACCOUNTANT_EMAIL_ID

        //  process.env.CEO_EMAIL,
        // process.env.DIRECTOR_EMAIL,
      ];

      await emailSenderForPMS(companyId, to, mailData, cc);
    } catch (error) {
      console.log("🚀 ~ ComplaintMail ~ newComplaintMail= ~ error:", error);
    }
  };

  paidProjectExpecesMail = async (data, companyId) => {
    try {
      let html = `
<div style="font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; background-color: #f4f4f8; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  
  <!-- Header Section -->
  <div style="background-color: #03497a; color: #fff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">Paid - Project Expense Request for ${
      data?.project?.title
    } </h1>
  </div>

  <!-- Email Body -->
  <div style="padding: 20px; background-color: #fff;">
    <p style="margin: 0 0 15px; font-size: 16px;">Dear <strong>${
      data?.createdBy?.full_name
    }</strong>,</p>
    
    <p style="margin: 0 0 15px; font-size: 16px;">
      The Account Team has purchased the item as per your request for the project 
      <strong>${data?.project?.title}</strong>.
    </p>

    <!-- Expense Details Table -->
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold; width: 40%;">Purchase Request Details</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">${
          data?.purchase_request_details
        }</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Cost</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">$${
          data?.cost_in_usd
        }</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Need to Bill Customer?</td>
        <td style="padding: 12px; border: 1px solid #eaeaea;">${
          data?.need_to_bill_customer ? "Yes" : "No"
        }</td>
      </tr>
      ${
        data?.is_recuring
          ? `
<tr style="background-color: #f9f9f9;">
  <td style="padding: 12px; border: 1px solid #eaeaea; font-weight: bold;">Is Recurring?</td>
  <td style="padding: 12px; border: 1px solid #eaeaea;text-transform: capitalize">
    Yes ${data.billing_cycle ? ` ~ ${data.billing_cycle}` : ""}
  </td>
</tr>`
          : ""
      }
    </table>

    <!-- Conditional Billing Message -->
    ${
      data?.need_to_bill_customer
        ? `
    <p style="margin-top: 20px; font-size: 16px; color: #d9534f; font-weight: bold;">
      @AM: Please add $${data?.cost_in_usd} to the customer in the next invoice.
    </p>`
        : ""
    }

    <p style="margin-top: 20px; font-size: 14px; color: #555;">Please take necessary action at the earliest.</p>
  </div>

  <!-- Footer Section -->
  <div style="padding: 20px; background-color: #f9f9f9;">
    <p style="margin: 0; font-size: 14px; color: #555;">Thanks and Regards,</p>
    <p style="margin: 5px 0 0; font-weight: bold; font-size: 14px;">Elsner Technologies Pvt. Ltd.</p>
  </div>
</div>
`;

      const mailData = {
        subject: `Expense Request for ${data?.project?.title}  ~  ${
          " " + data?._id
        }`,
        html
      };

      let cc = [
        data?.manager?.email,
        process.env.ACCOUNTANT_EMAIL_ID,
        // process.env.CEO_EMAIL,
        process.env.DIRECTOR_EMAIL,
        data?.acc_manager?.email,
        data?.createdBy_rm?.email
        // data?.acc_managers_rm?.email,
      ];
      let to = [
        data?.createdBy?.email
        //  process.env.CEO_EMAIL,
        // process.env.DIRECTOR_EMAIL,
      ];

      await emailSenderForPMS(companyId, to, mailData, cc);
    } catch (error) {
      console.log("🚀 ~ ComplaintMail ~ newComplaintMail= ~ error:", error);
    }
  };
}

module.exports = new ProjectExpansseMail();
