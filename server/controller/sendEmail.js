const mongoose = require("mongoose");
const ProjectMainTasks = mongoose.model("projectmaintasks");
const ProjectTasks = mongoose.model("projecttasks");
const CommentsModel = mongoose.model("Comments");
const BugsCommentsModel = mongoose.model("bugscomments");
const NoteModel = mongoose.model("notes_pms");
const NoteCommentsModel = mongoose.model("NotesComments");
const FileUploads = mongoose.model("fileuploads");
const DiscussionsTopics = mongoose.model("discussionstopics");
const DiscussionsTopicDetails = mongoose.model("discussionstopicsdetails");
const ProjectTaskBugs = mongoose.model("projecttaskbugs");
const Employees = mongoose.model("employees");
const PMSClient = mongoose.model("pmsclients");
const {
  mainTaskSubscriberMail,
  deleteMainTaskSubscriberMail
} = require("../template/mainTask");
const { assigneesMail } = require("../template/tasks");
const { MailForTaskNewComments } = require("../template/comments");
const { MailForBugNewComments } = require("../template/bugcomments");
const { noteSubscriberMail } = require("../template/note");
const { mailForNoteComments } = require("../template/noteComments");
const { newFileUploadSubscriberMail } = require("../template/fileUploaded");
const { topicSubscriberMail } = require("../template/discussionTopic");
const { MailForTopicComments } = require("../template/discussionTopicDetails");
const { bugAssigneesMail } = require("../template/projectBugs");
const {
  getCreatedUpdatedDeletedByQuery,
  getClientQuery
} = require("../helpers/common");

// Add new list
exports.subscribersMail = async (
  id,
  newAddedSubscriber = [],
  newAddedClients = [],
  companyId
) => {
  try {
    let matchQuery = {
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(id)
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { managerId: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$managerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { subscriberIds: "$subscribers" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$subscriberIds"] },
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
      ...(await getCreatedUpdatedDeletedByQuery()),
      ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
      {
        $lookup: {
          from: "projectworkflows",
          let: { workflowId: "$project.workFlow" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$workflowId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "workFlow"
        }
      },
      {
        $unwind: {
          path: "$workFlow",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "workflowstatuses",
          let: { taskStatus: "$task_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$taskStatus"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "workFlowStatus"
        }
      },
      {
        $unwind: {
          path: "$workFlowStatus",
          preserveNullAndEmptyArrays: true
        }
      },
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          status: 1,
          workFlow: {
            _id: 1,
            project_workflow: 1
          },
          workFlowStatus: {
            _id: 1,
            title: 1
          },
          manager: {
            _id: "$manager._id",
            full_name: "$manager.full_name",
            first_name: "$manager.first_name",
            last_name: "$manager.last_name",
            email: "$manager.email",
            emp_img: "$manager.emp_img"
          },
          isPrivateList: 1,
          project: "$project",
          createdBy: {
            _id: "$createdBy._id",
            full_name: "$createdBy.full_name",
            first_name: "$createdBy.first_name",
            last_name: "$createdBy.last_name",
            email: "$createdBy.email",
            emp_img: "$createdBy.emp_img",
            client_img: "$createdBy.client_img"
          },
          updatedBy: {
            _id: "$updatedBy._id",
            full_name: "$updatedBy.full_name",
            first_name: "$updatedBy.first_name",
            last_name: "$updatedBy.last_name",
            email: "$updatedBy.email",
            emp_img: "$updatedBy.emp_img",
            client_img: "$updatedBy.client_img"
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
                // _id: "$$subscriberId._id",
                // name: "$$subscriberId.full_name",
                // email: "$$subscriberId.email",
                $cond: {
                  if: {
                    ...(newAddedSubscriber.length > 0
                      ? {
                          $in: [
                            "$$subscriberId._id",
                            newAddedSubscriber.map(
                              (n) => new mongoose.Types.ObjectId(n)
                            )
                          ]
                        }
                      : {})
                  },
                  then: {
                    _id: "$$subscriberId._id",
                    name: "$$subscriberId.full_name",
                    email: "$$subscriberId.email",
                    emp_img: "$$subscriberId.emp_img"
                  },
                  else: null // Or any other value you prefer for non-matching IDs
                }
              }
            }
          },
          ...(await getClientQuery(true, newAddedClients))
        }
      }
    ];

    const data = await ProjectMainTasks.aggregate(mainQuery);
    await mainTaskSubscriberMail(data[0], companyId);
    return data;
  } catch (e) {
    console.log("🚀 ~ exports.subscribersMail= ~ e:", e);
    return e;
  }
};

// Add new task
exports.sendmailToAssignees = async (id, newAddedAssignees = [], companyId) => {
  try {
    const data = await this.taskData(id, newAddedAssignees); // await ProjectTasks.aggregate(mainQuery);
    await assigneesMail(data, newAddedAssignees, companyId);
    return;
  } catch (e) {
    console.log("🚀 ~ exports.sendmailToAssignees= ~ e:", e)
    return e;
  }
};

exports.taskData = async (id, newAddedAssignees = []) => {
  try {
    let matchQuery = {
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(id)
    };
    const mainQuery = [
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "mainTask"
        }
      },
      {
        $unwind: {
          path: "$mainTask",
          preserveNullAndEmptyArrays: true
        }
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },

      ...(await getCreatedUpdatedDeletedByQuery()),
      ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
      {
        $lookup: {
          from: "employees",
          let: { managerId: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$managerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "task_status"
        }
      },
      {
        $unwind: {
          path: "$task_status",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "tasklabels",
          let: { task_labels: "$task_labels" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$task_labels"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "taskLabels"
        }
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
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "assignees"
        }
      },

      ...(await getClientQuery()),

      {
        $lookup: {
          from: "fileuploads",
          let: { taskId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$task_id", "$$taskId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "attachments"
        }
      },
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          taskId: 1,
          title: 1,
          descriptions: 1,
          estimated_hours: 1,
          estimated_minutes: 1,
          project: 1,
          manager: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            emp_img: 1
          },
          start_date: 1,
          due_date: 1,
          descriptions: 1,
          estimated_hours: 1,
          estimated_minutes: 1,
          task_status: {
            _id: 1,
            title: 1
          },
          task_status_history: 1,
          createdBy: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            emp_img: 1,
            client_img: 1
          },
          updatedBy: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            emp_img: 1,
            client_img: 1
          },
          mainTask: {
            _id: 1,
            title: 1,
            isPrivateList: 1
          },
          taskLabels: 1,
          assignees: {
            $map: {
              input: {
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$assignees" },
                      { $ne: ["$assignees", []] }
                    ]
                  },
                  then: "$assignees",
                  else: []
                }
              },
              as: "assigneeId",
              in: {
                _id: "$$assigneeId._id",
                full_name: "$$assigneeId.full_name",
                first_name: "$$assigneeId.first_name",
                last_name: "$$assigneeId.last_name",
                email: "$$assigneeId.email",
                emp_img: "$$assigneeId.emp_img"
              }
            }
          },
          ...(await getClientQuery(true)),
          attachments: 1
        }
      }
    ];
    const data = await ProjectTasks.aggregate(mainQuery);
    return data[0];
  } catch (e) {
    console.log("🚀 ~ exports.taskData= ~ e:", e);
    return e;
  }
};

// Add task comments
exports.sendmailForNewComments = async (id, companyId) => {
  try {
    let matchQuery = {
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(id)
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
          from: "projectmaintasks",
          let: { mainTaskId: "$task.main_task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$mainTaskId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "mainTask"
        }
      },
      {
        $unwind: {
          path: "$mainTask",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "projects",
          let: { projectId: "$task.project_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$projectId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { managerId: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$managerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
      },
      ...(await getCreatedUpdatedDeletedByQuery()),
      // {
      //   $lookup: {
      //     from: "employees",
      //     localField: "createdBy",
      //     foreignField: "_id",
      //     as: "createdBy",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$createdBy",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },

      {
        $lookup: {
          from: "employees",
          let: { assigneesIds: "$task.assignees" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$assigneesIds"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "assignees"
        }
      },
      {
        $addFields: {
          pms_clients: "$mainTask.pms_clients"
        }
      },
      ...(await getClientQuery()),
      {
        $addFields: {
          ...(await getClientQuery(true))
        }
      },
      { $match: matchQuery }
    ];
    const data = await CommentsModel.aggregate(mainQuery);

    if (data[0]?.taggedUsers && data[0].taggedUsers.length > 0) {
      const taggedEmp = await Employees.find({
        _id: { $in: data[0].taggedUsers }
      }).lean();

      const taggedClient = await PMSClient.find({
        _id: { $in: data[0].taggedUsers }
      }).lean();

      data[0].taggedUsers = [...taggedEmp, ...taggedClient];
    } else {
      data[0].taggedUsers = [];
    }

    await MailForTaskNewComments(data[0], companyId);
    return;
  } catch (e) {
    console.log("🚀 ~ exports.sendmailForNewComments= ~ e:", e)
    return e;
  }
};

// Add bug comments
exports.sendmailForNewBugComments = async (id, companyId) => {
  try {
    let matchQuery = {
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(id)
    };
    const mainQuery = [
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "bug"
        }
      },
      {
        $unwind: {
          path: "$bug",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "projecttasks",
          let: { taskId: "$bug.task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$taskId"] },
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
          from: "projects",
          let: { projectId: "$bug.project_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$projectId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { managerId: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$managerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy"
        }
      },
      {
        $unwind: {
          path: "$createdBy",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { bugsIds: "$bug.assignees" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$bugsIds"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "assignees"
        }
      },
      { $match: matchQuery }
    ];
    const data = await BugsCommentsModel.aggregate(mainQuery);

    const taggedEmp = await Employees.find({
      _id: { $in: data[0].taggedUsers }
    }).lean();
    const taggedClient = await PMSClient.find({
      _id: { $in: data[0].taggedUsers }
    }).lean();
    data[0].taggedUsers = [...taggedEmp, ...taggedClient];

    await MailForBugNewComments(data[0], companyId);
    return;
  } catch (e) {
    console.log("🚀 ~ exports.sendmailForNewBugComments= ~ e:", e)
    return e;
  }
};

exports.noteSubscribersMail = async (
  id,
  newAddedSubscriber = [],
  newAddedClients = [],
  companyId
) => {
  try {
    let matchQuery = {
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(id)
    };
    const mainQuery = [
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { managerId: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$managerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { subscribersIds: "$subscribers" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$subscribersIds"] },
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
      ...(await getCreatedUpdatedDeletedByQuery()),

      {
        $lookup: {
          from: "notebooks",
          let: { notebookId: "$noteBook_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$notebookId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "notebook"
        }
      },
      {
        $unwind: {
          path: "$notebook",
          preserveNullAndEmptyArrays: true
        }
      },
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          title: 1,
          notebook: {
            _id: 1,
            title: 1
          },
          manager: {
            _id: "$manager._id",
            full_name: "$manager.full_name",
            first_name: "$manager.first_name",
            last_name: "$manager.last_name",
            email: "$manager.email",
            emp_img: "$manager.emp_img"
          },
          isPrivate: 1,
          project: "$project",
          createdBy: {
            _id: "$createdBy._id",
            full_name: "$createdBy.full_name",
            first_name: "$createdBy.first_name",
            last_name: "$createdBy.last_name",
            email: "$createdBy.email",
            emp_img: "$createdBy.emp_img",
            client_img: "$createdBy.client_img"
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
                // _id: "$$subscriberId._id",
                // name: "$$subscriberId.full_name",
                // email: "$$subscriberId.email",
                $cond: {
                  if: {
                    ...(newAddedSubscriber.length > 0
                      ? {
                          $in: [
                            "$$subscriberId._id",
                            newAddedSubscriber.map(
                              (n) => new mongoose.Types.ObjectId(n)
                            )
                          ]
                        }
                      : { $eq: ["$$subscriberId.isDeleted", false] })
                  },
                  then: {
                    _id: "$$subscriberId._id",
                    name: "$$subscriberId.full_name",
                    first_name: "$subscriberId.first_name",
                    last_name: "$subscriberId.last_name",
                    email: "$$subscriberId.email",
                    emp_img: "$$subscriberId.emp_img"
                  },
                  else: null // Or any other value you prefer for non-matching IDs
                }
              }
            }
          },
          ...(await getClientQuery(true, newAddedClients))
        }
      }
    ];
    const data = await NoteModel.aggregate(mainQuery);
    await noteSubscriberMail(data[0], companyId);
    return data;
  } catch (e) {
    console.log("🚀 ~ exports.noteSubscribersMail= ~ e:", e);
    return e;
  }
};

// Add task comments
exports.sendmailNoteComments = async (id, companyId) => {
  try {
    let matchQuery = {
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(id)
    };
    const mainQuery = [
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "note"
        }
      },
      {
        $unwind: {
          path: "$note",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "notebooks",
          let: { notebookId: "$note.noteBook_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$notebookId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "notebook"
        }
      },
      {
        $unwind: {
          path: "$notebook",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "projects",
          let: { project_id: "$note.project_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { managerId: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$managerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy"
        }
      },
      {
        $unwind: {
          path: "$createdBy",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { subscribersIds: "$note.subscribers" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$subscribersIds"] },
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

      // {
      //   $lookup: {
      //     from: "employees",
      //     let: { taggedUsersIds: "$taggedUsers" },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $and: [
      //               { $in: ["$_id", "$$taggedUsersIds"] },
      //               { $eq: ["$isDeleted", false] },
      //               { $eq: ["$isSoftDeleted", false] },
      //               { $eq: ["$isActivate", true] },
      //             ],
      //           },
      //         },
      //       },
      //     ],
      //     as: "taggedUsers",
      //   },
      // },
      { $match: matchQuery }
    ];
    const data = await NoteCommentsModel.aggregate(mainQuery);

    const taggedEmp = await Employees.find({
      _id: { $in: data[0].taggedUsers }
    }).lean();
    const taggedClient = await PMSClient.find({
      _id: { $in: data[0].taggedUsers }
    }).lean();
    data[0].taggedUsers = [...taggedEmp, ...taggedClient];

    await mailForNoteComments(data[0], companyId);
    return;
  } catch (e) {
    console.log("🚀 ~ exports.sendmailNoteComments= ~ e:", e);
    return e;
  }
};

// Delete main task...
exports.deleteMainTaskManagerMail = async (id, companyId) => {
  try {
    let matchQuery = {
      _id: new mongoose.Types.ObjectId(id)
    };
    const mainQuery = [
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { managerId: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$managerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
      },
      ...(await getCreatedUpdatedDeletedByQuery("deletedBy")),
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          manager: {
            _id: "$manager._id",
            full_name: "$manager.full_name",
            first_name: "$manager.first_name",
            last_name: "$manager.last_name",
            email: "$manager.email",
            emp_img: "$manager.emp_img"
          },
          isPrivate: 1,
          project: "$project",
          deletedBy: {
            _id: "$deletedBy._id",
            full_name: "$deletedBy.full_name",
            first_name: "$deletedBy.first_name",
            last_name: "$deletedBy.last_name",
            email: "$deletedBy.email",
            emp_img: "$deletedBy.emp_img",
            client_img: "$deletedBy.client_img"
          }
        }
      }
    ];
    const data = await ProjectMainTasks.aggregate(mainQuery);
    await deleteMainTaskSubscriberMail(data[0], companyId);
    return data;
  } catch (e) {
    console.log("🚀 ~ exports.noteSubscribersMail= ~ e:", e);
    return e;
  }
};

// Add file uploaded list
exports.subscribersMailForNewFileUploaded = async (
  fileIds,
  updatedSub = [],
  newAddedClients = [],
  companyId
) => {
  try {
    let matchQuery = {
      isDeleted: false,
      _id: { $in: fileIds }
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { managerId: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$managerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
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
      {
        $lookup: {
          from: "employees",
          let: { subscriberIds: "$subscribers" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$subscriberIds"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "subscribers"
        }
      },
      ...(await getClientQuery()),
      ...(await getCreatedUpdatedDeletedByQuery()),
      ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          path: 1,
          name: 1,
          folder: {
            _id: 1,
            name: 1
          },
          manager: {
            _id: "$manager._id",
            full_name: "$manager.full_name",
            first_name: "$manager.first_name",
            last_name: "$manager.last_name",
            email: "$manager.email",
            emp_img: "$manager.emp_img"
          },
          project: {
            _id: 1,
            title: 1,
            projectId: 1,
            color: 1
          },
          createdBy: {
            _id: "$createdBy._id",
            full_name: "$createdBy.full_name",
            first_name: "$createdBy.first_name",
            last_name: "$createdBy.last_name",
            email: "$createdBy.email",
            emp_img: "$createdBy.emp_img"
          },
          updatedBy: {
            _id: "$updatedBy._id",
            full_name: "$updatedBy.full_name",
            first_name: "$updatedBy.first_name",
            last_name: "$updatedBy.last_name",
            email: "$updatedBy.email",
            emp_img: "$updatedBy.emp_img"
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
                name: "$$subscriberId.full_name",
                first_name: "$subscriberId.first_name",
                last_name: "$subscriberId.last_name",
                email: "$$subscriberId.email",
                emp_img: "$$subscriberId.emp_img"
              }
            }
          },
          ...(await getClientQuery(true, newAddedClients))
        }
      },
      {
        $group: {
          _id: null,
          createdBy: { $first: "$createdBy" },
          updatedBy: { $first: "$updatedBy" },
          manager: { $first: "$manager" },
          folder: { $first: "$folder" },
          project: { $first: "$project" },
          subscribers: { $first: "$subscribers" },
          pms_clients: { $first: "$pms_clients" },
          attachments: {
            $push: {
              path: "$path",
              name: "$name"
            }
          }
        }
      }
    ];

    const data = await FileUploads.aggregate(mainQuery);
    await newFileUploadSubscriberMail(data[0] || {}, updatedSub, companyId);
    return data;
  } catch (e) {
    console.log("🚀 ~ exports.subscribersMail= ~ e:", e);
    return e;
  }
};

// Topic subscribers mail...
exports.discussionsTopicSubscribersMail = async (
  id,
  newAddedSubscriber = [],
  newAddedClients = [],
  companyId
) => {
  try {
    let matchQuery = {
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(id)
    };
    const mainQuery = [
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { managerId: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$managerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { subscribersIds: "$subscribers" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$subscribersIds"] },
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
      ...(await getCreatedUpdatedDeletedByQuery()),
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          title: 1,
          manager: {
            _id: "$manager._id",
            full_name: "$manager.full_name",
            email: "$manager.email",
            emp_img: "$manager.emp_img",
            first_name: "$manager.first_name",
            last_name: "$manager.last_name"
          },
          isPrivate: 1,
          project: "$project",
          createdBy: {
            _id: "$createdBy._id",
            full_name: "$createdBy.full_name",
            first_name: "$createdBy.first_name",
            last_name: "$createdBy.last_name",
            email: "$createdBy.email",
            emp_img: "$createdBy.emp_img"
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
                // _id: "$$subscriberId._id",
                // name: "$$subscriberId.full_name",
                // email: "$$subscriberId.email",
                $cond: {
                  if: {
                    ...(newAddedSubscriber.length > 0
                      ? {
                          $in: [
                            "$$subscriberId._id",
                            newAddedSubscriber.map(
                              (n) => new mongoose.Types.ObjectId(n)
                            )
                          ]
                        }
                      : { $eq: ["$$subscriberId.isDeleted", false] })
                  },
                  then: {
                    _id: "$$subscriberId._id",
                    first_name: "$$subscriberId.first_name",
                    last_name: "$$subscriberId.last_name",
                    name: "$$subscriberId.full_name",
                    email: "$$subscriberId.email",
                    emp_img: "$$subscriberId.emp_img"
                  },
                  else: null // Or any other value you prefer for non-matching IDs
                }
              }
            }
          },
          ...(await getClientQuery(true, newAddedClients))
        }
      }
    ];

    const data = await DiscussionsTopics.aggregate(mainQuery);

    await topicSubscriberMail(data[0], companyId);
    return data;
  } catch (e) {
    console.log("🚀 ~ exports.discussionsTopicSubscribersMail= ~ e:", e);
    return e;
  }
};

// Tagged users in topic details...
exports.sendmailForNewCommentsInTopic = async (id, companyId) => {
  try {
    let matchQuery = {
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(id)
    };
    const mainQuery = [
      {
        $lookup: {
          from: "discussionstopics",
          let: { topicId: "$topic_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$topicId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "topic"
        }
      },
      {
        $unwind: {
          path: "$topic",
          preserveNullAndEmptyArrays: true
        }
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "employees",
          let: { managerId: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$managerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
      },
      ...(await getCreatedUpdatedDeletedByQuery()),
      // {
      //   $lookup: {
      //     from: "employees",
      //     let: { taggedUsersIds: "$taggedUsers" },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $and: [
      //               { $in: ["$_id", "$$taggedUsersIds"] },
      //               { $eq: ["$isDeleted", false] },
      //               { $eq: ["$isSoftDeleted", false] },
      //               { $eq: ["$isActivate", true] },
      //             ],
      //           },
      //         },
      //       },
      //     ],
      //     as: "taggedUsers",
      //   },
      // },

      { $match: matchQuery }
    ];
    const data = await DiscussionsTopicDetails.aggregate(mainQuery);

    const taggedEmp = await Employees.find({
      _id: { $in: data[0].taggedUsers }
    }).lean();
    const taggedClient = await PMSClient.find({
      _id: { $in: data[0].taggedUsers }
    }).lean();
    data[0].taggedUsers = [...taggedEmp, ...taggedClient];

    await MailForTopicComments(data[0], companyId);
    return;
  } catch (e) {
    console.log("🚀 ~ exports.sendmailForNewCommentsInTopic= ~ e:", e)
    return e;
  }
};

// bugs mail...
exports.mailForBugAssignees = async (id, newAddedAssignees = [], companyId) => {
  try {
    const data = await this.getProjectBugsData(id);
    await bugAssigneesMail(data, newAddedAssignees, companyId);
    return data;
  } catch (e) {
    console.log("🚀 ~ exports.mailForBugAssignees= ~ e:", e);
    return e;
  }
};

// bugs data
exports.getProjectBugsData = async (id) => {
  try {
    let matchQuery = {
      isDeleted: false,
      _id: new mongoose.Types.ObjectId(id)
    };
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
          from: "projectsubtasks",
          let: { sub_task_id: "$sub_task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$sub_task_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "subTask"
        }
      },
      {
        $unwind: {
          path: "$subTask",
          preserveNullAndEmptyArrays: true
        }
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "project"
        }
      },
      {
        $unwind: {
          path: "$project",
          preserveNullAndEmptyArrays: true
        }
      },
      ...(await getCreatedUpdatedDeletedByQuery()),
      ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
      {
        $lookup: {
          from: "employees",
          let: { managerId: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$managerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "manager"
        }
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "bugsworkflowstatuses",
          let: { bug_status: "$bug_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$bug_status"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "bug_status"
        }
      },
      {
        $unwind: {
          path: "$bug_status",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "tasklabels",
          let: { bug_labels: "$bug_labels" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$bug_labels"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "bugLabels"
        }
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
                    { $eq: ["$isActivate", true] }
                  ]
                }
              }
            }
          ],
          as: "assignees"
        }
      },
      ...(await getClientQuery()),
      {
        $lookup: {
          from: "fileuploads",
          let: { bugId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$bugs_id", "$$bugId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "attachments"
        }
      },
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          bugId: 1,
          title: 1,
          descriptions: 1,
          estimated_hours: 1,
          estimated_minutes: 1,
          project: 1,
          manager: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            emp_img: 1
          },
          start_date: 1,
          due_date: 1,
          descriptions: 1,
          estimated_hours: 1,
          estimated_minutes: 1,
          bug_status: {
            _id: 1,
            title: 1
          },
          bug_status_history: 1,
          createdBy: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            emp_img: 1,
            client_img: 1
          },
          updatedBy: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            emp_img: 1,
            client_img: 1
          },
          task: {
            _id: 1,
            title: 1
          },
          subTask: {
            _id: 1,
            title: 1
          },
          bugLabels: 1,
          assignees: {
            $map: {
              input: {
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$assignees" },
                      { $ne: ["$assignees", []] }
                    ]
                  },
                  then: "$assignees",
                  else: []
                }
              },
              as: "assigneeId",
              in: {
                _id: "$$assigneeId._id",
                full_name: "$$assigneeId.full_name",
                first_name: "$$assigneeId.first_name",
                last_name: "$$assigneeId.last_name",
                email: "$$assigneeId.email",
                emp_img: "$$assigneeId.emp_img"
              }
            }
          },
          ...(await getClientQuery(true)),
          attachments: 1
        }
      }
    ];
    const data = await ProjectTaskBugs.aggregate(mainQuery);
    return data[0];
  } catch (e) {
    console.log("🚀 ~ exports.getProjectBugsData= ~ e:", e);
    return e;
  }
};
