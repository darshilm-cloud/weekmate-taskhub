const express = require('express');
const router = express.Router();

const notesCommentsController = require('../../controller/notesComments');

router.post('/add',  notesCommentsController.addComment);
router.post('/commentList', notesCommentsController.CommentsList);
router.put('/editComment/:id', notesCommentsController.editComment);
router.delete('/deleteComment/:id', notesCommentsController.deleteComment);
router.post('/historyComments', notesCommentsController.historyComments);
router.post('/editCommentsResolve/:id', notesCommentsController.editCommentResolve);


module.exports = router;