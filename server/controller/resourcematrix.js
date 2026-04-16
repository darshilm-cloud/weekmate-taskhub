const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const _ = require("lodash");
const mongoose = require("mongoose");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const Projects = mongoose.model("projects");
const WorkFlowStatus = mongoose.model("workflowstatus");
const ProjectSubTask = mongoose.model("projecttasks");
const ProjectTaskHourLogs = mongoose.model("projecttaskhourlogs");
const Employees = mongoose.model("employees");
 const moment = require('moment');

exports.getTaskHubMatrix = async (req, res) => {
  try {
    // ------------------ Validation ------------------
    const validationSchema = Joi.object({
      pageNo: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).optional(),
      startDate: Joi.string().required(),
      endDate: Joi.string().required(),
      assignees: Joi.array().optional(),
      search: Joi.string().optional().allow(""),
      technology: Joi.array().optional()
    });

    const { value, error } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(res, statusCode.BAD_REQUEST, error.details[0].message);
    }

    const { startDate, pageNo, limit, endDate, assignees, search } = value;
    const pageNum = pageNo && pageNo > 0 ? parseInt(pageNo, 10) : null;
    const limitNum = limit && limit > 0 ? parseInt(limit, 10) : null;
    const skip = (pageNum - 1) * limitNum;
    const {
      _id: decodedUserId,
      pms_role_id: { _id: roleId, role_name: roleName } = {},
      companyId: decodedCompanyId
    } = req.user || {};

    // ------------------ Employee Filter ------------------
    const empFilter = { 
        isDeleted: false,
        isActivate: true,
        companyId: newObjectId(decodedCompanyId),
    };

    if (assignees && Array.isArray(assignees) && assignees.length > 0) {
      empFilter._id = { $in: assignees };
    }
    if (search) {
      empFilter.full_name = { $regex: search, $options: "i" };
    }

    // ------------------ Fetch Employees ------------------
    const [totalEmployees, employees] = await Promise.all([
      Employees.countDocuments(empFilter),
      Employees.find(empFilter, { _id: 1, full_name: 1 })
        .sort({ _id: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    if (!employees || employees.length === 0) {
      return res.json({
        meta: { startDate, endDate, page: pageNum, pageSize: limitNum, totalEmployees },
        data: []
      });
    }

    const employeeIds = employees.map(e => e._id);

    // ------------------ Fetch Projects ------------------
    const projects = await Projects.find(
      { 
        companyId: newObjectId(decodedCompanyId),
        assignees: { $in: employeeIds }, 
        isDeleted: false ,
       end_date: {$gte: moment(startDate, "YYYY-MM-DD").toISOString()}
      },
      { title: 1, assignees: 1, workFlow: 1 }
    ).lean();

    if (!projects.length) {
      return res.json({
        meta: { startDate, endDate, page: pageNum, pageSize: limitNum, totalEmployees },
        data: []
      });
    }

    const projectIds = projects.map(p => p._id);

    // ------------------ Workflow statuses ------------------
    const workflowIds = [...new Set(projects.map(p => p.workFlow).filter(Boolean))];
    let allWorkflowStatuses = [];
    if (workflowIds.length) {
      allWorkflowStatuses = await WorkFlowStatus.find(
        { workflow_id: { $in: workflowIds }, isDeleted: false },
        { title: 1 }
      ).lean();
    }
    const statusIdToTitle = {};
    allWorkflowStatuses.forEach(s => { statusIdToTitle[String(s._id)] = s.title || "unknown"; });

    // ------------------ Filter statuses (exclude done/hold/etc) ------------------
    const excludeKeywords = [
      "to do","todo","done","complete","completed","completion","completeed",
      "hold","on hold","in hold","hold for now",
      "review","in review","ready to review",
      "qa","ready for qa","quality assurance",
      "production","prod","move to production","to production",
      "deploy","deployment","release","released","live","in live"
    ];
    const normalizeToSpace = str => (str||"").toString().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const normalizeNoSpace = str => normalizeToSpace(str).replace(/\s+/g,"");
    const excludeSpace = excludeKeywords.map(normalizeToSpace);
    const excludeNoSpace = excludeKeywords.map(normalizeNoSpace);

    const allowedStatusIds = allWorkflowStatuses
      .filter(s => {
        const title = (s.title || "").toString();
        const nSpace = normalizeToSpace(title);
        const nNoSpace = normalizeNoSpace(title);
        const isExcluded = excludeSpace.some(kw => kw && nSpace.includes(kw)) ||
                           excludeNoSpace.some(kw => kw && nNoSpace.includes(kw));
        return !isExcluded;
      })
      .map(s => s._id);

    // ------------------ Fetch Subtasks ------------------
    let subtasks = [];
    if (projectIds.length && allowedStatusIds.length) {
      subtasks = await ProjectSubTask.aggregate([
        {
          $match: {
            project_id: { $in: projectIds },
            task_status: { $in: allowedStatusIds },
            // due_date: {$gte: moment(startDate, "YYYY-MM-DD").toISOString()},
            status: "active",
            isDeleted: false
          }
        },
        {
          $addFields: {
            estimatedTotalHours: {
              $add: [
                { $convert: { input: "$estimated_hours", to: "double", onError: 0, onNull: 0 } },
                { $divide: [{ $convert: { input: "$estimated_minutes", to: "double", onError: 0, onNull: 0 } }, 60] }
              ]
            }
          }
        },
        {
          $project: {
            title: 1, project_id: 1, estimatedTotalHours: 1, assignees: 1, start_date: 1, due_date: 1, task_status: 1
          }
        }
      ]).exec();
    }
    const subtaskIds = subtasks.map(s => s._id);

    // ------------------ Aggregate Logs ------------------
    // we'll need logs by day (startDate..endDate),
    // totals up to endDate, totals before startDate, and totals up to today (inclusive).
    const todayStr = new Date().toISOString().split('T')[0];

    const logsData = await ProjectTaskHourLogs.aggregate([
      {
        $match: {
          employee_id: { $in: employeeIds },
          project_id: { $in: projectIds },
          task_id: { $in: subtaskIds },
          // logged_date: { $lte: new Date(endDate) }, // capture up to endDate (subsets below)
          isDeleted: false
        }
      },
      {
        $addFields: {
          totalHours: {
            $add: [
              { $toDouble: "$logged_hours" },
              { $divide: [{ $toDouble: "$logged_minutes" }, 60] }
            ]
          }
        }
      },
      {
        $facet: {
          byDay: [
            { $match: { logged_date: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
            { $group: { _id: { employee_id: "$employee_id", logged_date: "$logged_date" }, hours: { $sum: "$totalHours" } } }
          ],
          bySubtaskTotal: [
            // totals up to endDate (we matched <= endDate above)
            { $group: { _id: { employee_id: "$employee_id", subtask_id: "$task_id" }, hours: { $sum: "$totalHours" } } }
          ],
          bySubtaskBeforeStart: [
            { $match: { logged_date: { $lt: new Date(startDate) } } },
            { $group: { _id: { employee_id: "$employee_id", subtask_id: "$task_id" }, hours: { $sum: "$totalHours" } } }
          ],
          bySubtaskUpToToday: [
            { $match: { logged_date: { $lte: new Date(todayStr) } } },
            { $group: { _id: { employee_id: "$employee_id", subtask_id: "$task_id" }, hours: { $sum: "$totalHours" } } }
          ]
        }
      }
    ]).exec();

    const logsByDay = logsData[0]?.byDay || [];
    const logsBySubtaskTotal = logsData[0]?.bySubtaskTotal || [];
    const logsBySubtaskBefore = logsData[0]?.bySubtaskBeforeStart || [];
    const logsBySubtaskUpToToday = logsData[0]?.bySubtaskUpToToday || [];

    // ------------------ Optimize Log Lookup (maps) ------------------
    const logsDayMap = {}; // key empId_yyyy-mm-dd => hours
    logsByDay.forEach(l => {
      const empId = String(l._id.employee_id);
      const d = new Date(l._id.logged_date).toISOString().split('T')[0];
      logsDayMap[`${empId}_${d}`] = l.hours || 0;
    });

    const subtaskTotalMap = {}; // up to endDate
    logsBySubtaskTotal.forEach(l => {
      subtaskTotalMap[`${String(l._id.employee_id)}_${String(l._id.subtask_id)}`] = l.hours || 0;
    });

    const subtaskBeforeMap = {}; // before startDate
    logsBySubtaskBefore.forEach(l => {
      subtaskBeforeMap[`${String(l._id.employee_id)}_${String(l._id.subtask_id)}`] = l.hours || 0;
    });

    const subtaskUpToTodayMap = {}; // up to today inclusive
    logsBySubtaskUpToToday.forEach(l => {
      subtaskUpToTodayMap[`${String(l._id.employee_id)}_${String(l._id.subtask_id)}`] = l.hours || 0;
    });

    const getLoggedDayHours = (empId, date) => logsDayMap[`${String(empId)}_${date}`] || 0;

    // ------------------ Generate date list (Mon-Fri) ------------------
    const generateDateRange = (start, end) => {
      const dates = [];
      let current = new Date(start);
      const last = new Date(end);
      while (current <= last) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          dates.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };
    const datesInRange = generateDateRange(startDate, endDate);

    // ------------------ Build Final Data ------------------
    const finalData = employees.map(emp => {
      const dailyCapacity = 8.5;
      const empIdStr = String(emp._id);

      // employee-specific subtasks (from fetched subtasks)
      const empSubtasks = subtasks.filter(st => st.assignees && st.assignees.some(aid => String(aid) === empIdStr));

      // build per-task objects (include project_id so we can group later)
      const tasks = empSubtasks.map(st => {
        const key = `${empIdStr}_${String(st._id)}`;
        const totalLoggedUpToEnd = subtaskTotalMap[key] || 0;      // up to endDate
        const loggedBeforeStart = subtaskBeforeMap[key] || 0;     // < startDate
        const loggedUpToToday = subtaskUpToTodayMap[key] || 0;    // <= today
        const loggedInRange = Math.max(0, totalLoggedUpToEnd); // logs within requested window

        const estimated = st.estimatedTotalHours || 0;

        // remainingToPlan should subtract ALL logs up to today (so opening "today" uses remaining = est - logsSoFar)
        const remainingToPlan = Math.max(0, estimated - loggedUpToToday);

        // remainingAllTime is estimate - all logs up to endDate (for final remaining)
        const remainingAllTime = Math.max(0, estimated - totalLoggedUpToEnd);

        return {
          _id: st._id,
          project_id: st.project_id,
          title: st.title,
          startDate: st.start_date,
          endDate: st.due_date,
          estimatedHours: estimated,
          loggedHours: loggedInRange,      // shown for the window [startDate..endDate]
          remainingHours: remainingAllTime,
          remainingToPlan,
          task_status: st.task_status
        };
      });

      // total remaining we plan for (sum of remainingToPlan)
      const totalEstimatedRemaining = tasks.reduce((sum, t) => sum + (t.remainingToPlan || 0), 0);

      // ------------------ Project Summaries (group tasks by project) ------------------
      const empProjectIds = [...new Set(empSubtasks.map(st => String(st.project_id)))];
      const empProjects = projects.filter(p => empProjectIds.includes(String(p._id)));

      const projectSummaries = empProjects.map(proj => {
        // find task objects that belong to this project
        const projTasks = tasks.filter(t => String(t.project_id) === String(proj._id));

        const projEstimated = projTasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
        const projLogged = projTasks.reduce((s, t) => s + (t.loggedHours || 0), 0);
        const projRemaining = projTasks.reduce((s, t) => s + (t.remainingHours || 0), 0);

        return {
          _id: proj._id,
          name: proj.title || proj.name || "",
          subTaskCounts: projTasks.reduce((acc, t) => {
            const status = statusIdToTitle[String(t.task_status)] || "unknown";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {}),
          hours: {
            estimated: projEstimated,
            logged: projLogged,
            remaining: projRemaining
          },
          tasks: projTasks.map(t => ({
            ...t,
            status: statusIdToTitle[String(t.task_status)] || "unknown"
          }))
        };
      });

      // ------------------ Allocation: start from max(startDate, today) ------------------
      // Determine allocationStartDate (first date within datesInRange that is >= today)
      const todayStrLocal = todayStr;
      const allocationStartDate = datesInRange.find(d => d >= todayStrLocal) || datesInRange[0];

      // tasks queue for allocation (mutating remainingToPlan)
      const allocationTasks = tasks.map(t => ({ ...t }))
        .sort((a, b) => new Date(a.startDate || startDate) - new Date(b.startDate || startDate));

      // Build days for the entire requested range, but only allocate on days >= allocationStartDate
      const days = datesInRange.map(date => {
        const logged = getLoggedDayHours(emp._id, date); // actual logged hours on that date
        let available = Math.max(dailyCapacity - logged, 0);
        let assignedThisDay = 0;

        // Only allocate on days that are >= allocationStartDate
        if (date >= allocationStartDate) {
          for (const t of allocationTasks) {
            if (!t.remainingToPlan || t.remainingToPlan <= 0) continue;
            const taskStart = t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : datesInRange[0];
            if (taskStart > date) continue; // task hasn't started yet
            const assign = Math.min(available, t.remainingToPlan);
            if (assign <= 0) continue;
            t.remainingToPlan -= assign;
            available -= assign;
            assignedThisDay += assign;
            if (available <= 0) break;
          }
        }

        const plannedTotal = Math.min(dailyCapacity, assignedThisDay + logged);
        const remainingAssigned = Math.max(0, plannedTotal - logged);
        const free = Math.max(0, dailyCapacity - plannedTotal);

        return {
          date,
          planned: plannedTotal,
          logged,
          remainingAssigned,
          free,
          isFullDayBooked: plannedTotal >= dailyCapacity,
          currentDayTotalHours: dailyCapacity
        };
      });

      // ------------------ Employee summary ------------------
      const daysNotFree = days.filter(d => d.isFullDayBooked).length;
      const totalSpent = days.reduce((sum, d) => sum + d.logged, 0);

      return {
        employee: { _id: emp._id, name: emp.full_name, isExpand: empProjects.length > 0 },
        projects: projectSummaries,
        days,
        summary: {
          daysNotFree,
          totalSpent,
          totalPlanned: totalEstimatedRemaining,
          capacity: dailyCapacity * datesInRange.length
        }
      };
    });

    const meta = { startDate, endDate, page: pageNum, pageSize: limitNum, totalEmployees };
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, finalData, meta);

  } catch (error) {
    console.error("Error in getTaskHubMatrix:", error);
    return catchBlockErrorResponse(res, error.message);
  }
};
