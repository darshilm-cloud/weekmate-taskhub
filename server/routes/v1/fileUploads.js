const express = require("express");
const router = express.Router();
const fileController = require("../../controller/fileUploads");
const { upload } = require("../../helpers/common");

router.post("/upload", upload.any(), fileController.uploadFiles);

router.post("/unlink", fileController.deleteFiles);

module.exports = router;
