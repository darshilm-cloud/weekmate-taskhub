const { socketEvents } = require("../settings/socketEventName");
const { saveNotificationInDb } = require("../controllers/notifications");
const { utcDefault } = require("./common");

class SocketNotificationCommonFn {
  sendNotification = async (
    io,
    project_id,
    senderId,
    receivers,
    message,
    notificationType = "",
    moduleIds = {}
  ) => {
    try {
      // remove sender id from receivers list ...
      receivers = [
        ...new Set(
          receivers
            .map((r) => r.toString())
            .filter((d) => d !== senderId.toString())
        ),
      ];

      receivers.forEach((element) => {
        if (element)
          // send notification to assignee..
          io.to(element.toString()).emit(socketEvents.NOTIFICATIONS, {
            message: message,
            type: notificationType,
            data: [],
            time: utcDefault(),
          });
      });

      // save notification in db...
      await saveNotificationInDb({
        project_id,
        senderId,
        receivers,
        message,
        notificationType,
        moduleIds,
      });
    } catch (error) {
      console.log("🚀 ~ sendNotification ~ error:", error);
    }
  };
}

module.exports = new SocketNotificationCommonFn();
