const express = require("express");
const Router = express.Router();
const MaintenanceController = require("../../controller/maintenance");
const { validate } = require("../../middleware/privateKeyValidation");

// POST /v1/maintenance/delete-company-data
Router.post("/delete-company-data", (req, res, next) => validate(req, res, next), (req, res) =>
  MaintenanceController.deleteCompanyData(req, res)
);

module.exports = Router;


