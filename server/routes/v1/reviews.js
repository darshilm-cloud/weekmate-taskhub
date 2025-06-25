let express = require("express");
var Router = express.Router();
var reviews = require("../../controller/reviews");

Router.post("/add", reviews.addReview);
Router.post("/get", reviews.getReview);
Router.put("/update/:id", reviews.updateReview);
Router.delete("/delete/:id", reviews.deleteReview);

module.exports = Router;
