let express = require("express");
var Router = express.Router();
const AdminManage = require("../../controller/AdminManage");

var { fileMiddleware } = require("../../middleware/filesMiddleware");

Router.post("/getUsersList", AdminManage.getUsersList);
Router.post("/addUser", AdminManage.addUser);
Router.post(
  "/admin/users/upload-csv",
  fileMiddleware,
  AdminManage.addUsersByCsv
);
Router.put("/editUser/:userId", AdminManage.editUser);
Router.delete("/deleteUser/:userId", AdminManage.deleteUser);

module.exports = Router;
