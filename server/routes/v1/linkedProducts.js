/**
 * Linked products – backend only. No UI changes here.
 * GET /v1/linked-products  → products linked to the logged-in user's company.
 * Auth is enforced globally in app.js (this path is not in PRE_AUTH_ROUTES), so req.user
 * is already populated by the time the controller runs.
 */
const express = require("express");
const Router = express.Router();
const linkedProductsController = require("../../controller/linkedProducts");

Router.get("/", linkedProductsController.getLinkedProducts);

module.exports = Router;
