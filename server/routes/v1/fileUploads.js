const express = require("express");
const router = express.Router();
const fileController = require("../../controller/fileUploads");
const { upload, dynamicUploadMiddleware } = require("../../helpers/common");

router.post("/upload", dynamicUploadMiddleware, fileController.uploadFiles);

router.post("/unlink", fileController.deleteFiles);

module.exports = router;
