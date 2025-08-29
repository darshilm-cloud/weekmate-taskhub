const fs = require("fs");
const mongoose = require("mongoose");
const Joi = require("joi");
const path = require("path");
const messages = require("../helpers/messages");
const { statusCode } = require("../helpers/constant");
const {
  catchBlockErrorResponse,
  successResponse,
} = require("../helpers/response");
const {
  getFileUploadPath,
  getRefModelFromLoginUser,
} = require("../helpers/common");
const configs = require("../configs");
const FileUploads = mongoose.model("fileuploads");

exports.uploadFiles = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.FILE_UPLOADED,
      req.files?.length > 0
        ? req.files.map((f) => {
          return {
            file_name: f.filename,
            file_path:
              process.platform === "win32"
                ? f.path.split("public\\")[1]
                : f.path.split("public/")[1],
            file_size: f.size,
            companyId: decodedCompanyId
          };
        })
        : []
    );
  } catch (error) {
    console.log("🚀 ~ exports.uploadFiles= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.deleteFiles = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      del_files_arr: Joi.array().required(),
      file_for: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const getFiles = await FileUploads.find({
      isDeleted: false,
      _id: {
        $in: value.del_files_arr,
      },
    });

    // delete from storage
    const filePath = getFileUploadPath(value.file_for);
    getFiles?.forEach((file) => fs.unlinkSync(`.${filePath}/${file.name}`));

    // Delete files from db..
    await FileUploads.deleteMany({
      _id: {
        $in: value.del_files_arr.map((d) => new mongoose.Types.ObjectId(d)),
      },
    });
    return successResponse(res, statusCode.SUCCESS, messages.FILE_DELETED, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.filesManageInDB = async (
  attachments,
  loginUser,
  projectId,
  folderId = null,
  taskId = null,
  subTaskId = null,
  commentsId = null,
  isBookmark = null,
  discussionsTopicId = null,
  discussionsTopicDetailsId = null,
  bugsId = null,
  complaint_commentId = null,
) => {
  try {
    const loginUserId = loginUser;
    let fileSection =
      !taskId &&
        !subTaskId &&
        !commentsId &&
        !discussionsTopicId &&
        !discussionsTopicDetailsId &&
        !bugsId
        ? "Files"
        : taskId
          ? "Tasks"
          : subTaskId
            ? "Sub Tasks"
            : commentsId
              ? "Comments"
              : discussionsTopicId || discussionsTopicDetailsId
                ? "Discussions"
                : bugsId
                  ? "Bugs"
                  : complaint_commentId
                    ? "Complaints Comments"
                    : "Files";

    console.log("🚀 ~ fileSection:", fileSection);

    if (attachments?.length && attachments?.length > 0) {
      for (let i = 0; i < attachments.length; i++) {
        const element = attachments[i];
        let obj = {
          name: element.file_name,
          path: element.file_path,
          file_section: fileSection,
          companyId: element.companyId,
          file_type: path.extname(element.file_name),
          file_size: element.file_size,  
          updatedBy: loginUserId,
          project_id: projectId,
          ...(folderId ? { folder_id: folderId } : {}),
          ...(taskId ? { task_id: taskId } : {}),
          ...(subTaskId ? { sub_task_id: subTaskId } : {}),
          ...(commentsId ? { comments_id: commentsId } : {}),
          ...(isBookmark ? { isBookmark: isBookmark } : {}),
          ...(discussionsTopicId
            ? { discussion_topic_id: discussionsTopicId }
            : {}),
          ...(discussionsTopicDetailsId
            ? { discussion_topic_details_id: discussionsTopicDetailsId }
            : {}),
          ...(bugsId ? { bugs_id: bugsId } : {}),
          ...(complaint_commentId ? { complaint_comment_id: complaint_commentId } : {}),
        };

        // If file update...
        if (element?._id) {
          await FileUploads.findByIdAndUpdate(element._id, {
            $set: {
              ...obj,
              updatedAt: configs.utcDefault(),
              ...(await getRefModelFromLoginUser(loginUser, true)),
            },
          });
        } else {
          // if new file upload..
          const newFile = new FileUploads({
            ...obj,
            createdBy: loginUserId,
            createdAt: configs.utcDefault(),
            ...(await getRefModelFromLoginUser(loginUser)),
          });
          const data = await newFile.save();
        }
      }
    } else {
      // If files are remove...
      await FileUploads.deleteMany({
        isDeleted: false,
        project_id: new mongoose.Types.ObjectId(projectId),
        ...(folderId ? { folder_id: folderId } : {}),
        ...(taskId ? { task_id: taskId } : {}),
        ...(subTaskId ? { sub_task_id: subTaskId } : {}),
        ...(commentsId ? { comments_id: commentsId } : {}),
        ...(isBookmark ? { isBookmark: isBookmark } : {}),
        ...(discussionsTopicId
          ? { discussion_topic_id: discussionsTopicId }
          : {}),
        ...(discussionsTopicDetailsId
          ? { discussion_topic_details_id: discussionsTopicDetailsId }
          : {}),
        ...(bugsId ? { bugs_id: bugsId } : {}),
      });
    }
    return;
  } catch (error) {
    console.log("🚀 ~ Error in upload file in DB..:", error);
  }
};