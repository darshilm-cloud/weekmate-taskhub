const express = require('express');
const router = express.Router();

const bugCommentsController = require('../../controller/bugComments');

router.post('/add',  bugCommentsController.addComment);
router.post('/commentList', bugCommentsController.CommentsList);
router.put('/editComment/:id', bugCommentsController.editComment);
router.delete('/deleteComment/:id', bugCommentsController.deleteComment);
router.post("/details", bugCommentsController.commentsDetails);
router.post('/editCommentsResolve/:id', bugCommentsController.editCommentResolve);


module.exports = router;