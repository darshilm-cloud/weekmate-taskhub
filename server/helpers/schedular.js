const schedule = require("node-schedule");
const moment = require("moment");
const {
  scheduleCronForProjectMissedDeadline,
  scheduleCronForTaskMissedDeadline,
  scheduleCronTosendMailtoAllPMandAMfornotUpdatingStatus,
  scheduleCronForGetFileUploadSize
} = require("../controller/schedular");
const { getQuarterlyMails, updateSentMails } = require("../controller/quarterlyMails")
const { emailSenderForPMS } = require("../helpers/common")

// Send mail to PM and PM's manager to missed project Deadline... 10am
schedule.scheduleJob("30 4 * * *", async () => {
  try {
    console.info(
      "schedule project missed deadline 10am started at",
      moment().toString(),
      moment.utc().valueOf()
    );
    await scheduleCronForProjectMissedDeadline();
    console.info("schedule project missed deadline 10am finished");
  } catch (error) {
    console.log(
      "🚀 ~ schedule.scheduleJob ~ project missed deadline error:",
      error
    );
  }
});

// add companyfileUpload size on new day
schedule.scheduleJob("0 0 * * *", async () => {
  try {
     await scheduleCronForGetFileUploadSize();
  } catch (error) {
     console.log(
      "🚀 ~ schedule.scheduleJob ~ company file size error:",
      error
    );
  }
})

// Send mail to PM and PM's manager to missed project Task Deadline... 11am
schedule.scheduleJob("30 5 * * *", async () => {
  try {
    console.info(
      "schedule project Task missed deadline 10am started at",
      moment().toString(),
      moment.utc().valueOf()
    );
    await scheduleCronForTaskMissedDeadline();
    console.info("schedule project Task missed deadline 10am finished");
  } catch (error) {
    console.log(
      "🚀 ~ schedule.scheduleJob ~ project Task missed deadline error:",
      error
    );
  }
});

// Send mail to them who selected to get mails after every 4 hours 0 */4
schedule.scheduleJob("0 */4 * * *", async () => {
  try {
    console.info(
      "schedule mail to them who selected to get mails after every 4 hours",
      moment().toString(),
      moment.utc().valueOf()
    );
    let data = await getQuarterlyMails();
    for (let i = 0; i < data.length; i++) {
      await emailSenderForPMS(data[i].mailids, data[i].maildata)
    }
    console.info("schedule mail to them who selected to get mails after every 4 hours batch clear START");
    data.forEach(ele => updateSentMails(ele._id))
    console.info("schedule mail to them who selected to get mails after every 4 hours FINISHED");
  } catch (error) {
    console.log("🚀 ~ schedule.scheduleJob ~ error:", error)

  }
});

// Send reminder mail for updating status of complaint, if status of complaint is not updated within 5 working days at 10:30 am
schedule.scheduleJob("00 4 * * *", async () => {
  try {
    console.info(
      "schedule reminder mail for updating status of complaint, if status of complaint is not updated within 5 working days",
      moment().toString(),
      moment.utc().valueOf()
    );
    console.info("schedule reminder mail for updating status of complaint, if status of complaint is not updated within 5 working days START");
    await scheduleCronTosendMailtoAllPMandAMfornotUpdatingStatus();
    console.info("schedule reminder mail for updating status of complaint, if status of complaint is not updated within 5 working days FINISHED");
  } catch (error) {
    console.log("🚀 ~ schedule.scheduleJob ~ error:", error)

  }
});
