const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const mongoose = require("mongoose");
const TaskHoursLogs = mongoose.model("projecttaskhourlogs");
const ProjectTotalTaskHourLogs = mongoose.model("projecttotaltaskhourlogs");
const employeeInOutTimes = mongoose.model("employeeInOutTimes");
const Employees = mongoose.model("employees");
const {
  getPagination,
  getTotalCountQuery,
  getAggregationPagination
} = require("../helpers/queryHelper");
const { statusCode, DEFAULT_DATA } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");
const moment = require("moment");
const {
  taskHoursLoggedMail,
  subTaskHoursLoggedMail
} = require("../template/hoursLogged");
const csvTemplate = require("../template/timesheetCSV");
const {
  getCreatedUpdatedDeletedByQuery,
  getRefModelFromLoginUser,
  getProjectDefaultSettingQuery
} = require("../helpers/common");
const {
  checkLoginUserIsProjectManager,
  checkLoginUserIsProjectAccountManager
} = require("./projectMainTask");
const { sheet } = require("../template/timesheetReportsCSV");
const {
  sheet1
} = require("../template/timesheetReportsCSVMyLoggedTimeDetails");
const {
  sheet2
} = require("../template/timesheetReportsCSVMyLoggedTimeDetailsProject");
const { checkUserIsAdmin } = require("./authentication");
const configRoles = require("../settings/config.json");
const { generateCacheKey } = require("../middleware/CryptoKey");
const { getCache, storeCache } = require("../middleware/cacheStore");

// Check is exists..
// exports.taskHoursExists = async (task_id, project_id) => {
//   try {
//     let isExist = false;
//     const data = await TaskHoursLogs.find({

//       isDeleted: false,
//       $and: [
//         {
//           createdAt: {
//             $and: [
//               { $gte: moment().startOf("day") },
//               { $lte: moment().endOf("day") }
//             ]
//           },
//         },
//         { task_id: new mongoose.Types.ObjectId(task_id), },
//         { project_id: new mongoose.Types.ObjectId(project_id), },
//       ]

//     });
//     console.log("🚀 ~ exports.taskHoursExists= ~ data:", data)
//     if (data.length > 0) isExist = true;

//     return isExist;
//   } catch (error) {
//     console.log("🚀 ~ exports.taskHoursExists= ~ error:", error);
//   }
// };

//Add task hours :
exports.addTaskHoursLogs = async (req, res) => {
  try {
    // Decode user from token
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      task_id: Joi.string().optional().default(null),
      subtask_id: Joi.string().optional().default(null),
      bugs_id: Joi.string().optional().default(null),
      timesheet_id: Joi.string().required(),
      descriptions: Joi.string().optional().allow(""),
      logged_hours: Joi.string().required(),
      logged_minutes: Joi.string().optional().allow(""),
      logged_date: Joi.string().required(),
      isManuallyAdded: Joi.boolean().optional().default(true),
      logged_status: Joi.string().optional().allow("Void")
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message,
        null
      );
    }
    // if (await this.taskHoursExists(value?.task_id, value?.project_id)) {
    //   return errorResponse(res, statusCode.CONFLICT, messages.HOURS_ALREADY_EXISTS);
    // } else {
    let loggedDate = moment.utc(value.logged_date).format();

    let data = new TaskHoursLogs({
      employee_id: req.user._id,
      project_id: value.project_id,
      // main_task_id: value.main_task_id,
      task_id: value.task_id,
      subtask_id: value.subtask_id || null,
      bug_id: value.bugs_id || null,
      timesheet_id: value.timesheet_id,
      descriptions: value.descriptions || "",
      logged_hours: value.logged_hours,
      logged_minutes: value.logged_minutes || "00",
      logged_date: loggedDate, //moment.utc(value.logged_date).format(),
      isManuallyAdded: value.isManuallyAdded,
      logged_status: value.logged_status || "Void",
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req.user))
    });
    await data.save();

    // to store the total time for employee for the particular month and year..
    let month = moment.utc(loggedDate).format("MM");
    console.log("🚀 ~ exports.addTaskHoursLogs= ~ month:", month);
    let year = moment.utc(loggedDate).format("YYYY");
    console.log("🚀 ~ exports.addTaskHoursLogs= ~ year:", year);

    function calculateNewTotalTime(
      existingTotalTime = "00:00",
      newHours,
      newMinutes
    ) {
      let [existingHours, existingMinutes] = existingTotalTime
        .split(":")
        .map(Number);
      let totalNewMinutes = parseInt(newMinutes) + existingMinutes;
      let totalNewHours =
        parseInt(newHours) + existingHours + Math.floor(totalNewMinutes / 60);
      totalNewMinutes = totalNewMinutes % 60;

      return `${String(totalNewHours).padStart(2, "0")}:${String(
        totalNewMinutes
      ).padStart(2, "0")}`;
    }

    let existingLog = await ProjectTotalTaskHourLogs.findOne({
      employee_id: new mongoose.Types.ObjectId(req.user._id),
      month: month,
      year: year
    });

    let newTotalTime = calculateNewTotalTime(
      existingLog?.total_time,
      value.logged_hours,
      value.logged_minutes || "00"
    );

    if (existingLog && existingLog != null) {
      await ProjectTotalTaskHourLogs.findOneAndUpdate(
        {
          employee_id: req.user._id,
          month: month,
          year: year
        },
        {
          $set: { updatedBy: req.user._id, total_time: newTotalTime }
        },
        { new: true }
      );
    } else {
      // Create new entry if it does not exist
      let newLog = new ProjectTotalTaskHourLogs({
        employee_id: req.user._id,
        month: month,
        year: year,
        total_time: newTotalTime,
        createdBy: req.user._id,
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req.user))
      });
      await newLog.save();
    }

    // send mail to manager..
    const loggedData = await this.getLoggedHoursData(data._id);

    // This change is made for Project named ~> "SO1001/IH/TimeTrackNRG" where manager has no need to get the mails for hours being logged..
    let project_ids = [];
    let project_id = loggedData[0]?.project?._id.toString();

    if (!project_ids.includes(project_id)) {
      if (!value.subtask_id) {
        await taskHoursLoggedMail(loggedData[0], decodedCompanyId);
      } else {
        // TODO : need to check design
        await subTaskHoursLoggedMail(loggedData[0], decodedCompanyId);
      }
    } else {
      console.log(
        `This change is made for Project named ~> SO1001/IH/TimeTrackNRG ~ ${moment().format(
          "DD-MM-YYYY"
        )} \n ~ ${JSON.stringify(
          loggedData[0]
        )} \n where manager has no need to get the mails for hours being logged..`
      );
    }
    if (await data.save()) {
      return successResponse(
        res,
        statusCode.CREATED,
        messages.LOGGED_HOURS_CREATED,
        data
      );
    } else {
      return errorResponse(res, statusCode.CONFLICT, null);
    }
    // }
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get task hours :
exports.getTaskHoursLogs = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      project_id: Joi.string().required()
      // _id: Joi.string().allow("").optional(),
      // task_id: Joi.string().allow("").optional(),
      // subtask_id: Joi.string().optional().default(null),
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
      sortBy: value.sortBy
    });
    let matchQuery = {
      employee_id: new mongoose.Types.ObjectId(req.user._id),
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value.project_id)
      // main_task_id: new mongoose.Types.ObjectId(value.main_task_id),
      // task_id: new mongoose.Types.ObjectId(value.task_id),
      // ...(value?.subtask_id
      //   ? {
      //     subtask_id: new mongoose.Types.ObjectId(value.subtask_id),
      //   }
      //   : { subtask_id: { $eq: null } }),
    };

    const mainQuery = [
      ...(await getCreatedUpdatedDeletedByQuery()),
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          emp_name: "$createdBy.full_name",
          logged_date: 1,
          descriptions: 1,
          logged_hours: 1,
          logged_minutes: 1,
          logged_seconds: { $ifNull: ["$logged_seconds", 0] },
          isManuallyAdded: 1,
          logged_status: 1
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await TaskHoursLogs.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await TaskHoursLogs.aggregate([
      ...mainQuery,
      { $sort: pagination.sort }
    ]);

    const metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page
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

//Get task hours logged by timesheet
exports.getTaskHoursLogsByTimesheet = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      project_id: Joi.string().required(),
      // main_task_id: Joi.string().required(),
      // task_id: Joi.string().required(),
      timesheet_id: Joi.string().required(),
      subtask_id: Joi.string().optional().allow(""),
      month: Joi.string().allow("").optional(),
      year: Joi.string().allow("").optional(),
      logged_status: Joi.string().optional().allow(""),
      // employee_id: Joi.string().allow("").optional(),
      dateRange: Joi.string().allow("").optional(),
      startDate: Joi.string().allow("").optional(),
      endDate: Joi.string().allow("").optional(),
      groupBy: Joi.string().allow("").optional(),
      orderBy: Joi.string().allow("").optional(),
      users: Joi.array().optional()
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

    let pagination = getPagination({
      pageLimit: value.limit,
      pageNum: value.pageNo,
      sort: value.sort,
      sortBy: value.sortBy
    });
    if (value.logged_status == "all") {
      value.logged_status = "";
    }
    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value.project_id),
      // main_task_id: new mongoose.Types.ObjectId(value.main_task_id),
      // task_id: new mongoose.Types.ObjectId(value.task_id),
      timesheet_id: new mongoose.Types.ObjectId(value.timesheet_id),

      // ...(value?.employee_id
      //   ? {
      //       employee_id: new mongoose.Types.ObjectId(value.employee_id),
      //     }
      //   : {}),

      ...(value?.logged_status
        ? {
            logged_status: value.logged_status
          }
        : {}),

      ...(value?.subtask_id
        ? {
            subtask_id: new mongoose.Types.ObjectId(value.subtask_id)
          }
        : { subtask_id: { $eq: null } })
    };
    if (value.month && value.year) {
      matchQuery.logged_date = {
        $eq: [moment(TaskHoursLogs.logged_date).format("YYYY"), value.year],
        $eq: [moment(TaskHoursLogs.logged_date).format("MMMM"), value.month]
      };
    }
    if (value?.users && value?.users.length > 0) {
      matchQuery = {
        ...matchQuery,
        "createdBy._id": {
          $in: value?.users.map((ele) => new mongoose.Types.ObjectId(ele))
        }
      };
    }
    if (!isManager && !isAdmin && !isAccManager) {
      matchQuery = {
        ...matchQuery,
        $expr: {
          $or: [
            {
              $eq: ["$createdBy._id", new mongoose.Types.ObjectId(req.user._id)]
            }
            // {
            //   $in: [
            //     new mongoose.Types.ObjectId(req.user._id),
            //     "$projectDetails.pms_clients",
            //   ],
            // },
          ]
        }
      };
    }
    const mainQuery = [
      ...(await getCreatedUpdatedDeletedByQuery()),

      {
        $lookup: {
          from: "projecttaskbugs",
          let: { bug_id: "$bug_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$bug_id"] },
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
      },

      {
        $lookup: {
          from: "projecttasks",
          let: { task_id: "$task_id", bug_task_id: "$bugs.task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$_id", "$$task_id"] },
                        { $eq: ["$_id", "$$bug_task_id"] }
                      ]
                    },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "tasks"
        }
      },
      {
        $unwind: {
          path: "$tasks",
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
          as: "projectDetails"
        }
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "projectmaintasks",
          let: { mainTaskId: "$tasks.main_task_id" },
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
          as: "maintasksDetails"
        }
      },
      // {
      //   $unwind: {
      //     path: "$maintasksDetails",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },

      {
        $lookup: {
          from: "projecttimesheets",
          let: { timesheet_id: "$timesheet_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$timesheet_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "timesheet"
        }
      },
      {
        $unwind: {
          path: "$timesheet",
          preserveNullAndEmptyArrays: true
        }
      },

      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          loggedBy: { $ifNull: ["$createdBy.full_name", ""] },
          loggedBy_img: { $ifNull: ["$createdBy.emp_img", ""] },
          logged_hours: 1,
          logged_minutes: 1,
          logged_seconds: { $ifNull: ["$logged_seconds", 0] },
          createdAt: 1,
          logged_date: {
            $dateToString: {
              format: "%d-%m-%Y",
              date: "$logged_date",
              timezone: "UTC"
            }
          },
          time: {
            $concat: [
              { $toString: "$logged_hours" },
              "h ",
              {
                $toString: {
                  $concat: [
                    {
                      $toString: {
                        $cond: [{ $lt: ["$logged_minutes", 10] }, "0", ""]
                      }
                    },
                    { $toString: "$logged_minutes" }
                  ]
                }
              },
              "m ",
              {
                $toString: {
                  $concat: [
                    {
                      $toString: {
                        $cond: [{ $lt: [{ $ifNull: ["$logged_seconds", 0] }, 10] }, "0", ""]
                      }
                    },
                    { $toString: { $ifNull: ["$logged_seconds", 0] } }
                  ]
                }
              },
              "s"
            ]
          },
          descriptions: 1,
          project: "$projectDetails.title",
          project_id: "$projectDetails._id",
          project_color: "$projectDetails.color",
          subtask_id: 1,
          // main_taskList: "$mainTasks.title",
          main_taskList_id: { $first: "$maintasksDetails._id" },
          main_taskList: { $first: "$maintasksDetails.title" },
          task: "$tasks.title",
          task_id: "$tasks._id",
          bug_id: { $ifNull: ["$bugs._id", ""] },
          bug: { $ifNull: ["$bugs.title", ""] },
          timesheet: "$timesheet.title",
          logged_status: 1
        }
      }
    ];

    // if (value.groupBy === "person") {
    //   mainQuery.push({
    //     $group: {
    //       _id: "$employee_id",
    //       totalHours: { $sum: { $toInt: "$logged_hours" } },
    //       totalMinutes: { $sum: { $toInt: "$logged_minutes" } },
    //       count: { $sum: 1 },
    //     },
    //   });
    // } else if (value.groupBy === "tasklist") {
    //   mainQuery.push({
    //     $group: {
    //       _id: "$task_id",
    //       totalHours: { $sum: { $toInt: "$logged_hours" } },
    //       totalMinutes: { $sum: { $toInt: "$logged_minutes" } },
    //       count: { $sum: 1 },
    //     },
    //   });
    // } else if (value.groupBy === "month") {
    //   mainQuery.push({
    //     $group: {
    //       _id: {
    //         month: { $month: "$logged_date" },
    //         year: { $year: "$logged_date" },
    //       },
    //       totalHours: { $sum: { $toInt: "$logged_hours" } },
    //       totalMinutes: { $sum: { $toInt: "$logged_minutes" } },
    //     },
    //   });
    // } else if (value.groupBy === "year") {
    //   mainQuery.push({
    //     $group: {
    //       _id: { $year: "$logged_date" },
    //       totalHours: { $sum: { $toInt: "$logged_hours" } },
    //       totalMinutes: { $sum: { $toInt: "$logged_minutes" } },
    //       count: { $sum: 1 },
    //     },
    //   });
    // }

    const currentDate = moment();
    let startDt = moment();
    if (value.dateRange === "last_2_week") {
      matchQuery.logged_date = {
        $gte: startDt.subtract(16, "days").toDate(),
        $lte: currentDate.toDate()
      };
    } else if (value.dateRange === "last_week") {
      matchQuery.logged_date = {
        $gte: startDt.subtract(8, "days").toDate(),
        $lte: currentDate.toDate()
      };
    } else if (value.dateRange === "last_month") {
      const startOfLastMonth = moment().subtract(1, "month").startOf("month");
      const endOfLastMonth = moment().subtract(1, "month").endOf("month");

        matchQuery.logged_date = {
         $gte: startOfLastMonth.toDate(),
         $lte: endOfLastMonth.toDate(),
        };
    } else if (value.dateRange === "this_month") {
      matchQuery.logged_date = {
        $gte: moment().startOf("month").toDate(),
        $lte: moment().endOf("month").toDate(),
      };
    }else if (value.dateRange === "Custom") {
      matchQuery.logged_date = {
        $gte: moment(value.startDate).startOf("day").toDate(),
        $lte: moment(value.endDate).endOf("day").toDate()
      };
    }
    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await TaskHoursLogs.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await TaskHoursLogs.aggregate(mainQuery);

    if (value.orderBy) {
      if (value.orderBy === "asc") {
        data.sort((a, b) =>
          moment(a.logged_date, "DD-MM-YYYY").diff(
            moment(b.logged_date, "DD-MM-YYYY")
          )
        );
      } else if (value.orderBy === "desc") {
        data.sort((a, b) =>
          moment(b.logged_date, "DD-MM-YYYY").diff(
            moment(a.logged_date, "DD-MM-YYYY")
          )
        );
      }
    }
    // const metaData = {
    //   total: totalCount,
    //   limit: pagination.limit,
    //   pageNo: pagination.page,
    //   totalPages:
    //     pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
    //   currentPage: pagination.page,
    // };

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      value._id ? data[0] : data,
      !value._id && {}
    );
  } catch (error) {
    console.log("🚀 ~ exports.getTaskHoursLogsByTimesheet= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Update task hours :
exports.updateTaskHoursLogs = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      // employee_id: Joi.string().required(),
      // main_task_id: Joi.string().required(),
      // task_id: Joi.string().required(),
      // timeLogged_id:Joi.string().required(),
      // subtask_id: Joi.string().optional().default(null),
      // timesheet_id: Joi.string().required(),
      descriptions: Joi.string().optional().allow(""),
      logged_hours: Joi.string().optional(),
      logged_minutes: Joi.string().optional(),
      logged_date: Joi.string().required(),
      // isManuallyAdded: Joi.boolean().optional().default(true),
      logged_status: Joi.string().optional().allow("Void")
    });
    const { error, value } = validationSchema.validate(req.body);
    let oldTaskHours = await TaskHoursLogs.findById(req.params.id);
    let oldHours =
      oldTaskHours?.logged_hours + ":" + oldTaskHours?.logged_minutes;
    let current_hours = value.logged_hours + ":" + value.logged_minutes;
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    let loggedDate = moment.utc(value.logged_date, "DD-MM-YYYY").format();

    let date1 = moment(value.logged_date, "DD-MM-YYYY").startOf("day");

    const data = await TaskHoursLogs.findByIdAndUpdate(
      req.params.id,
      {
        // employee_id: value.employee_id,
        // project_id: projectId,
        // main_task_id: value.main_task_id,
        // task_id: value.task_id,
        // subtask_id: value.subtask_id || null,
        // timesheet_id: value.timesheet_id,
        descriptions: value.descriptions || "",
        logged_hours: value.logged_hours || "00",
        logged_minutes: value.logged_minutes || "00",
        logged_date: moment.utc(value.logged_date, "DD-MM-YYYY").format(),
        // isManuallyAdded: value.isManuallyAdded,
        logged_status: value.logged_status || "Void",
        updatedBy: req.user._id,
        ...(await getRefModelFromLoginUser(req.user, true))
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.BAD_REQUEST, messages.BAD_REQUEST);
    }

    let month = moment.utc(loggedDate).format("MM");

    let year = moment.utc(loggedDate).format("YYYY");

    let existingLog = await ProjectTotalTaskHourLogs.findOne({
      employee_id: new mongoose.Types.ObjectId(req.user._id),
      month: month,
      year: year
    });
    console.log(existingLog.total_time, "total_time");
    function timeToMinutes(timeStr) {
      let [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    }

    function minutesToTime(minutes) {
      // Determine if the time is negative
      console.log(minutes, "minutes");
      let isNegative = minutes < 0;
      minutes = Math.abs(minutes); // Work with absolute value

      // Calculate hours and remaining minutes from total minutes
      let hours = Math.floor(minutes / 60);
      let remainingMinutes = minutes % 60;

      // Format hours and minutes to "HH:MM" and handle negative case
      return `${isNegative ? "-" : ""}${hours}:${
        remainingMinutes < 10 ? "0" : ""
      }${remainingMinutes}`;
    }
    let oldTimeInMinutes = timeToMinutes(oldHours);
    let newTimeInMinutes = timeToMinutes(current_hours);

    let differenceInMinutes = newTimeInMinutes - oldTimeInMinutes;
    let totalTimeinMinutes = timeToMinutes(existingLog.total_time);
    let updatedTimeInMinutes = totalTimeinMinutes + differenceInMinutes;
    let updatedTime = minutesToTime(updatedTimeInMinutes);
    console.log(existingLog.total_time, "total_time", updatedTime);
    await ProjectTotalTaskHourLogs.findOneAndUpdate(
      {
        employee_id: new mongoose.Types.ObjectId(req.user._id),
        month: month,
        year: year
      },
      {
        $set: { updatedBy: req.user._id, total_time: updatedTime }
      },
      { new: true }
    );
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LOGGED_HOURS_UPDATED,
      data
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Soft Delete task hours :
exports.deleteTaskHoursLogs = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    // Get the task hours log data before deletion for logging
    const taskLogToDelete = await TaskHoursLogs.findById(req.params.id).lean();
    
    if (!taskLogToDelete) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }
    
    const data = await TaskHoursLogs.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user._id,
        deletedAt: configs.utcDefault(),
        ...(await getRefModelFromLoginUser(req.user, false, true))
      },
      { new: true }
    );

    if (!data) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }
    // Extract logged hours and minutes to deduct
    const loggedHoursToDeduct = taskLogToDelete.logged_hours;
    const loggedMinutesToDeduct = taskLogToDelete.logged_minutes || "00";

    // Get the corresponding month and year for the log
    let loggedDate = moment.utc(taskLogToDelete.logged_date).format();
    let month = moment.utc(loggedDate).format("MM");
    let year = moment.utc(loggedDate).format("YYYY");

    // Find the corresponding entry in ProjectTotalTaskHourLogs
    let existingLog = await ProjectTotalTaskHourLogs.findOne({
      employee_id: new mongoose.Types.ObjectId(req.user._id),
      month: month,
      year: year
    });

    // If the entry exists, calculate the new total time after deduction
    if (existingLog) {
      let newTotalTime = calculateDeductedTotalTime(
        existingLog.total_time,
        loggedHoursToDeduct,
        loggedMinutesToDeduct
      );

      // Update the ProjectTotalTaskHourLogs entry
      await ProjectTotalTaskHourLogs.findOneAndUpdate(
        {
          employee_id: new mongoose.Types.ObjectId(req.user._id),
          month: month,
          year: year
        },
        {
          $set: { updatedBy: req.user._id, total_time: newTotalTime }
        },
        { new: true }
      );
    } else {
      console.log("Total time entry not found");
    }

    // Function to calculate new total time after deduction
    function calculateDeductedTotalTime(
      existingTotalTime = "00:00",
      hoursToDeduct,
      minutesToDeduct
    ) {
      let [existingHours, existingMinutes] = existingTotalTime
        .split(":")
        .map(Number);
      let totalNewMinutes = existingMinutes - parseInt(minutesToDeduct);
      let totalNewHours = existingHours - parseInt(hoursToDeduct);

      // Adjust if minutes go negative
      if (totalNewMinutes < 0) {
        totalNewMinutes += 60;
        totalNewHours -= 1;
      }

      // Ensure hours are not negative
      if (totalNewHours < 0) {
        totalNewHours = 0;
        totalNewMinutes = 0;
      }

      return `${String(totalNewHours).padStart(2, "0")}:${String(
        totalNewMinutes
      ).padStart(2, "0")}`;
    }

    // Log delete activity
    const userInfo = await getUserInfoForLogging(req.user);
    if (userInfo && taskLogToDelete) {
      await logDelete({
        companyId: userInfo.companyId,
        moduleName: "taskHoursLogs",
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        deletedRecord: taskLogToDelete,
        additionalData: {
          recordId: taskLogToDelete._id.toString(),
          logged_hours: taskLogToDelete.logged_hours,
          logged_minutes: taskLogToDelete.logged_minutes,
          logged_date: taskLogToDelete.logged_date,
          isSoftDelete: true
        }
      });
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LOGGED_HOURS_DELETED,
      data
    );
  } catch (error) {
    console.log("🚀 ~ exports.deleteTaskHoursLogs ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
exports.deleteTaskHoursLogsMultiple = async (req, res) => {
  try {
    const { logDelete, getUserInfoForLogging } = require("../helpers/activityLoggerHelper");
    
    const validationSchema = Joi.object({
      ids: Joi.array().optional()
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    if (value.ids.length > 0 && value.ids != undefined) {
      // Get the task hours logs data before deletion for logging
      const taskLogsToDelete = await TaskHoursLogs.find({
        _id: { $in: value.ids },
        isDeleted: false
      }).lean();
      
      if (!taskLogsToDelete || taskLogsToDelete.length === 0) {
        return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
      }
      
      const data = await TaskHoursLogs.updateMany(
        { _id: { $in: value.ids } },
        {
          $set: {
            isDeleted: true,
            deletedBy: req.user._id,
            deletedAt: configs.utcDefault(),
            ...(await getRefModelFromLoginUser(req.user, false, true))
          }
        },
        { new: true }
      );

      if (!data) {
        return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
      }

      // Log delete activity
      const userInfo = await getUserInfoForLogging(req.user);
      if (userInfo && taskLogsToDelete.length > 0) {
        const deletedIds = taskLogsToDelete.map(log => log._id.toString());
        await logDelete({
          companyId: userInfo.companyId,
          moduleName: "taskHoursLogs",
          email: userInfo.email,
          createdBy: userInfo._id,
          deletedBy: userInfo._id,
          additionalData: {
            deletedRecordIds: deletedIds,
            deletedCount: taskLogsToDelete.length,
            isSoftDelete: true,
            isMultiple: true
          }
        });
      }

      return successResponse(
        res,
        statusCode.SUCCESS,
        messages.LOGGED_HOURS_DELETED,
        data
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get task total hours :
exports.getTaskTotalHours = async (req, res) => {
  try {
    // const projectId = req.params.id;
    const validationSchema = Joi.object({
      timesheet_id: Joi.string().required()
      // project_id: Joi.string().required(),
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
      timesheet_id: new mongoose.Types.ObjectId(value.timesheet_id)
    };

    if (!isManager && !isAdmin && !isAccManager) {
      matchQuery = {
        ...matchQuery,
        $expr: {
          $or: [
            {
              $eq: ["$createdBy", new mongoose.Types.ObjectId(req.user._id)]
            },
            {
              $in: [
                new mongoose.Types.ObjectId(req.user._id),
                "$project.pms_clients"
              ]
            }
          ]
        }
      };
    }
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
      { $match: matchQuery },
      {
        $addFields: {
          total_minutes: {
            $add: [
              {
                $cond: {
                  if: { $eq: [{ $type: "$logged_hours" }, "string"] },
                  then: { $multiply: [{ $toInt: "$logged_hours" }, 60] },
                  else: { $multiply: ["$logged_hours", 60] }
                }
              },
              { $toInt: "$logged_minutes" }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          total_minutes: { $sum: "$total_minutes" }
        }
      },
      {
        $project: {
          _id: 0,
          total_hours: {
            $divide: [{ $floor: { $divide: ["$total_minutes", 60] } }, 1]
          },
          total_minutes: { $mod: ["$total_minutes", 60] },
          total_seconds: { $ifNull: ["$total_seconds", 0] }
        }
      },
      {
        $project: {
          _id: 0,
          total_time: {
            $concat: [
              { $toString: "$total_hours" },
              "h",
              " ",
              {
                $cond: {
                  if: { $lt: ["$total_minutes", 10] },
                  then: { $concat: ["0", { $toString: "$total_minutes" }] },
                  else: { $toString: "$total_minutes" }
                }
              },
              "m"
            ]
          }
        }
      }
    ];

    let data = await TaskHoursLogs.aggregate(mainQuery);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      data.length > 0 ? data[0] : {},
      {}
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Get added logged data for manager mail...
exports.getLoggedHoursData = async (loggedId) => {
  try {
    const mainQuery = [
      ...(await getCreatedUpdatedDeletedByQuery()),
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
          let: { subtask_id: "$subtask_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$subtask_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "subtask"
        }
      },
      {
        $unwind: {
          path: "$subtask",
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
          as: "main_task"
        }
      },
      {
        $unwind: {
          path: "$main_task",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "projecttimesheets",
          let: { timesheet_id: "$timesheet_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$timesheet_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "timesheet"
        }
      },
      {
        $unwind: {
          path: "$timesheet",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "projecttaskbugs",
          let: { bug_id: "$bug_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$bug_id"] },
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
      },

      {
        $lookup: {
          from: "workflowstatuses",
          let: { task_status: "$task.task_status" },
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
          from: "workflowstatuses",
          let: { sub_task_status: "$subtask.task_status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$sub_task_status"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "sub_task_status"
        }
      },
      {
        $unwind: {
          path: "$sub_task_status",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projecttaskhourlogs",
          let: { taskId: "$task._id" },
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
          as: "task_hours"
        }
      },
      {
        $match: {
          _id: new mongoose.Types.ObjectId(loggedId),
          isDeleted: false
        }
      },
      {
        $addFields: {
          totalLoggedTime: {
            $reduce: {
              input: "$task_hours",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $add: [
                      {
                        $multiply: [
                          {
                            $toDouble: "$$this.logged_hours" // Convert string to double
                          },
                          60
                        ] // Convert hours to minutes
                      },
                      {
                        $toDouble: "$$this.logged_minutes" // Convert string to double
                      }
                    ]
                  }
                ]
              }
            }
          },
          employee: "$createdBy"
        }
      },
      {
        $project: {
          _id: 1,
          logged_date: 1,
          logged_hours: 1,
          logged_minutes: 1,
          logged_seconds: { $ifNull: ["$logged_seconds", 0] },
          totalLoggedTime: 1,
          total_logged_hours: {
            $floor: {
              $divide: ["$totalLoggedTime", 60]
            }
          },
          total_logged_minutes: {
            $mod: ["$totalLoggedTime", 60]
          },
          isManuallyAdded: 1,
          logged_status: 1,
          employee: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            emp_img: 1,
            client_img: 1
          },
          project: {
            _id: 1,
            title: 1,
            projectId: 1,
            color: 1,
            descriptions: 1,
            estimatedHours: 1
          },
          manager: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            emp_img: 1
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            emp_img: 1
          },
          main_task: {
            _id: 1,
            title: 1,
            status: 1
          },
          task: {
            _id: 1,
            title: 1,
            status: 1,
            task_status: 1,
            start_date: 1,
            due_date: 1,
            estimated_hours: 1,
            estimated_minutes: 1,
            task_progress: 1
          },
          subtask: {
            _id: 1,
            title: 1,
            status: 1,
            start_date: 1,
            due_date: 1,
            estimated_hours: 1,
            estimated_minutes: 1,
            task_progress: 1
          },
          bugs: {
            _id: 1,
            title: 1,
            status: 1,
            bug_status: 1,
            start_date: 1,
            due_date: 1,
            estimated_hours: 1,
            estimated_minutes: 1,
            progress: 1
          },
          // timesheet: {
          //   _id: 1,
          //   title: 1,
          // },
          task_status: {
            _id: 1,
            title: 1
          },
          sub_task_status: {
            _id: 1,
            title: 1
          }
        }
      }
    ];

    const data = await TaskHoursLogs.aggregate(mainQuery);
    return data;
  } catch (error) {
    console.log("🚀 ~ exports.getLoggedHoursData=async ~ error:", error);
  }
};

//Export CSV task hours logged by timesheet
exports.exportTimesheetCSV = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      project_id: Joi.string().required(),
      // main_task_id: Joi.string().required(),
      // task_id: Joi.string().required(),
      timesheet_id: Joi.string().required(),
      subtask_id: Joi.string().optional().allow(""),
      month: Joi.string().allow("").optional(),
      year: Joi.string().allow("").optional(),
      logged_status: Joi.string().optional().allow(""),
      // employee_id: Joi.string().allow("").optional(),
      dateRange: Joi.string().allow("").optional(),
      startDate: Joi.string().allow("").optional(),
      endDate: Joi.string().allow("").optional(),
      groupBy: Joi.string().allow("").optional(),
      orderBy: Joi.string().allow("").optional(),
      ids: Joi.array().optional()
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

    let pagination = getPagination({
      pageLimit: value.limit,
      pageNum: value.pageNo,
      sort: value.sort,
      sortBy: value.sortBy
    });

    if (value.logged_status == "all") {
      value.logged_status = "";
    }

    let matchQuery = {
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(value.project_id),
      timesheet_id: new mongoose.Types.ObjectId(value.timesheet_id),
      ...(value?.logged_status
        ? {
            logged_status: value.logged_status
          }
        : {}),

      ...(value?.subtask_id
        ? {
            subtask_id: new mongoose.Types.ObjectId(value.subtask_id)
          }
        : { subtask_id: { $eq: null } }),

      ...(value.ids && value?.ids?.length > 0
        ? {
            _id: {
              $in: value?.ids.map((id) => new mongoose.Types.ObjectId(id))
            }
          }
        : {})
    };

    if (!isManager && !isAdmin && !isAccManager) {
      matchQuery = {
        ...matchQuery,
        $expr: {
          $or: [
            {
              $eq: ["$createdBy._id", new mongoose.Types.ObjectId(req.user._id)]
            }
            // {
            //   $in: [
            //     new mongoose.Types.ObjectId(req.user._id),
            //     "$projectDetails.assignees",
            //   ],
            // },
            // {
            //   $in: [
            //     new mongoose.Types.ObjectId(req.user._id),
            //     "$projectDetails.pms_clients",
            //   ],
            // },
          ]
        }
      };
    }

    if (value.month && value.year) {
      matchQuery.logged_date = {
        $eq: [moment(TaskHoursLogs.logged_date).format("YYYY"), value.year],
        $eq: [moment(TaskHoursLogs.logged_date).format("MMMM"), value.month]
      };
    }
    const mainQuery = [
      ...(await getCreatedUpdatedDeletedByQuery()),

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
          as: "tasks"
        }
      },
      {
        $unwind: {
          path: "$tasks",
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
          as: "projectDetails"
        }
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: true
        }
      },

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
          as: "bugs"
        }
      },
      {
        $unwind: {
          path: "$bugs",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "projectmaintasks",
          let: { mainTaskId: "$tasks.main_task_id" },
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
          as: "maintasksDetails"
        }
      },
      // {
      //   $unwind: {
      //     path: "$maintasksDetails",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },

      {
        $lookup: {
          from: "projecttimesheets",
          let: { timesheet_id: "$timesheet_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$timesheet_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "timesheet"
        }
      },
      {
        $unwind: {
          path: "$timesheet",
          preserveNullAndEmptyArrays: true
        }
      },
      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          loggedBy: { $ifNull: ["$createdBy.full_name", ""] },
          logged_hours: 1,
          logged_minutes: 1,
          logged_seconds: { $ifNull: ["$logged_seconds", 0] },
          logged_date: {
            $dateToString: {
              format: "%d-%m-%Y",
              date: "$logged_date",
              timezone: "UTC"
            }
          },
          time: {
            $concat: [
              { $toString: "$logged_hours" },
              "h",
              " ",
              {
                $toString: {
                  $cond: [
                    { $lt: ["$logged_minutes", 10] },
                    { $concat: ["0", { $toString: "$logged_minutes" }] },
                    { $toString: "$logged_minutes" }
                  ]
                }
              },
              "m"
            ]
          },
          descriptions: 1,
          project: "$projectDetails.title",
          project_color: "$projectDetails.color",
          subtask_id: 1,
          // main_taskList: "$mainTasks.title",
          main_taskList: { $first: "$maintasksDetails.title" },
          task: "$tasks.title",
          taskId: "$tasks.taskId",
          timesheet: "$timesheet.title",
          bugId: { $ifNull: ["$bugs.bugId", ""] },
          bug: { $ifNull: ["$bugs.title", ""] },
          logged_status: 1
        }
      }
    ];

    const currentDate = moment();
    let startDt = moment();
    if (value.dateRange === "last_2_week") {
      matchQuery.logged_date = {
        $gte: startDt.subtract(16, "days").toDate(),
        $lte: currentDate.toDate()
      };
    } else if (value.dateRange === "last_week") {
      matchQuery.logged_date = {
        $gte: startDt.subtract(8, "days").toDate(),
        $lte: currentDate.toDate()
      };
    } else if (value.dateRange === "last_month") {
      matchQuery.logged_date = {
        $gte: startDt.subtract(31, "days").toDate(),
        $lte: currentDate.toDate()
      };
    } else if (value.dateRange === "Custom") {
      matchQuery.logged_date = {
        $gte: moment(value.startDate).startOf("day").toDate(),
        $lte: moment(value.endDate).endOf("day").toDate()
      };
    }
    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await TaskHoursLogs.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await TaskHoursLogs.aggregate([
      ...mainQuery,
      { $sort: pagination.sort }
    ]);

    if (value.orderBy) {
      if (value.orderBy === "asc") {
        data.sort((a, b) =>
          moment(a.logged_date, "DD-MM-YYYY").diff(
            moment(b.logged_date, "DD-MM-YYYY")
          )
        );
      } else if (value.orderBy === "desc") {
        data.sort((a, b) =>
          moment(b.logged_date, "DD-MM-YYYY").diff(
            moment(a.logged_date, "DD-MM-YYYY")
          )
        );
      }
    }
    const metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page
    };
    if (data.length == 0) {
      return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
    }
    let html = csvTemplate.sheet(data);
    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.HTML_GENERATED,
      html
    );
    // return res.json({
    //   message: "HTML Generated successfully",
    //   data: html
    // }
    // );
  } catch (error) {
    console.log(error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// Timesheets reports details for graphs
exports.getTimesheetsReports = async (req, res) => {
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
      sort: Joi.string().default("logged_date"),
      sortBy: Joi.string().default("desc"),
      technologies: Joi.array().optional(),
      types: Joi.array().optional(),
      projects: Joi.array().optional(),
      managers: Joi.array().optional(),
      departments: Joi.array().optional(),
      users: Joi.array().optional(), // employees or assignes to project
      isExport: Joi.boolean().required(),
      startDate: Joi.date().optional().allow(""),
      endDate: Joi.date().optional().allow("")
    });

    const { value, error } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    const cacheKey = generateCacheKey({...value,decodedCompanyId});

    // const cached = getCache(cacheKey);
    // if (cached) {
    //   const { data, metadata } = cached;
    //   return successResponse(
    //     res,
    //     statusCode.SUCCESS,
    //     messages.LISTING,
    //     data,
    //     metadata
    //   );
    // }

    const pagination = getPagination({
      pageLimit: value.limit,
      pageNum: value.pageNo,
      sort: value.sort,
      sortBy: value.sortBy
    });
    let matchQuery = {
      isDeleted: false
    };

    if (value.projects && value.projects.length > 0) {
      matchQuery.project_id = {
        $in: value?.projects.map((ele) => new mongoose.Types.ObjectId(ele))
      };
    }
    if (value.users && value.users.length > 0) {
      matchQuery.employee_id = {
        $in: value?.users.map((ele) => new mongoose.Types.ObjectId(ele))
      };
    }
    // if (value.departments && value.departments.length > 0) {
    //   matchQuery["dept._id"] = {
    //     $in: value?.departments.map((ele) => new mongoose.Types.ObjectId(ele))
    //   };
    // }
    if (value.technologies && value.technologies.length > 0) {
      matchQuery["tech._id"] = {
        $in: value?.technologies.map((ele) => new mongoose.Types.ObjectId(ele))
      };
    }
    if (value.types && value.types.length > 0) {
      matchQuery["type._id"] = {
        $in: value?.types.map((ele) => new mongoose.Types.ObjectId(ele))
      };
    }
    if (value.managers && value.managers.length > 0) {
      matchQuery["mgr._id"] = {
        $in: value?.managers.map((ele) => new mongoose.Types.ObjectId(ele))
      };
    }
    // if (value?.startDate && value?.endDate) {
    //   matchQuery.logged_date = {
    //     $gte: moment(value.startDate).startOf("day").toDate(),
    //     $lte: moment(value.endDate).endOf("day").toDate(),
    //   };
    // }

    let orFilter = [
      !(
        (await checkUserIsAdmin(req?.user?._id)) ||
        req?.user?._id == "660a38c0768eaa003f5727c8"
      )
        ? {
            $or: [
              { "managers._id": new mongoose.Types.ObjectId(req.user._id) },
              { createdBy: new mongoose.Types.ObjectId(req.user._id) }
            ]
          }
        : {}
    ];
    matchQuery = {
      ...matchQuery,
      $and: orFilter
    };
    console.log(
      "🚀 ~ exports.getTimesheetsReports= ~ matchQuery:",
      req?.user?._id,
      req?.user?._id == "660a38c0768eaa003f5727c8",
      JSON.stringify(orFilter)
    );

    let mainQuery = [
      {
        $match: {
          isDeleted: false,
          logged_date: {
            $gte: moment(value.startDate).startOf("day").toDate(),
            $lte: moment(value.endDate).endOf("day").toDate()
          }
        }
      },
      {
        $lookup: {
          from: "projects",
          let: { project_id: "$project_id" },
          pipeline: [
            {
              $lookup: {
                from: "projectstatuses",
                localField: "project_status",
                foreignField: "_id",
                as: "project_status"
              }
            },
            {
              $unwind: {
                path: "$project_status",
                preserveNullAndEmptyArrays: false
              }
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$project_id"] },
                    { $eq: ["$isDeleted", false] },
                    {
                      $eq: [
                        "$project_status.title",
                        DEFAULT_DATA.PROJECT_STATUS.ACTIVE
                      ]
                    },
                    {
                      $eq: ["$companyId", newObjectId(decodedCompanyId)]
                    }
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
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { employee_id: "$employee_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$employee_id"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                    {
                      $eq: ["$companyId", newObjectId(decodedCompanyId)]
                    }
                  ]
                }
              }
            }
          ],
          as: "employee"
        }
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
                    {
                      $eq: ["$companyId", newObjectId(decodedCompanyId)]
                    }
                  ]
                }
              }
            }
          ],
          as: "tech"
        }
      },
      {
        $lookup: {
          from: "projecttypes",
          let: { projecttypes: "$project.project_type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$projecttypes"] },
                    { $eq: ["$isDeleted", false] },
                    {
                      $eq: ["$companyId", newObjectId(decodedCompanyId)]
                    }
                  ]
                }
              }
            }
          ],
          as: "type"
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { employee_id: "$project.manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$employee_id"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] },
                    { $eq: ["$isActivate", true] },
                    {
                      $eq: ["$companyId", newObjectId(decodedCompanyId)]
                    }
                  ]
                }
              }
            }
          ],
          as: "mgr"
        }
      },
      // {
      //   $lookup: {
      //     from: "subdepartments",
      //     let: { department_id: "$employee.subdepartment_id" },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $and: [
      //               { $in: ["$_id", "$$department_id"] },
      //               { $eq: ["$isDeleted", false] }
      //             ]
      //           }
      //         }
      //       }
      //     ],
      //     as: "dept"
      //   }
      // },
      // {
      //   $unwind: {
      //     path: "$dept",
      //     preserveNullAndEmptyArrays: false
      //   }
      // },
      // ...(await getProjectDefaultSettingQuery("project._id")),
      {
        $match: matchQuery
      },
      {
        $project: {
          _id: 1,
          employee_id: 1,
          // user_code: {
          //   $ifNull: [{ $first: "$employee.emp_code" }, ""]
          // },
          user: {
            $ifNull: [{ $first: "$employee.full_name" }, ""]
          },
          project_id: 1,
          project: "$project.title",
          descriptions: 1,
          isDeleted: 1,
          logged_date: 1,
          logged_hours: 1,
          logged_minutes: 1,
          logged_seconds: { $ifNull: ["$logged_seconds", 0] },
          logged_time: {
            $concat: [
              { $toString: "$logged_hours" },
              ":",
              {
                $toString: {
                  $cond: [
                    { $lt: ["$logged_minutes", 10] },
                    { $concat: ["0", { $toString: "$logged_minutes" }] },
                    { $toString: "$logged_minutes" }
                  ]
                }
              },
              ":",
              {
                $toString: {
                  $cond: [
                    { $lt: [{ $ifNull: ["$logged_seconds", 0] }, 10] },
                    { $concat: ["0", { $toString: { $ifNull: ["$logged_seconds", 0] } }] },
                    { $toString: { $ifNull: ["$logged_seconds", 0] } }
                  ]
                }
              }
            ]
          },
          // employeeDepartment: "$dept.sub_department_name",
          // ...(await getProjectDefaultSettingQuery("project._id", true)),
          projectManager: {
            $ifNull: [{ $first: "$mgr.full_name" }, ""]
          },
          projectTechnology: {
            $map: {
              input: "$tech",
              as: "t",
              in: "$$t.project_tech"
            }
          },
          projectType: {
            $ifNull: [{ $first: "$type.project_type" }, ""]
          }
        }
      }
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    let listQuery = getAggregationPagination(mainQuery, pagination);
    const [dataTotal, totalCountResult, data] = await Promise.all([
      TaskHoursLogs.aggregate(mainQuery),
      TaskHoursLogs.aggregate(countQuery),
      TaskHoursLogs.aggregate(listQuery)
    ]);
    // const dataTotal = await TaskHoursLogs.aggregate(mainQuery);
    // const totalCountResult = await TaskHoursLogs.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;
    let metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page
    };
    // const data = await TaskHoursLogs.aggregate(listQuery);
    if (value?.isExport) {
      return dataTotal;
    }
    let totalHours = 0;
    for (let hours of dataTotal)
      totalHours +=
        parseFloat(hours.logged_hours) + parseFloat(hours.logged_minutes) / 60;
    // to get the total hours as per userr
    const userTotalHours = dataTotal.reduce((acc, curr) => {
      const { user, logged_hours, logged_minutes } = curr;
      let totalLoggedHours =
        parseFloat(logged_hours) + parseFloat(logged_minutes) / 60;
      if (!acc[user]) {
        acc[user] = {
          user,
          user: curr.user,
          totalLoggedHours: 0
        };
      }
      acc[user].totalLoggedHours += totalLoggedHours;

      return acc;
    }, {});
    // to convert users hours floating points to be round upto 2 decimal points
    for (const user in userTotalHours) {
      if (Object.hasOwnProperty.call(userTotalHours, user)) {
        userTotalHours[user].totalLoggedHours = parseFloat(
          userTotalHours[user].totalLoggedHours.toFixed(2)
        );
      }
    }

    // to get the total hours as per departments
    // const deptTotalHours = dataTotal.reduce((acc, curr) => {
    //   const { employeeDepartment, logged_hours, logged_minutes } = curr;
    //   let totalLoggedHours =
    //     parseFloat(logged_hours) + parseFloat(logged_minutes) / 60;
    //   if (!acc[employeeDepartment]) {
    //     acc[employeeDepartment] = {
    //       employeeDepartment,
    //       employeeDepartment: curr.employeeDepartment,
    //       totalLoggedHours: 0
    //     };
    //   }
    //   acc[employeeDepartment].totalLoggedHours += totalLoggedHours;

    //   return acc;
    // }, {});
    // to convert departments hours floating points to be round upto 2 decimal points
    // for (const dept in deptTotalHours) {
    //   if (Object.hasOwnProperty.call(deptTotalHours, dept)) {
    //     deptTotalHours[dept].totalLoggedHours = parseFloat(
    //       deptTotalHours[dept].totalLoggedHours.toFixed(2)
    //     );
    //   }
    // }

    // to get the total hours as per types
    const typesTotalHours = dataTotal.reduce((acc, curr) => {
      const { projectType, logged_hours, logged_minutes } = curr;
      let totalLoggedHours =
        parseFloat(logged_hours) + parseFloat(logged_minutes) / 60;
      if (!acc[projectType]) {
        acc[projectType] = {
          projectType,
          projectType: curr.projectType,
          totalLoggedHours: 0
        };
      }
      acc[projectType].totalLoggedHours += totalLoggedHours;

      return acc;
    }, {});
    // to convert types hours floating points to be round upto 2 decimal points
    for (const type in typesTotalHours) {
      if (Object.hasOwnProperty.call(typesTotalHours, type)) {
        typesTotalHours[type].totalLoggedHours = parseFloat(
          typesTotalHours[type].totalLoggedHours.toFixed(2)
        );
      }
    }

    // to get the total hours as per managers
    const mgrTotalHours = dataTotal.reduce((acc, curr) => {
      const { projectManager, logged_hours, logged_minutes } = curr;
      let totalLoggedHours =
        parseFloat(logged_hours) + parseFloat(logged_minutes) / 60;
      if (!acc[projectManager]) {
        acc[projectManager] = {
          projectManager,
          projectManager: curr.projectManager,
          totalLoggedHours: 0
        };
      }
      acc[projectManager].totalLoggedHours += totalLoggedHours;

      return acc;
    }, {});
    // to convert managers hours floating points to be round upto 2 decimal points
    for (const type in mgrTotalHours) {
      if (Object.hasOwnProperty.call(mgrTotalHours, type)) {
        mgrTotalHours[type].totalLoggedHours = parseFloat(
          mgrTotalHours[type].totalLoggedHours.toFixed(2)
        );
      }
    }

    const masterData = {
      data: data,
      totalHours: totalHours.toFixed(2),
      manager: Object.values(mgrTotalHours).sort(
        (a, b) => b.totalLoggedHours - a.totalLoggedHours
      ),
      type: Object.values(typesTotalHours).sort(
        (a, b) => b.totalLoggedHours - a.totalLoggedHours
      ),
      // department: Object.values(deptTotalHours).sort(
      //   (a, b) => b.totalLoggedHours - a.totalLoggedHours
      // ),
      user: Object.values(userTotalHours)
        .sort((a, b) => b.totalLoggedHours - a.totalLoggedHours)
        .slice(0, 9)
    };

    // storeCache(cacheKey, masterData, metaData, 24 * 60 * 60);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      masterData,
      metaData
    );
  } catch (error) {
    console.log("e=>", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.reportsCSV = async (req, res) => {
  try {
    const data = await this.getTimesheetsReports(req, res);
    // console.log("88",data)
    const html = sheet(data);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.HTML_GENERATED,
      html
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getHoursData = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      startDate: Joi.string().allow("").optional(),
      endDate: Joi.string().allow("").optional()
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
      isDeleted: false
    };

    const mainQuery = [
      ...(await getCreatedUpdatedDeletedByQuery()),

      {
        $lookup: {
          from: "projecttaskbugs",
          let: { bug_id: "$bug_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$bug_id"] },
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
      },

      {
        $lookup: {
          from: "projecttasks",
          let: { task_id: "$task_id", bug_task_id: "$bugs.task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$_id", "$$task_id"] },
                        { $eq: ["$_id", "$$bug_task_id"] }
                      ]
                    },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "tasks"
        }
      },
      {
        $unwind: {
          path: "$tasks",
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
          as: "projectDetails"
        }
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "projectmaintasks",
          let: { mainTaskId: "$tasks.main_task_id" },
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
          as: "maintasksDetails"
        }
      },
      // {
      //   $unwind: {
      //     path: "$maintasksDetails",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },

      {
        $lookup: {
          from: "projecttimesheets",
          let: { timesheet_id: "$timesheet_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$timesheet_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "timesheet"
        }
      },
      {
        $unwind: {
          path: "$timesheet",
          preserveNullAndEmptyArrays: true
        }
      },

      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          loggedBy: { $ifNull: ["$createdBy.full_name", ""] },
          loggedBy_img: { $ifNull: ["$createdBy.emp_img", ""] },
          email: { $ifNull: ["$createdBy.email", ""] },
          logged_hours: 1,
          logged_mins: "$logged_minutes",
          logged_seconds: { $ifNull: ["$logged_seconds", 0] },
          createdAt: 1,
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$logged_date",
              timezone: "UTC"
            }
          },
          time: {
            $concat: [
              { $toString: "$logged_hours" },
              "h ",
              {
                $toString: {
                  $concat: [
                    {
                      $toString: {
                        $cond: [{ $lt: ["$logged_minutes", 10] }, "0", ""]
                      }
                    },
                    { $toString: "$logged_minutes" }
                  ]
                }
              },
              "m ",
              {
                $toString: {
                  $concat: [
                    {
                      $toString: {
                        $cond: [{ $lt: [{ $ifNull: ["$logged_seconds", 0] }, 10] }, "0", ""]
                      }
                    },
                    { $toString: { $ifNull: ["$logged_seconds", 0] } }
                  ]
                }
              },
              "s"
            ]
          },
          descriptions: 1,
          project: "$projectDetails.title",
          project_color: "$projectDetails.color",
          subtask_id: 1,
          // main_taskList: "$mainTasks.title",
          main_taskList: { $first: "$maintasksDetails.title" },
          task: "$tasks.title",
          bug: { $ifNull: ["$bugs.title", ""] },
          timesheet: "$timesheet.title",
          logged_status: 1
        }
      }
    ];

    matchQuery.logged_date = {
      $gte: moment(value.startDate).startOf("day").toDate(),
      $lte: moment(value.endDate).endOf("day").toDate()
    };

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await TaskHoursLogs.aggregate(mainQuery);

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data);
  } catch (error) {
    console.log("🚀 ~ exports.getTaskHoursLogsByTimesheet= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

//Get task hours logged by task
exports.getTaskHoursLogsByTask = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      // limit: Joi.number().integer().min(0).default(10),
      // pageNo: Joi.number().integer().min(1).default(1),
      // sort: Joi.string().default("_id"),
      // sortBy: Joi.string().default("desc"),
      orderBy: Joi.string().optional().allow("").default("desc"),
      employee_id: Joi.string().optional().allow(""),
      project_id: Joi.string().required(),
      task_id: Joi.string().required()
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
      project_id: new mongoose.Types.ObjectId(value.project_id),
      task_id: new mongoose.Types.ObjectId(value.task_id)
    };
    if (value?.employee_id) {
      matchQuery = {
        ...matchQuery,
        employee_id: newObjectId(value?.employee_id)
      };
    }
    // const pagination = getPagination({
    //   pageLimit: value.limit,
    //   pageNum: value.pageNo,
    //   sort: value.sort,
    //   sortBy: value.sortBy,
    // });

    const mainQuery = [
      ...(await getCreatedUpdatedDeletedByQuery()),
      { $match: matchQuery },
      {
        $lookup: {
          from: "projecttaskbugs",
          let: { bug_id: "$bug_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$bug_id"] },
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
      },

      {
        $lookup: {
          from: "projecttasks",
          let: { task_id: "$task_id", bug_task_id: "$bugs.task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$_id", "$$task_id"] },
                        { $eq: ["$_id", "$$bug_task_id"] }
                      ]
                    },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "tasks"
        }
      },
      {
        $unwind: {
          path: "$tasks",
          preserveNullAndEmptyArrays: false
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
          as: "projectDetails"
        }
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: false
        }
      },

      {
        $lookup: {
          from: "projectmaintasks",
          let: { mainTaskId: "$tasks.main_task_id" },
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
          as: "maintasksDetails"
        }
      },

      {
        $lookup: {
          from: "projecttimesheets",
          let: { timesheet_id: "$timesheet_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$timesheet_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "timesheet"
        }
      },
      {
        $unwind: {
          path: "$timesheet",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $project: {
          _id: 1,
          loggedBy: { $ifNull: ["$createdBy.full_name", ""] },
          loggedBy_img: { $ifNull: ["$createdBy.emp_img", ""] },
          logged_date: {
            $dateToString: {
              format: "%d-%m-%Y",
              date: "$logged_date",
              timezone: "UTC"
            }
          },
          logged_hours: 1,
          logged_minutes: 1,
          logged_seconds: { $ifNull: ["$logged_seconds", 0] },
          createdAt: 1,
          descriptions: 1,
          projectDetails: {
            _id: 1,
            title: 1
          },
          main_taskList: { $first: "$maintasksDetails.title" },
          task: "$tasks.title",
          bug: { $ifNull: ["$bugs.title", ""] },
          timesheet: {
            _id: 1,
            title: 1
          },
          project_id: 1,
          timesheet_id: 1
        }
      }
    ];

    // const countQuery = getTotalCountQuery(mainQuery);
    // const totalCountResult = await TaskHoursLogs.aggregate(countQuery);
    // const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    // const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await TaskHoursLogs.aggregate(mainQuery);

    if (value.orderBy) {
      if (value.orderBy === "asc") {
        data.sort((a, b) =>
          moment(a.logged_date, "DD-MM-YYYY").diff(
            moment(b.logged_date, "DD-MM-YYYY")
          )
        );
      } else if (value.orderBy === "desc") {
        data.sort((a, b) =>
          moment(b.logged_date, "DD-MM-YYYY").diff(
            moment(a.logged_date, "DD-MM-YYYY")
          )
        );
      }
    }
    // const metaData = {
    //   total: totalCount,
    //   limit: pagination.limit,
    //   pageNo: pagination.page,
    //   totalPages:
    //     pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
    //   currentPage: pagination.page,
    // };

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      value._id ? data[0] : data,
      !value._id && {}
    );
  } catch (error) {
    console.log("🚀 ~ exports.getTaskHoursLogsByTimesheet= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// get my logged time as per projects
exports.getMyLoggedHours = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.array().optional().default([]),
      dateRange: Joi.string().allow("").optional(),
      start_date: Joi.date().optional().default(""),
      end_date: Joi.date().optional().default(""),
      orderBy: Joi.string().allow("").optional(),
      isExport: Joi.boolean().optional().allow("")
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    // Or filter..
    let orFilter = {};

    // get login user role ...
    // if (!(await checkUserIsAdmin(req.user._id))) {
    orFilter = {
      $or: [
        { employee_id: new mongoose.Types.ObjectId(req.user._id) },
        { createdBy: new mongoose.Types.ObjectId(req.user._id) }
      ]
    };
    // }

    let matchQuery = {
      isDeleted: false,
      ...(value.project_id.length > 0
        ? {
            project_id: {
              $in: value.project_id.map((p) => new mongoose.Types.ObjectId(p))
            }
          }
        : {}),

      ...(value.start_date !== "" && value.end_date == ""
        ? {
            logged_date: {
              $gte: moment(value.start_date).startOf("day").toDate()
            }
          }
        : {}),
      ...(value.start_date == "" && value.end_date !== ""
        ? {
            logged_date: {
              $lte: moment(value.end_date).startOf("day").toDate()
            }
          }
        : {}),

      ...(value.start_date !== "" && value.end_date !== ""
        ? {
            logged_date: {
              $gte: moment(value.start_date).startOf("day").toDate(),
              $lte: moment(value.end_date).startOf("day").toDate()
            }
          }
        : {})
    };

    const currentDate = moment();
    let startDt = moment();
    if (value.dateRange === "last_2_week") {
      matchQuery.logged_date = {
        $gte: startDt.subtract(16, "days").toDate(),
        $lte: currentDate.toDate()
      };
    } else if (value.dateRange === "last_week") {
      matchQuery.logged_date = {
        $gte: startDt.subtract(8, "days").toDate(),
        $lte: currentDate.toDate()
      };
    } else if (value.dateRange === "last_month") {
      matchQuery.logged_date = {
        $gte: startDt.subtract(31, "days").toDate(),
        $lte: currentDate.toDate()
      };
    } else if (value.dateRange === "Custom") {
      matchQuery.logged_date = {
        $gte: moment(value.start_date).startOf("day").toDate(),
        $lte: moment(value.end_date).endOf("day").toDate()
      };
    }

    matchQuery = {
      ...matchQuery,
      ...orFilter
    };

    const mainQuery = [
      ...(await getCreatedUpdatedDeletedByQuery()),
      {
        $lookup: {
          from: "projecttaskbugs",
          let: { bug_id: "$bug_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$bug_id"] },
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
      },

      {
        $lookup: {
          from: "projecttasks",
          let: { task_id: "$task_id", bug_task_id: "$bugs.task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$_id", "$$task_id"] },
                        { $eq: ["$_id", "$$bug_task_id"] }
                      ]
                    },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "tasks"
        }
      },
      {
        $unwind: {
          path: "$tasks",
          preserveNullAndEmptyArrays: false
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
          as: "projectDetails"
        }
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: false
        }
      },

      {
        $lookup: {
          from: "projectmaintasks",
          let: { mainTaskId: "$tasks.main_task_id" },
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
          as: "maintasksDetails"
        }
      },

      {
        $lookup: {
          from: "projecttimesheets",
          let: { timesheet_id: "$timesheet_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$timesheet_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "timesheet"
        }
      },
      {
        $unwind: {
          path: "$timesheet",
          preserveNullAndEmptyArrays: false
        }
      },

      { $match: matchQuery },
      {
        $project: {
          _id: 1,
          descriptions: 1,
          logged_hours: 1,
          logged_minutes: 1,
          logged_seconds: { $ifNull: ["$logged_seconds", 0] },
          logged_date: 1,
          projectDetails: {
            _id: 1,
            title: 1
          },
          main_taskList: { $first: "$maintasksDetails.title" },
          task: "$tasks.title",
          bug: { $ifNull: ["$bugs.title", ""] },
          time: {
            $concat: [
              { $toString: "$logged_hours" },
              "h ",
              {
                $toString: {
                  $concat: [
                    {
                      $toString: {
                        $cond: [{ $lt: ["$logged_minutes", 10] }, "0", ""]
                      }
                    },
                    { $toString: "$logged_minutes" }
                  ]
                }
              },
              "m ",
              {
                $toString: {
                  $concat: [
                    {
                      $toString: {
                        $cond: [{ $lt: [{ $ifNull: ["$logged_seconds", 0] }, 10] }, "0", ""]
                      }
                    },
                    { $toString: { $ifNull: ["$logged_seconds", 0] } }
                  ]
                }
              },
              "s"
            ]
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1
          },
          timesheet: {
            _id: 1,
            title: 1
          },
          project_id: 1,
          timesheet_id: 1
        }
      },

      {
        $group: {
          _id: {
            project: "$project_id"
          },
          data: { $push: "$$ROOT" },
          totalHours: { $sum: { $toInt: "$logged_hours" } }, // Convert logged_hours to integer and sum
          totalMinutes: { $sum: { $toInt: "$logged_minutes" } }, // Convert logged_minutes to integer and sum
          totalSeconds: { $sum: { $toInt: { $ifNull: ["$logged_seconds", 0] } } } // Convert logged_seconds to integer and sum
        }
      },
      {
        $lookup: {
          from: "projects",
          let: { project_id: "$_id.project" },
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
          preserveNullAndEmptyArrays: false
        }
      },

      {
        $addFields: {
          total_minutes: {
            $add: [
              {
                $cond: {
                  if: { $eq: [{ $type: "$totalHours" }, "string"] },
                  then: { $multiply: [{ $toInt: "$totalHours" }, 60] },
                  else: { $multiply: ["$totalHours", 60] }
                }
              },
              { $toInt: "$totalMinutes" }
            ]
          },
          total_seconds: {
            $add: [
              {
                $cond: {
                  if: { $eq: [{ $type: "$totalHours" }, "string"] },
                  then: { $multiply: [{ $toInt: "$totalHours" }, 3600] },
                  else: { $multiply: ["$totalHours", 3600] }
                }
              },
              { $multiply: [{ $toInt: "$totalMinutes" }, 60] },
              { $toInt: { $ifNull: ["$totalSeconds", 0] } }
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          project: {
            _id: 1,
            title: 1
          },
          logged_date: 1,
          timesheet: {
            _id: 1,
            title: 1
          },
          logged_data: "$data",
          total_hours: {
            $divide: [{ $floor: { $divide: ["$total_minutes", 60] } }, 1]
          },
          total_minutes: { $mod: ["$total_minutes", 60] },
          total_seconds: { $ifNull: ["$total_seconds", 0] }
        }
      },

      {
        $group: {
          _id: null,
          projects: { $push: "$$ROOT" },
          grandTotalHours: { $sum: "$total_hours" },
          grandTotalMinutes: { $sum: "$total_minutes" }
        }
      },
      {
        $addFields: {
          grandTotalMinutes: {
            $add: [
              {
                $cond: {
                  if: { $eq: [{ $type: "$grandTotalHours" }, "string"] },
                  then: { $multiply: [{ $toInt: "$grandTotalHours" }, 60] },
                  else: { $multiply: ["$grandTotalHours", 60] }
                }
              },
              { $toInt: "$grandTotalMinutes" }
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          projects: 1,
          grandTotalHours: {
            $divide: [{ $floor: { $divide: ["$grandTotalMinutes", 60] } }, 1]
          },
          grandTotalMinutes: { $mod: ["$grandTotalMinutes", 60] }
        }
      }
    ];

    let data = await TaskHoursLogs.aggregate(mainQuery);

    if (value.orderBy) {
      data.forEach((item) => {
        if (value.orderBy === "asc") {
          item?.logged_data?.sort((a, b) =>
            moment(a.logged_date, "DD-MM-YYYY").diff(
              moment(b.logged_date, "DD-MM-YYYY")
            )
          );
        } else if (value.orderBy === "desc") {
          item?.logged_data?.sort((a, b) =>
            moment(b.logged_date, "DD-MM-YYYY").diff(
              moment(a.logged_date, "DD-MM-YYYY")
            )
          );
        }
      });
    }

    // Group logged_data by logged_date
    // data = data.map((project) => {
    //   const groupedLoggedData = project?.logged_data?.reduce((acc, log) => {
    //     const date = moment(log.logged_date).format("YYYY-MM-DD");
    //     if (!acc[date]) {
    //       acc[date] = [];
    //     }
    //     acc[date].push(log);
    //     return acc;
    //   }, {});

    //   const transformedLoggedData = Object.keys(groupedLoggedData).map(
    //     (date) => ({
    //       logged_date: date,
    //       createdBy: project.logged_data[0].createdBy,
    //       data: groupedLoggedData[date],
    //     })
    //   );

    //   return {
    //     ...project,
    //     logged_data: transformedLoggedData,
    //   };
    // });

    if (data.length > 0) {
      data[0].projects = data[0].projects.map((project) => {
        const groupedLoggedData = project.logged_data.reduce((acc, log) => {
          const date = moment(log.logged_date).format("YYYY-MM-DD");
          if (!acc[date]) {
            acc[date] = [];
          }
          log["logged_date"] = moment(log.logged_date).format("DD-MM-YYYY");
          acc[date].push(log);
          return acc;
        }, {});

        const transformedLoggedData = Object.keys(groupedLoggedData).map(
          (date) => ({
            logged_date: date, //moment(date).format("DD-MM-YYYY"),
            createdBy: project.logged_data[0].createdBy,
            data: groupedLoggedData[date]
          })
        );

        return {
          ...project,
          logged_data: transformedLoggedData
        };
      });
    }
    if (value?.isExport) {
      return data[0].projects;
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      data.length > 0
        ? data[0]
        : { projects: [], grandTotalHours: 0, grandTotalMinutes: 0 },
      {}
    );
  } catch (error) {
    console.log("🚀 ~ exports.getMyLoggedHours= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.myloggedhoursDateCSV = async (req, res) => {
  try {
    const data = await this.getMyLoggedHoursbyDate(req, res);
    // console.log("🚀 ~ exports.myloggedhoursDateCSV= ~ data:", data)
    // console.log("88",data)
    const html = sheet1(data);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.HTML_GENERATED,
      html
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.myloggedhoursProjectCSV = async (req, res) => {
  try {
    const data = await this.getMyLoggedHours(req, res);

    const html = sheet2(data);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.HTML_GENERATED,
      html
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getMyLoggedHoursbyDate = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.array().optional().default([]),
      dateRange: Joi.string().allow("").optional(),
      start_date: Joi.date().optional().default(""),
      end_date: Joi.date().optional().default(""),
      orderBy: Joi.string().allow("").optional(),
      isExport: Joi.boolean().optional().allow("")
    });
    const { error, value } = validationSchema.validate(req.body);
    // console.log("🚀 ~ exports.getMyLoggedHoursbyDate= ~ value:", value)
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    // Or filter..
    let orFilter = {};

    // get login user role ...
    // if (!(await checkUserIsAdmin(req.user._id))) {
    orFilter = {
      $or: [
        { employee_id: new mongoose.Types.ObjectId(req.user._id) },
        { createdBy: new mongoose.Types.ObjectId(req.user._id) }
      ]
    };
    // }

    let matchQuery = {
      isDeleted: false,
      ...(value.project_id.length > 0
        ? {
            project_id: {
              $in: value.project_id.map((p) => new mongoose.Types.ObjectId(p))
            }
          }
        : {}),
      ...(value.start_date !== "" && value.end_date == ""
        ? {
            logged_date: {
              $gte: moment(value.start_date).startOf("day").toDate()
            }
          }
        : {}),
      ...(value.start_date == "" && value.end_date !== ""
        ? {
            logged_date: {
              $lte: moment(value.end_date).startOf("day").toDate()
            }
          }
        : {}),
      ...(value.start_date !== "" && value.end_date !== ""
        ? {
            logged_date: {
              $gte: moment(value.start_date).startOf("day").toDate(),
              $lte: moment(value.end_date).startOf("day").toDate()
            }
          }
        : {})
    };

    const currentDate = moment();
    let startDt = moment();
    if (value.dateRange === "last_2_week") {
      matchQuery.logged_date = {
        $gte: startDt.subtract(16, "days").toDate(),
        $lte: currentDate.toDate()
      };
    } else if (value.dateRange === "last_week") {
      matchQuery.logged_date = {
        $gte: startDt.subtract(8, "days").toDate(),
        $lte: currentDate.toDate()
      };
    } else if (value.dateRange === "last_month") {
      matchQuery.logged_date = {
        $gte: startDt.subtract(31, "days").toDate(),
        $lte: currentDate.toDate()
      };
    } else if (value.dateRange === "Custom") {
      matchQuery.logged_date = {
        $gte: moment(value.start_date).startOf("day").toDate(),
        $lte: moment(value.end_date).endOf("day").toDate()
      };
    }
    matchQuery = {
      ...matchQuery,
      ...orFilter
    };

    const mainQuery = [
      ...(await getCreatedUpdatedDeletedByQuery()),
      {
        $lookup: {
          from: "projecttaskbugs",
          let: { bug_id: "$bug_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$bug_id"] },
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
      },

      {
        $lookup: {
          from: "projecttasks",
          let: { task_id: "$task_id", bug_task_id: "$bugs.task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$_id", "$$task_id"] },
                        { $eq: ["$_id", "$$bug_task_id"] }
                      ]
                    },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "tasks"
        }
      },
      {
        $unwind: {
          path: "$tasks",
          preserveNullAndEmptyArrays: false
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
          as: "projectDetails"
        }
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: false
        }
      },

      {
        $lookup: {
          from: "projectmaintasks",
          let: { mainTaskId: "$tasks.main_task_id" },
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
          as: "maintasksDetails"
        }
      },

      {
        $lookup: {
          from: "projecttimesheets",
          let: { timesheet_id: "$timesheet_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$timesheet_id"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "timesheet"
        }
      },
      {
        $unwind: {
          path: "$timesheet",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: matchQuery
      },
      {
        $project: {
          _id: 1,
          descriptions: 1,
          logged_hours: 1,
          logged_minutes: 1,
          logged_seconds: { $ifNull: ["$logged_seconds", 0] },
          logged_date: 1,
          projectDetails: {
            _id: 1,
            title: 1
          },
          main_taskList: { $first: "$maintasksDetails.title" },
          task: "$tasks.title",
          bug: { $ifNull: ["$bugs.title", ""] },
          time: {
            $concat: [
              { $toString: "$logged_hours" },
              "h ",
              {
                $toString: {
                  $concat: [
                    {
                      $toString: {
                        $cond: [{ $lt: ["$logged_minutes", 10] }, "0", ""]
                      }
                    },
                    { $toString: "$logged_minutes" }
                  ]
                }
              },
              "m ",
              {
                $toString: {
                  $concat: [
                    {
                      $toString: {
                        $cond: [{ $lt: [{ $ifNull: ["$logged_seconds", 0] }, 10] }, "0", ""]
                      }
                    },
                    { $toString: { $ifNull: ["$logged_seconds", 0] } }
                  ]
                }
              },
              "s"
            ]
          },
          createdBy: {
            _id: 1,
            full_name: 1,
            emp_img: 1
          },
          timesheet: {
            _id: 1,
            title: 1
          },
          project_id: 1,
          timesheet_id: 1
        }
      }
    ];

    let data = await TaskHoursLogs.aggregate(mainQuery);

    if (value.orderBy) {
      data.sort((a, b) => {
        const dateA = moment(a.logged_date, "YYYY-MM-DD");
        const dateB = moment(b.logged_date, "YYYY-MM-DD");
        if (value.orderBy === "asc") {
          return dateA.diff(dateB);
        } else if (value.orderBy === "desc") {
          return dateB.diff(dateA);
        }
      });
    }

    // Group data by logged_date
    // const groupedData = data.reduce((acc, item) => {
    //   const date = moment(item.logged_date).format("YYYY-MM-DD");
    //   if (!acc[date]) {
    //     acc[date] = [];
    //   }
    //   acc[date].push(item);
    //   return acc;
    // }, {});

    // Group data by logged_date and calculate total time per date
    const groupedData = data.reduce(
      (acc, item) => {
        const date = moment(item.logged_date).format("YYYY-MM-DD");
        if (!acc[date]) {
          acc[date] = {
            items: [],
            totalTime: {
              hours: 0,
              minutes: 0
            }
          };
        }
        // acc[date].items.push(item);
        acc[date].items.push({
          ...item,
          logged_date: moment(item.logged_date).format("DD-MM-YYYY") // Update the format here
        });
        acc[date].totalTime.hours += parseInt(item.logged_hours);
        acc[date].totalTime.minutes += parseInt(item.logged_minutes);

        // Handle minutes overflow
        if (acc[date].totalTime.minutes >= 60) {
          acc[date].totalTime.hours += Math.floor(
            acc[date].totalTime.minutes / 60
          );
          acc[date].totalTime.minutes = acc[date].totalTime.minutes % 60;
        }

        // Calculate grand totals
        acc.grandTotal.hours += parseInt(item.logged_hours);
        acc.grandTotal.minutes += parseInt(item.logged_minutes);
        if (acc.grandTotal.minutes >= 60) {
          acc.grandTotal.hours += Math.floor(acc.grandTotal.minutes / 60);
          acc.grandTotal.minutes = acc.grandTotal.minutes % 60;
        }

        return acc;
      },
      { grandTotal: { hours: 0, minutes: 0 } }
    );

    //   return acc;
    // }, {});
    if (value?.isExport) {
      return groupedData;
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      groupedData,
      {}
    );
  } catch (error) {
    console.log("🚀 ~ exports.getMyLoggedHoursbyDate= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

// API for listing employees data for approved hours feature.
exports.getEmployeesHours = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      sort: Joi.string().default("name"),
      sortBy: Joi.string().default("asc"),
      month: Joi.string().required(),
      year: Joi.string().required(),
      users: Joi.array().optional(),
      dept_ids: Joi.array().optional(),
      isTotals: Joi.boolean().optional(),
      productivity_status: Joi.string().optional().allow(""),
      my_emps: Joi.boolean().required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    // let managedProjects, projectIds;
    let matchQuery = {
      isDeleted: false,
      isActivate: true,
      isSoftDeleted: false
    };

    if (
      value?.my_emps &&
      value?.my_emps != undefined &&
      req?.user?.pms_role_id?.role_name != configRoles.PMS_ROLES.USER
    ) {
      // 1. Fetch all employees reporting to the logged-in user (req.user._id)
      const reportingEmployees = await Employees.find(
        {
          reporting_manager: new mongoose.Types.ObjectId(req.user._id),
          isActivate: true,
          isDeleted: false,
          isSoftDeleted: false
        },
        { _id: 1 }
      );

      // 2. If no employees report to the user, return empty response
      if (!reportingEmployees?.length) {
        return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
      }

      // Get the list of employee IDs reporting to the user
      const employeeIds = reportingEmployees.map((emp) => emp._id);
      // console.log("🚀 ~ exports.getEmployeesHours= ~ employeeIds:", employeeIds)

      // 3. Modify the match query to filter based on the reporting employees
      matchQuery = {
        _id: { $in: employeeIds }
      };
      if (value?.dept_ids?.length > 0) {
        matchQuery["subdepartment_id"] = {
          $in: value?.dept_ids.map((e) => new mongoose.Types.ObjectId(e))
        };
      }
    } else {
      if (value?.dept_ids?.length > 0) {
        matchQuery["subdepartment_id"] = {
          $in: value?.dept_ids.map((e) => new mongoose.Types.ObjectId(e))
        };
      }
    }

    if (value?.users && value?.users?.length > 0) {
      matchQuery = {
        ...matchQuery,
        _id: {
          $in: value?.users.map((ele) => new mongoose.Types.ObjectId(ele))
        }
      };
    }

    const mainQuery = [
      // ...(await getCreatedUpdatedDeletedByQuery()),
      { $match: matchQuery },

      {
        $lookup: {
          from: "subdepartments",
          let: { subdept_id: "$subdepartment_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$_id", "$$subdept_id"] }]
                }
              }
            }
          ],
          as: "subdept"
        }
      },
      {
        $unwind: {
          path: "$subdept",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "empdepartments",
          let: { dept_id: "$department_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$_id", "$$dept_id"] }]
                }
              }
            }
          ],
          as: "dept"
        }
      },
      {
        $unwind: {
          path: "$dept",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { empid: "$reporting_manager" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$empid"] },
                    { $eq: ["$isActivate", true] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "rm"
        }
      },
      {
        $unwind: {
          path: "$rm",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projecttotaltaskhourlogs",
          let: { empid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$employee_id", "$$empid"] },
                    { $eq: ["$month", value?.month || "10"] },
                    { $eq: ["$year", value?.year || "2024"] }
                  ]
                }
              }
            }
          ],
          as: "totalhrs"
        }
      },
      {
        $unwind: {
          path: "$totalhrs",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "approvedhours",
          let: { empid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$employee_id", "$$empid"] },
                    { $eq: ["$month", value?.month || "10"] },
                    { $eq: ["$year", value?.year || "2024"] }
                  ]
                }
              }
            }
          ],
          as: "approvedHours"
        }
      },
      {
        $unwind: {
          path: "$approvedHours",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          totalhrs: { $first: "$totalhrs.total_time" },
          approved_hours: { $first: "$approvedHours.approved_hours" },
          approved_minutes: { $first: "$approvedHours.approved_minutes" },
          notes: { $first: "$approvedHours.notes" },
          subdeptName: { $first: "$subdept.sub_department_name" },
          employeeID: { $first: "$_id" },
          employeeName: { $first: "$full_name" },
          employeeImg: { $first: "$emp_img" },
          name: { $first: "$first_name" },
          rm: { $first: "$rm.full_name" },
          rm_img: { $first: "$rm.emp_img" },
          total_experience_before_elsner: {
            $first: "$employment_details.total_experience_before_elsner"
          },
          joining_date: { $first: "$joining_date" },
          deptName: { $first: "$dept.department_name" }
        }
      },
      // emp exp level...
      {
        $addFields: {
          total_experience: {
            $add: [
              {
                $ifNull: [{ $toDouble: "$total_experience_before_elsner" }, 0]
              },
              {
                $round: [
                  {
                    $divide: [
                      {
                        $dateDiff: {
                          startDate: "$joining_date",
                          endDate: "$$NOW",
                          unit: "month"
                        }
                      },
                      12
                    ]
                  },
                  1
                ]
              }
            ]
          }
        }
      },
      {
        $addFields: {
          empExpLevel: {
            $switch: {
              branches: [
                {
                  case: { $lt: ["$total_experience", 1] },
                  then: "Fresher"
                },
                {
                  case: {
                    $and: [
                      { $gte: ["$total_experience", 1] },
                      { $lt: ["$total_experience", 3] }
                    ]
                  },
                  then: "Junior"
                },
                {
                  case: {
                    $and: [
                      { $gte: ["$total_experience", 3] },
                      { $lt: ["$total_experience", 5] }
                    ]
                  },
                  then: "Mid"
                },
                {
                  case: { $gte: ["$total_experience", 5] },
                  then: "Senior"
                }
              ],
              default: "Unknown"
            }
          }
        }
      },
      {
        $lookup: {
          from: "employees",
          let: { empID: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$reporting_manager", "$$empID"] },
                    { $eq: ["$isActivate", true] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isSoftDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "reportingManagers"
        }
      },
      {
        $addFields: {
          empExpLevel: {
            $cond: {
              if: { $gt: [{ $size: "$reportingManagers" }, 0] },
              then: "TL",
              else: "$empExpLevel"
            }
          }
        }
      },
      //
      {
        $project: {
          _id: 0,
          employee: {
            name: "$employeeName",
            img: "$employeeImg",
            id: "$employeeID",
            totalhrs: "$totalhrs",
            total_hours: { $arrayElemAt: [{ $split: ["$totalhrs", ":"] }, 0] },
            total_minutes: {
              $arrayElemAt: [{ $split: ["$totalhrs", ":"] }, 1]
            },
            approved_hours: "$approved_hours",
            approved_minutes: "$approved_minutes",
            notes: "$notes",
            rm_full_name: "$rm",
            rm_img: "$rm_img",
            total_experience_before_elsner: "$total_experience_before_elsner",
            joining_date: "$joining_date",
            experience_in_elsner: {
              $round: [
                {
                  $divide: [
                    {
                      $dateDiff: {
                        startDate: "$joining_date",
                        endDate: "$$NOW",
                        unit: "month"
                      }
                    },
                    12
                  ]
                },
                1 // Round to 1 decimal place for the fractional years (e.g., 2.5, 1.2, etc.)
              ]
            },
            total_experience: {
              $add: [
                {
                  $ifNull: [{ $toDouble: "$total_experience_before_elsner" }, 0]
                }, // Handle nulls and convert to number
                {
                  $round: [
                    {
                      $divide: [
                        {
                          $dateDiff: {
                            startDate: "$joining_date",
                            endDate: "$$NOW",
                            unit: "month"
                          }
                        },
                        12
                      ]
                    },
                    1 // Round to 1 decimal place
                  ]
                }
              ]
            },
            emp_exp_level: "$empExpLevel"
          },
          // project: "$projectName",
          department: "$deptName",
          subdepartment: "$subdeptName",
          // logs: "$logs",
          name: 1
        }
      },
      {
        $sort: { name: 1 }
      }
    ];
    // let data = await Employees.aggregate(mainQuery);
    let data, metaData, listQuery;

    const pagination = getPagination({
      pageLimit: value.limit,
      pageNum: value.pageNo,
      sort: value.sort,
      sortBy: value.sortBy
    });
    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await Employees.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;
    listQuery = await getAggregationPagination(mainQuery, pagination);
    data = await Employees.aggregate(listQuery);
    // console.log("🚀 ~ exports.getEmployeesHours= ~ data:", data)

    metaData = {
      total: totalCount,
      limit: pagination.limit,
      pageNo: pagination.page,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
      currentPage: pagination.page
    };

    for (let i = 0; i < data.length; i++) {
      let expectedHours = 0;
      let expected_productivity = 0;
      switch (data[i]?.employee?.emp_exp_level) {
        case "Fresher":
          expected_productivity = 50;
          break;

        case "Junior":
          expected_productivity = 75;
          break;

        case "Mid":
        case "TL":
          expected_productivity = 100;
          break;

        case "Senior":
          expected_productivity = 140;
          break;

        default:
          expected_productivity = 0;
          break;
      }
      let empID = data[i].employee.id;
      // console.log("🚀 ~ exports.getEmployeesHours= ~ empID:", empID);
      let totalWorkingTime = await this.getTotalLoggedHoursForMonthByEmployee(
        value?.month,
        value?.year,
        empID
      );

      let totalWorkingTimeInMinutes, approvedTimeInMinutes, overallProductivity;
      let productivityStatus = "";
      // to check if we have the proper data then and then only to calcluate the productivity, for the query optimization due to load..
      if (
        totalWorkingTime &&
        data[i].employee.total_hours &&
        data[i].employee.total_minutes &&
        data[i].employee.approved_hours &&
        data[i].employee.approved_minutes
      ) {
        // Get total working time in minutes
        totalWorkingTimeInMinutes =
          parseInt(totalWorkingTime[0].total_hours_as_working_days_ofemp) * 60 +
          parseInt(totalWorkingTime[0].total_minutes_as_working_days_ofemp);
        // console.log(data[i]?.employee.name)
        // console.log("🚀 ~ exports.getEmployeesHours= ~ totalWorkingTimeInMinutes:", totalWorkingTimeInMinutes)
        expectedHours =
          (totalWorkingTimeInMinutes / 60) * (expected_productivity / 100);
        // console.log("🚀 ~ exports.getEmployeesHours= ~ expectedHours:", expectedHours)

        // Calculate approved time (convert to minutes)
        approvedTimeInMinutes =
          parseInt(data[i].employee.approved_hours) * 60 +
          parseInt(data[i].employee.approved_minutes);

        // console.log("🚀 ~ exports.getEmployeesHours= ~ approvedTimeInMinutes:", approvedTimeInMinutes)

        // Calculate Overall Productivity
        overallProductivity =
          (((approvedTimeInMinutes / 60) * (expected_productivity / 100)) /
            expectedHours) *
          100;
        // console.log("🚀 ~ exports.getEmployeesHours= ~ overallProductivity:", overallProductivity)

        // Set productivity status for freshers based on overall productivity
        switch (data[i]?.employee?.emp_exp_level) {
          case "Fresher":
            if (overallProductivity < 50) {
              productivityStatus = "low";
            } else if (overallProductivity === 50) {
              productivityStatus = "match";
            } else {
              productivityStatus = "more";
            }
            break;

          case "Junior":
            if (overallProductivity < 75) {
              productivityStatus = "low";
            } else if (overallProductivity === 75) {
              productivityStatus = "match";
            } else {
              productivityStatus = "more";
            }
            break;

          case "Mid":
          case "TL":
            if (overallProductivity < 100) {
              productivityStatus = "low";
            } else if (overallProductivity === 100) {
              productivityStatus = "match";
            } else {
              productivityStatus = "more";
            }
            break;

          case "Senior":
            if (overallProductivity < 140) {
              productivityStatus = "low";
            } else if (overallProductivity === 140) {
              productivityStatus = "match";
            } else {
              productivityStatus = "more";
            }
            break;

          default:
            productivityStatus = "unknown";
            break;
        }
      }

      if (
        data[i]?.employee?.approved_hours &&
        data[i]?.employee?.approved_hours != null &&
        data[i]?.employee?.approved_hours != undefined
      ) {
        data[i].employee = {
          ...data[i].employee,
          totalWorkingTime: totalWorkingTime[0],
          productivity: {
            expectedHours: expectedHours,
            overallProductivity: overallProductivity?.toFixed(2) // Overall productivity
          },
          productivity_status: productivityStatus
        };
      } else {
        data[i].employee = {
          ...data[i].employee,
          totalWorkingTime: totalWorkingTime[0]
        };
      }
    }

    // if (
    //   value?.productivity_status &&
    //   value?.productivity_status != "" &&
    //   value?.productivity_status != null &&
    //   value?.productivity_status != undefined
    // ) {
    //   const statusToFilter = value.productivity_status;
    //   data = data.filter(
    //     (ele) => ele?.employee?.productivity_status === statusToFilter
    //   );
    // }

    let data2 = await Employees.aggregate(mainQuery);

    const grandTotal = data2
      ? data2.reduce(
          (accumulator, currentEmployee) => {
            const totalHours =
              currentEmployee.employee.total_hours != null
                ? parseInt(currentEmployee.employee.total_hours, 10)
                : 0;
            const totalMinutes =
              currentEmployee.employee.total_minutes != null
                ? parseInt(currentEmployee.employee.total_minutes, 10)
                : 0;

            accumulator.hours += totalHours;
            accumulator.minutes += totalMinutes;

            return accumulator;
          },
          { hours: 0, minutes: 0 }
        )
      : { hours: 0, minutes: 0 };

    // Adjust hours and minutes if minutes >= 60
    if (grandTotal.minutes >= 60) {
      grandTotal.hours += Math.floor(grandTotal.minutes / 60);
      grandTotal.minutes = grandTotal.minutes % 60;
    }

    // Calculate the grand total approved hours and minutes
    const grandApprovedTotal = data2
      ? data2.reduce(
          (accumulator, currentEmployee) => {
            const approvedHours =
              currentEmployee.employee.approved_hours != null
                ? parseInt(currentEmployee.employee.approved_hours, 10)
                : 0;
            const approvedMinutes =
              currentEmployee.employee.approved_minutes != null
                ? parseInt(currentEmployee.employee.approved_minutes, 10)
                : 0;

            accumulator.hours += approvedHours;
            accumulator.minutes += approvedMinutes;

            return accumulator;
          },
          { hours: 0, minutes: 0 }
        )
      : { hours: 0, minutes: 0 };

    // Adjust hours and minutes if minutes >= 60
    if (grandApprovedTotal.minutes >= 60) {
      grandApprovedTotal.hours += Math.floor(grandApprovedTotal.minutes / 60);
      grandApprovedTotal.minutes = grandApprovedTotal.minutes % 60;
    }

    const totalData = { grandTotal, grandApprovedTotal };
    metaData.totalData = totalData;

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      data,
      metaData ? metaData : {}
    );
  } catch (error) {
    console.log("🚀 ~ exports.getTaskHoursLogsByTimesheet= ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
// to get grand total hours of all employees
exports.getHoursDetails = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      emp_id: Joi.string().required(),
      month: Joi.string().required(),
      year: Joi.string().required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    // let managedProjects, projectIds;
    let matchQuery = {
      isDeleted: false,
      "createdBy._id": new mongoose.Types.ObjectId(value?.emp_id),
      logged_date: {
        $gte: moment(`${value.year}-${value.month}-01`)
          .startOf("month")
          .toDate(),
        $lte: moment(`${value.year}-${value.month}-01`).endOf("month").toDate()
      }
    };

    const mainQuery = [
      ...(await getCreatedUpdatedDeletedByQuery()),
      { $match: matchQuery },
      {
        $lookup: {
          from: "projecttaskbugs",
          let: { bug_id: "$bug_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$bug_id"] },
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
      },
      {
        $lookup: {
          from: "projecttasks",
          let: { task_id: "$task_id", bug_task_id: "$bugs.task_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$_id", "$$task_id"] },
                        { $eq: ["$_id", "$$bug_task_id"] }
                      ]
                    },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "tasks"
        }
      },
      {
        $unwind: {
          path: "$tasks",
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
          as: "projectDetails"
        }
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "projectmaintasks",
          let: { mainTaskId: "$tasks.main_task_id" },
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
          as: "maintasksDetails"
        }
      },
      {
        $unwind: {
          path: "$maintasksDetails",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $group: {
          _id: "$createdBy._id",
          logs: {
            $push: {
              logged_date: {
                $dateToString: {
                  format: "%d-%m-%Y",
                  date: "$logged_date",
                  timezone: "UTC"
                }
              },
              task: "$tasks.title",
              main_task: "$maintasksDetails.title",
              project: "$projectDetails.title",
              bug: { $ifNull: ["$bugs.title", " - "] },
              logged_hours: "$logged_hours",
              logged_minutes: "$logged_minutes",
              descriptions: "$descriptions",
              employee: {
                name: "$createdBy.full_name",
                img: "$createdBy.emp_img"
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          logs: "$logs"
        }
      },
      {
        $sort: { name: 1 }
      }
    ];

    let data = await TaskHoursLogs.aggregate(mainQuery);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      data[0]?.logs ? data[0]?.logs : data,
      {}
    );
  } catch (error) {
    console.log(
      "🚀 ~ exports.grandTotalforTrackedandApprovedHours= ~ error:",
      error
    );
    return catchBlockErrorResponse(res, error.message);
  }
};

// to claulate total time
exports.getTotalTime = (hours, minutes, days) => {
  // console.log("🚀 ~ hours, minutes, days:", hours, minutes, days)
  const totalWorkHoursPerDay = hours;
  const totalWorkMinutesPerDay = minutes;
  const totalWorkingDays = days;
  let totalExpectedHours = totalWorkingDays * totalWorkHoursPerDay;
  let totalExpectedMinutes = totalWorkingDays * totalWorkMinutesPerDay;

  // Handle minutes overflow
  if (totalExpectedMinutes >= 60) {
    totalExpectedHours += Math.floor(totalExpectedMinutes / 60);
    totalExpectedMinutes = totalExpectedMinutes % 60;
  }
  return {
    total_hours: totalExpectedHours,
    total_minutes: totalExpectedMinutes
  };
};
// to get total working days and hours according to that.
exports.getTotalLoggedHoursForMonthByEmployee = async (
  month,
  year,
  empId,
  dashboardHours = false
) => {
  try {
    let startDate = moment(`${year}-${month}-01`).startOf("month").toDate();
    let endDate1 = moment(`${year}-${month}-01`).endOf("month").toDate();

    // *********************** FIRST - Half complete to get the total working days as of month *****************************************

    startDate = moment(`${year}-${month}-01`).startOf("month").toDate();
    endDate1 = moment(`${year}-${month}-01`).endOf("month").toDate();
    let endDate2 = moment().startOf("day").toDate();

    let endDate = dashboardHours ? endDate2 : endDate1;

    let employees_total_time_data_as_working_days = [];
    // now to get the employees' leave records

    const empWorkingDayData = await employeeInOutTimes.find({
      employee_id: new mongoose.Types.ObjectId(empId),
      $or: [
        { workedTime: { $ne: "" } },
        {
          record_type: {
            $in: ["Working Day", "First-Half", "Second-Half", "Flexy-Leave"]
          }
        }
      ],
      created_At: {
        $gte: startDate,
        $lte: endDate
      }
    });
    let workingday_sum = 0;
    empWorkingDayData.map((e) => {
      if (
        e.record_type == "Working Day" ||
        e.record_type == "Flexy-Leave" ||
        e?.workedTime != ""
      ) {
        workingday_sum++;
      }
    });

    let working_day_time = this.getTotalTime(8, 30, workingday_sum);

    let halfdays_sum = 0;
    empWorkingDayData.map((e) => {
      if (e.record_type == "First-Half" || e.record_type == "Second-Half") {
        halfdays_sum++;
      }
    });

    let half_day_time = this.getTotalTime(4, 0, halfdays_sum);

    let final_total_hours_of_emp =
      working_day_time.total_hours + half_day_time.total_hours;
    let final_total_minutes_of_emp =
      working_day_time.total_minutes + half_day_time.total_minutes;

    employees_total_time_data_as_working_days.push({
      employee_id: empId,
      total_hours_as_working_days_ofemp: final_total_hours_of_emp,
      total_minutes_as_working_days_ofemp: final_total_minutes_of_emp
    });
    // *********************** SECOND - Half complete, fetching the employee's working days and half days data and the total time for that employee **********

    return employees_total_time_data_as_working_days;
  } catch (error) {
    console.log("🚀 ~ exports.getMyLoggedHoursbyDate= ~ error:", error);
  }
};

exports.getTaskHoursLogsfortotal = async (req, res) => {
  try {
    // Fetch active employees who are applicable for PMS
    const empdata = await Employees.aggregate([
      {
        $match: {
          isActivate: true,
          isDeleted: false,
          isSoftDeleted: false
          // pms_applicable: true
        }
      },
      {
        $project: {
          _id: 1,
          emp_code: 1,
          full_name: 1
        }
      }
    ]);

    const startDate = moment("2024-10-01").startOf("day").toDate();
    const endDate = moment().endOf("day").toDate();

    // Iterate over each employee
    for (let emp of empdata) {
      const hoursLogged = await TaskHoursLogs.aggregate([
        {
          $match: {
            isDeleted: false,
            createdBy: new mongoose.Types.ObjectId(emp._id),
            logged_date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total_logged_hours: { $sum: { $toInt: "$logged_hours" } },
            total_logged_minutes: { $sum: { $toInt: "$logged_minutes" } },
            logs: {
              $push: {
                logged_hours: "$logged_hours",
                logged_minutes: "$logged_minutes",
                logged_date: "$logged_date"
              }
            }
          }
        },
        {
          $project: {
            total_hours: {
              $add: [
                "$total_logged_hours",
                { $floor: { $divide: ["$total_logged_minutes", 60] } }
              ]
            },
            total_minutes: { $mod: ["$total_logged_minutes", 60] },
            logs: 1
          }
        }
      ]);

      if (hoursLogged.length > 0) {
        const logData = hoursLogged[0];
        console.log(
          "🚀 ~ exports.getTaskHoursLogsfortotal= ~ emp:",
          emp.full_name
        );
        console.log(
          "🚀 ~ exports.getTaskHoursLogsfortotal= ~ logData:",
          logData
        );
        const month = "10"; // October
        const year = "2024";

        const newTotalTime = `${String(logData.total_hours).padStart(
          2,
          "0"
        )}:${String(logData.total_minutes).padStart(2, "0")}`;

        // Create new entry in total task hour logs table
        await ProjectTotalTaskHourLogs.updateOne(
          { employee_id: emp._id, month, year },
          {
            $set: {
              total_time: newTotalTime,
              updatedBy: req.user._id
            },
            $setOnInsert: {
              employee_id: emp._id,
              month,
              year,
              createdBy: req.user._id,
              ...(await getRefModelFromLoginUser(req.user))
            }
          },
          { upsert: true }
        );

        console.log(
          `Employee: ${emp.full_name} | Total Hours: ${newTotalTime}`
        );
      }
    }

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, [], {});
  } catch (error) {
    console.error("🚀 ~ error:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
