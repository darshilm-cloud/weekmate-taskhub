const mongoose = require("mongoose");
const moment = require("moment");
const { DEFAULT_DATA } = require("../helpers/constant");
const {
  projectDeadlineMissedMail,
  taskDeadlineMissedMail,
} = require("../template/deadlineMissed");
const Project = mongoose.model("projects");
const Complaints = mongoose.model("complaints");
const {
  getCreatedUpdatedDeletedByQuery,
} = require("../helpers/common");
const { newReminderMailforStatusUpdate } = require("../template/reminderMailforComplaintStatusUpdate");

exports.scheduleCronForProjectMissedDeadline = async () => {
  try {
    let yesterday = moment().utc().subtract(1, "day").startOf("day").toDate();
    let today = moment().utc().startOf("day").toDate();

    let matchQuery = {
      isDeleted: false,
      "project_status.title": {
        $eq: DEFAULT_DATA.PROJECT_STATUS.ACTIVE,
      },
      end_date: {
        $gte: yesterday,
        $lt: today,
      },
    };

    const mainQuery = [
      {
        $lookup: {
          from: "projecttechs",
          let: { technology: "$technology" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$technology"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "technology",
        },
      },
      {
        $lookup: {
          from: "projecttypes",
          let: { project_type: "$project_type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_type"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "project_type",
        },
      },
      {
        $unwind: {
          path: "$project_type",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "projectstatuses",
          let: { project_status: "$project_status" },
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

      { $match: matchQuery },
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { manager: "$manager.reporting_manager" },
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
          as: "manager_of_manager",
        },
      },
      {
        $unwind: {
          path: "$manager_of_manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          projectId: 1,
          start_date: 1,
          end_date: 1,
          technology: 1,
          project_type: 1,
          manager: {
            _id: 1,
            first_name: 1,
            last_name: 1,
            full_name: 1,
            email: 1,
          },
          manager_of_manager: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
          },
        },
      },
    ];

    let data = await Project.aggregate(mainQuery);

    for (let i = 0; i < data.length; i++) {
      const element = data[i];
      await projectDeadlineMissedMail(element);
    }
    return;
  } catch (error) {
    console.log(
      "🚀 ~ exports.scheduleCronForProjectMissedDeadline= ~ error:",
      error
    );
  }
};

exports.scheduleCronForTaskMissedDeadline = async () => {
  try {
    let yesterday = moment().subtract(1, "day").startOf("day").toDate();
    let today = moment().startOf("day").toDate();

    const mainQuery = [
      {
        $lookup: {
          from: "projectstatuses",
          let: { project_status: "$project_status" },
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
      {
        $match: {
          isDeleted: false,
          "project_status.title": {
            $eq: DEFAULT_DATA.PROJECT_STATUS.ACTIVE,
          },
        },
      },
      {
        $lookup: {
          from: "projecttasks",
          let: { projectId: "$_id" },
          pipeline: [
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
                as: "task_status",
              },
            },
            {
              $unwind: {
                path: "$task_status",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$project_id", "$$projectId"] },
                    { $eq: ["$isDeleted", false] },
                    {
                      $ne: [
                        "$task_status.title",
                        DEFAULT_DATA.WORKFLOW_STATUS.DONE,
                      ],
                    },
                    { $gte: ["$due_date", yesterday] },
                    { $lt: ["$due_date", today] },
                  ],
                },
              },
            },
          ],
          as: "tasks",
        },
      },
      //   {
      //     $group: {
      //       _id: "$manager",
      //       projects: {
      //         $push: "$$ROOT",
      //       },
      //     },
      //   },
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
      {
        $lookup: {
          from: "employees",
          let: { manager: "$manager.reporting_manager" },
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
          as: "manager_of_manager",
        },
      },
      {
        $unwind: {
          path: "$manager_of_manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $expr: {
            $and: [{ $gt: [{ $size: "$tasks" }, 0] }],
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          projectId: 1,
          start_date: 1,
          end_date: 1,
          technology: 1,
          project_type: 1,
          tasks: 1,
          manager: {
            _id: 1,
            first_name: 1,
            last_name: 1,
            full_name: 1,
            email: 1,
          },
          manager_of_manager: {
            _id: 1,
            first_name: 1,
            last_name: 1,
            full_name: 1,
            email: 1,
          },
        },
      },
    ];

    let data = await Project.aggregate(mainQuery);

    for (let i = 0; i < data.length; i++) {
      const element = data[i];
      await taskDeadlineMissedMail(element);
    }
    return;
  } catch (error) {
    console.log(
      "🚀 ~ exports.scheduleCronForTaskMissedDeadline= ~ error:",
      error
    );
  }
};

exports.scheduleCronTosendMailtoAllPMandAMfornotUpdatingStatus = async () => {
  try {
    // Function to calculate working days before a given date
    const calculateWorkingDaysBefore = (startDate, days) => {
      let count = 0;
      let currentDate = moment(startDate);

      while (count < days) {
        currentDate.add(1, 'days');
        // Check if the day is a working day (Monday to Friday)
        if (currentDate.isoWeekday() < 6) { // 6 means Saturday, 7 means Sunday
          count++;
        }
      }

      return currentDate;
    };

    let data = await Complaints.aggregate([
      {
        $match: {
          isDeleted: false,
        }
      },
      {
        $lookup: {
          from: "complaints_status",
          let: { complaintId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$complaint_id", "$$complaintId"] },
                    { $eq: ["$isDeleted", false] },
                    {
                      $not: {
                        $in: ["$status", ["client_review", "resolved", "customer_lost"]]
                      }
                    },
                  ],
                },
              },
            },
          ],
          as: "status_data",
        },
      },
      {
        $unwind: {
          path: "$status_data",
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
          from: "projecttechs",
          let: { technology: "$project.technology" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$technology"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "technology",
        },
      },
      {
        $unwind: {
          path: "$technology",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { manager: "$project.manager" },
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
      {
        $lookup: {
          from: "employees",
          let: { acc_manager: "$project.acc_manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$acc_manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "acc_manager",
        },
      },
      {
        $unwind: {
          path: "$acc_manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { manager: "$project.manager.reporting_manager" },
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
          as: "managers_rm",
        },
      },
      {
        $unwind: {
          path: "$managers_rm",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { acc_manager: "$project.acc_manager.reporting_manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$acc_manager"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                  ],
                },
              },
            },
          ],
          as: "acc_managers_rm",
        },
      },
      {
        $unwind: {
          path: "$acc_managers_rm",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(await getCreatedUpdatedDeletedByQuery()),
      {
        $project: {
          _id: 1,
          project: {
            _id: 1,
            title: 1,
            manager: 1,
            acc_manager: 1,
            technology: 1,
          },
          status_data: {
            _id: 1,
            status: 1
          },
          technology: {
            _id: 1,
            project_tech: 1,
          },
          manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1
          },
          managers_rm: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1
          },
          acc_manager: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1
          },
          acc_managers_rm: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            email: 1
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1,
            client_img: 1,
            email: 1
          },
          project_id: 1,
          client_name: 1,
          client_email: 1,
          complaint: 1,
          priority: 1,
          escalation_level: 1,
          status: 1,
          updatedAt: 1,
          createdAt: 1,
        },
      },

    ]);

    const today = moment().startOf("day"); // Get today's date

    let emailDetails = [];
    data.forEach(complaint => {
      const fiveWorkingDaysBefore = calculateWorkingDaysBefore(moment(complaint.createdAt), 5);

      if ((fiveWorkingDaysBefore.startOf("day")).isSame(today)) {
        console.log(`Reminder query for complaint ID: ${complaint._id}`);
        emailDetails.push(complaint);
      }
    });
    for (const ele of emailDetails) {
      await newReminderMailforStatusUpdate(ele);
    }




  } catch (error) {
    console.log(
      "🚀 ~ exports.scheduleCronTosendMailtoAllPMandAMfornotUpdatingStatus= ~ error:",
      error
    );
  }
};
