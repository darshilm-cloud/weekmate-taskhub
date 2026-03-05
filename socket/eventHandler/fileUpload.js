const { getFileDetails } = require("../controllers/fileUpload");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName, getAssigneesName } = require("../helpers/common");
class NoteEventSocketFn {
  addFileUploadSubscriberEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_FILE_SUBSCRIBERS, async (data) => {
      try {
        const { _id, subscribers, pms_clients } = data;
        let details = await getFileDetails(_id);
        const users = [...details.subscribers, ...details.pms_clients] || [];

        if (users && users.length > 0) {
          // subscribers notification..
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.FILE_SUBSCRIBERS}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            users.map((a) => a._id),
            msg,
            notificationType.FILE_SUBSCRIBERS
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            users,
            details?.project?.manager
          );
          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${details?.project?.title}] ${getUserName(
              details?.updatedBy
            )} has subscribed ${getAssigneesNames} to the file`;

            await sendNotification(
              io,
              details?.project?._id,
              details?.updatedBy?._id?.toString(),
              [details?.project?.manager],
              managerMsg,
              notificationType.FILE_SUBSCRIBERS
            );
          }
        }
      } catch (error) {
        console.log("🚀 ~ NoteEventSocketFn ~ socket.on ~ error:", error);
      }
    });
  };

  editFileUploadSubscriberEvent = async (socket, io) => {
    socket.on(socketEvents.EDIT_FILE_SUBSCRIBERS, async (data) => {
      try {
        const { _id, subscribers, pms_clients } = data;
        let details = await getFileDetails(_id);
        let users = [...details.subscribers, ...details.pms_clients] || [];

        if (users && users.length > 0) {
          users = users.filter((s) =>
            [...subscribers, ...pms_clients].includes(s?._id?.toString())
          );

          // subscribers notification..
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.FILE_SUBSCRIBERS}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            users.map((a) => a._id),
            msg,
            notificationType.FILE_SUBSCRIBERS
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            users,
            details?.project?.manager
          );
          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${details?.project?.title}] ${getUserName(
              details?.updatedBy
            )} has subscribed ${getAssigneesNames} to the file`;

            await sendNotification(
              io,
              details?.project?._id,
              details?.updatedBy?._id?.toString(),
              [details?.project?.manager],
              managerMsg,
              notificationType.FILE_SUBSCRIBERS
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
