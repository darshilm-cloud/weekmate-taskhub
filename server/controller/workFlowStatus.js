const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const ProjectWorkFlow = mongoose.model("projectworkflows");
const ProjectWorkFlowStatus = mongoose.model("workflowstatus");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");

//Add Project Work Flow status:
exports.addProjectWorkFlowStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      workflow_id: Joi.string().required(),
      title: Joi.string().required(),
      color: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (
      !(await this.projectWorkFlowStatusExists(value.title, value.workflow_id))
    ) {
      // Get last sequence for ..
      const getWorkFlowLastData = await ProjectWorkFlowStatus.find({
        isDeleted: false,
        workflow_id: new mongoose.Types.ObjectId(value.workflow_id),
      })
        .sort({ sequence: -1 })
        .limit(1);

      // save new data..
      let data = new ProjectWorkFlowStatus({
        workflow_id: value.workflow_id,
        title: value.title,
        color: value.color,
        sequence: getWorkFlowLastData[0].sequence,
        createdBy: req.user._id,
        updatedBy: req.user._id,
      });
      await data.save();

      // Update last sequence of workflow status..
      await ProjectWorkFlowStatus.findByIdAndUpdate(
        getWorkFlowLastData[0]._id,
        {
          sequence: parseInt(getWorkFlowLastData[0].sequence) + 1,
        }
      );

      return successResponse(res, statusCode.CREATED, messages.CREATED, data);
    } else {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        messages.ALREADY_EXISTS,
        []
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project Work Flow:
exports.getProjectWorkFlowStatus = async (req, res) => {
  try {
    const query = [
      {
        $match: {
          isDeleted: false,
          workflow_id: new mongoose.Types.ObjectId(req.params.workFlowId),
          ...(req.query._id
            ? { _id: new mongoose.Types.ObjectId(req.query._id) }
            : {}),
        },
      },
      {
        $sort: {
          sequence: 1,
        },
      },
    ];
    const projectWorkFlowStatus = await ProjectWorkFlowStatus.aggregate(query);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      req.query._id ? projectWorkFlowStatus[0] : projectWorkFlowStatus,
      []
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Check is exists..
exports.projectWorkFlowStatusExists = async (title, workflow_id, id = null) => {
  try {
    let isExist = false;
    // const data = await ProjectWorkFlowStatus.findOne({
    //   workflow_id: workflow_id,
    //   // title: title?.trim()?.toLowerCase(),
    //   title: { $regex: new RegExp(`^${title}$`, "i") },
    //   isDeleted: false,
    //   ...(id
    //     ? {
    //         _id: { $ne: id },
    //       }
    //     : {}),
    // });
    // if (data) isExist = true;

    const data = await ProjectWorkFlowStatus.aggregate([
      {
        $match: {
          workflow_id: workflow_id,
          isDeleted: false,
          ...(id
            ? {
                _id: { $ne: new mongoose.Types.ObjectId(id) },
              }
            : {}),
        },
      },
      {
        $addFields: {
          titleLower: { $toLower: "$title" }, // Add a temporary field with lowercase title
        },
      },
      {
        $match: {
          titleLower: title.trim().toLowerCase(), // Match the lowercase title
        },
      },
    ]);
    if (data.length > 0) isExist = true;
    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectWorkFlowStatusExists= ~ error:", error);
  }
};

//Update Project Work Flow:
exports.updateProjectWorkFlowStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      workflow_id: Joi.string().required(),
      title: Joi.string().required(),
      color: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);

    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (
      !(await this.projectWorkFlowStatusExists(
        value.title,
        value.workflow_id,
        req.params.id
      ))
    ) {
      const data = await ProjectWorkFlowStatus.findByIdAndUpdate(
        req.params.id,
        {
          workflow_id: value.workflow_id,
          title: value.title,
          color: value.color,
          updatedBy: req.user._id,
        },
        { new: true }
      );

      if (!data) {
        return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
      }

      return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
    } else {
      return errorResponse(
        res,
        statusCode.CONFLICT,
        messages.ALREADY_EXISTS,
        []
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project Work Flow:
exports.deleteProjectWorkFlowStatus = async (req, res) => {
  try {
    const data = await ProjectWorkFlowStatus.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(res, statusCode.SUCCESS, messages.DELETED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
