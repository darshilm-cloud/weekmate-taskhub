const { getDiscussionTopic } = require("../controllers/discussions");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName, getAssigneesName } = require("../helpers/common");
class DiscussionTopicEventSocketFn {
  addDiscussionTopicSubscribersEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_DISCUSSION_SUBSCRIBERS, async (data) => {
      try {
        const { _id, subscribers, pms_clients } = data;
        let topic = await getDiscussionTopic(_id);
        const assignedUsers =
          [...topic.subscribers, ...topic.pms_clients] || [];

        // subscribers notification...
        if (assignedUsers && assignedUsers.length > 0) {
          const msg = `[${topic?.project?.title}] ${getUserName(
            topic?.updatedBy
          )} ${resMsg.DISCUSSION_SUBSCRIBERS}`;

          await sendNotification(
            io,
            topic?.project?._id,
            topic?.updatedBy?._id?.toString(),
            assignedUsers.map((a) => a._id),
            msg,
            notificationType.DISCUSSION_SUBSCRIBERS
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            assignedUsers,
            topic?.project?.manager
          );

          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${topic?.project?.title}] ${getUserName(
              topic?.updatedBy
            )} has subscribed ${getAssigneesNames} to the discussion topic`;

            await sendNotification(
              io,
              topic?.project?._id,
              topic?.updatedBy?._id?.toString(),
              [topic?.project?.manager],
              managerMsg,
              notificationType.DISCUSSION_SUBSCRIBERS
            );
          }
        }
      } catch (error) {
        console.log(
          "🚀 ~ DiscussionTopicEventSocketFn ~ socket.on ~ error:",
          error
        );
      }
    });
  };

  editDiscussionTopicSubscribersEvent = async (socket, io) => {
    socket.on(socketEvents.EDIT_DISCUSSION_SUBSCRIBERS, async (data) => {
      try {
        const { _id, subscribers, pms_clients } = data;
        let topic = await getDiscussionTopic(_id);
        let assignedUsers = [...topic.subscribers, ...topic.pms_clients] || [];

        if (assignedUsers && assignedUsers.length > 0) {
          assignedUsers = assignedUsers.filter((s) =>
            [...subscribers, ...pms_clients].includes(s?._id?.toString())
          );

          //  subscribers notification..
          const msg = `[${topic?.project?.title}] ${getUserName(
            topic?.updatedBy
          )} ${resMsg.DISCUSSION_SUBSCRIBERS}`;

          await sendNotification(
            io,
            topic?.project?._id,
            topic?.updatedBy?._id?.toString(),
            assignedUsers.map((a) => a._id),
            msg,
            notificationType.DISCUSSION_SUBSCRIBERS
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            assignedUsers,
            topic?.project?.manager
          );
          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${topic?.project?.title}] ${getUserName(
              topic?.updatedBy
            )} has subscribed ${getAssigneesNames} to the discussion topic`;

            await sendNotification(
              io,
              topic?.project?._id,
              topic?.updatedBy?._id?.toString(),
              [topic?.project?.manager],
              managerMsg,
              notificationType.DISCUSSION_SUBSCRIBERS
            );
          }
        }
      } catch (error) {
        console.log(
          "🚀 ~ DiscussionTopicEventSocketFn ~ socket.on ~ error:",
          error
        );
      }
    });
  };
}

module.exports = new DiscussionTopicEventSocketFn();
