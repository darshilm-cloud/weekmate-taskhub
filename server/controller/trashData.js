const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const Project = mongoose.model("projects");
const DiscussionTopic = mongoose.model("discussionstopics");
const ProjectBugs = mongoose.model("projecttaskbugs");
const ProjectTasks = mongoose.model("projecttasks");
const Notes = mongoose.model("notes_pms");
const LoggedHours = mongoose.model("projecttaskhourlogs");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr,
  getAggregationPagination,
} = require("../helpers/queryHelper");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");

const { getCreatedUpdatedDeletedByQuery } = require("../helpers/common");
const { checkUserIsAdmin } = require("./authentication");

exports.getTrashProjects = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("deletedAt"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
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
      pageLimit: value?.limit,
      pageNum: value?.pageNo,
      sort: value?.sort,
      sortBy: value?.sortBy,
    });

    // Or filter..
    let orFilter = [
      !(await checkUserIsAdmin(req?.user?._id))
        ? {
            $or: [
              { "assignees._id": new mongoose.Types.ObjectId(req.user._id) },
              { "pms_clients._id": new mongoose.Types.ObjectId(req.user._id) },
              { "manager._id": new mongoose.Types.ObjectId(req.user._id) },
              { "createdBy._id": new mongoose.Types.ObjectId(req.user._id) },
              { "deletedBy._id": new mongoose.Types.ObjectId(req.user._id)}
            ],
          }
        : {},
    ];

    let matchQuery = {
      isDeleted: true,
      // For details
      ...(value?._id ? { _id: new mongoose.Types.ObjectId(value?._id) } : {}),
    };

    if (value?.search) {
      orFilter = [
        ...orFilter,
        searchDataArr(
          ["title", "manager.full_name", "deletedBy.full_name", "descriptions"],
          value?.search
        ),
      ];
    }
    matchQuery = {
      ...matchQuery,
      $and: orFilter,
    };

    const mainQuery = [
      {
        $lookup: {
          from: "employees",
          let: { manager: "$manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "manager",
        },
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(await getCreatedUpdatedDeletedByQuery("deletedBy")),

      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          descriptions: 1,
          manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
          },
          deletedBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
          },
          deletedAt: 1,
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await Project.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await Project.aggregate(listQuery);

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
      value?._id ? data[0] : data,
      !value?._id && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getTrashDiscussion = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("deletedAt"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
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
      pageLimit: value?.limit,
      pageNum: value?.pageNo,
      sort: value?.sort,
      sortBy: value?.sortBy,
    });

    // Or filter..
    let orFilter = [
      !(await checkUserIsAdmin(req?.user?._id))
        ? {
            $or: [
              { "project.createdBy": new mongoose.Types.ObjectId(req.user._id) },
              { "project.manager": new mongoose.Types.ObjectId(req.user._id) },
              { "createdBy._id": new mongoose.Types.ObjectId(req.user._id) },
              { "deletedBy._id": new mongoose.Types.ObjectId(req.user._id)}
            ],
          }
        : {},
    ];

    let matchQuery = {
      isDeleted: true,
      // For details
      ...(value?._id ? { _id: new mongoose.Types.ObjectId(value?._id) } : {}),
    };

    if (value?.search) {
      orFilter = [
        ...orFilter,
        searchDataArr(
          ["title", "project.title", "deletedBy.full_name", "descriptions"],
          value?.search
        ),
      ];
    }
    matchQuery = {
      ...matchQuery,
      $and: orFilter,
    };

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
      ...(await getCreatedUpdatedDeletedByQuery("deletedBy")),

      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          descriptions: 1,
          project: {
            _id: 1,
            title: 1,
          },
          deletedBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
          },
          deletedAt: 1,
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await DiscussionTopic.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await DiscussionTopic.aggregate(listQuery);

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
      value?._id ? data[0] : data,
      !value?._id && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getTrashTasks = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("deletedAt"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
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
      pageLimit: value?.limit,
      pageNum: value?.pageNo,
      sort: value?.sort,
      sortBy: value?.sortBy,
    });

    // Or filter..
    let orFilter = [
      !(await checkUserIsAdmin(req?.user?._id))
        ? {
            $or: [
              { "assignees._id": new mongoose.Types.ObjectId(req.user._id) },
              { "pms_clients._id": new mongoose.Types.ObjectId(req.user._id) },
              { "project.manager": new mongoose.Types.ObjectId(req.user._id) },
              { "createdBy._id": new mongoose.Types.ObjectId(req.user._id) },
              { "deletedBy._id": new mongoose.Types.ObjectId(req.user._id)}

            ],
          }
        : {},
    ];

    let matchQuery = {
      isDeleted: true,
      // For details
      ...(value?._id ? { _id: new mongoose.Types.ObjectId(value?._id) } : {}),
    };

    if (value?.search) {
      orFilter = [
        ...orFilter,
        searchDataArr(
          [
            "title",
            "mainTask.title",
            "project.title",
            "deletedBy.full_name",
            "descriptions",
          ],
          value?.search
        ),
      ];
    }
    matchQuery = {
      ...matchQuery,
      $and: orFilter,
    };

    const mainQuery = [
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
      ...(await getCreatedUpdatedDeletedByQuery("deletedBy")),

      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          descriptions: 1,
          project: {
            _id: 1,
            title: 1,
          },
          mainTask: {
            _id: 1,
            title: 1,
          },
          deletedBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
          },
          deletedAt: 1,
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await ProjectTasks.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await ProjectTasks.aggregate(listQuery);

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
      value?._id ? data[0] : data,
      !value?._id && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getTrashBugs = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("deletedAt"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
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
      pageLimit: value?.limit,
      pageNum: value?.pageNo,
      sort: value?.sort,
      sortBy: value?.sortBy,
    });

    // Or filter..
    let orFilter = [
      !(await checkUserIsAdmin(req?.user?._id))
        ? {
            $or: [
              { "assignees._id": new mongoose.Types.ObjectId(req.user._id) },
              { "pms_clients._id": new mongoose.Types.ObjectId(req.user._id) },
              { "project.manager": new mongoose.Types.ObjectId(req.user._id) },
              { "createdBy._id": new mongoose.Types.ObjectId(req.user._id) },
              { "deletedBy._id": new mongoose.Types.ObjectId(req.user._id)}

            ],
          }
        : {},
    ];

    let matchQuery = {
      isDeleted: true,
      // For details
      ...(value?._id ? { _id: new mongoose.Types.ObjectId(value?._id) } : {}),
    };

    if (value?.search) {
      orFilter = [
        ...orFilter,
        searchDataArr(
          [
            "title",
            "task.title",
            "project.title",
            "deletedBy.full_name",
            "descriptions",
          ],
          value?.search
        ),
      ];
    }
    matchQuery = {
      ...matchQuery,
      $and: orFilter,
    };

    const mainQuery = [
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
      ...(await getCreatedUpdatedDeletedByQuery("deletedBy")),

      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          descriptions: 1,
          project: {
            _id: 1,
            title: 1,
          },
          task: {
            _id: 1,
            title: 1,
          },
          deletedBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
          },
          deletedAt: 1,
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await ProjectBugs.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await ProjectBugs.aggregate(listQuery);

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
      value?._id ? data[0] : data,
      !value?._id && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getTrashNotes = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("deletedAt"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
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
      pageLimit: value?.limit,
      pageNum: value?.pageNo,
      sort: value?.sort,
      sortBy: value?.sortBy,
    });

    // Or filter..
    let orFilter = [
      !(await checkUserIsAdmin(req?.user?._id))
        ? {
            $or: [
              { "subscribers._id": new mongoose.Types.ObjectId(req.user._id) },
              { "pms_clients._id": new mongoose.Types.ObjectId(req.user._id) },
              { "project.manager": new mongoose.Types.ObjectId(req.user._id) },
              { "createdBy._id": new mongoose.Types.ObjectId(req.user._id) },
              { "deletedBy._id": new mongoose.Types.ObjectId(req.user._id)}

            ],
          }
        : {},
    ];

    let matchQuery = {
      isDeleted: true,
      // For details
      ...(value?._id ? { _id: new mongoose.Types.ObjectId(value?._id) } : {}),
    };

    if (value?.search) {
      orFilter = [
        ...orFilter,
        searchDataArr(
          ["title", "project.title", "deletedBy.full_name", "notesInfo"],
          value?.search
        ),
      ];
    }
    matchQuery = {
      ...matchQuery,
      $and: orFilter,
    };

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
      ...(await getCreatedUpdatedDeletedByQuery("deletedBy")),

      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          notesInfo: 1,
          project: {
            _id: 1,
            title: 1,
          },
          deletedBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
          },
          deletedAt: 1,
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await Notes.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await Notes.aggregate(listQuery);

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
      value?._id ? data[0] : data,
      !value?._id && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getTrashLoggedHours = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("deletedAt"),
      sortBy: Joi.string().default("desc"),
      _id: Joi.string().optional(),
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
      pageLimit: value?.limit,
      pageNum: value?.pageNo,
      sort: value?.sort,
      sortBy: value?.sortBy,
    });

    // Or filter..
    let orFilter = [
      !(await checkUserIsAdmin(req?.user?._id))
        ? {
            $or: [
              { "project.manager": new mongoose.Types.ObjectId(req.user._id) },
              { "createdBy._id": new mongoose.Types.ObjectId(req.user._id) },
              { "deletedBy._id": new mongoose.Types.ObjectId(req.user._id)}
            ],
          }
        : {},
    ];

    let matchQuery = {
      isDeleted: true,
      // For details
      ...(value?._id ? { _id: new mongoose.Types.ObjectId(value?._id) } : {}),
    };

    if (value?.search) {
      orFilter = [
        ...orFilter,
        searchDataArr(
          [
            "project.title",
            "task.title",
            "createdBy.full_name",
            "descriptions",
            "deletedBy.full_name",
          ],
          value?.search
        ),
      ];
    }
    matchQuery = {
      ...matchQuery,
      $and: orFilter,
    };

    const mainQuery = [
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
      ...(await getCreatedUpdatedDeletedByQuery()),
      ...(await getCreatedUpdatedDeletedByQuery("deletedBy")),

      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          descriptions: 1,
          logged_hours: 1,
          logged_minutes: 1,
          project: {
            _id: 1,
            title: 1,
          },
          task: {
            _id: 1,
            title: 1,
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
          },
          deletedBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
          },
          deletedAt: 1,
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await LoggedHours.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await LoggedHours.aggregate(listQuery);

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
      value?._id ? data[0] : data,
      !value?._id && metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.deleteData = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      project_ids: Joi.array().optional().default([]),
      discussion_ids: Joi.array().optional().default([]),
      task_ids: Joi.array().optional().default([]),
      bug_ids: Joi.array().optional().default([]),
      note_ids: Joi.array().optional().default([]),
      logged_time_ids: Joi.array().optional().default([]),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    let resMsg = messages.DELETED;
    if (value?.project_ids && value?.project_ids.length > 0) {
      await Project.deleteMany({
        isDeleted: true,
        _id: {
          $in: value.project_ids.map((d) => new mongoose.Types.ObjectId(d)),
        },
      });
    }

    if (value?.discussion_ids && value?.discussion_ids.length > 0) {
      await DiscussionTopic.deleteMany({
        isDeleted: true,
        _id: {
          $in: value.discussion_ids.map((d) => new mongoose.Types.ObjectId(d)),
        },
      });
    }

    if (value?.task_ids && value?.task_ids.length > 0) {
      await ProjectTasks.deleteMany({
        isDeleted: true,
        _id: {
          $in: value.task_ids.map((d) => new mongoose.Types.ObjectId(d)),
        },
      });
    }

    if (value?.bug_ids && value?.bug_ids.length > 0) {
      await ProjectBugs.deleteMany({
        isDeleted: true,
        _id: {
          $in: value.bug_ids.map((d) => new mongoose.Types.ObjectId(d)),
        },
      });
    }

    if (value?.note_ids && value?.note_ids.length > 0) {
      await Notes.deleteMany({
        isDeleted: true,
        _id: {
          $in: value.note_ids.map((d) => new mongoose.Types.ObjectId(d)),
        },
      });
    }

    if (value?.logged_time_ids && value?.logged_time_ids.length > 0) {
      await LoggedHours.deleteMany({
        isDeleted: true,
        _id: {
          $in: value.logged_time_ids.map((d) => new mongoose.Types.ObjectId(d)),
        },
      });
    }

    return successResponse(res, statusCode.SUCCESS, resMsg, [], []);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.restoreData = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};
    
    const validationSchema = Joi.object({
      project_ids: Joi.array().optional().default([]),
      discussion_ids: Joi.array().optional().default([]),
      task_ids: Joi.array().optional().default([]),
      bug_ids: Joi.array().optional().default([]),
      note_ids: Joi.array().optional().default([]),
      logged_time_ids: Joi.array().optional().default([]),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    let resMsg = messages.RESTORE;
    const updateObj = {
      isDeleted: false,
      deletedBy: null,
      deletedAt: null,
      deletedByModel: null,
    };

    if (value?.project_ids && value?.project_ids.length > 0) {
      await Project.updateMany(
        {
          isDeleted: true,
          _id: {
            $in: value.project_ids.map((d) => new mongoose.Types.ObjectId(d)),
          },
        },
        updateObj
      );
    }

    if (value?.discussion_ids && value?.discussion_ids.length > 0) {
      await DiscussionTopic.updateMany(
        {
          isDeleted: true,
          _id: {
            $in: value.discussion_ids.map(
              (d) => new mongoose.Types.ObjectId(d)
            ),
          },
        },
        updateObj
      );
    }

    if (value?.task_ids && value?.task_ids.length > 0) {
      await ProjectTasks.updateMany(
        {
          isDeleted: true,
          _id: {
            $in: value.task_ids.map((d) => new mongoose.Types.ObjectId(d)),
          },
        },
        updateObj
      );
    }

    if (value?.bug_ids && value?.bug_ids.length > 0) {
      await ProjectBugs.updateMany(
        {
          isDeleted: true,
          _id: {
            $in: value.bug_ids.map((d) => new mongoose.Types.ObjectId(d)),
          },
        },
        updateObj
      );
    }

    if (value?.note_ids && value?.note_ids.length > 0) {
      await Notes.updateMany(
        {
          isDeleted: true,
          _id: {
            $in: value.note_ids.map((d) => new mongoose.Types.ObjectId(d)),
          },
        },
        updateObj
      );
    }

    if (value?.logged_time_ids && value?.logged_time_ids.length > 0) {
      await LoggedHours.updateMany(
        {
          isDeleted: true,
          _id: {
            $in: value.logged_time_ids.map(
              (d) => new mongoose.Types.ObjectId(d)
            ),
          },
        },
        updateObj
      );
    }

    return successResponse(res, statusCode.SUCCESS, resMsg, [], []);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};