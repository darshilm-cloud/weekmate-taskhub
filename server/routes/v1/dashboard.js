let express = require("express");
var Router = express.Router();
var dashboard = require("../../controller/dashboard");

Router.post("/get/my-project", dashboard.getMyProjects);
Router.post("/get/my-task", dashboard.getMyTasks);
Router.post("/get/my-logged-time", dashboard.getMyLoggedHours);
Router.post("/get/my-bugs", dashboard.getMyBugs);
Router.post("/get/total-trackedhours", dashboard.getEmpTrackedHoursforDashboard);


module.exports = Router;
