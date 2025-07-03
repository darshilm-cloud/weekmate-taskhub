let express = require("express");
var Router = express.Router();
var empController = require("../../controller/employees");

Router.post("/get", empController.getEmployees);
Router.get("/dropdown", empController.getEmployeesForDropdown);
Router.get("/manager/dropdown", empController.getReportingManagerForDropdown);
Router.get("/:id", empController.getEmployeeDetails);
// Router.post("/dropdownDeptwiseUsers", empController.getEmployeesForDropdownDeptwise);


module.exports = Router;
