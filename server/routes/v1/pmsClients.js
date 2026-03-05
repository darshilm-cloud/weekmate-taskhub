let express = require("express");
var Router = express.Router();
var PMSUsers = require("../../controller/pmsClients");

Router.post("/add", PMSUsers.addClients);
Router.post("/get", PMSUsers.getClients);
Router.put("/update/:id", PMSUsers.updateClientData);
Router.put("/update/status/:id", PMSUsers.updateClientStatus);
Router.delete("/delete/:id", PMSUsers.deleteClientData);
Router.get(
  "/get-project-client/:projectId",
  PMSUsers.getProjectsWiseAssignedClient
);

module.exports = Router;
