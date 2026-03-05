const { getMainDetails } = require("../controllers/mainTask");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName, getAssigneesName } = require("../helpers/common");
class MainTaskEventSocketFn {
  addMainTaskSubscribersEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_LIST_SUBSCRIBERS, async (data) => {
      try {
        const { _id, subscribers, pms_clients } = data;
        // get project details ...
        let mainTask = await getMainDetails(_id);
        const assignedUsers =
          [...mainTask.subscribers, ...mainTask.pms_clients] || [];

        if (assignedUsers && assignedUsers.length > 0) {
          // subscribers notification..
          const msg = `[${mainTask?.project?.title}] ${getUserName(
            mainTask?.updatedBy
          )} ${resMsg.LIST_SUBSCRIBERS}`;

          await sendNotification(
            io,
            mainTask?.project?._id,
            mainTask?.updatedBy?._id?.toString(),
            assignedUsers.map((a) => a._id),
            msg,
            notificationType.LIST_ASSIGNED,
            {
              main_task_id: mainTask?._id,
            }
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            assignedUsers,
            mainTask?.project?.manager
          );
          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${mainTask?.project?.title}] ${getUserName(
              mainTask?.updatedBy
            )} has subscribed ${getAssigneesNames} to the task list`;

            await sendNotification(
              io,
              mainTask?.project?._id,
              mainTask?.updatedBy?._id?.toString(),
              [mainTask?.project?.manager],
              managerMsg,
              notificationType.LIST_ASSIGNED,
              {
                main_task_id: mainTask?._id,
              }
            );
          }
        }
      } catch (error) {
        console.log(
          "🚀 ~ ADD_LIST_SUBSCRIBERS: server.js:74 ~ socket.on ~ error:",
          error
        );
      }
    });
  };

  editMainTaskSubscribersEvent = async (socket, io) => {
    socket.on(socketEvents.EDIT_LIST_SUBSCRIBERS, async (data) => {
      try {
        const { _id, subscribers, pms_clients } = data;
        // get project details ...
        let mainTask = await getMainDetails(_id);
        let assignedUsers =
          [...mainTask.subscribers, ...mainTask.pms_clients] || [];

        if (assignedUsers && assignedUsers.length > 0) {
          assignedUsers = assignedUsers.filter((s) =>
            [...subscribers, ...pms_clients].includes(s?._id?.toString())
          );

          // subscribers notification..
          const msg = `[${mainTask?.project?.title}] ${getUserName(
            mainTask?.updatedBy
          )} ${resMsg.LIST_SUBSCRIBERS}`;

          await sendNotification(
            io,
            mainTask?.project?._id,
            mainTask?.updatedBy?._id?.toString(),
            assignedUsers.map((a) => a._id),
            msg,
            notificationType.LIST_ASSIGNED,
            {
              main_task_id: mainTask?._id,
            }
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            assignedUsers,
            mainTask?.project?.manager
          );
          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${mainTask?.project?.title}] ${getUserName(
              mainTask?.updatedBy
            )} has subscribed ${getAssigneesNames} to the task list`;

            await sendNotification(
              io,
              mainTask?.project?._id,
              mainTask?.updatedBy?._id?.toString(),
              [mainTask?.project?.manager],
              managerMsg,
              notificationType.LIST_ASSIGNED,
              {
                main_task_id: mainTask?._id,
              }
            );
          }
        }
      } catch (error) {
        console.log(
          "🚀 ~ EDIT_LIST_SUBSCRIBERS: server.js:74 ~ socket.on ~ error:",
          error
        );
      }
    });
  };
}

module.exports = new MainTaskEventSocketFn();
