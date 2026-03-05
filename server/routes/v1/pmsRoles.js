let express = require("express");
var Router = express.Router();
var rolePermissions = require("../../controller/PMSRoles");

// For add data master in model..
Router.post("/addRole", rolePermissions.addPMSRole);

Router.post("/getAll", rolePermissions.getRoles);
Router.get("/get/employee/:userId", rolePermissions.getEmpRoles);
Router.post("/update", rolePermissions.updateEmpRoles);

Router.post("/add/permissions", rolePermissions.addResourcePermission);
Router.get("/get/permissions/:roleId", rolePermissions.getRolePermissions);

module.exports = Router;
