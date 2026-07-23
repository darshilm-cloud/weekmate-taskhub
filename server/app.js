var path = require("path");
const dotenv = require("dotenv");
const envFile =
process.env.NODE_ENV === "development" ? ".env.dev" : ".env.prod";
dotenv.config({ path: path.resolve(__dirname, `./env/${envFile}`) });
require("./models"); // This should import your model
var createError = require("http-errors");
var express = require("express");
const { engine } = require("express-handlebars");
var cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
var logger = require("morgan");
var cors = require("cors");
const { initModels, connect } = require("./helpers/database");
const v1 = require("./routes/v1");
const Configs = require("./configs");
const swaggerUi = require("swagger-ui-express");
const { authentication } = require("./middleware/authentications");
const { apikeyauthentication } = require("./middleware/apikeyAuthentication");
const { updatePermission, updateRoles } = require("./helpers/updatePermission");
const { clearPermissionFile, clearRolesFile } = require("./helpers/clearRolesandPermissions")
const {
  getUserPermissions,
  getDataForLoginUser,
} = require("./controller/authentication");
const { checkIsPMSClient } = require("./controller/PMSRoles");
const { PRE_AUTH_ROUTES, API_KEY_VALIDATIONS, SUPER_ADMIN_API_ROUTES } = require("./helpers/constant");
const {
  verifyTokenOrApiPassword,
  usedSuperAdminApiPassword,
} = require("./middleware/superAdminAuthentication");
const commonHelpers = require("./helpers/common");
const mongoose= require("mongoose");
global.chalk = require("chalk");
global.moment = require("moment");
var app = express();

global.newObjectId = (id) => {
  if (!id) return null; // Handle null, undefined, empty string
  try {
    return mongoose.Types.ObjectId.createFromHexString(id);
  } catch (error) {
    return null; // Return null for invalid hex strings
  }
};
global.validObjectId = (id) => {
  if (!id) return null; // Handle null, undefined, empty string
  try {
    if (mongoose.Types.ObjectId.isValid(id)) return true;
    return false;
  } catch (error) {
    return null; // Return null for invalid id
  }
};

// Limit request body size
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

app.use(cors());

// view engine setup
app.set("views", path.join(__dirname, "views"));
// app.set("view engine", "ejs");

// Setting Handlebars
app.engine(
  "hbs",
  engine({
    extname: "hbs",
  })
);
app.set("view engine", "hbs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));
app.use("/public", express.static(path.join(__dirname, "public")));

connect()
  .then(async () => {
    // clearPermissionFile(),
    // clearRolesFile(),
    console.log(chalk.green("Database connect successfully!"));
    // Backfill Standard workflow for companies registered before auto-creation was added
    await commonHelpers.seedMissingStandardWorkflows();
  })
  .catch((err) => {
    console.log(chalk.red("[ERROR]:Database connection"));
    console.log(chalk.red(err));
  });
initModels();

//Update permission & role file:
updatePermission();
updateRoles();

// Setup Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(Configs.setupSwagger()));

// Reports routes (no auth — called by WeekMate proxy)
const reportsRoutes = require("./routes/v1/reports");
app.use("/api/reports", reportsRoutes);

// Authentication...
app.use(async (req, res, next) => {
  if (PRE_AUTH_ROUTES.includes(req.path)) {
    return next(); // Skip authentication..
  }
  else if (SUPER_ADMIN_API_ROUTES.includes(req.path)) {
    // User token (superadmin UI) OR shared api-password (superadmin crons)..
    await verifyTokenOrApiPassword(req, res, next);
  }
  else if (API_KEY_VALIDATIONS.includes(req.path)) {
    await apikeyauthentication(req, res, next);
  } 
  else {
    // await apikeyauthentication(req, res, next);
    await authentication(req, res, next);
  }
});

// Add permission in all the apis apart from login...
app.use((req, res, next) => {
  if (PRE_AUTH_ROUTES.includes(req.path) || API_KEY_VALIDATIONS.includes(req.path)) {
    return next(); // Skip permissions array..
  } else if (SUPER_ADMIN_API_ROUTES.includes(req.path) && usedSuperAdminApiPassword(req)) {
    // Machine caller: there is no req.user to build a permission map from, so the
    // wrapper below would throw on req.user._id. Token callers still get theirs.
    return next();
  } else {
    let chunks = [];

    const originalJson = res.json;

    res.json = async function (resBody) {
      // Modify the response body here
      // Get login user permissions..
      resBody.permissions = await getUserPermissions(req.user._id,req.user.companyId);
      // Get login user pms role
      const loginUser = await getDataForLoginUser({
        _id: req.user._id,
      });
      resBody.pms_role_id = (loginUser && loginUser.pms_role_id?._id) || "";
      // Call the original res.json method
      originalJson.call(this, resBody);
    };

    res.write = ((write) => {
      return function (chunk) {
        chunks.push(Buffer.from(chunk));
        write.apply(res, arguments);
      };
    })(res.write);

    res.end = ((end) => {
      return function (chunk) {
        if (chunk) chunks.push(Buffer.from(chunk));
        end.apply(res, arguments);
      };
    })(res.end);

    next();
  }
});

//Start API endpoint:
app.use("/v1", v1);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// cron..
if (app.get("env") === "production" && process.env.NODE_ENV == "production") {
  require("./helpers/schedular");
}
console.log(chalk.blue("Date & Time :", Configs.utcDefault()));

module.exports = app;
