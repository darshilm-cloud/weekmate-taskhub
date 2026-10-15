let express = require("express");
var Router = express.Router();
var taskHoursLogs = require("../../controller/taskHoursLogs");
var { verification } = require("../../middleware/verification")
const { requirePermission } = require("../../helpers/permissionGuard");


Router.post("/add", requirePermission(["timesheet_add"]), taskHoursLogs.addTaskHoursLogs);
// task and subtask wise logged hours
Router.post("/get", taskHoursLogs.getTaskHoursLogs);
// hours logged by timesheet
Router.post("/getHours", verification, taskHoursLogs.getTaskHoursLogsByTimesheet);
Router.put("/update/:id", requirePermission(["timesheet_edit"]), taskHoursLogs.updateTaskHoursLogs);
Router.delete("/delete/:id", requirePermission(["timesheet_delete"]), taskHoursLogs.deleteTaskHoursLogs);
Router.post("/get-total-hours", taskHoursLogs.getTaskTotalHours);
Router.post("/getHoursCSV", taskHoursLogs.exportTimesheetCSV);
Router.delete("/updateMultiple", requirePermission(["timesheet_delete"]), taskHoursLogs.deleteTaskHoursLogsMultiple);
Router.post("/gettimesheetsReports",taskHoursLogs.getTimesheetsReports);
Router.post("/gettimesheetsReportsCSV", taskHoursLogs.reportsCSV);
Router.post("/getHoursData", taskHoursLogs.getHoursData);
Router.post("/getTaskwiseHours", taskHoursLogs.getTaskHoursLogsByTask);
Router.post("/getMyLoggedHours", verification, taskHoursLogs.getMyLoggedHours);
Router.post("/myloggedhoursProjectCSV", taskHoursLogs.myloggedhoursProjectCSV);
Router.post("/getMyLoggedHoursDate", verification, taskHoursLogs.getMyLoggedHoursbyDate);
Router.post("/myloggedhoursDateCSV", taskHoursLogs.myloggedhoursDateCSV);
// API for listing employees data for approved hours feature.
Router.post("/getEmployeesHours", taskHoursLogs.getEmployeesHours);
Router.post("/getHoursDetails", taskHoursLogs.getHoursDetails );
Router.post("/temp", taskHoursLogs.getTaskHoursLogsfortotal );


module.exports = Router;
