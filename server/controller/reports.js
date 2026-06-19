const mongoose = require("mongoose");
const Joi = require("joi");
const moment = require("moment");

const ActivityLog = mongoose.model("activitylogs");
const Employee = mongoose.model("employees");
const Company = mongoose.model("companies");

/**
 * GET /api/reports/user-activity-summary
 * Returns licensed user counts and active-user counts for a company.
 * Called by the WeekMate proxy — no auth token required.
 */
exports.getUserActivitySummary = async (req, res) => {
  try {
    const schema = Joi.object({
      companyDomain: Joi.string().trim().required(),
      dateFrom: Joi.string().optional(),
      dateTo: Joi.string().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.json({ status: 403, message: error.details[0].message });
    }

    const { companyDomain, dateFrom, dateTo } = value;

    // Resolve company
    const company = await Company.findOne({
      companyDomain,
      isDeleted: false,
    }).lean();
    if (!company) {
      return res.json({ status: 403, message: "Company not found" });
    }

    const companyId = company._id;
    const now = dateTo ? moment(dateTo).endOf("day").toDate() : moment().endOf("day").toDate();
    const thirtyDaysAgo = dateFrom ? moment(dateFrom).startOf("day").toDate() : moment().subtract(30, "days").startOf("day").toDate();

    const [totalLicensedUsers, activeEmails] =
      await Promise.all([
        Employee.countDocuments({ companyId, isDeleted: false }),
        ActivityLog.distinct("email", {
          companyId,
          createdAt: { $gte: thirtyDaysAgo, $lte: now },
        }),
      ]);

    const activeUsers = activeEmails.length;
    const inactiveUsers = Math.max(0, totalLicensedUsers - activeUsers);

    return res.json({
      status: 200,
      data: {
        totalLicensedUsers,
        activeUsers,
        inactiveUsers,
      },
      message: "User activity summary fetched successfully",
    });
  } catch (err) {
    console.error("[reports] getUserActivitySummary error:", err);
    return res.json({ status: 403, message: "Something went wrong" });
  }
};

/**
 * POST /api/reports/employee-usage
 * Returns per-employee activity stats with pagination and optional search.
 * Called by the WeekMate proxy — no auth token required.
 */
exports.getEmployeeUsage = async (req, res) => {
  try {
    const schema = Joi.object({
      companyDomain: Joi.string().trim().required(),
      dateFrom: Joi.string().optional(),
      dateTo: Joi.string().optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(200).default(10),
      search: Joi.string().trim().allow("").optional(),
      status: Joi.string().valid("active", "inactive").optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.json({ status: 403, message: error.details[0].message });
    }

    const { companyDomain, dateFrom, dateTo, page, limit, search, status } = value;

    // Resolve company
    const company = await Company.findOne({
      companyDomain,
      isDeleted: false,
    }).lean();
    if (!company) {
      return res.json({ status: 403, message: "Company not found" });
    }

    const companyId = company._id;

    // Date range for activity filter
    const toDate = dateTo
      ? moment(dateTo).endOf("day").toDate()
      : moment().endOf("day").toDate();
    const fromDate = dateFrom
      ? moment(dateFrom).startOf("day").toDate()
      : moment().subtract(30, "days").startOf("day").toDate();

    // Build employee query (for search / filter)
    const empQuery = { companyId, isDeleted: false };
    if (search && search.trim() !== "") {
      empQuery.full_name = { $regex: search.trim(), $options: "i" };
    }

    // Fetch all matching employees (we need the full list to sort active→inactive)
    const employees = await Employee.find(empQuery)
      .select("_id full_name email emp_code")
      .lean();

    if (!employees.length) {
      return res.json({
        status: 200,
        data: { employees: [], total: 0, page, limit },
        message: "Employee usage fetched successfully",
      });
    }

    const employeeEmails = employees.map((e) => e.email).filter(Boolean);

    // Aggregate activity per email within the date range
    const activityStats = await ActivityLog.aggregate([
      {
        $match: {
          companyId,
          email: { $in: employeeEmails },
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: "$email",
          lastActivity: { $max: "$createdAt" },
          totalActions: { $sum: 1 },
          uniqueDates: {
            $addToSet: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
          },
        },
      },
    ]);

    // Build lookup map: email → stats
    const statsMap = {};
    for (const stat of activityStats) {
      statsMap[stat._id] = stat;
    }

    // Merge employees with their stats
    const merged = employees.map((emp) => {
      const stats = statsMap[emp.email] || null;
      return {
        fullName: emp.full_name || "",
        email: emp.email || "",
        empCode: emp.emp_code || "",
        lastActivity: stats ? stats.lastActivity : null,
        totalActions: stats ? stats.totalActions : 0,
        activeDays: stats ? stats.uniqueDates.length : 0,
        isActive: !!stats,
      };
    });

    const filtered = status === "active"
      ? merged.filter((e) => e.isActive)
      : status === "inactive"
      ? merged.filter((e) => !e.isActive)
      : merged;

    filtered.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      if (a.isActive && b.isActive) {
        return new Date(b.lastActivity) - new Date(a.lastActivity);
      }
      return (a.fullName || "").localeCompare(b.fullName || "");
    });

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const paginated = filtered.slice(skip, skip + limit);

    return res.json({
      status: 200,
      data: {
        employees: paginated,
        total,
        page,
        limit,
      },
      message: "Employee usage fetched successfully",
    });
  } catch (err) {
    console.error("[reports] getEmployeeUsage error:", err);
    return res.json({ status: 403, message: "Something went wrong" });
  }
};
