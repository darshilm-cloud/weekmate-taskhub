const { notificationType } = require("../settings/notificationTypes");

exports.checkNotificationType = (type) => {
  switch (type) {
    case notificationType.PROJECT_ASSIGNED:
      return {
        title: "Assign project",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Tasks",
      };
    case notificationType.LIST_ASSIGNED:
      return {
        title: "Assign new task list",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Tasks",
      };
    case notificationType.TASK_ASSIGNED:
      return {
        title: "Assign task",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Tasks",
      };
    case notificationType.TASK_COMMENT_ASSIGNED:
      return {
        title: "Mention in task comment",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Tasks",
      };
    case notificationType.TASK_COMMENT_ADDED:
      return {
        title: "Task Comment added",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Tasks",
      };
    case notificationType.DISCUSSION_SUBSCRIBERS:
      return {
        title: "Subscribe in discussion",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Discussion",
      };
    case notificationType.DISCUSSION_TAGGED_USERS:
      return {
        title: "Mention in discussion",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Discussion",
      };
    case notificationType.BUG_ASSIGNED:
      return {
        title: "Assign bug",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Bugs",
      };
    case notificationType.BUG_COMMENTS:
      return {
        title: "Mention in bug",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Bugs",
      };
    case notificationType.TASK_LOGGED_HOURS:
      return {
        title: "Hours logged in task",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Time",
      };
    case notificationType.NOTE_SUBSCRIBERS:
      return {
        title: "Subscribe in note",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Notes",
      };
    case notificationType.NOTE_COMMENTS_TAGGED_USERS:
      return {
        title: "Mention in note",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Notes",
      };
    case notificationType.FILE_SUBSCRIBERS:
      return {
        title: "Subscribed in files",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Files",
      };
    default:
      return {
        title: "You have a notification",
        url: "https://dev-pms.elsnerdev.co/project-list",
        tab: "Overview",
      };
  }
};
