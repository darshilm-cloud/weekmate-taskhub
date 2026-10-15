let express = require("express");
var Router = express.Router();
var dashboard = require("../../controller/dashboard");
const reportCache = require("../../middleware/reportCache");

Router.post("/get/my-project", dashboard.getMyProjects);
Router.post("/get/my-task", dashboard.getMyTasks);
Router.post("/get/task-statistics", dashboard.getTaskStatistics);
Router.post("/get/task-list", reportCache({ when: (req) => req.body?.project_task_counts === true }), dashboard.getTaskList);
Router.post("/get/my-logged-time", dashboard.getMyLoggedHours);
Router.post("/get/my-bugs", dashboard.getMyBugs);
Router.post("/get/global-team-report", dashboard.getGlobalTeamReport);
// Router.post("/get/total-trackedhours", dashboard.getEmpTrackedHoursforDashboard);


module.exports = Router;
