const mongoose = require("mongoose");
const path = require("path");

// mongoose.Promise = global.Promise;
class Database {
  connect = () => {
    // Log the URI WITHOUT the username/password (logs end up in log files, terminals, screenshots)
    const safeUrl = String(process.env.DB_URL || "").replace(/\/\/[^@/]*@/, "//***:***@");
    console.log(chalk.bgGreen.bold("Connect to database:", safeUrl));
    return mongoose.connect(process.env.DB_URL);
  };

  initModels = () => {
    require(path.join(__dirname, "../models"));
    return;
  };
}

module.exports = new Database();
