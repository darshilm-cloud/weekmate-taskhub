let express = require("express");
var Router = express.Router();
var rolePermissions = require("../../controller/PMSRoles");
const { requirePermission } = require("../../helpers/permissionGuard");

// For add data master in model..
Router.post("/addRole", requirePermission(["settings_manage"]), rolePermissions.addPMSRole);

Router.post("/getAll", rolePermissions.getRoles);
Router.get("/get/employee/:userId", rolePermissions.getEmpRoles);
Router.post("/update", requirePermission(["people_edit", "manage_people"]), rolePermissions.updateEmpRoles);

Router.post("/add/permissions", requirePermission(["settings_manage"]), rolePermissions.addResourcePermission);
Router.get("/get/permissions/:roleId", rolePermissions.getRolePermissions);

module.exports = Router;
