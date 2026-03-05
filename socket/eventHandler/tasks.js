const { getTaskDetails } = require("../controllers/tasks");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName, getAssigneesName } = require("../helpers/common");
class TaskNotificationEventSocketFn {
  addTaskAssigneeEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_TASK_ASSIGNEE, async (data) => {
      try {
        const { _id, assignees, pms_clients } = data;
        // get project details ...
        let task = await getTaskDetails(_id);
        const assignedUsers = [...task.assignees, ...task.pms_clients] || [];
        if(data?.createdByModel === "pmsclients" && task?.assignees.length <= 0 ){
          assignedUsers.push(task?.project?.manager);
        }
        if (assignedUsers && assignedUsers.length > 0) {
          // Assignee notification...
          const msg = `[${task?.project?.title}] ${getUserName(
            task?.updatedBy
          )} ${resMsg.TASK_ASSIGNED}`;

          await sendNotification(
            io,
            task?.project?._id,
            task?.updatedBy?._id?.toString(),
            assignedUsers.map((a) => a._id),
            msg,
            notificationType.TASK_ASSIGNED,
            {
              main_task_id: task.mainTask?._id,
              task_id: task?._id,
            }
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            assignedUsers,
            task?.project?.manager
          );
          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${task?.project?.title}] ${getUserName(
              task?.updatedBy
            )} has assigned task to ${getAssigneesNames}`;

            await sendNotification(
              io,
              task?.project?._id,
              task?.updatedBy?._id?.toString(),
              [task?.project?.manager],
              managerMsg,
              notificationType.TASK_ASSIGNED,
              {
                main_task_id: task.mainTask?._id,
                task_id: task?._id,
              }
            );
          }
        }
      } catch (error) {
        console.log(
          "🚀 ~ ADD_TASK_ASSIGNEE: server.js:74 ~ socket.on ~ error:",
          error
        );
      }
    });
  };

  editTaskAssigneeEvent = async (socket, io) => {
    socket.on(socketEvents.EDIT_TASK_ASSIGNEE, async (data) => {
      try {
        const { _id, assignees, pms_clients } = data;
        // get project details ...
        let task = await getTaskDetails(_id);
        let assignedUsers = [...task.assignees, ...task.pms_clients] || [];

        if (assignedUsers && assignedUsers.length > 0) {
          assignedUsers = assignedUsers.filter((s) =>
            [...assignees, ...pms_clients].includes(s?._id?.toString())
          );
          // Assignee notification,.
          const msg = `[${task?.project?.title}] ${getUserName(
            task?.updatedBy
          )} ${resMsg.TASK_ASSIGNED}`;

          await sendNotification(
            io,
            task?.project?._id,
            task?.updatedBy?._id?.toString(),
            assignedUsers.map((a) => a._id),
            msg,
            notificationType.TASK_ASSIGNED,
            {
              main_task_id: task.mainTask?._id,
              task_id: task?._id,
            }
          );

          // Manager notification..
          const getAssigneesNames = getAssigneesName(
            assignedUsers,
            task?.project?.manager
          );
          if (getAssigneesNames && getAssigneesNames !== "") {
            const managerMsg = `[${task?.project?.title}] ${getUserName(
              task?.updatedBy
            )} has assigned task to ${getAssigneesNames}`;

            await sendNotification(
              io,
              task?.project?._id,
              task?.updatedBy?._id?.toString(),
              [task?.project?.manager],
              managerMsg,
              notificationType.TASK_ASSIGNED,
              {
                main_task_id: task.mainTask?._id,
                task_id: task?._id,
              }
            );
          }
        }
      } catch (error) {
        console.log(
          "🚀 ~ EDIT_TASK_ASSIGNEE: server.js:74 ~ socket.on ~ error:",
          error
        );
      }
    });
  };
}

module.exports = new TaskNotificationEventSocketFn();
