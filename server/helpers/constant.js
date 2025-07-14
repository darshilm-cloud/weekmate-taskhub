module.exports = {
  statusCode: {
    SUCCESS: 200,
    NO_CONTENT: 204,
    CREATED: 201,
    MOVED_PERMENENTLY: 301,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    UNSUPPORTED_MEDIA_TYPE: 415,
    TIMEOUT: 408,
    CONFLICT: 409,
    SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    PARTIAL: 210,
  },
  MULTER: {
    MAX_FILE_SIZE: 200000000, //209715200, //25000000,//in bytes
    DESTINATION: "/public/images",
    TASK: "/public/projectTask",
    SUBTASK: "/public/projectSubTask",
    COMMENT: "/public/comments",
    FOLDERS: "/public/folderWise",
    DISCUSSION_TOPIC: "/public/discussionsTopics",
    DISCUSSION_TOPIC_DETAILS: "/public/discussionsTopicsDetails",
    BUGS: "/public/taskBugs",
    APP_SETTING: "/public/appSetting",
    COMPLAINT_COMMENTS: "/public/complaint_comments",
  },

  DEFAULT_DATA: {
    WORKFLOW_STATUS: {
      TODO: "To-Do",
      DONE: "Done",
    },
    BUG_WORKFLOW_STATUS: {
      TODO: "Open", //"To Do",
      IN_PROGRESS: "In Progress",
      TO_BE_TESTED: "To be Tested",
      ON_HOLD: "On Hold",
      DONE: "Closed", //"Done",
    },
    PROJECT_STATUS: {
      ACTIVE: "Active",
      ARCHIVED: "Archived",
    },
    WORKFLOW: {
      STANDARD: "Standard Workflow",
    },

    RESTRICT_PROJECT_ID: [], //["#409045" , "#806440"]

    PROJECT_TABS: {
      OVERVIEW: "Overview",
      DISCUSSION: "Discussion",
      TASKS: "Tasks",
      BUGS: "Bugs",
      NOTES: "Notes",
      FILES: "Files",
      TIME: "Time",
    },
  },

  PRE_AUTH_ROUTES: [
    "/v1/authentication/redirectToBack",
    "/v1/authentication/login",
    "/api-docs",
    "/v1/authentication/forgotPassword",
    "/v1/authentication/resetPassword",
    "/v1/app/setting/get",
    "/v1/taskhub/complaint/resolution/feedback/add",
    "/v1/taskhub/complaint/resolution/feedback/get",
    "/v1/CompanyReg/registerAdminAndCompany",
    "/v1/CompanyReg/verify-registration"
  ],
  API_KEY_VALIDATIONS: ["/v1/projects/task-logged-hours/getHoursData"],
};
