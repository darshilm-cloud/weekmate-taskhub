const mongoose = require("mongoose");
const moment = require("moment");
const TaskTimers = mongoose.model("tasktimers");
const TaskHourLogs = mongoose.model("projecttaskhourlogs");
const Companies = mongoose.model("companies");
const ProjectTasks = mongoose.model("projecttasks");
const Project = mongoose.model("projects");
const ProjectTimesheets = mongoose.model("projecttimesheets");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const Joi = require("joi");
const { getRefModelFromLoginUser } = require("../helpers/common");

/**
 * Helper function to get existing timesheet for a project
 */
const getProjectTimesheet = async (projectId) => {
  try {
    // Find an existing active timesheet for the project
    const timesheet = await ProjectTimesheets.findOne({
      project_id: new mongoose.Types.ObjectId(projectId),
      isDeleted: false,
      status: "active"
    }).sort({ 
      isDefault: -1, // Prioritize default timesheets
      createdAt: -1   // Then most recent
    });

    if (timesheet) {
      console.log(`✅ Found timesheet: ${timesheet.title} for project: ${projectId}`);
      return timesheet._id;
    } else {
      console.warn(`⚠️  No active timesheet found for project: ${projectId}`);
      return null;
    }
  } catch (error) {
    console.error("❌ Error in getProjectTimesheet:", error);
    return null;
  }
};

/**
 * Start timer for a task
 */
exports.startTimer = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      task_id: Joi.string().required(),
    });
    
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    }

    // Check if user already has an active timer
    const activeTimer = await TaskTimers.findOne({
      user_id: req.user._id,
      is_active: true,
      isDeleted: false,
    });

    if (activeTimer) {
      return errorResponse(res, statusCode.CONFLICT, "Please stop your current timer before starting a new one");
    }

    // Verify task exists
    const task = await ProjectTasks.findOne({
      _id: new mongoose.Types.ObjectId(value.task_id),
      isDeleted: false,
      status: "active",
    });

    if (!task) {
      return errorResponse(res, statusCode.NOT_FOUND, "Task not found");
    }

    // Create new timer
    const timerData = {
      task_id: value.task_id,
      user_id: req.user._id,
      start_time: new Date(),
      is_active: true,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req.user)),
    };

    const newTimer = new TaskTimers(timerData);
    const savedTimer = await newTimer.save();

    return successResponse(res, statusCode.CREATED, "Timer started successfully", {
      timer_id: savedTimer._id,
      task_id: savedTimer.task_id,
      start_time: savedTimer.start_time,
    });
  } catch (error) {
    console.error("Error in startTimer:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

/**
 * Stop timer for a task
 */
exports.stopTimer = async (req, res) => {
  try {
    // Find user's active timer
    const activeTimer = await TaskTimers.findOne({
      task_id: req.body.task_id,
      user_id: req.user._id,
      is_active: true,
      isDeleted: false,
    });

    if (!activeTimer) {
      return errorResponse(res, statusCode.NOT_FOUND, "No active timer found");
    }

    // Calculate duration
    const stopTime = new Date();
    const durationSeconds = Math.floor((stopTime - activeTimer.start_time) / 1000);
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;

    // Update timer
    const updatedTimer = await TaskTimers.findByIdAndUpdate(
      activeTimer._id,
      {
        stop_time: stopTime,
        duration_minutes: Math.floor(durationSeconds / 60),
        duration_seconds: durationSeconds,
        is_active: false,
        updatedBy: req.user._id,
        updatedAt: new Date(),
      },
      { new: true }
    );

    // Get task details for log
    const task = await ProjectTasks.findById(activeTimer.task_id);

    if (!task) {
      return errorResponse(res, statusCode.NOT_FOUND, "Task not found");
    }

    // Get existing timesheet for the project
    const timesheetId = await getProjectTimesheet(task.project_id);

    if (!timesheetId) {
      return errorResponse(res, statusCode.NOT_FOUND, "No active timesheet found for this project. Please create a timesheet first.");
    }

    // Create log in projecttaskhourlogs
    const logData = {
      employee_id: req.user._id,
      project_id: task.project_id,
      task_id: activeTimer.task_id,
      subtask_id: null,
      bug_id: null,
      timesheet_id: timesheetId, // Use existing timesheet ID
      descriptions: "Auto-logged via timer",
      logged_hours: hours.toString().padStart(2, '0'),
      logged_minutes: minutes.toString().padStart(2, '0'),
      logged_seconds: seconds.toString().padStart(2, '0'),
      logged_date: new Date(),
      isManuallyAdded: false, // Timer log
      logged_status: "Void",
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...(await getRefModelFromLoginUser(req.user)),
    };

    const newLog = new TaskHourLogs(logData);
    await newLog.save();

    return successResponse(res, statusCode.OK, "Timer stopped successfully", {
      timer_id: updatedTimer._id,
      task_id: updatedTimer.task_id,
      start_time: updatedTimer.start_time,
      stop_time: updatedTimer.stop_time,
      duration: `${hours}h ${minutes}m ${seconds}s`,
      duration_seconds: durationSeconds,
      duration_minutes: Math.floor(durationSeconds / 60),
      log_id: newLog._id,
      timesheet_id: timesheetId,
    });
  } catch (error) {
    console.error("Error in stopTimer:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

/**
 * Get timer status and history for a specific task
 */
exports.getTaskTimerStatus = async (req, res) => {
  try {
    const { task_id } = req.params;
    
    if (!task_id) {
      return errorResponse(res, statusCode.BAD_REQUEST, "Task ID is required");
    }

    // Only get records for current date
    const today = moment().startOf('day').toDate();
    const tomorrow = moment().add(1, 'day').startOf('day').toDate();

    // Get all timer sessions for this task by this user (current date only)
    const timerSessions = await TaskTimers.find({
      task_id: new mongoose.Types.ObjectId(task_id),
      user_id: req.user._id,
      isDeleted: false,
      start_time: { $gte: today, $lt: tomorrow }
    }).sort({ start_time: -1 });

    // Check if user has an active timer for this task
    const activeTimer = timerSessions.find(session => session.is_active === true);

    // Calculate total time spent on this task
    const completedSessions = timerSessions.filter(session => session.is_active === false);
    const totalSeconds = completedSessions.reduce((sum, session) => sum + (session.duration_seconds || 0), 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    // Format sessions data
    const sessions = timerSessions.map(session => {
      const totalSeconds = session.duration_seconds || 0;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      return {
        session_id: session._id,
        start_time: session.start_time,
        stop_time: session.stop_time,
        duration_minutes: session.duration_minutes,
        duration_seconds: session.duration_seconds,
        duration_breakdown: {
          hours: hours,
          minutes: minutes,
          seconds: seconds,
        },
        duration_formatted: `${hours}h ${minutes}m ${seconds}s`,
        is_active: session.is_active,
        created_at: session.createdAt,
      };
    });

    return successResponse(res, statusCode.OK, "Task timer status retrieved", {
      task_id: task_id,
      user_id: req.user._id,
      active_timer: activeTimer ? {
        session_id: activeTimer._id,
        start_time: activeTimer.start_time,
        current_duration_minutes: Math.floor((new Date() - activeTimer.start_time) / (1000 * 60)),
        current_duration_seconds: Math.floor((new Date() - activeTimer.start_time) / 1000),
        current_duration_breakdown: (() => {
          const currentSeconds = Math.floor((new Date() - activeTimer.start_time) / 1000);
          const hours = Math.floor(currentSeconds / 3600);
          const minutes = Math.floor((currentSeconds % 3600) / 60);
          const seconds = currentSeconds % 60;
          return { hours, minutes, seconds };
        })(),
        current_duration_formatted: (() => {
          const currentSeconds = Math.floor((new Date() - activeTimer.start_time) / 1000);
          const hours = Math.floor(currentSeconds / 3600);
          const minutes = Math.floor((currentSeconds % 3600) / 60);
          const seconds = currentSeconds % 60;
          return `${hours}h ${minutes}m ${seconds}s`;
        })(),
        is_active: true,
      } : null,
      total_time_spent: {
        hours: totalHours,
        minutes: totalMinutes,
        seconds: remainingSeconds,
        total_seconds: totalSeconds,
        total_minutes: Math.floor(totalSeconds / 60),
      },
      sessions: sessions,
      sessions_count: timerSessions.length,
      completed_sessions: completedSessions.length,
    });
  } catch (error) {
    console.error("Error in getTaskTimerStatus:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};

/**
 * Auto-stop timers at end of day
 */
exports.autoStopTimers = async () => {
  try {
    console.log("🔄 Starting auto-stop timers...");
    
    const today = moment().startOf('day').toDate();
    
    // Find all active timers
    const activeTimers = await TaskTimers.find({
      is_active: true,
      isDeleted: false,
      createdAt: {
        $gte: today,
        $lte: moment().endOf('day').toDate(),
      },
    }).populate('user_id', 'firstName lastName').populate('task_id', 'project_id');

    console.log(`📋 Found ${activeTimers.length} active timers to process`);

    let autoStoppedCount = 0;

    for (const timer of activeTimers) {
      try {
        // Get company work hours
        const company = await Companies.findOne({
          _id: timer.task_id.project_id,
          isDeleted: false,
        });

        const workHoursPerDay = company?.workHoursPerDay || 8.5;
        const workMinutesPerDay = workHoursPerDay * 60;

        // Calculate total time spent today by this user
        const todaySessions = await TaskHourLogs.find({
          employee_id: timer.user_id,
          isDeleted: false,
          logged_date: {
            $gte: today,
            $lte: moment().endOf('day').toDate(),
          },
        });

        const totalSpentMinutes = todaySessions.reduce((sum, session) => {
          const hours = parseInt(session.logged_hours) || 0;
          const minutes = parseInt(session.logged_minutes) || 0;
          return sum + (hours * 60) + minutes;
        }, 0);

        // Calculate remaining time
        const remainingMinutes = workMinutesPerDay - totalSpentMinutes;

        if (remainingMinutes <= 0) {
          // No time left, stop immediately
          const stopTime = timer.start_time;
          await TaskTimers.findByIdAndUpdate(timer._id, {
            stop_time: stopTime,
            duration_minutes: 0,
            duration_seconds: 0,
            is_active: false,
            updatedAt: new Date(),
          });
          console.log(`⚠️ Auto-stopped timer for ${timer.user_id.firstName} - No time remaining`);
        } else {
          // Stop timer with remaining time
          const stopTime = new Date(timer.start_time.getTime() + (remainingMinutes * 60 * 1000));
          const hours = Math.floor(remainingMinutes / 60);
          const minutes = remainingMinutes % 60;
          const seconds = 0; // For auto-stop, we're dealing with minutes, so seconds = 0
          
          await TaskTimers.findByIdAndUpdate(timer._id, {
            stop_time: stopTime,
            duration_minutes: remainingMinutes,
            duration_seconds: remainingMinutes * 60,
            is_active: false,
            updatedAt: new Date(),
          });

          // Get task details
          const task = await ProjectTasks.findById(timer.task_id._id);
          
          if (task) {
            // Get existing timesheet for the project
            const timesheetId = await getProjectTimesheet(task.project_id);

            if (timesheetId) {
              // Create log in projecttaskhourlogs
              const logData = {
                employee_id: timer.user_id._id,
                project_id: timer.task_id.project_id,
                task_id: timer.task_id._id,
                subtask_id: null,
                bug_id: null,
                timesheet_id: timesheetId, // Use existing timesheet ID
                logged_hours: hours.toString().padStart(2, '0'),
                logged_minutes: minutes.toString().padStart(2, '0'),
                logged_seconds: seconds.toString().padStart(2, '0'),
                logged_date: new Date(),
                isManuallyAdded: false, // Auto-stop log
                logged_status: "Void",
                descriptions: "Auto-stopped timer at end of day",
                createdBy: timer.user_id._id,
                updatedBy: timer.user_id._id,
                ...await getRefModelFromLoginUser(timer.user_id)
              };

              const newLog = new TaskHourLogs(logData);
              await newLog.save();

              console.log(`⚠️ Auto-stopped timer for ${timer.user_id.firstName} - Remaining: ${remainingMinutes} minutes - ${task.title}`);
            } else {
              console.warn(`⚠️ No timesheet found for project ${task.project_id} - skipping log creation`);
            }
          }
        }

        autoStoppedCount++;
      } catch (error) {
        console.error(`❌ Error auto-stopping timer ${timer._id}:`, error);
      }
    }

    console.log(`✅ Auto-stopped ${autoStoppedCount} timers`);
    return {
      success: true,
      autoStoppedCount,
      message: `Successfully auto-stopped ${autoStoppedCount} timers`,
    };
  } catch (error) {
    console.error("❌ Error in autoStopTimers:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to auto-stop timers",
    };
  }
};

exports.stopMultipleTimers = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      task_id: Joi.string().required(),
      user_ids: Joi.array().items(Joi.string()).min(1).required(),
    });
    
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    }

    // Get task details to find createdBy and updatedBy
    const task = await ProjectTasks.findById(value.task_id);
    if (!task) {
      return errorResponse(res, statusCode.NOT_FOUND, "Task not found");
    }

    // Get project details to find project's createdBy and updatedBy
    const project = await Project.findById(task.project_id);
    if (!project) {
      return errorResponse(res, statusCode.NOT_FOUND, "Project not found");
    }

    // Create final user_ids array including task owners and project owners
    // Normalize all IDs to strings and remove duplicates
    const finalUserIds = [...new Set([
      ...value.user_ids.map(id => id.toString()),           // Frontend provided users (normalized to string)
      ...(task.createdBy ? [task.createdBy.toString()] : []),      // Task creator
      ...(task.updatedBy ? [task.updatedBy.toString()] : []),      // Task updater
      ...(project.createdBy ? [project.createdBy.toString()] : []), // Project creator
      ...(project.updatedBy ? [project.updatedBy.toString()] : [])   // Project updater
    ])];

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const userId of finalUserIds) {
      try {
        console.log(userId)
        // Find user's active timer
        const activeTimer = await TaskTimers.findOne({
          task_id: value.task_id,
          user_id: new mongoose.Types.ObjectId(userId),
          is_active: true,
          isDeleted: false,
        });

        if (!activeTimer) {
          results.push({
            user_id: userId,
            status: "no_active_timer",
            message: "No active timer found for this user"
          });
          continue;
        }

        // Calculate duration
        const stopTime = new Date();
        const durationSeconds = Math.floor((stopTime - activeTimer.start_time) / 1000);
        const durationMinutes = Math.floor(durationSeconds / 60);
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        const seconds = durationSeconds % 60;

        // Update timer
        const updatedTimer = await TaskTimers.findByIdAndUpdate(
          activeTimer._id,
          {
            stop_time: stopTime,
            duration_minutes: durationMinutes,
            duration_seconds: durationSeconds,
            is_active: false,
            updatedBy: req.user._id,
            updatedAt: new Date(),
          },
          { new: true }
        );

        // Get task details for log
        const task = await ProjectTasks.findById(activeTimer.task_id);

        if (!task) {
          results.push({
            user_id: userId,
            status: "error",
            message: "Task not found"
          });
          errorCount++;
          continue;
        }

        // Get existing timesheet for the project
        const timesheetId = await getProjectTimesheet(task.project_id);

        if (!timesheetId) {
          results.push({
            user_id: userId,
            status: "error",
            message: "No active timesheet found for this project"
          });
          errorCount++;
          continue;
        }

        // Create log in projecttaskhourlogs
        const logData = {
          employee_id: userId,
          project_id: task.project_id,
          task_id: activeTimer.task_id,
          subtask_id: null,
          bug_id: null,
          timesheet_id: timesheetId, // Use existing timesheet ID
          logged_hours: hours.toString().padStart(2, '0'),
          logged_minutes: minutes.toString().padStart(2, '0'),
          logged_seconds: seconds.toString().padStart(2, '0'),
          logged_date: new Date(),
          isManuallyAdded: false, // Timer log
          logged_status: "Void",
          descriptions: "Auto logged via timer",
          createdBy: userId,
          updatedBy: userId,
          ...(await getRefModelFromLoginUser(req.user)),
        };

        console.log(logData)

        const newLog = new TaskHourLogs(logData);
        await newLog.save();

        results.push({
          user_id: userId,
          status: "success",
          message: "Timer stopped successfully",
          timer_id: updatedTimer._id,
          task_id: updatedTimer.task_id,
          start_time: updatedTimer.start_time,
          stop_time: updatedTimer.stop_time,
          duration: `${hours}h ${minutes}m`,
          log_id: newLog._id,
          timesheet_id: timesheetId,
        });

        successCount++;
      } catch (error) {
        results.push({
          user_id: userId,
          status: "error",
          message: error.message
        });
        errorCount++;
      }
    }

    return successResponse(res, statusCode.OK, "Multiple timers processed", {
      task_id: value.task_id,
      project_id: task.project_id,
      requested_users: value.user_ids.length,
      total_users_processed: finalUserIds.length,
      added_task_owners: finalUserIds.length - value.user_ids.length,
      task_creator: task.createdBy ? task.createdBy.toString() : null,
      task_updater: task.updatedBy ? task.updatedBy.toString() : null,
      project_creator: project.createdBy ? project.createdBy.toString() : null,
      project_updater: project.updatedBy ? project.updatedBy.toString() : null,
      success_count: successCount,
      error_count: errorCount,
      results: results
    });
  } catch (error) {
    console.error("Error in stopMultipleTimers:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};