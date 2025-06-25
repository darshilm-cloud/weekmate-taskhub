let express = require("express");
var Router = express.Router();
var reviews = require("../../controller/reviews");
const projectexpanses  = require("../../controller/projectexpanses");

Router.post("/add", projectexpanses.addProjectExpense);
Router.post("/get", projectexpanses.getProjectExpenses);
Router.put("/update/:id", projectexpanses.updateProjectExpense);
Router.delete("/delete/:id", projectexpanses.deleteProjectExpense);
Router.post("/exportProjectExpenses", projectexpanses.exportProjectExpenses);



module.exports = Router;
