const { getDiscussionTopicDetails } = require("../controllers/discussions");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName } = require("../helpers/common");
class DiscussionTopicDetailsEventSocketFn {
  addTopicDetailTaggedUserEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_DISCUSSION_TAGGED_USERS, async (data) => {
      try {
        const { _id, taggedUsers } = data;
        let details = await getDiscussionTopicDetails(_id);
        const tagged_users = [...taggedUsers] || [];

        if (tagged_users && tagged_users.length > 0) {
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.DISCUSSION_TAGGED_USERS}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            tagged_users,
            msg,
            notificationType.DISCUSSION_TAGGED_USERS
          );
        }
      } catch (error) {
        console.log(
          "🚀 ~ DiscussionTopicDetailsEventSocketFn ~ socket.on ~ error:",
          error
        );
      }
    });
  };

  editTopicDetailTaggedUserEvent = async (socket, io) => {
    socket.on(socketEvents.EDIT_DISCUSSION_TAGGED_USERS, async (data) => {
      try {
        const { _id, taggedUsers } = data;
        let details = await getDiscussionTopicDetails(_id);
        const tagged_users = [...taggedUsers] || [];

        if (tagged_users && tagged_users.length > 0) {
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.DISCUSSION_TAGGED_USERS}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            tagged_users,
            msg,
            notificationType.DISCUSSION_TAGGED_USERS
          );
        }
      } catch (error) {
        console.log(
          "🚀 ~ DiscussionTopicDetailsEventSocketFn ~ socket.on ~ error:",
          error
        );
      }
    });
  };
}

module.exports = new DiscussionTopicDetailsEventSocketFn();
