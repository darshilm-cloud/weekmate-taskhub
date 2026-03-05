const { getNoteCommentsDetails } = require("../controllers/notes");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName } = require("../helpers/common");
class NoteEventSocketFn {
  addNoteCommentsTaggedUserEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_NOTE_COMMENTS_TAGGED_USERS, async (data) => {
      try {
        const { _id, taggedUsers } = data;
        let details = await getNoteCommentsDetails(_id);
        const users = [...taggedUsers] || [];

        if (users && users.length > 0) {
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.NOTE_COMMENTS_TAGGED_USERS}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            users,
            msg,
            notificationType.NOTE_COMMENTS_TAGGED_USERS
          );
        }
      } catch (error) {
        console.log("🚀 ~ NoteEventSocketFn ~ socket.on ~ error:", error);
      }
    });
  };

  editNoteCommentsTaggedUserEvent = async (socket, io) => {
    socket.on(socketEvents.EDIT_NOTE_COMMENTS_TAGGED_USERS, async (data) => {
      try {
        const { _id, taggedUsers } = data;
        let details = await getNoteCommentsDetails(_id);
        const users = [...taggedUsers] || [];

        if (users && users.length > 0) {
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.NOTE_COMMENTS_TAGGED_USERS}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            users,
            msg,
            notificationType.NOTE_COMMENTS_TAGGED_USERS
          );
        }
      } catch (error) {
        console.log("🚀 ~ NoteEventSocketFn ~ socket.on ~ error:", error);
      }
    });
  };
}

module.exports = new NoteEventSocketFn();
