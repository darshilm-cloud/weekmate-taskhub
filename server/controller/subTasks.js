const Joi = require("joi");
const moment = require("moment");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const ProjectSubTasks = mongoose.model("projectsubtasks");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr,
  getAggregationPagination,
} = require("../helpers/queryHelper");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const { generateRandomId } = require("../helpers/common");
const { filesManageInDB } = require("./fileUploads");
const { getDataForUpdate } = require("./tasks");
const ProjectTaskUpdateHistory = mongoose.model("taskupdatehistory");

// Check is exists..
exports.projectSubTaskExists = async (reqData, id = null) => {
  try {
    let isExist = false;
    const data = await ProjectSubTasks.findOne({
      isDeleted: false,
      // title: reqData?.title?.trim()?.toLowerCase(),
      title: { $regex: new RegExp(`^${reqData?.title}$`, "i") },
      project_id: new mongoose.Types.ObjectId(reqData.project_id),
      main_task_id: new mongoose.Types.ObjectId(reqData.main_task_id),
      task_id: new mongoose.Types.ObjectId(reqData.task_id),
      ...(id
        ? {
            _id: { $ne: id },
          }
        : {}),
    });
    console.log("🚀 ~ exports.projectSubTaskExists= ~ data:", data);
    if (data) isExist = true;
    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.projectSubTaskExists= ~ error:", error);
  }
};

//Add Project suub task :
exports.addProjectsSubTask = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      project_id: Joi.string().required(),
      main_task_id: Joi.string().required(),
      task_id: Joi.string().required(),
      status: Joi.string().optional().default("active"),
      descriptions: Joi.string().optional().allow("").default(""),
      task_labels: Joi.array().optional(),
      start_date: Joi.date().optional(),
      due_date: Joi.date().optional(),
      assignees: Joi.array().optional(),
      estimated_hours: Joi.string().optional().default("00"),
      estimated_minutes: Joi.string().optional().default("00"),
      attachments: Joi.any().optional(),
      task_progress: Joi.string().optional().default("0"),
      task_status: Joi.string().optional(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (await this.projectSubTaskExists(value)) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      let data = new ProjectSubTasks({
        title: value.title,
        subTaskId: generateRandomId(),
        project_id: value.project_id,
        main_task_id: value.main_task_id || null,
        task_id: value.task_id || null,
        task_status: value.task_status || null,
        assignees: value.assignees || [],
        status: value.status,
        descriptions: value.descriptions || "",
        task_labels: value.task_labels || [],
        start_date: value.start_date || null,
        due_date: value.due_date || null,
        start_date: value.start_date || null,
        estimated_hours: value.estimated_hours,
        estimated_minutes: value.estimated_minutes,
        // attachments: value.attachments || [],
        task_progress: value.task_progress,
        ...(value?.task_status && {
          task_status_history: [
            {
              task_status: value?.task_status,
              updatedBy: req.user._id,
              updatedAt: configs.utcDefault(),
            },
          ],
        }),

        createdBy: req.user._id,
        updatedBy: req.user._id,
      });
      const newData = await data.save();

      // save  files,..
      if (value?.attachments && value.attachments.length > 0) {
        await filesManageInDB(
          value.attachments,
          req.user,
          value.project_id,
          value.folder_id,
          null,
          newData._id
        );
      }

      // Add a data in history..
      let newHistory = new ProjectTaskUpdateHistory({
        project_id: value.project_id,
        main_task_id: value.main_task_id || null,
        task_id: value.task_id,
        subtask_id: newData._id,
        updated_key: "createdAt",
        createdBy: req.user._id,
        updatedBy: req.user._id,
      });
      await newHistory.save();
      return successResponse(res, statusCode.CREATED, messages.CREATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get Project sub task :
exports.getProjectsSubTask = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
      project_id: Joi.string().required(),
      main_task_id: Joi.string().required(),
      task_id: Joi.string().required(),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const pagination = getPagination({
      pageLimit: value.limit,
      pageNum: value.pageNo,
      sort: value.sort,
      sortBy: value.sortBy,
    });

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value.project_id),
      main_task_id: new mongoose.Types.ObjectId(value.main_task_id),
      task_id: new mongoose.Types.ObjectId(value.task_id),
      // For details
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {}),
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["title"], value.search),
      };
    }

    const mainQuery = [
      {
        $lookup: {
          from: "projecttasks",
          let: { task_id: "$task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$task_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "task",
        },
      },
      {
        $unwind: {
          path: "$task",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "projectmaintasks",
          let: { main_task_id: "$main_task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$main_task_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "mainTask",
        },
      },
      {
        $unwind: {
          path: "$mainTask",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "projects",
          let: { project_id: "$project_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "project",
        },
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "workflowstatuses",
          let: { task_status: "$task_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$task_status"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "workFlowStatus",
        },
      },
      {
        $unwind: {
          path: "$workFlowStatus",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "tasklabels",
          let: { task_label_ids: "$task_labels" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$task_label_ids"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "taskLabels",
        },
      },

      {
        $lookup: {
          from: "employees",
          let: { assigneesIds: "$assignees" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$assigneesIds"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "assignees",
        },
      },

      {
        $lookup: {
          from: "fileuploads",
          let: { sub_task_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sub_task_id", "$$sub_task_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "attachments",
        },
      },
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          subTaskId: 1,
          title: 1,
          project: 1,
          task: 1,
          status: 1,
          descriptions: 1,
          start_date: 1,
          due_date: 1,
          estimated_hours: 1,
          estimated_minutes: 1,
          attachments: {
            $map: {
              input: "$attachments",
              as: "attachment",
              in: {
                _id: "$$attachment._id",
                name: "$$attachment.name",
                file_type: "$$attachment.file_type",
                path: "$$attachment.path",
              },
            },
          },
          task_progress: 1,
          task_status_history: 1,
          mainTask: 1,
          workFlowStatus: {
            _id: 1,
            title: 1,
          },
          taskLabels: 1,
          assignees: {
            $map: {
              input: {
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$assignees" },
                      { $ne: ["$assignees", []] },
                    ],
                  },
                  then: "$assignees",
                  else: [],
                },
              },
              as: "assigneeId",
              in: {
                _id: "$$assigneeId._id",
                name: "$$assigneeId.full_name",
              },
            },
          },
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await ProjectSubTasks.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await ProjectSubTasks.aggregate([
      ...mainQuery,
      { $sort: pagination.sort },
    ]);

    const metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page,
    };

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      value._id ? data[0] : data,
      !value._id && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update Project sub task : whole the data ... not in use...
exports.updateProjectsSubTask = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      title: Joi.string().required(),
      project_id: Joi.string().required(),
      main_task_id: Joi.string().required(),
      task_id: Joi.string().required(),
      status: Joi.string().optional().default("active"),
      descriptions: Joi.string().optional().allow("").default(""),
      task_labels: Joi.array().optional(),
      start_date: Joi.date().optional(),
      due_date: Joi.date().optional(),
      assignees: Joi.array().optional(),
      estimated_hours: Joi.string().optional().default("00"),
      estimated_minutes: Joi.string().optional().default("00"),
      attachments: Joi.array().optional(),
      task_progress: Joi.string().optional().default("0"),
      task_status: Joi.string().optional(),
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
      await this.projectSubTaskExists(
        value.title,
        value.project_id,
        req.params.id
      )
    ) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      const getData = await ProjectSubTasks.findById(req.params.id);

      const data = await ProjectSubTasks.findByIdAndUpdate(
        req.params.id,
        {
          title: value.title,
          project_id: value.project_id,
          main_task_id: value.main_task_id || null,
          task_id: value.task_id || null,
          task_status: value.task_status || null,
          assignees: value.assignees || [],
          status: value.status,
          descriptions: value.descriptions || "",
          task_labels: value.task_labels || [],
          start_date: value.start_date || null,
          due_date: value.due_date || null,
          start_date: value.start_date || null,
          estimated_hours: value.estimated_hours,
          estimated_minutes: value.estimated_minutes,
          attachments: value.attachments || [],
          task_progress: value.task_progress,
          ...(getData.task_status && !value.task_status
            ? {
                task_status_history: [
                  ...getData.task_status_history,
                  {
                    task_status: null,
                    updatedBy: req.user._id,
                    updatedAt: configs.utcDefault(),
                  },
                ],
              }
            : !getData.task_status && value.task_status
            ? {
                task_status_history: [
                  {
                    task_status: value.task_status,
                    updatedBy: req.user._id,
                    updatedAt: configs.utcDefault(),
                  },
                ],
              }
            : getData.task_status &&
              value.task_status &&
              getData.task_status.toString() !== value.task_status.toString()
            ? {
                task_status_history: [
                  ...getData.task_status_history,
                  {
                    task_status: value.task_status,
                    updatedBy: req.user._id,
                    updatedAt: configs.utcDefault(),
                  },
                ],
              }
            : getData.task_status_history),
          updatedBy: req.user._id,
        },
        { new: true }
      );

      if (!data) {
        return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
      }

      return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// update status...
exports.updateProjectsSubTaskStatus = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      status: Joi.string().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const data = await ProjectSubTasks.findByIdAndUpdate(
      req.params.id,
      {
        status: value.status,
        updatedBy: req.user._id,
        updatedAt: configs.utcDefault(),
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete Project sub task :
exports.deleteProjectsSubTask = async (req, res) => {
  try {
    const data = await ProjectSubTasks.findByIdAndUpdate(
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

//Update Project sub task props  :
exports.updateProjectsSubTaskProps = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      updated_key: Joi.string().required(),
      title: Joi.string().required(),
      project_id: Joi.string().required(),
      main_task_id: Joi.string().required(),
      task_id: Joi.string().required(),
      status: Joi.string().optional().default("active"),
      descriptions: Joi.string().optional().allow("").default(""),
      task_labels: Joi.array().optional(),
      start_date: Joi.date().optional(),
      due_date: Joi.date().optional(),
      assignees: Joi.array().optional(),
      estimated_hours: Joi.string().optional().default("00"),
      estimated_minutes: Joi.string().optional().default("00"),
      attachments: Joi.array().optional(),
      task_progress: Joi.string().optional().default("0"),
      task_status: Joi.string().optional(),
      folder_id: Joi.string().optional(),
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
      value.updated_key == "title" &&
      (await this.projectSubTaskExists(value, req.params.id))
    ) {
      return errorResponse(res, statusCode.CONFLICT, messages.ALREADY_EXISTS);
    } else {
      const getData = await ProjectSubTasks.findById(req.params.id);

      const { updateObj, historyUpdateObj } = await getDataForUpdate(
        req.user,
        getData,
        {
          ...value,
          sub_task_id: req.params.id,
        }
      );

      const data = await ProjectSubTasks.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(req.params.id), isDeleted: false },
        { $set: updateObj },
        { new: true }
      );

      if (
        value?.updated_key !== "attachments" &&
        historyUpdateObj?.updated_key
      ) {
        // update task history...
        let historyData = new ProjectTaskUpdateHistory({
          ...historyUpdateObj,
          project_id: value.project_id,
          main_task_id: value.main_task_id || null,
          task_id: value.task_id,
          subtask_id: req.params.id,
        });
        await historyData.save();
      }

      // save  files,..
      if (value?.attachments && value.attachments.length > 0) {
        await filesManageInDB(
          value.attachments,
          req.user,
          value.project_id,
          value.folder_id,
          null,
          req.params.id
        );
      }

      if (!data) {
        return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
      }

      return successResponse(res, statusCode.SUCCESS, messages.UPDATED, data);
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// History
exports.getHistory = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
      sub_task_id: Joi.string().required(),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const pagination = getPagination({
      pageLimit: value.limit,
      pageNum: value.pageNo,
      sort: value.sort,
      sortBy: value.sortBy,
    });

    let matchQuery = {
      isDeleted: false,
      subtask_id: new mongoose.Types.ObjectId(value.sub_task_id),
    };

    const mainQuery = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "employees",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $unwind: {
          path: "$createdBy",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updatedBy",
          foreignField: "_id",
          as: "updatedBy",
        },
      },
      {
        $unwind: {
          path: "$updatedBy",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,
          updated_key: 1,
          pervious_value: 1,
          new_value: 1,
          createdBy: {
            _id: 1,
            full_name: 1,
          },
          updatedBy: {
            _id: 1,
            full_name: 1,
          },
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await ProjectTaskUpdateHistory.aggregate(
      countQuery
    );
    
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = getAggregationPagination(mainQuery, pagination);
    let data = await ProjectTaskUpdateHistory.aggregate([
      ...mainQuery,
      { $sort: pagination.sort },
    ]);

    const metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page,
    };

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      data,
      metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
