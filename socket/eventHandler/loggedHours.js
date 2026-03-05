const { getTaskLoggedHoursDetails } = require("../controllers/loggedHours");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName } = require("../helpers/common");
class LoggedHoursEventSocketFn {
  addTaskLoggedHoursEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_TASK_LOGGED_HOURS, async (data) => {
      try {
        const { _id } = data;
        let details = await getTaskLoggedHoursDetails(_id);
        const users = [details?.project?.manager] || [];

        if (users && users.length > 0) {
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.createdBy
          )} ${resMsg.TASK_LOGGED_HOURS}`;
          await sendNotification(
            io,
            details?.project?._id,
            details?.createdBy?._id?.toString(),
            users,
            msg,
            notificationType.TASK_LOGGED_HOURS,
            { logged_hours_id: _id }
          );
        }
      } catch (error) {
        console.log(
          "🚀 ~ LoggedHoursEventSocketFn ~ socket.on ~ error:",
          error
        );
      }
    });
  };

  addBugsLoggedHoursEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_BUG_LOGGED_HOURS, async (data) => {
      try {
        const { _id } = data;
        let details = await getTaskLoggedHoursDetails(_id);
        const users = [details?.project?.manager] || [];

        if (users && users.length > 0) {
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.createdBy
          )} ${resMsg.TASK_LOGGED_HOURS}`;
          await sendNotification(
            io,
            details?.project?._id,
            details?.createdBy?._id?.toString(),
            users,
            msg,
            notificationType.TASK_LOGGED_HOURS
          );
        }
      } catch (error) {
        console.log(
          "🚀 ~ LoggedHoursEventSocketFn ~ socket.on ~ error:",
          error
        );
      }
    });
  };
}

module.exports = new LoggedHoursEventSocketFn();
