const express = require('express');
const router = express.Router();

const notesCommentsController = require('../../controller/notesComments');
const { requirePermission } = require("../../helpers/permissionGuard");

router.post('/add', requirePermission(["notes_view"]), notesCommentsController.addComment);
router.post('/commentList', notesCommentsController.CommentsList);
router.put('/editComment/:id', requirePermission(["notes_view"]), notesCommentsController.editComment);
router.delete('/deleteComment/:id', requirePermission(["notes_view"]), notesCommentsController.deleteComment);
router.post('/historyComments', notesCommentsController.historyComments);
router.post('/editCommentsResolve/:id', requirePermission(["notes_view"]), notesCommentsController.editCommentResolve);


module.exports = router;