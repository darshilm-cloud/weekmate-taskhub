const express = require('express');
const router = express.Router();

const hoursloogedCommentsController = require('../../controller/hoursLoggedComments');

router.post('/add',  hoursloogedCommentsController.addComment);
router.post('/commentList', hoursloogedCommentsController.CommentsList);
router.put('/editComment/:id', hoursloogedCommentsController.editComment);
router.delete('/deleteComment/:id', hoursloogedCommentsController.deleteComment);
router.post('/historyComments', hoursloogedCommentsController.historyComments);
// router.post('/editCommentsResolve/:id', hoursloogedCommentsController.editCommentResolve);


module.exports = router;