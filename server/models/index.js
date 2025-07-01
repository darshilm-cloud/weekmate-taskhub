let projectType = require("./projectTypes");
let projectTech = require("./projectTech");
let projectWorkFlow = require("./projectWorkFlow");
let resource = require("./resources");
let rolePermissions = require("./rolePermissions");
let employeeSchema = require("./employees");
let departmentSchema = require("./departments");
let designationSchema = require("./designations");
let notes = require("./notes");
let noteBook = require("./noteBook");
let projectMainTask = require("./projectMainTask");
let projects = require("./projects");
let Comments = require("./tasksComments");
let projectStatus = require("./projectStatus");
let projectTimeSheet = require("./projectTimeSheet");
let subDepartments = require("./subDepartments");
let subTasks = require("./subTasks");
let taskHoursLogs = require("./taskHoursLogs");
let taskLabels = require("./taskLabels");
let tasks = require("./tasks");
let taskUpdateHistory = require("./taskUpdateHistory");
let workFlowStatus = require("./workFlowStatus");
let fileFolder = require("./fileFolders");
let fileUploads = require("./filesUpload");
let discussionsTopics = require("./discussionsTopics");
let discussionsTopicsDetails = require("./discussionsTopicsDetails");
let empInOut = require("./empInOut");

let notesComments = require("./notesComments");
let BugsWorkFlowStatus = require("./bugsWorkFlowStatus");
let ProjectTaskBugs = require("./bugs");
let bugComments = require("./bugComments");
let PMSClients = require("./pmsClients");
let role = require("./role");
let PMSRoles = require("./pmsRoles");
let starProjects = require("./projectStar")
let mailSettings = require("./mailSettings")
let quarterlyhourmails = require("./quarterlyMail")
let recentVisitedData = require("./recentVisitedData");
let x_api_keys = require("./XAPIkey");
let appSetting = require("./appSetting");
let projectTabs = require("./projectTabs");
let projectTabsSetting = require("./projectTabsSettings");
let loggedhoursComents = require("./hoursLoggedComments");
let hoursApprove = require("./hoursApprove");
let totaltaskhourslogged = require("./totaltaskhourslogged");
let holidays = require("./holidays");
let complaints = require("./complaints");
let complaints_status = require("./complaints_status");
let complaints_comments = require("./complaints_comments");
let reviews = require("./reviews");
let consumer_feedback_form = require("./consumer_feedback_form");

let CompanyModel = require("./CompanyModel");
let SMTP = require("./Smtp");

module.exports = {
  projectType,
  projectTech,
  projectWorkFlow,
  resource,
  employeeSchema,
  rolePermissions,
  departmentSchema,
  designationSchema,
  projectMainTask,
  projects,
  projectStatus,
  Comments,
  projectTimeSheet,
  subDepartments,
  subTasks,
  taskHoursLogs,
  taskLabels,
  tasks,
  taskUpdateHistory,
  workFlowStatus,
  fileFolder,
  fileUploads,
  notes,
  noteBook,
  discussionsTopics,
  discussionsTopicsDetails,
  notesComments,
  BugsWorkFlowStatus,
  ProjectTaskBugs,
  bugComments,
  PMSClients,
  role,
  PMSRoles,
  starProjects,
  mailSettings,
  quarterlyhourmails,
  recentVisitedData,
  x_api_keys,
  appSetting,
  projectTabs,
  projectTabsSetting,
  loggedhoursComents,
  hoursApprove,
  empInOut,
  totaltaskhourslogged,
  holidays,
  complaints,
  complaints_status,
  complaints_comments,
  reviews,
  consumer_feedback_form,
  CompanyModel,
  SMTP
};
