let express = require("express");
var Router = express.Router();
const SuperAdmin = require("../../controller/SuperAdmin");
const SuperAdminActivity = require("../../controller/SuperAdminActivity");

// Company-wise activity (module adoption) report
Router.get("/activity-report/overview", SuperAdminActivity.getActivityOverview);
Router.get("/activity-report", SuperAdminActivity.getActivityReport);

// Admin Routes
Router.post("/getAdminList", SuperAdmin.getAdminList);
Router.post("/addAdmin", SuperAdmin.addAdmin);
Router.put("/editAdmin/:adminId", SuperAdmin.editAdmin);
Router.delete("/deleteAdmin/:userId", SuperAdmin.deleteAdmin);
Router.get("/getDashboardData", SuperAdmin.getDashboardData);

// Weekly report (superadmin cron): companies/users added and login activity
Router.get("/weekly-stats", SuperAdmin.getWeeklyStats);
Router.get("/login-activity", SuperAdmin.getLoginActivity);

// Employee Routes
Router.post("/getUsersList", SuperAdmin.getUsersList);
Router.post("/addUser", SuperAdmin.addUser);
Router.put("/editUser/:userId", SuperAdmin.editUser);
Router.delete("/deleteUser/:userId", SuperAdmin.deleteUser);

module.exports = Router;
