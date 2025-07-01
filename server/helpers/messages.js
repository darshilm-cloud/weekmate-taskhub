module.exports = {
  ERROR: "Error",
  BAD_REQUEST: "Bad request",
  VALIDATION_FAILED: "Validation Failed",
  USER_LOGIN: "User logged In successfully",
  SERVER_ERROR: "Something went to wrong",
  LISTING: "Data fetched successfully",
  CREATED: "Data saved successfully",
  UPDATED: "Data updated successfully",
  DELETED: "Data deleted successfully",
  RESTORE: "Data restored successfully",
  HTML_GENERATED: "HTML Generated successfully",
  COPIED: "Data copied successfully.",

  FILE_UPLOADED: "File uploaded successfully",
  FILE_DELETED: "File deleted successfully",

  ALREADY_EXISTS: "Data Already Exists.",
  ALREADY_EXISTS_IN_EMP_EMAIL: "Email Id is Already assigned to Employee.",

  NOT_FOUND: "Data not found",

  LOGIN_USER_NOT_FOUND: "Your login id is invalid!",

  NO_DATA: "No Content Found",

  UNAUTHORIZED: "Unauthorized: No token provided",
  FORBIDDEN: "Forbidden: Invalid token",

  FOLDER_REQUIRED: "Please select file folder.",

  WORK_FLOW_NOT_DELETED:
    "You can't delete a Workflow as such a project's are associated with it",

  CAN_NOT_UPDATE: "You can't update default data",
  CAN_NOT_DELETE: "You can't delete default data",

  CLIENT_NOT_DELETED:
    "You can't delete a client because it has associated projects",

  CLIENT_NOT_DEACTIVE:
    "You can't deactivate a client because it has associated projects",

  ACCOUNT_DEACTIVATE: "Your Account is deactivated",
  PASSWORD_INVALID: "Your password is invalid",

  IMPORT_FILE_NOT_FOUND: "Please import the file",
  SINGLE_FILE: "Import only one file allowed.",
  FILE_EXT: "Import file extension must be CSV or XSLX or XLS",

  PASSWORD_CHANGED_SUCCESS: "Your password has been successfully updated",
  PASSWORD_WRONG:
    "Your current password is wrong, please enter correct password.",
  PASSWORD_SAME: "Current password and new password should not be same",
  EMAIL_INVALID: "Your email is invalid",
  MAIL_SENT: "Email sent sucessfully",
  RESET_TOKEN: "Your email address is wrong or may be your token get expiered.",
  EXPIRED_TOKEN: "Please try again, may be your token get expiered.",
  PASSWORD_CHANGE_HRMS: "Please change your password with HRMS",

  // project
  PROJECT_CREATED: "Project created successfully",
  PROJECT_UPDATED: "Project updated successfully",
  PROJECT_DELETED: "Project deleted successfully",
  PROJECT_ACTIVATE: "Project activated successfully.",

  // task
  TASK_CREATED: "Task created successfully",
  TASK_UPDATED: "Task updated successfully",
  TASK_DELETED: "Task deleted successfully",
  TASK_STATUS_UPDATED: "Task status updated successfully",

  // bugs
  BUG_CREATED: "Bug created successfully",
  BUG_UPDATED: "Bug updated successfully",
  BUG_DELETED: "Bug deleted successfully",
  BUG_STATUS_UPDATED: "Bug status updated successfully",
  BUG_CSV_IMPORT: "Bugs csv imported successfully",

  //tasks
  TASK_CSV_IMPORT: "Tasks csv imported successfully",

  // note
  NOTE_CREATED: "Note created successfully",
  NOTE_UPDATED: "Note updated successfully",
  NOTE_DELETED: "Note deleted successfully",

  // folder
  FOLDER_CREATED: "Folder created successfully",
  FOLDER_UPDATED: "Folder updated successfully",
  FOLDER_DELETED: "Folder deleted successfully",

  //file
  FILE_CREATED: "File uploaded successfully",
  FILE_UPDATED: "File updated successfully",
  FILE_DELETED: "File deleted successfully",
  FILE_NAME_UPDATED: "File name updated successfully",
  FILE_SUBSCRIBER_UPDATED: "File subscriber updated successfully",

  // Logged hours
  LOGGED_HOURS_CREATED: "Hours have been logged.",
  LOGGED_HOURS_UPDATED: "Logged hours updated successfully",
  LOGGED_HOURS_DELETED: "Logged hours deleted successfully",
  HOURS_ALREADY_EXISTS: "Hours for this task for the same date already Exists.",
  APPROVED_HOURS_CREATED: "Hours have been approved.",
  ERROR_STORING: "Error Stroing Files to Hours Logged.",

  // Client
  CLIENT_CREATED: "Client created successfully",
  CLIENT_UPDATED: "Client updated successfully",
  CLIENT_DELETED: "Client deleted successfully",

  // role
  ROLE_UPDATED: "User role has been updated successfully",

  // permission
  PERMISSION_UPDATED: "Role Permissions updated successfully",

  // for csv
  COLUMNS_MISMATCH: "Columns does not match, Please verify the Sample CSV",

  // to check the api key headers
  UNAUTHORIZED_KEY: "Unauthorized: X-API-KEY not provided",
  FORBIDDEN_KEY: "Forbidden: Invalid X-API-KEY",

  // general settings updates
  APP_SETTING_UPDATED: "App settings updated successfully.",
  TAB_SETTING_UPDATED: "Project tab settings updated successfully.",

  // billable hours approval.
  MANAGER_EMPS: "No Employees Found Under Your Management",
  APPROVED_TIME_EXCEED: "Approved time cannot exceed total time",

  ERROR_STORING: "Error Stroing Files to Hours Logged.",

  // complaint
  COMPLAINT_CREATED: "Complaint added successfully",
  COMPLAINT_UPDATED: "Complaint updated successfully",
  COMPLAINT_DELETED: "Complaint deleted successfully",

  //project expense
  PROJECTEXPENSE_CREATED : "Project expense added successfully",
  PROJECTEXPENSE_UPDATED: "Project expense updated successfully",
  PROJECTEXPENSE_DELETED: "Project expense deleted successfully",
  PROJECTEXPENSE_DELETED_DENIED:"You do not have permission to delete this expense",
  // complaint status
  COMPLAINT_STATUS_CREATED: "Complaint status added successfully",
  COMPLAINT_STATUS_UPDATED: "Complaint status updated successfully",
  COMPLAINT_STATUS_DELETED: "Complaint status deleted successfully",

  // complaint comments
  COMPLAINT_COMMENTS_CREATED: "Complaint comment added successfully",
  COMPLAINT_COMMENTS_UPDATED: "Complaint comment updated successfully",
  COMPLAINT_COMMENTS_DELETED: "Complaint comment deleted successfully",

  // review
  REVIEW_CREATED: "Review added successfully",
  REVIEW_UPDATED: "Review updated successfully",
  REVIEW_DELETED: "Review deleted successfully",

  COMPANY_NAME_EXIST: "Company with this name already exists",
  COMPANY_EMAIL_EXIST: "Company with this email already exists",
  COMPANY_CREATED: "Company created successfully",

  SMTP_NOT_FOUND:'SMTP configuration not found',
  SMTP_FOUND:"SMTP configuration retrieved successfully",
};
