const { getBugsDetails } = require("../controllers/bugs");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName, getAssigneesName } = require("../helpers/common");

class BugsEventSocketFn {
  addBugsAssigneeEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_BUG_ASSIGNEE, async (data) => {
      try {
        const { _id, assignees } = data;
        let details = await getBugsDetails(_id);
        const users = [...details.assignees] || [];

        if (users && users.length > 0) {
          // Assignee notification...
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.BUG_ASSIGNEE}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            users.map((a) => a._id),
            msg,
            notificationType.BUG_ASSIGNED,
            {
              bug_id: details?._id,
            }
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            users,
            details?.project?.manager
          );
          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${details?.project?.title}] ${getUserName(
              details?.updatedBy
            )} has assigned bug to ${getAssigneesNames}`;

            await sendNotification(
              io,
              details?.project?._id,
              details?.updatedBy?._id?.toString(),
              [details?.project?.manager],
              managerMsg,
              notificationType.BUG_ASSIGNED,
              {
                bug_id: details?._id,
              }
            );
          }
        }
      } catch (error) {
        console.log("🚀 ~ BugsEventSocketFn ~ socket.on ~ error:", error);
      }
    });
  };

  editBugsAssigneeEvent = async (socket, io) => {
    socket.on(socketEvents.EDIT_BUG_ASSIGNEE, async (data) => {
      try {
        const { _id, assignees } = data;
        let details = await getBugsDetails(_id);
        let users = [...details.assignees] || [];

        if (users && users.length > 0) {
          users = users.filter((s) =>
            [...assignees].includes(s?._id?.toString())
          );
          // Assignee notification,.
          const msg = `[${details?.project?.title}] ${getUserName(
            details?.updatedBy
          )} ${resMsg.BUG_ASSIGNEE}`;

          await sendNotification(
            io,
            details?.project?._id,
            details?.updatedBy?._id?.toString(),
            users.map((a) => a._id),
            msg,
            notificationType.BUG_ASSIGNED,
            {
              bug_id: details?._id,
            }
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            users,
            details?.project?.manager
          );
          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${details?.project?.title}] ${getUserName(
              details?.updatedBy
            )} has assigned bug to ${getAssigneesNames}`;

            await sendNotification(
              io,
              details?.project?._id,
              details?.updatedBy?._id?.toString(),
              [details?.project?.manager],
              managerMsg,
              notificationType.BUG_ASSIGNED,
              {
                bug_id: details?._id,
              }
            );
          }
        }
      } catch (error) {
        console.log("🚀 ~ BugsEventSocketFn ~ socket.on ~ error:", error);
      }
    });
  };
}

module.exports = new BugsEventSocketFn();
