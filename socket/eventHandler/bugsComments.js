const { getBugCommentsDetails } = require("../controllers/bugs");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName } = require("../helpers/common");

class BugsCommentsEventSocketFn {
  addBugsCommentsTaggedUserEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_BUG_COMMENTS, async (data) => {
      try {
        const { _id, taggedUsers } = data;
        let details = await getBugCommentsDetails(_id);
        const users = [...taggedUsers] || [];

        if (users && users.length > 0) {
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.BUG_COMMENTS}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            users,
            msg,
            notificationType.BUG_COMMENTS,
            {
              bug_id: details?.bug?._id,
            }
          );
        }
      } catch (error) {
        console.log(
          "🚀 ~ BugsCommentsEventSocketFn ~ socket.on ~ error:",
          error
        );
      }
    });
  };

  editBugsCommentsTaggedUserEvent = async (socket, io) => {
    socket.on(socketEvents.EDIT_BUG_COMMENTS, async (data) => {
      try {
        const { _id, taggedUsers } = data;
        let details = await getBugCommentsDetails(_id);
        const users = [...taggedUsers] || [];

        if (users && users.length > 0) {
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.BUG_COMMENTS}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            users,
            msg,
            notificationType.BUG_COMMENTS,
            {
              bug_id: details?.bug?._id,
            }
          );
        }
      } catch (error) {
        console.log(
          "🚀 ~ BugsCommentsEventSocketFn ~ socket.on ~ error:",
          error
        );
      }
    });
  };
}

module.exports = new BugsCommentsEventSocketFn();
