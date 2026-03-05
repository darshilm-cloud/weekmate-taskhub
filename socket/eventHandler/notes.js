const { getNoteDetails } = require("../controllers/notes");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName, getAssigneesName } = require("../helpers/common");
class NoteEventSocketFn {
  addNoteSubscriberEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_NOTE_SUBSCRIBERS, async (data) => {
      try {
        const { _id, subscribers, pms_clients } = data;
        let details = await getNoteDetails(_id);
        const users = [...details.subscribers, ...details.pms_clients] || [];

        if (users && users.length > 0) {
          // subscribers notification..
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.NOTE_SUBSCRIBERS}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            users.map((a) => a._id),
            msg,
            notificationType.NOTE_SUBSCRIBERS
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            users,
            details?.project?.manager
          );
          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${details?.project?.title}] ${getUserName(
              details?.updatedBy
            )} has subscribed ${getAssigneesNames} to the note`;

            await sendNotification(
              io,
              details?.project?._id,
              details?.updatedBy?._id?.toString(),
              [details?.project?.manager],
              managerMsg,
              notificationType.NOTE_SUBSCRIBERS
            );
          }
        }
      } catch (error) {
        console.log("🚀 ~ NoteEventSocketFn ~ socket.on ~ error:", error);
      }
    });
  };

  editNoteSubscriberEvent = async (socket, io) => {
    socket.on(socketEvents.EDIT_NOTE_SUBSCRIBERS, async (data) => {
      try {
        const { _id, subscribers, pms_clients } = data;
        let details = await getNoteDetails(_id);
        let users = [...details.subscribers, ...details.pms_clients] || [];

        if (users && users.length > 0) {
          users = users.filter((s) =>
            [...details.subscribers, ...details.pms_clients].includes(
              s?._id?.toString()
            )
          );

          // subscribers notification..
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.NOTE_SUBSCRIBERS}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            users.map((a) => a._id),
            msg,
            notificationType.NOTE_SUBSCRIBERS
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            users,
            details?.project?.manager
          );
          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${details?.project?.title}] ${getUserName(
              details?.updatedBy
            )} has subscribed ${getAssigneesNames} to the note`;

            await sendNotification(
              io,
              details?.project?._id,
              details?.updatedBy?._id?.toString(),
              [details?.project?.manager],
              managerMsg,
              notificationType.NOTE_SUBSCRIBERS
            );
          }
        }
      } catch (error) {
        console.log("🚀 ~ NoteEventSocketFn ~ socket.on ~ error:", error);
      }
    });
  };
}

module.exports = new NoteEventSocketFn();
