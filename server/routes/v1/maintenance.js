const express = require("express");
const Router = express.Router();
const MaintenanceController = require("../../controller/maintenance");
const { validate } = require("../../middleware/privateKeyValidation");

// POST /v1/maintenance/delete-company-data
Router.post("/delete-company-data", (req, res, next) => validate(req, res, next), (req, res) =>
  MaintenanceController.deleteCompanyData(req, res)
);

// POST /v1/maintenance/addTestData
Router.post("/addTestData", MaintenanceController.addDummyTestData);

// POST /v1/maintenance/deleteTestData
Router.post("/deleteTestData", MaintenanceController.deleteDummyTestData);


Router.post("/getEmployeeOverviewData", MaintenanceController.getEmployeeOverviewData);
// Router.post("/getEmployeeProjectTaskOverviewData", MaintenanceController.getEmployeeProjectTaskOverviewData);

module.exports = Router;


