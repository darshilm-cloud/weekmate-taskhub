// socket events
module.exports = {
  socketEvents: {
    CONNECTION: "connection",
    DISCONNECT: "disconnect",

    JOIN_ROOM: "joinRoom",
    USER_ACTIVITY: "userActivity",

    NOTIFICATIONS: "notification",
    GET_NOTIFICATIONS: "get_notification",
    GET_READ_NOTIFICATIONS: "get_read_notification",
    GET_UNREAD_NOTIFICATIONS: "get_unread_notification",
    READ_NOTIFICATIONS: "read_notification",

    ADD_PROJECT_ASSIGNEE: "add_project_assignee",
    EDIT_PROJECT_ASSIGNEE: "edit_project_assignee",

    ADD_LIST_SUBSCRIBERS: "add_list_subscriber",
    EDIT_LIST_SUBSCRIBERS: "edit_list_subscriber",

    ADD_TASK_ASSIGNEE: "add_task_assign",
    EDIT_TASK_ASSIGNEE: "edit_task_assign",

    ADD_TASK_COMMENTS_TAGGED_USERS: "add_task_comments_tagged_users",
    EDIT_TASK_COMMENTS_TAGGED_USERS: "edit_task_comments_tagged_users",

    ADD_DISCUSSION_SUBSCRIBERS: "add_discussion_subscriber",
    EDIT_DISCUSSION_SUBSCRIBERS: "edit_discussion_subscriber",

    ADD_DISCUSSION_TAGGED_USERS: "add_discussion_tagged_user",
    EDIT_DISCUSSION_TAGGED_USERS: "edit_discussion_tagged_user",

    ADD_BUG_ASSIGNEE: "add_bug_assign",
    EDIT_BUG_ASSIGNEE: "edit_bug_assign",

    ADD_BUG_COMMENTS: "add_bug_comments",
    EDIT_BUG_COMMENTS: "edit_bug_comments",

    ADD_TASK_LOGGED_HOURS: "add_task_logged_hours",
    ADD_BUG_LOGGED_HOURS: "add_bug_logged_hours",

    ADD_NOTE_SUBSCRIBERS: "add_note_subscriber",
    EDIT_NOTE_SUBSCRIBERS: "edit_note_subscriber",

    ADD_NOTE_COMMENTS_TAGGED_USERS: "add_note_comments_tagged_user",
    EDIT_NOTE_COMMENTS_TAGGED_USERS: "edit_note_comments_tagged_user",

    ADD_FILE_SUBSCRIBERS: "add_file_subscriber",
    EDIT_FILE_SUBSCRIBERS: "edit_file_subscriber",
  },
};
