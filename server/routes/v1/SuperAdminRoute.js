let express = require("express");
var Router = express.Router();
const SuperAdmin = require("../../controller/SuperAdmin");

Router.post("/getAdminList", SuperAdmin.getAdminList);
Router.post("/addAdmin", SuperAdmin.addAdmin);
Router.put("/editAdmin/:adminId", SuperAdmin.editAdmin);
Router.delete("/deleteAdmin/:userId", SuperAdmin.deleteAdmin);
Router.get("/getDashboardData", SuperAdmin.getDashboardData);

module.exports = Router;
