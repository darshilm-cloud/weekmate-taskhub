const mongoose = require("mongoose");
const { getDB } = require("../helpers/db");
const {
  getLoginUserData,
  utcDefault,
  getRefModelForSenderReceiver,
  getRefModelFromLoginUser,
  checkIsPMSClient,
} = require("../helpers/common");

class NotificationSocketFn {
  saveNotificationInDb = async (data) => {
  try {
    const {
      project_id,
      senderId,
      receivers,
      message,
      notificationType,
      moduleIds,
    } = data;
    const loginUser = await getLoginUserData(senderId);

    if (loginUser) {
      const newdata = await getDB().Notifications.insertOne({
        project_id: new mongoose.Types.ObjectId(project_id),
        main_task_id: moduleIds?.main_task_id
          ? new mongoose.Types.ObjectId(moduleIds.main_task_id)
          : null,
        task_id: moduleIds?.task_id
          ? new mongoose.Types.ObjectId(moduleIds.task_id)
          : null,
        bug_id: moduleIds?.bug_id
          ? new mongoose.Types.ObjectId(moduleIds.bug_id)
          : null,
        logged_hours_id: moduleIds?.logged_hours_id
          ? new mongoose.Types.ObjectId(moduleIds.logged_hours_id)
          : null,
        sender_id: new mongoose.Types.ObjectId(senderId),
        receiver_ids: receivers.map((r) => new mongoose.Types.ObjectId(r)),
        message: message,
        type: notificationType,
        // is_seen: false,
        read_history: [],
        ...(await getRefModelForSenderReceiver(loginUser)),
        ...(await getRefModelFromLoginUser(loginUser)),
        createdBy: new mongoose.Types.ObjectId(senderId),
        updatedBy: new mongoose.Types.ObjectId(senderId),
        createdAt: utcDefault(),
        updatedAt: utcDefault(),
        isDeleted: false,
        deletedBy: null,
        deletedAt: null,
      });
    }
    return;
  } catch (error) {
    console.log(
      "🚀 ~ NotificationSocketFn ~ saveNotificationInDb= ~ error:",
      error
    );
  }
  };

  getUserNotifications = async (receiverId , isRead = false) => {
    try {
      const query = [
        {
          $match: {
            receiver_ids: new mongoose.Types.ObjectId(receiverId),
            isDeleted: false,
            "read_history.receiver_id": {
              ...(!isRead
                ? {$ne: new mongoose.Types.ObjectId(receiverId),} 
              : {$eq: new mongoose.Types.ObjectId(receiverId),})
            },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ];
      const res = await getDB().Notifications.aggregate(query).toArray();
      return res;
    } catch (error) {
      console.log(
        "🚀 ~ NotificationSocketFn ~ getUserNotifications= ~ error:",
        error
      );
    }
  };

  markAsReadNotification = async (data) => {
    try {
      if (data?.notification_ids && data?.notification_ids?.length > 0) {
        for (let i = 0; i < data?.notification_ids.length; i++) {
          const notification_id = data?.notification_ids[i];

          const existingNotification = await getDB().Notifications.findOne({
            _id: new mongoose.Types.ObjectId(notification_id),
            isDeleted: false,
            "read_history.receiver_id": {
              $ne: new mongoose.Types.ObjectId(data.user_id),
            },
          });

          if (existingNotification) {
            // Update read history receiver wise..
            await getDB().Notifications.updateOne(
              {
                _id: new mongoose.Types.ObjectId(existingNotification._id),
              },
              {
                $addToSet: {
                  read_history: {
                    receiver_id: new mongoose.Types.ObjectId(data.user_id),
                    updatedAt: utcDefault(),
                    readByModel: (await checkIsPMSClient(data.user_id))
                      ? "pmsclients"
                      : "employees",
                  },
                },
              },
              {
                new: true, // Return the updated document
              }
            );
          }
        }
      }

      return;
    } catch (error) {
      console.log(
        "🚀 ~ NotificationSocketFn ~ markAsReadNotification= ~ error:",
        error
      );
    }
  };
}

module.exports = new NotificationSocketFn();
