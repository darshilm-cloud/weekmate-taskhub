const { getTaskCommentsDetails } = require("../controllers/tasks");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName } = require("../helpers/common");
class CommentsNotificationEventSocketFn {
  addTaskCommentsAssigneeEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_TASK_COMMENTS_TAGGED_USERS, async (data) => {
      console.log("🚀 ~ CommentsNotificationEventSocketFn ~ socket.on ~ data:", data)
      try {
        let { _id, taggedUsers } = data;
        let comment = await getTaskCommentsDetails(_id);

        let otherUsers = [];
        let projectAllUsers = [
          comment?.project?.manager,
          // ...comment?.mainTask?.pms_clients,
          ...comment.task?.assignees,
        ];

        if (taggedUsers && taggedUsers.length > 0) {
          console.log("123")
          taggedUsers = taggedUsers.map((user) => user.toString());

          projectAllUsers.forEach((userId) => {
            if (!taggedUsers.includes(userId.toString())) {
              otherUsers.push(userId.toString());
            }
          });

          // notification for tagged users ...
          const msg = `[${comment?.project?.title}] ${getUserName(
            comment?.updatedBy
          )} ${resMsg.TASK_COMMENTS_TAGGED_USERS}`;

          await sendNotification(
            io,
            comment?.project?._id,
            comment?.updatedBy?._id?.toString(),
            taggedUsers,
            msg,
            notificationType.TASK_COMMENT_ASSIGNED,
            {
              main_task_id: comment?.mainTask?._id,
              task_id: comment?.task?._id,
            }
          );
        } else {
          otherUsers = projectAllUsers;
          console.log("678", otherUsers)
        }

        if (otherUsers && otherUsers.length > 0) {
          const msg = `[${comment?.project?.title}] ${
            resMsg.TASK_COMMENTS_ADDED
          } ${getUserName(comment?.updatedBy)}`;

          await sendNotification(
            io,
            comment?.project?._id,
            comment?.updatedBy?._id?.toString(),
            otherUsers,
            msg,
            notificationType.TASK_COMMENT_ADDED,
            {
              main_task_id: comment?.mainTask?._id,
              task_id: comment?.task?._id,
            }
          );
        }
      } catch (error) {
        console.log(
          "🚀 ~ CommentsNotificationEventSocketFn ~ socket.on ~ error:",
          error
        );
      }
    });
  };

  editTaskCommentsAssigneeEvent = async (socket, io) => {
    socket.on(socketEvents.EDIT_TASK_COMMENTS_TAGGED_USERS, async (data) => {
      try {
        const { _id, taggedUsers } = data;
        let comment = await getTaskCommentsDetails(_id);
        const tagged_users = [...taggedUsers] || [];

        if (tagged_users && tagged_users.length > 0) {
          const msg = `[${comment?.project?.title}] ${getUserName(
            comment?.updatedBy
          )} ${resMsg.TASK_COMMENTS_TAGGED_USERS}`;

          await sendNotification(
            io,
            comment?.project?._id,
            comment?.updatedBy?._id?.toString(),
            tagged_users,
            msg,
            notificationType.TASK_COMMENT_ASSIGNED,
            {
              main_task_id: comment?.mainTask?._id,
              task_id: comment?.task?._id,
            }
          );
        }
      } catch (error) {
        console.log(
          "🚀 ~ CommentsNotificationEventSocketFn ~ socket.on ~ error:",
          error
        );
      }
    });
  };
}

module.exports = new CommentsNotificationEventSocketFn();
