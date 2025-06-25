const multer = require("multer");
const upload = multer();


exports.fileMiddleware = (() => {
    return upload.fields([
      { name: "attachment" }, 
    ]);
  })();
  