let express = require("express");
var Router = express.Router();
const SuperAdmin = require("../../controller/SuperAdmin");

// Admin Routes
Router.post("/getAdminList", SuperAdmin.getAdminList);
Router.post("/addAdmin", SuperAdmin.addAdmin);
Router.put("/editAdmin/:adminId", SuperAdmin.editAdmin);
Router.delete("/deleteAdmin/:userId", SuperAdmin.deleteAdmin);
Router.get("/getDashboardData", SuperAdmin.getDashboardData);

// Employee Routes
Router.post("/getUsersList", SuperAdmin.getUsersList);
Router.post("/addUser", SuperAdmin.addUser);
Router.put("/editUser/:userId", SuperAdmin.editUser);
Router.delete("/deleteUser/:userId", SuperAdmin.deleteUser);

module.exports = Router;
