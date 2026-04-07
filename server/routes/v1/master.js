let express = require("express");
var Router = express.Router();
var masterController = require("../../controller/master");

// Router.get("/get/department", masterController.getEmpDepartment);
// Router.get("/get/subdepartment", masterController.getEmpSubDepartment);
Router.get("/get/employees", masterController.getEmployees);
// Router.get("/get/designation", masterController.getEmpDesignations);
Router.get("/get/resources", masterController.getResource);
Router.get("/get/projects", masterController.getProjects);
Router.get("/get/subscribers/:id", masterController.getSubscribers);
Router.get("/get/tasks/:id", masterController.getTasks);
Router.get("/get/maintasks/:id", masterController.getmainTasksList);
Router.get("/get/stages/:id", masterController.getStages);
Router.get("/get/timesheets/:id", masterController.getTimesheets);
Router.get("/get/bugs-workflow", masterController.getBugsWorkFlow);
Router.post("/get/clients", masterController.getPMSClient);
Router.get("/get/clients", masterController.getPMSClient);
Router.get("/get/bugs/:taskId", masterController.getTaskWiseBugs);
Router.get("/get/tasksAssigned/:id", masterController.getTasksAssigned);
Router.post("/get/taggedUsersList", masterController.getTaggedUsersList);
Router.get("/get/employeesManagerWise", masterController.getEmployeeManagerWise);
Router.get("/get/account_managers", masterController.getAccMgrs);


module.exports = Router;
