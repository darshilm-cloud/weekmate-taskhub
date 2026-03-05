const { getProjectDetails } = require("../controllers/projects");
const { resMsg } = require("../helpers/constants");
const { sendNotification } = require("../helpers/notificationCommon");
const { socketEvents } = require("../settings/socketEventName");
const { notificationType } = require("../settings/notificationTypes");
const { getUserName } = require("../helpers/common");
class ProjectEventSocketFn {
  addProjectAssigneeEvent = async (socket, io) => {
    socket.on(socketEvents.ADD_PROJECT_ASSIGNEE, async (data) => {
      try {
        const { _id } = data;
        // get project details ...
        let project = await getProjectDetails(_id);
        const assignedUsers =
          [project?.manager, ...project?.assignees, ...project?.pms_clients] ||
          [];

        if (assignedUsers && assignedUsers.length > 0) {
          const msg = `[${project?.title}] ${getUserName(project?.updatedBy)} ${
            resMsg.PROJECT_ASSIGNED
          }`;

          await sendNotification(
            io,
            project?._id,
            project?.updatedBy?._id?.toString(),
            assignedUsers,
            msg,
            notificationType.PROJECT_ASSIGNED
          );
        }
      } catch (error) {
        console.log("🚀 ~ ADD_PROJECT_ASSIGNEE : socket.on ~ error:", error);
      }
    });
  };

  editProjectAssigneeEvent = async (socket, io) => {
    socket.on(socketEvents.EDIT_PROJECT_ASSIGNEE, async (data) => {
      try {
        const { _id, assignees, pms_clients } = data;
        // get project details ...
        let project = await getProjectDetails(_id);
        let assignedUsers = [...assignees, ...pms_clients] || [];

        if (assignedUsers && assignedUsers.length > 0) {
          const msg = `[${project?.title}] ${getUserName(project?.updatedBy)} ${
            resMsg.PROJECT_ASSIGNED
          }`;

          await sendNotification(
            io,
            project?._id,
            project?.updatedBy?._id?.toString(),
            assignedUsers,
            msg,
            notificationType.PROJECT_ASSIGNED
          );
        }
      } catch (error) {
        console.log(
          "🚀 ~ EDIT_PROJECT_ASSIGNEE: server.js:74 ~ socket.on ~ error:",
          error
        );
      }
    });
  };
}

module.exports = new ProjectEventSocketFn();
