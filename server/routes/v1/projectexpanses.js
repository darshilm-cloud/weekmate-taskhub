let express = require("express");
var Router = express.Router();
var reviews = require("../../controller/reviews");
const projectexpanses  = require("../../controller/projectexpanses");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["expense_add"]), projectexpanses.addProjectExpense);
Router.post("/get", projectexpanses.getProjectExpenses);
Router.put("/update/:id", requirePermission(["expense_edit"]), projectexpanses.updateProjectExpense);
Router.delete("/delete/:id", requirePermission(["expense_delete"]), projectexpanses.deleteProjectExpense);
Router.post("/exportProjectExpenses", projectexpanses.exportProjectExpenses);



module.exports = Router;
