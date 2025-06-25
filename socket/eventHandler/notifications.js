const {
  getUserNotifications,
  markAsReadNotification,
} = require("../controllers/notifications");
const { resMsg } = require("../helpers/constants");
const { socketEvents } = require("../settings/socketEventName");

class NotificationEventSocketFn {
  userJoinTheRoom = async (socket) => {
    socket.on(socketEvents.JOIN_ROOM, async (data) => {
      try {
        const { userId } = data;
        socket.join(userId);
        console.log(`User ${userId} joined room`);
      } catch (error) {
        console.log("🚀 ~ JOIN_ROOM : socket.on ~ error:", error);
      }
    });
  };

  getNotificationEvent = async (socket) => {
    socket.on(socketEvents.GET_NOTIFICATIONS, async (data) => {
      try {
        let notifications = await getUserNotifications(data.user_id);

        socket.emit(socketEvents.GET_NOTIFICATIONS, {
          message: resMsg.GET_NOTIFICATIONS,
          data: notifications,
        });
      } catch (error) {
        console.log("🚀 ~ GET_NOTIFICATIONS : socket.on ~ error:", error);
      }
    });
  };

  // read notification ...
  getReadNotificationEvent = async (socket) => {
    socket.on(socketEvents.GET_READ_NOTIFICATIONS, async (data) => {
      try {
        let notifications = await getUserNotifications(data.user_id , true);

        socket.emit(socketEvents.GET_READ_NOTIFICATIONS, {
          message: resMsg.GET_NOTIFICATIONS,
          data: notifications,
        });
      } catch (error) {
        console.log("🚀 ~ GET_READ_NOTIFICATIONS : socket.on ~ error:", error);
      }
    });
  };

  // Unread notification 
  getUnreadNotificationEvent = async (socket) => {
    socket.on(socketEvents.GET_UNREAD_NOTIFICATIONS, async (data) => {
      try {
        let notifications = await getUserNotifications(data.user_id , false);

        socket.emit(socketEvents.GET_UNREAD_NOTIFICATIONS, {
          message: resMsg.GET_NOTIFICATIONS,
          data: notifications,
        });
      } catch (error) {
        console.log("🚀 ~ GET_NOTIFICATIONS : socket.on ~ error:", error);
      }
    });
  };

  readNotificationEvent = async (socket) => {
    socket.on(socketEvents.READ_NOTIFICATIONS, async (data) => {
      try {
        await markAsReadNotification(data);
      } catch (error) {
        console.log("🚀 ~READ_NOTIFICATIONS : socket.on ~ error:", error);
      }
    });
  };
}

module.exports = new NotificationEventSocketFn();
