const express = require("express");
const Router = express.Router();


const ProjectTypes = require("./projectTypes");
const ProjectTech = require("./projectTech");
const ProjectWorkFlow = require("./projectWorkFlow");
const Authentication = require("./authentication");
const Resources = require("./resources");
const PMSRoles = require("./pmsRoles");
const Employees = require("./employees");
const Master = require("./master");
const workFlowStatus = require("./workFlowStatus");
const projectStatus = require("./projectStatus");
const projects = require("./projects");
const projectMainTask = require("./projectMainTask");
const projectLabels = require("./projectLabels");
const projectTask = require("./task");
const Comments = require("./taskComments");
const projectSubTask = require("./subTasks");
const projectTimeSheets = require("./projectTimeSheets");
const taskLoggedHours = require("./taskHoursLogs");
const fileUpload = require("./fileUploads");
const fileFolders = require("./fileFolders");
const Note = require("./notes");
const NoteBook = require("./noteBook");
const DiscussionsTopics = require("./discussionsTopics");
const DiscussionsTopicsDetails = require("./discussionsTopicsDetails");
const notesComments = require("./notescomments");
const projectBugs = require("./projectBugs");
const bugComments = require("./bugComments");
const PMSClients = require("./pmsClients");
const dashboard = require("./dashboard");
const trashData = require("./trashData");
const mailSettings = require("./mailSettings");
const quarterlMails = require("./quarterlyMails")
const recentVisitedData = require("./recentVisitedData");
const xapikeys = require("./XAPIkey")
const appSetting = require("./appSetting");
const projectTabsSetting = require("./projectTabSetting");
const loggedhourscomments = require("./hoursLoggedComments");
const hoursApprove = require("./hoursApprove");
const complaints = require("./complaints");
const complaints_status = require("./complaints_status");
const complaints_comments = require("./complaints_comments");
const reviews = require("./reviews");
const projectexpanses = require("./projectexpanses");
const companyReg = require("./companyReg");
const companyManage = require("./companyManage");
const smtpConfig = require("./smtpConfig")

const consumer_reolution_feedback = require("./consumer_feedback_form");

Router.use("/project/type", ProjectTypes);
Router.use("/projectTech", ProjectTech);
Router.use("/projectWorkFlow", ProjectWorkFlow);
Router.use("/authentication", Authentication);
Router.use("/resource", Resources);
Router.use("/roles", PMSRoles);
Router.use("/employees", Employees);
Router.use("/master", Master);
Router.use("/work-flow/status", workFlowStatus);
Router.use("/project/status", projectStatus);
Router.use("/projects", projects);
Router.use("/projects/main-task", projectMainTask);
Router.use("/projects/labels", projectLabels);
Router.use("/projects/tasks", projectTask);
Router.use("/projects/sub-tasks", projectSubTask);
Router.use("/projects/timesheet", projectTimeSheets);
Router.use("/projects/task-logged-hours", taskLoggedHours);
Router.use("/files", fileUpload);
Router.use("/folders", fileFolders);
Router.use("/projects/notes", Note);
Router.use("/projects/notebook", NoteBook);
Router.use("/projects/discussion-topic", DiscussionsTopics);
Router.use("/projects/discussion-topic-details", DiscussionsTopicsDetails);
Router.use("/comments", Comments);
Router.use("/notesComments", notesComments);
Router.use("/projects/bug", projectBugs);
Router.use("/projects/bugcomments", bugComments);
Router.use("/pms/client", PMSClients);
Router.use("/dashboard", dashboard);
Router.use("/trash", trashData);
Router.use("/mail/settings", mailSettings);
Router.use("/mail/settings/quarterly", quarterlMails);
Router.use("/recent-visited-data", recentVisitedData);
Router.use("/xapikeys", xapikeys);
Router.use("/app/setting", appSetting);
Router.use("/project-tabs/setting", projectTabsSetting);
Router.use('/loggedhours/comments',loggedhourscomments);
Router.use('/approvehours',hoursApprove);;
Router.use('/taskhub/complaints',complaints);
Router.use('/taskhub/complaints/status',complaints_status);
Router.use('/taskhub/complaints/comments',complaints_comments);
Router.use('/taskhub/reviews',reviews);
Router.use('/taskhub/projectexpanses',projectexpanses);
Router.use('/CompanyReg',companyReg)
Router.use('/CompanyManage',companyManage)
Router.use('/smtpConfig',smtpConfig)

Router.use('/taskhub/complaint/resolution/feedback',consumer_reolution_feedback);

module.exports = Router;
