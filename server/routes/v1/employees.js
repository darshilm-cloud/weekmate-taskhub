let express = require("express");
var Router = express.Router();
var empController = require("../../controller/employees");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/get", empController.getEmployees);
Router.get("/dropdown", empController.getEmployeesForDropdown);
Router.get("/manager/dropdown", empController.getReportingManagerForDropdown);
Router.get("/:id", empController.getEmployeeDetails);
// people_edit, except for your own profile (Profile modal).
Router.put(
  "/editEmployee/:userId",
  requirePermission(["people_edit"], { allow: (req) => String(req.params.userId) === String(req.user?._id) }),
  empController.editEmployee
);

// Router.post("/dropdownDeptwiseUsers", empController.getEmployeesForDropdownDeptwise);


module.exports = Router;
