let express = require("express");
var Router = express.Router();
const SuperAdmin = require("../../controller/SuperAdmin");
const SuperAdminActivity = require("../../controller/SuperAdminActivity");
const SuperAdminCompanyHealth = require("../../controller/SuperAdminCompanyHealth");
const { requireSuperAdmin } = require("../../helpers/permissionGuard");

// Company-wise activity (module adoption) report
Router.get("/activity-report/overview", SuperAdminActivity.getActivityOverview);
Router.get("/activity-report", SuperAdminActivity.getActivityReport);

// Company-wise health (usage, adoption, trends)
Router.get("/company-health", SuperAdminCompanyHealth.getCompanyHealthOverview);
Router.get("/company-health/:companyId", SuperAdminCompanyHealth.getCompanyHealthDetail);

// Admin Routes
Router.post("/getAdminList", SuperAdmin.getAdminList);
Router.post("/addAdmin", requireSuperAdmin(), SuperAdmin.addAdmin);
Router.put("/editAdmin/:adminId", requireSuperAdmin(), SuperAdmin.editAdmin);
Router.delete("/deleteAdmin/:userId", requireSuperAdmin(), SuperAdmin.deleteAdmin);
Router.get("/getDashboardData", SuperAdmin.getDashboardData);

// Weekly report (superadmin cron): companies/users added and login activity
Router.get("/weekly-stats", SuperAdmin.getWeeklyStats);
Router.get("/login-activity", SuperAdmin.getLoginActivity);

// Employee Routes
Router.post("/getUsersList", SuperAdmin.getUsersList);
Router.post("/addUser", requireSuperAdmin(), SuperAdmin.addUser);
Router.put("/editUser/:userId", requireSuperAdmin(), SuperAdmin.editUser);
Router.delete("/deleteUser/:userId", requireSuperAdmin(), SuperAdmin.deleteUser);

module.exports = Router;
