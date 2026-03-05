const express = require('express');
const router = express.Router();

const taskCommentsController = require('../../controller/taskComments');

router.post('/add',  taskCommentsController.addComment);
router.post('/commentList', taskCommentsController.CommentsList);
router.put('/editComment/:id', taskCommentsController.editComment);
router.delete('/deleteComment/:id', taskCommentsController.deleteComment);
router.post('/historyComments', taskCommentsController.historyComments);
router.post('/editCommentsResolve/:id', taskCommentsController.editCommentResolve);


module.exports = router;