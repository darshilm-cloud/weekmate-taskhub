const crypto = require("crypto");
const moment = require("moment");

/*
 * Readable logs for every outgoing email, e.g.
 *   2026-10-28T11:10:36.250+05:30 [MAIL 3f9a1c2e] 🚀 Sending email to: a@x.com, b@x.com | CC: pm@x.com | BCC:  | From: Lumina <noreply@lumina.com> | SMTP: company smtp.gmail.com:587
 *   2026-10-28T11:10:36.910+05:30 [MAIL 3f9a1c2e] ✅ Email sent to: a@x.com, b@x.com | Accepted: a@x.com, b@x.com | Rejected:  | MessageId: <...> | 660 ms
 * Lines of one email share the same id. Bodies and SMTP passwords are never logged.
 * Search the server log with:  grep "\[MAIL"   or   grep "<id>"   or   grep "<email>"
 */

const newMailId = () => crypto.randomBytes(4).toString("hex");

const toList = (value) =>
  (Array.isArray(value) ? value : String(value || "").split(","))
    .map((email) => String(email || "").trim())
    .filter(Boolean);

// The function that asked for the email (e.g. "assigneesMail (template/tasks.js:510)").
const getTrigger = () => {
  const frames = String(new Error().stack || "").split("\n").slice(1);
  const frame = frames.find(
    (line) => !line.includes("mailLogger.js") && !line.includes("helpers/common.js") && !line.includes("node_modules") && !line.includes("node:")
  );
  if (!frame) return "unknown";
  const match = frame.trim().match(/^at (?:async )?(?:(\S+) )?\(?(.*?):(\d+):\d+\)?$/);
  if (!match) return frame.trim();
  const file = match[2].replace(/^.*\/server\//, "");
  return `${match[1] || "anonymous"} (${file}:${match[3]})`;
};

const list = (value) => toList(value).join(", ");
const addresses = (value) => (Array.isArray(value) ? value.map((item) => item?.address || item).join(", ") : value || "");

const formatters = {
  TRIGGERED: (d) =>
    `📨 Email triggered: "${d.subject}" | Type: ${d.type} | Trigger: ${d.trigger} | companyId ${d.companyId || "-"} | To: ${list(d.to)} | CC: ${list(d.cc)}`,
  FILTERED: (d) =>
    `🔕 Not sending to: ${list(d.optedOut)} (turned off ${d.type}) | Still sending to: ${list(d.to)} | CC: ${list(d.cc)}`,
  SKIPPED: (d) => `⏭️  Email skipped: "${d.subject}" | ${d.reason} | Recipients: ${list(d.optedOut)}`,
  SENDING: (d) =>
    `🚀 Sending email to: ${list(d.to)} | CC: ${list(d.cc)} | BCC: ${list(d.bcc)} | From: ${d.from || "default"} | SMTP: ${d.smtp || "-"} | Subject: "${d.subject}"`,
  SENT: (d) =>
    `✅ Email sent to: ${list(d.to)} | CC: ${list(d.cc)} | Accepted: ${addresses(d.accepted)} | Rejected: ${addresses(d.rejected)} | MessageId: ${d.messageId || "-"} | ${d.ms} ms`,
  FAILED: (d) =>
    `❌ Email failed to: ${list(d.to)} | CC: ${list(d.cc)} | Subject: "${d.subject}" | Error: ${d.error}${d.code ? ` (${d.code})` : ""}${d.smtpResponse && d.smtpResponse !== d.error ? ` | SMTP: ${d.smtpResponse}` : ""}${d.ms !== undefined ? ` | ${d.ms} ms` : ""}`,
};

const logMail = (event, details = {}) => {
  const format = formatters[event] || ((d) => `${event} ${JSON.stringify(d)}`);
  const line = `${moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")} [MAIL ${details.id || "-"}] ${format(details)}`;
  if (event === "FAILED") console.error(line);
  else console.log(line);
};

module.exports = { newMailId, toList, getTrigger, logMail };
