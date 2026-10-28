const mongoose = require("mongoose");

/*
 * Emails an employee can switch off from Profile → Email Preferences.
 * Every email is ON unless the user has turned it off (mailsettings.disabledEmails).
 * Account / approval / workflow emails are not listed here and are always sent.
 *
 * A mail opts in by carrying `preferenceKey` in the content it hands to
 * emailSenderForPMS, which then drops recipients who switched that key off.
 */
const EMAIL_PREFERENCES = [
  { key: "project_assigned", module: "Projects", name: "Assigned to a project" },
  { key: "project_manager_assigned", module: "Projects", name: "Assigned as project manager" },
  { key: "project_updated", module: "Projects", name: "Project details updated" },
  { key: "project_deadline_missed", module: "Projects", name: "Project deadline missed" },

  { key: "tasklist_subscribed", module: "Task Lists", name: "Subscribed to a task list" },
  { key: "tasklist_deleted", module: "Task Lists", name: "Task list deleted" },

  { key: "task_assigned", module: "Tasks", name: "Task assigned" },
  { key: "task_stage_changed", module: "Tasks", name: "Task stage changed" },
  { key: "task_comment", module: "Tasks", name: "Comment or mention on a task" },
  { key: "task_deadline_missed", module: "Tasks", name: "Task deadline missed" },

  { key: "bug_assigned", module: "Bugs", name: "Bug assigned" },
  { key: "bug_stage_changed", module: "Bugs", name: "Bug stage changed" },
  { key: "bug_comment", module: "Bugs", name: "Comment or mention on a bug" },

  { key: "note_subscribed", module: "Notes", name: "Subscribed to a note" },
  { key: "note_comment", module: "Notes", name: "Comment or mention on a note" },

  { key: "discussion_subscribed", module: "Discussions", name: "Subscribed to a discussion topic" },
  { key: "discussion_mentioned", module: "Discussions", name: "Mentioned in a discussion" },

  { key: "file_uploaded", module: "Files", name: "File uploaded" },

  { key: "task_hours_logged", module: "Time Logs", name: "Hours logged on a task" },
  { key: "subtask_hours_logged", module: "Time Logs", name: "Hours logged on a sub-task" },
];

const EMAIL_PREFERENCE_KEYS = new Set(EMAIL_PREFERENCES.map((pref) => pref.key));

const toObjectId = (value) => {
  const id = value?._id || value;
  return id && mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(String(id)) : null;
};

// createdBy ids from a mailsettings query: { createdBy }, { createdBy: { $in } }, { $or: [...] }
const collectCreatedByIds = (query, ids = []) => {
  if (!query || typeof query !== "object") return ids;
  if ("createdBy" in query) {
    const value = query.createdBy;
    const list = value && Array.isArray(value.$in) ? value.$in : [value];
    list.forEach((item) => {
      const id = toObjectId(item);
      if (id) ids.push(id);
    });
  }
  (query.$or || []).forEach((part) => collectCreatedByIds(part, ids));
  return ids;
};

const LEGACY_FLAGS = [
  "project_assigned",
  "discussion_subscribed",
  "discussion_tagged",
  "maintask_subscribed",
  "task_assigned",
  "task_tagged_comments",
  "bug_assigned",
  "bug_tagged_comments",
  "note_assigned",
  "note_tagged_comments",
  "file_subscribed",
  "logged_hours",
];

const sendNowSettings = (createdBy) => ({
  createdBy,
  ...Object.fromEntries(LEGACY_FLAGS.map((flag) => [flag, true])),
  never: false,
  quarterlyMail: false,
});

/*
 * Stand-in for the mailsettings model inside the mail templates. The old
 * per-type flags were opt-in (no saved settings → no email), so most employees
 * never received these mails. The templates still pick recipients through
 * those flags; this answers "send now" for everyone they ask about, and the
 * real choice is made by preferenceKey in emailSenderForPMS.
 */
const recipientMailSettings = {
  find: async (query) => collectCreatedByIds(query).map(sendNowSettings),
  findOne: async (query) => sendNowSettings(collectCreatedByIds(query)[0] || null),
};

/**
 * Drop the addresses whose owner switched `preferenceKey` off.
 * @returns {string[]} the addresses that should still receive the email
 */
const filterOptedOutRecipients = async (emails, preferenceKey, companyId = null) => {
  const list = (Array.isArray(emails) ? emails : [emails]).filter(Boolean);
  if (!preferenceKey || list.length === 0) return list;

  const lowered = [...new Set(list.map((email) => String(email).trim().toLowerCase()))];
  const companyFilter = toObjectId(companyId) ? { companyId: toObjectId(companyId) } : {};
  const userQuery = { email: { $in: lowered }, isDeleted: false, ...companyFilter };

  const [employees, clients] = await Promise.all([
    mongoose.model("employees").find(userQuery).select("_id email").lean(),
    mongoose.model("pmsclients").find(userQuery).select("_id email").lean(),
  ]);
  const users = [...employees, ...clients];
  if (users.length === 0) return list;

  const optedOut = await mongoose
    .model("mailsettings")
    .find({ createdBy: { $in: users.map((user) => user._id) }, disabledEmails: preferenceKey })
    .select("createdBy")
    .lean();
  if (optedOut.length === 0) return list;

  const optedOutIds = new Set(optedOut.map((setting) => String(setting.createdBy)));
  const blocked = new Set(
    users.filter((user) => optedOutIds.has(String(user._id))).map((user) => String(user.email).toLowerCase())
  );
  return list.filter((email) => !blocked.has(String(email).trim().toLowerCase()));
};

module.exports = {
  EMAIL_PREFERENCES,
  EMAIL_PREFERENCE_KEYS,
  recipientMailSettings,
  filterOptedOutRecipients,
};
