/**
 * GET/PUT /v1/column-preference/:pageKey — per-user visible table columns.
 * Auth is enforced globally in app.js, so req.user is populated here.
 */
const express = require("express");
const Router = express.Router();
const columnPreferenceController = require("../../controller/columnPreference");

Router.get("/:pageKey", columnPreferenceController.getColumnPreference);
Router.put("/:pageKey", columnPreferenceController.saveColumnPreference);

module.exports = Router;
