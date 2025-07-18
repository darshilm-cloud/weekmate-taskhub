const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const FileFolders = mongoose.model("filefolders");
const FileUploads = mongoose.model("fileuploads");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const { searchDataArr } = require("../helpers/queryHelper");
const path = require("path");
const { subscribersMailForNewFileUploaded } = require("./sendEmail");
const {
  getArrayChanges,
  getRefModelFromLoginUser,
  getCreatedUpdatedDeletedByQuery,
  getClientQuery
} = require("../helpers/common");
const {
  checkLoginUserIsProjectManager,
  checkLoginUserIsProjectAccountManager
} = require("./projectMainTask");
const { checkUserIsAdmin } = require("./authentication");

//Add file folders :
exports.addFileFolders = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      name: Joi.string().required(),
      project_id: Joi.string().required(),
      isBookmark: Joi.boolean().optional().default(false)
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (!(await this.isFileFolderExists(value))) {
      let data = new FileFolders({
        name: value.name,
        project_id: value.project_id,
        isBookmark: value.isBookmark,
        createdBy: req.user._id,
        updatedBy: req.user._id
      });
      const newData = await data.save();

      return successResponse(
        res,
        statusCode.CREATED,
        messages.FOLDER_CREATED,
        newData
      );
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

//Get file folders :
exports.getFileFolders = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      search: Joi.string().allow("").optional(),
      _id: Joi.string().optional()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value?.project_id),
      ...(value._id ? { _id: new mongoose.Types.ObjectId(value._id) } : {})
    };
    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["name"], value.search)
      };
    }

    let fileQuery = [
      { $eq: ["$folder_id", "$$folder_id"] },
      { $eq: ["$isDeleted", false] }
    ];

    const [isAdmin, isManager, isAccManager] = await Promise.all([
      checkUserIsAdmin(req.user._id),
      checkLoginUserIsProjectManager(value.project_id, req.user._id),
      checkLoginUserIsProjectAccountManager(value.project_id, req.user._id)
    ]);

    if (!isManager && !isAdmin && !isAccManager) {
      fileQuery = [
        ...fileQuery,
        {
          $or: await this.conditionForFileAccess(req?.user?._id)
        }
      ];
    }

    let query = [
      {
        $match: matchQuery
      },
      {
        $lookup: {
          from: "fileuploads",
          let: { folder_id: "$_id" },
          pipeline: [
            ...(await this.queryForFileAccess()),
            {
              $match: {
                $expr: {
                  $and: fileQuery
                }
              }
            },
            {
              $sort: { [value?.sort]: value?.sortBy == "asc" ? 1 : -1 }
            }
          ],
          as: "files"
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];

    const data = await FileFolders.aggregate(query);

    data.filter((ele) => {
      if (
        ele.createdBy == req.user?._id ||
        isAdmin ||
        isManager ||
        isAccManager
      ) {
        ele.isDeletable = true;
        ele.isEditable = true;
      } else {
        ele.isDeletable = false;
        ele.isEditable = false;
      }

      ele.files.filter((file) => {
        if (
          file.createdBy == req.user?._id ||
          isAdmin ||
          isManager ||
          isAccManager
        ) {
          file.isDeletable = true;
          file.isEditable = true;
        } else {
          file.isDeletable = false;
          file.isEditable = false;
        }
      });
    });

    return successResponse(
      res,
      200,
      messages.LISTING,
      value._id ? data[0] : data,
      []
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Check is exists..
exports.isFileFolderExists = async (value, id = null) => {
  try {
    let isExist = false;
    // const data = await FileFolders.findOne({
    //   // name: name?.trim()?.toLowerCase(),
    //   name: { $regex: new RegExp(`^${value?.name}$`, "i") },
    //   project_id: new mongoose.Types.ObjectId(value.project_id),
    //   isDeleted: false,
    //   ...(id
    //     ? {
    //         _id: { $ne: id },
    //       }
    //     : {}),
    // });
    // if (data) isExist = true;

    const data = await FileFolders.aggregate([
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(value?.project_id),
          isDeleted: false,
          ...(id
            ? {
                _id: { $ne: new mongoose.Types.ObjectId(id) }
              }
            : {})
        }
      },
      {
        $addFields: {
          titleLower: { $toLower: "$name" } // Add a temporary field with lowercase title
        }
      },
      {
        $match: {
          titleLower: value?.name.trim().toLowerCase() // Match the lowercase title
        }
      }
    ]);
    if (data.length > 0) isExist = true;

    return isExist;
  } catch (error) {
    console.log("🚀 ~ exports.isFileFolderExists= ~ error:", error);
  }
};

//Update file folders :
exports.updateFileFolders = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      name: Joi.string().required(),
      project_id: Joi.string().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    if (!(await this.isFileFolderExists(value, req.params.id))) {
      const data = await FileFolders.findByIdAndUpdate(
        req.params.id,
        {
          name: value.name,
          updatedBy: req.user._id
        },
        { new: true }
      );

      if (!data) {
        return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
      }

      return successResponse(
        res,
        statusCode.SUCCESS,
        messages.FOLDER_UPDATED,
        data
      );
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

//Soft Delete file folders :
exports.deleteFileFolders = async (req, res) => {
  try {
    const data = await FileFolders.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault()
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    // Delete folder files ..
    await FileFolders.findOneAndUpdate(
      {
        isDeleted: false,
        folder_id: new mongoose.Types.ObjectId(req.params.id)
      },
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault()
      },
      { new: true }
    );

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.FOLDER_DELETED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Update file folders :
exports.updateFileFoldersBookmark = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      isBookmark: Joi.boolean().required()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const data = await FileFolders.findByIdAndUpdate(
      req.params.id,
      {
        isBookmark: value.isBookmark,
        updatedBy: req.user._id
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.FOLDER_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get project all files  :
exports.getProjectAllFiles = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      search: Joi.string().allow("").optional(),
      _id: Joi.string().optional()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const [isAdmin, isManager, isAccManager] = await Promise.all([
      checkUserIsAdmin(req.user._id),
      checkLoginUserIsProjectManager(value.project_id, req.user._id),
      checkLoginUserIsProjectAccountManager(value.project_id, req.user._id)
    ]);

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value.project_id),
      ...(!isManager && !isAdmin && !isAccManager
        ? {
            $expr: {
              $and: [
                {
                  $or: [
                    {
                      $eq: [
                        "$createdBy",
                        new mongoose.Types.ObjectId(req.user._id)
                      ]
                    },
                    {
                      $in: [
                        new mongoose.Types.ObjectId(req.user._id),
                        "$subscribers"
                      ]
                    }
                  ]
                }
              ]
            }
          }
        : {})
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(["name", "file_type", "path"], value.search)
      };
    }

    let query = [
      {
        $match: matchQuery
      },
      {
        $sort: { [value?.sort]: value?.sortBy == "asc" ? 1 : -1 }
      }
    ];

    let data = await FileUploads.aggregate(query);

    return successResponse(res, 200, messages.LISTING, data, []);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get file details :
exports.getFileDetails = async (req, res) => {
  try {
    let matchQuery = {
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(req.params.fileId)
    };

    let query = [
      {
        $match: matchQuery
      },
      {
        $lookup: {
          from: "filefolders",
          let: { folder_id: "$folder_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$folder_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "folder"
        }
      },
      {
        $unwind: {
          path: "$folder",
          preserveNullAndEmptyArrays: true
        }
      },
      ...(await getCreatedUpdatedDeletedByQuery()),
      ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
      {
        $lookup: {
          from: "employees",
          let: { subscribers: "$subscribers" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$subscribers"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "subscribers"
        }
      },
      ...(await getClientQuery()),
      {
        $project: {
          _id: 1,
          name: 1,
          file_type: 1,
          path: 1,
          file_section: 1,
          folder_id: 1,
          task_id: 1,
          sub_task_id: 1,
          comments_id: 1,
          discussion_topic_id: 1,
          discussion_topic_details_id: 1,
          createdAt: 1,
          updatedAt: 1,
          folder: {
            _id: 1,
            name: 1
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1
          },
          updatedBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1
          },
          subscribers: {
            $map: {
              input: {
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$subscribers" },
                      { $ne: ["$subscribers", []] }
                    ]
                  },
                  then: "$subscribers",
                  else: []
                }
              },
              as: "subscriberId",
              in: {
                _id: "$$subscriberId._id",
                full_name: "$$subscriberId.full_name",
                emp_img: "$$subscriberId.emp_img"
              }
            }
          },
          ...(await getClientQuery(true))
        }
      }
    ];

    let data = await FileUploads.aggregate(query);

    return successResponse(res, 200, messages.LISTING, data, []);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.projectFilesUploads = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      folder_id: Joi.string().required(),
      attachments: Joi.array().min(1),
      subscribers: Joi.array().default([]),
      pms_clients: Joi.array().optional().default([])
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    let savedItemIds = [];
    for (let i = 0; i < value?.attachments?.length; i++) {
      const element = value?.attachments[i];

      const obj = {
        name: element.file_name,
        path: element.file_path,
        file_type: path.extname(element.file_name),
        updatedBy: req.user._id,
        project_id: value.project_id,
        folder_id: value.folder_id,
        file_section: "Files",
        subscribers: value.subscribers || [],
        pms_clients: value.pms_clients || [],
        createdBy: req.user._id,
        createdAt: configs.utcDefault(),
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req?.user))
      };
      // if new file upload..
      const newFile = new FileUploads(obj);
      await newFile.save();
      savedItemIds = [
        ...savedItemIds,
        new mongoose.Types.ObjectId(newFile._id)
      ];
    }

    // mail for subscribers..
    if (
      (value?.subscribers && value?.subscribers?.length > 0) ||
      (value?.pms_clients && value?.pms_clients?.length > 0)
    ) {
      await subscribersMailForNewFileUploaded(
        savedItemIds,
        [],
        [],
        decodedCompanyId
      );
    }

    return successResponse(res, 200, messages.FILE_CREATED, savedItemIds, []);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.projectFileRename = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      file_id: Joi.string().required(),
      name: Joi.string().required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const updatedData = await FileUploads.findByIdAndUpdate(
      new mongoose.Types.ObjectId(value.file_id),
      {
        name: value.name,
        updatedBy: req.user._id,
        updatedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, true))
      }
    );

    return successResponse(
      res,
      200,
      messages.FILE_NAME_UPDATED,
      updatedData,
      []
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.projectFileUpdateSubscribers = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      file_id: Joi.string().required(),
      subscribers: Joi.array().optional(),
      pms_clients: Joi.array().optional()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const file = await FileUploads.findById(
      new mongoose.Types.ObjectId(value.file_id)
    );
    const updatedData = await FileUploads.findByIdAndUpdate(
      new mongoose.Types.ObjectId(value.file_id),
      {
        ...(value?.subscribers && {
          subscribers:
            value.subscribers.length > 0
              ? value.subscribers.map((s) => new mongoose.Types.ObjectId(s))
              : value.subscribers
        }),
        ...(value?.pms_clients && {
          pms_clients:
            value.pms_clients.length > 0
              ? value.pms_clients.map((s) => new mongoose.Types.ObjectId(s))
              : value.pms_clients
        }),
        updatedBy: req.user._id,
        updatedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, true))
      }
    );

    let subscribersData = getArrayChanges(
      file?.subscribers.map((a) => a.toString()),
      value?.subscribers
    );

    let clientsData = getArrayChanges(
      file?.pms_clients.map((a) => a.toString()),
      value?.pms_clients
    );

    if (subscribersData.added.length > 0 || clientsData.added.length > 0) {
      // mail for added subscribers..
      await subscribersMailForNewFileUploaded(
        [new mongoose.Types.ObjectId(value.file_id)],
        subscribersData.added.map((s) => s.toString()),
        clientsData.added.map((c) => c.toString()),
        decodedCompanyId
      );
    }
    return successResponse(
      res,
      200,
      messages.FILE_SUBSCRIBER_UPDATED,
      updatedData,
      []
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// delete file
exports.projectFileDelete = async (req, res) => {
  try {
    await FileUploads.findByIdAndUpdate(
      new mongoose.Types.ObjectId(req.params.id),
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req?.user, false, true))
      }
    );

    return successResponse(res, 200, messages.FILE_DELETED, {}, []);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// get query for file access ..
exports.queryForFileAccess = async () => {
  try {
    return [
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "task"
        }
      },
      {
        $unwind: {
          path: "$task",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "comments",
          let: { comments_id: "$comments_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$comments_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "comments"
        }
      },
      {
        $unwind: {
          path: "$comments",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "discussionstopics",
          let: { discussion_topic_id: "$discussion_topic_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$discussion_topic_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "discussion_topic"
        }
      },
      {
        $unwind: {
          path: "$discussion_topic",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "discussionstopicsdetails",
          let: {
            discussion_topic_details_id: "$discussion_topic_details_id"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$discussion_topic_details_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "discussion_topic_details"
        }
      },
      {
        $unwind: {
          path: "$discussion_topic_details",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projecttaskbugs",
          let: { bugs_id: "$bugs_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$bugs_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "bugs"
        }
      },
      {
        $unwind: {
          path: "$bugs",
          preserveNullAndEmptyArrays: true
        }
      }
    ];
  } catch (error) {
    console.log("🚀 ~ exports.queryForFileAccess= ~ error:", error);
  }
};

exports.conditionForFileAccess = async (loginUserId) => {
  try {
    return [
      // For file
      ...(await this.fileAccessCondition(
        loginUserId,
        "createdBy",
        "subscribers",
        "pms_clients"
      )),
      // For task
      ...(await this.fileAccessCondition(
        loginUserId,
        "task.createdBy",
        null,
        "task.pms_clients",
        "task.assignees"
      )),
      // for comments..
      ...(await this.fileAccessCondition(
        loginUserId,
        "comments.createdBy",
        null,
        null,
        null,
        "comments.taggedUsers"
      )),
      // for discussion topic...
      ...(await this.fileAccessCondition(
        loginUserId,
        "discussion_topic.createdBy",
        "discussion_topic.subscribers",
        "discussion_topic.pms_clients"
      )),
      // For discussion topic details
      ...(await this.fileAccessCondition(
        loginUserId,
        "discussion_topic_details.createdBy",
        null,
        null,
        null,
        "discussion_topic_details.taggedUsers"
      )),
      // For bugs...
      ...(await this.fileAccessCondition(
        loginUserId,
        "bugs.createdBy",
        null,
        null,
        "bugs.assignees"
      ))
    ];
  } catch (error) {
    console.log("🚀 ~ exports.conditionForFileAccess= ~ error:---", error);
  }
};

exports.fileAccessCondition = async (
  loginUserId,
  createdBy = null,
  subscribers = null,
  pms_clients = null,
  assignees = null,
  taggedUsers = null
) => {
  try {
    let data = [
      // For file
      {
        $eq: [`$${createdBy}`, new mongoose.Types.ObjectId(loginUserId)]
      }
    ];
    if (subscribers) {
      data = [
        ...data,
        {
          $in: [
            new mongoose.Types.ObjectId(loginUserId),
            {
              $cond: {
                if: {
                  $and: [
                    { $isArray: `$${subscribers}` },
                    { $ne: [`$${subscribers}`, []] }
                  ]
                },
                then: `$${subscribers}`,
                else: []
              }
            }
          ]
        }
      ];
    }
    if (pms_clients) {
      data = [
        ...data,
        {
          $in: [
            new mongoose.Types.ObjectId(loginUserId),
            {
              $cond: {
                if: {
                  $and: [
                    { $isArray: `$${pms_clients}` },
                    { $ne: [`$${pms_clients}`, []] }
                  ]
                },
                then: `$${pms_clients}`,
                else: []
              }
            }
          ]
        }
      ];
    }
    if (assignees) {
      data = [
        ...data,
        {
          $in: [
            new mongoose.Types.ObjectId(loginUserId),
            {
              $cond: {
                if: {
                  $and: [
                    { $isArray: `$${assignees}` },
                    { $ne: [`$${assignees}`, []] }
                  ]
                },
                then: `$${assignees}`,
                else: []
              }
            }
          ]
        }
      ];
    }
    if (taggedUsers) {
      data = [
        ...data,
        {
          $in: [
            new mongoose.Types.ObjectId(loginUserId),
            {
              $cond: {
                if: {
                  $and: [
                    { $isArray: `$${taggedUsers}` },
                    { $ne: [`$${taggedUsers}`, []] }
                  ]
                },
                then: `$${taggedUsers}`,
                else: []
              }
            }
          ]
        }
      ];
    }
    return data;
  } catch (error) {
    console.log("🚀 ~ error --------:", error);
  }
};
