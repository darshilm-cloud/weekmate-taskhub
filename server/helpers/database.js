const mongoose = require("mongoose");
const path = require("path");

// mongoose.Promise = global.Promise;
class Database {
  connect = () => {
    console.log(chalk.bgGreen.bold("Connect to database:", process.env.DB_URL)); // Log the URI
    return mongoose.connect(process.env.DB_URL);
  };

  initModels = () => {
    require(path.join(__dirname, "../models"));
    return;
  };
}

module.exports = new Database();
