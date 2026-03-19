const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const RecentVisitedData = mongoose.model("recent_visited_data");
const {
  searchDataArr,
  getPagination,
  getAggregationPagination,
} = require("../helpers/queryHelper");
const messages = require("../helpers/messages");
const { statusCode, DEFAULT_DATA } = require("../helpers/constant");
const {
  getRefModelFromLoginUser,
  getProjectDefaultSettingQuery,
} = require("../helpers/common");
const configs = require("../configs");

exports.addRecentVisitedData = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      dataFor: Joi.string().optional().default("project"),
      main_task_id: Joi.string().optional().default(null),
      task_id: Joi.string().optional().default(null),
      bug_id: Joi.string().optional().default(null),
      discussion_id: Joi.string().optional().default(null),
      note_id: Joi.string().optional().default(null),
      folder_id: Joi.string().optional().default(null),
      file_id: Joi.string().optional().default(null),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    const obj = {
      project_id: new mongoose.Types.ObjectId(value.project_id),
      dataFor: value.dataFor,
      ...(value?.main_task_id && {
        main_task_id: new mongoose.Types.ObjectId(value.main_task_id),
      }),
      ...(value?.task_id && {
        task_id: new mongoose.Types.ObjectId(value.task_id),
      }),
      ...(value?.bug_id && {
        bug_id: new mongoose.Types.ObjectId(value.bug_id),
      }),
      ...(value?.discussion_id && {
        discussion_id: new mongoose.Types.ObjectId(value.discussion_id),
      }),
      ...(value?.note_id && {
        note_id: new mongoose.Types.ObjectId(value.note_id),
      }),
      ...(value?.folder_id && {
        folder_id: new mongoose.Types.ObjectId(value.folder_id),
      }),
      ...(value?.file_id && {
        file_id: new mongoose.Types.ObjectId(value.file_id),
      }),
      createdBy: new mongoose.Types.ObjectId(req.user._id),
    };

    // get added recent data..
    const addedRecentData = await RecentVisitedData.findOne(obj);

    if (!addedRecentData) {
      const newData = new RecentVisitedData({
        ...obj,
        visited_count: 1,
        createdAt: configs.utcDefault(),
        updatedAt: configs.utcDefault(),
        updatedBy: req.user._id,
        createdBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user)),
      });
      await newData.save();
    } else {
      await RecentVisitedData.findByIdAndUpdate(
        addedRecentData._id,
        {
          $set: {
            visited_count: parseInt(addedRecentData.visited_count) + 1,
            updatedBy: req.user._id,
            updatedAt: configs.utcDefault(),
          },
        },
        // { $inc: { visited_count: 1 } },
        { new: true, useFindAndModify: false }
      );
    }

    return successResponse(res, statusCode.SUCCESS, messages.CREATED, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getRecentVisitedData = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      dataFor: Joi.string().optional().default("project"),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("updatedAt"),
      sortBy: Joi.string().default("desc"),
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    const pagination = getPagination({
      pageLimit: value.limit,
      pageNum: value.pageNo,
      sort: value.sort,
      sortBy: value.sortBy,
    });

    let matchQuery = {
      isDeleted: false,
      dataFor: value.dataFor,
      createdBy: new mongoose.Types.ObjectId(req.user._id),
      "project_status.title": {
        $eq: DEFAULT_DATA.PROJECT_STATUS.ACTIVE,
      },
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(
          [
            "project.title",
            "mainTask.title",
            "task.title",
            "bug.title",
            "discussion.title",
            "note.title",
            "folder.name",
            "file.name",
          ],
          value.search
        ),
      };
    }

    const mainQuery = [
      {
        $lookup: {
          from: "projects",
          let: { projectId: "$project_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$projectId"] },
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "projectstatuses",
          let: { project_status: "$project.project_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_status"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "project_status",
        },
      },
      {
        $unwind: {
          path: "$project_status",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(await getProjectDefaultSettingQuery("project._id")),

      ...(["list", "task"].includes(value.dataFor)
        ? [
            {
              $lookup: {
                from: "projectmaintasks",
                let: { mainTaskId: "$main_task_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$mainTaskId"] },
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
          ]
        : []),

      ...(value.dataFor == "task"
        ? [
            {
              $lookup: {
                from: "projecttasks",
                let: { taskId: "$task_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$taskId"] },
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
          ]
        : []),

      ...(value.dataFor == "bug"
        ? [
            {
              $lookup: {
                from: "projecttaskbugs",
                let: { bugId: "$bug_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$bugId"] },
                          { $eq: ["$isDeleted", false] },
                        ],
                      },
                    },
                  },
                ],
                as: "bug",
              },
            },
            {
              $unwind: {
                path: "$bug",
                preserveNullAndEmptyArrays: true,
              },
            },
          ]
        : []),

      ...(value.dataFor == "discussion"
        ? [
            {
              $lookup: {
                from: "discussionstopics",
                let: { topicId: "$discussion_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$topicId"] },
                          { $eq: ["$isDeleted", false] },
                        ],
                      },
                    },
                  },
                ],
                as: "discussion",
              },
            },
            {
              $unwind: {
                path: "$discussion",
                preserveNullAndEmptyArrays: true,
              },
            },
          ]
        : []),

      ...(value.dataFor == "note"
        ? [
            {
              $lookup: {
                from: "notes_pms",
                let: { noteId: "$note_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$noteId"] },
                          { $eq: ["$isDeleted", false] },
                        ],
                      },
                    },
                  },
                ],
                as: "note",
              },
            },
            {
              $unwind: {
                path: "$note",
                preserveNullAndEmptyArrays: true,
              },
            },
          ]
        : []),

      ...(value.dataFor == "fileFolder"
        ? [
            {
              $lookup: {
                from: "filefolders",
                let: { folderId: "$folder_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$folderId"] },
                          { $eq: ["$isDeleted", false] },
                        ],
                      },
                    },
                  },
                ],
                as: "folder",
              },
            },
            {
              $unwind: {
                path: "$folder",
                preserveNullAndEmptyArrays: true,
              },
            },
          ]
        : []),

      ...(value.dataFor == "file"
        ? [
            {
              $lookup: {
                from: "fileuploads",
                let: { fileId: "$file_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$fileId"] },
                          { $eq: ["$isDeleted", false] },
                        ],
                      },
                    },
                  },
                ],
                as: "file",
              },
            },
            {
              $unwind: {
                path: "$file",
                preserveNullAndEmptyArrays: true,
              },
            },
          ]
        : []),
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          visited_count: 1,
          dataFor: 1,
          project_id: 1,
          main_task_id: 1,
          task_id: 1,
          bug_id: 1,
          discussion_id: 1,
          note_id: 1,
          folder_id: 1,
          file_id: 1,
          createdBy: 1,
          updatedAt: 1,
          project: 1,
          mainTask: 1,
          task: 1,
          note: 1,
          discussion: 1,
          fileFolder: 1,
          file: 1,
          ...(await getProjectDefaultSettingQuery("project._id", true)),
        },
      },
    ];

    const listQuery = await getAggregationPagination(mainQuery, pagination);
    const data = await RecentVisitedData.aggregate(listQuery);

    return successResponse(res, 200, messages.LISTING, data, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.removeRecentVisitedData = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      recent_id: Joi.string().required(),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, 400, error.details[0].message);
    }

    const recentItem = await RecentVisitedData.findOne({
      _id: new mongoose.Types.ObjectId(value.recent_id),
      createdBy: new mongoose.Types.ObjectId(req.user._id),
      isDeleted: false,
    });

    if (!recentItem) {
      return errorResponse(res, 404, messages.NOT_FOUND);
    }

    await RecentVisitedData.findByIdAndUpdate(
      recentItem._id,
      {
        $set: {
          isDeleted: true,
          updatedAt: configs.utcDefault(),
          updatedBy: req.user._id,
        },
      },
      { new: true, useFindAndModify: false }
    );

    return successResponse(res, statusCode.SUCCESS, messages.DELETED, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
