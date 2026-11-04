# Aarav Enterprises: Taskhub demo

Taskhub part of the 5-product Aarav demo (spec: `docs/aarav/STORYLINE.md` and `CONTRACTS.md` in the
weekmate_pms repo). Branch `product-linking-demo`.

## 1. What was added

### API (server/, prefix `/v1`)

| Endpoint | Notes |
|---|---|
| `POST /projects/add` (extended) | `projectCode` (stored as `externalRef`, unique per company, 409 with the existing id when taken), `projectValue`, `assigneeEmails[]`, `managerEmail`, `accountManagerEmail`, `clientName` (find or create `pmsclients`, matched on company name or full name), optional `milestones[]` and `taskLists[{title,tasks[{title,assigneeEmail,dueDate}]}]`. Unresolved emails come back in `data.linking.unresolvedEmails`. Linked projects default to the "Active" status. Everything is optional, existing callers are unchanged. |
| `POST /projects/get` (extended) | filter `projectCode`; every row returns `projectCode` and `projectValue`. |
| `POST /projects/milestone/get` | `{project_id | projectCode}`; each row has `value` (INR), `billingAmount`, `projectCode`; metadata has the project, totals, approved count. |
| `POST /projects/milestone/add`, `PUT /projects/milestone/update/:id` | needs `project_edit` or `projects_manage`. |
| `POST /projects/milestone/submit/:id` | Team Manager: `{evidence:[string|{name,url}], note}`; needs `project_edit`, `projects_manage` or `tasks_manage`. Not Started / In Progress / Rework Required -> Submitted. |
| `POST /projects/milestone/approve/:id` | needs `projects_manage` (PM / Admin). Submitted -> Approved, records approver and time, sets `crmSyncStatus=pending` and enqueues the CRM push. |
| `POST /projects/milestone/reject/:id` | needs `projects_manage`; `{reviewNote}` required; Submitted -> Rework Required. |
| `POST /projects/milestone/crm-resync/:id` | retry a failed push (extra, used by the UI "Retry"). |
| `POST /projects/timesheet-submission/{submit,approve,reject,list}` | per `{employee, project, periodStart, periodEnd}`; statuses Draft / Submitted / Approved / Rejected. `submit` needs `timesheet_add` (own sheet; for others `timesheet_manage`), `approve` / `reject` need `timesheet_manage` (reject needs `reviewNote`), `list` filters project / projectCode / employee / status / period; people without `timesheet_manage` only see their own rows. |
| `POST /projects/task-logged-hours/projectEmployeeHours` | `{projectCode?, from, to}` -> `[{employeeEmail, projectCode, plannedHours, loggedHours, approvedHours}]`. `approvedHours` = hours inside an Approved submission, `plannedHours` = task estimates split across assignees. Without `projectCode`, all projects that have one. |
| `GET /resources/employees-lite` (also `/resource/employees-lite`) | `[{_id,email,full_name}]`, active employees of the caller's company. |

New collections: `projectmilestones`, `projecttimesheetsubmissions`. New fields on `projects`: `externalRef`, `projectValue`
(partial unique index on `{companyId, externalRef}` for live projects with a code).

### CRM outbox (`server/jobs/CrmSyncQueueService.js`)

Approval pushes `POST {CRM_BASE_URL}/api/public/milestones/approved?apikey={CRM_API_KEY}` with
`{projectCode, milestoneId, milestoneKey, title, amount, approvedBy, approvedAt, evidence[]}`
(`amount` = project value x billingPercent, 0 for non-billing milestones; CRM is idempotent on projectCode + milestoneId).

* BullMQ queue `crm-milestone-sync` (same Redis config / per-database prefix as the import queues), 6 attempts, exponential backoff
  (`CRM_SYNC_BACKOFF_MS`, default 5s). The worker starts at boot when `CRM_BASE_URL` and `CRM_API_KEY` are set.
* Redis unreachable: the push runs inline, fire-and-forget, 3 attempts, logged with the `[crm-sync]` prefix.
* Milestone fields `crmSyncStatus` (`none|pending|synced|failed`), `crmSyncedAt`, `crmSyncAttempts`, `crmSyncError`.
* Env: `CRM_BASE_URL`, `CRM_API_KEY` (added to `env/.env.sample`). If they are missing, an approval is saved with `crmSyncStatus=failed`
  and the error "not configured"; use Retry after configuring.

### Client

* Project view -> new **Milestones** tab (`components/PMS/ProjectMilestones.js`): weight, value, billing trigger, status chip, CRM sync chip
  with Retry, Submit (evidence links + note; resubmit after rework shows the PM's note), PM Review dialog (Approve / Return for rework with note),
  detail dialog with history.
* **Timesheet Approvals** page (`pages/TimesheetApprovals`, route `/:companySlug/timesheet-approvals`), linked from "My Logged Time" and the
  "Timesheet Report" page headers. Filters month / status / project, Approve / Reject (note) for `timesheet_manage`, "Submit my timesheet".

### Fix of an existing bug found while testing
`controller/dashboard.js` `getMyLoggedHours` referenced an undefined `archivedStatusIds` (HTTP 500 on the dashboard "my logged time" widget) and used an
invalid `$nin` inside `$expr`. Both fixed.

## 2. Seed: `server/scripts/seedAaravEnterprises.js`

```bash
cd server
DB_URL=mongodb://127.0.0.1:27017/aarav_taskhub npm run seed:aarav            # seed (no-op if already seeded)
DB_URL=mongodb://127.0.0.1:27017/aarav_taskhub npm run seed:aarav -- --reset  # wipe ONLY the Aarav tenant, then reseed
npm run seed:aarav -- --dryRun                                                # no writes
```

* `DB_URL` comes from the environment, else `env/.env.dev`. **The script refuses any host other than localhost / 127.0.0.1 / ::1 unless `--force`**
  (the stock `.env.dev` points at a remote DB, so always set `DB_URL` explicitly).
* Idempotent: a marker (`app_migrations` key `aarav-seed:<companyId>`) makes a second run a no-op. A crashed run (no marker) is cleaned and redone.
  `--reset` deletes only rows of company `6730a4a4a4a4a4a4a4a4a4a1` (and rows reachable only through its projects / employees) and its placeholder files.
* Never touches other tenants. Global reference rows (PMS roles, permission resources, project tabs) are created only if missing (a fresh DB).
* Deterministic: seeded RNG (20261103); dates are relative to the run day. Records have fixed ids (`6730a4a4a4a4a4a4...`) for employees, clients, projects, milestones.

### What it builds
* Company Aarav Enterprises (`aaravent`, id `6730a4a4a4a4a4a4a4a4a4a1`), default role permissions / project statuses / Standard workflow via the same helpers as
  `scripts/createCompany.js`, plus extra grants so the story works: PM (role `PC`: Neha, Amit) gets `projects_manage` and `timesheet_manage`, team managers (`TL`) can submit
  milestones, Account Manager (`AM`: Kavita), `User` for everyone else, `Admin` for Rajesh.
  Role mapping: AA001 Admin, AA003 and AA004 PC, AA006 AM, AA009-AA011 TL, rest User.
* 56 employees AA001-AA056 (`admin@aaravent.com` for Rajesh, others `first.last@aaravent.com`), password `Aarav@2026` (MD5 through the model `.save()` hook),
  HR style fields written raw: `emp_code`, `joining_date`, `reporting_manager`, `department_id`, `designation_id`, `branch`, `monthly_ctc`; 9 departments, 30 designations.
* 6 `pmsclients` (login `Client@2026`), project types / technologies / labels / bug stages.
* Projects PRJ-2026-001, 002, 003, 006 with 7 milestones each at the pinned statuses (001: M1,M2 approved, M3 Submitted with 2 evidence files;
  002: M2 Rework Required with the PM note; 003: M1-M4 approved, M5 In Progress; 006: all approved, M3 reworked once). Approved milestones show `synced`.
* One task list per milestone (5-12 tasks, statuses consistent with the milestone), a recurring "Project Governance" list (monthly recurring tasks), subtasks,
  comments, labels, task files and project files (placeholder files under `server/public/...`, git-ignored), folders, notes, discussions, bugs with comments, expenses,
  complaints with status / comments / feedback, reviews.
* One hour log per working day per allocated person (8h x allocation, +-1h noise, leave days and holidays skipped), monthly rollups, billable-hours approvals
  (`approvedHours`), project-wise timesheet submissions: all past months Approved by Neha, current month 4 Submitted + 1 Rejected (with note).
* Notifications, activity logs, India 2026 holidays, 30 days of attendance, stars, recent visits, task timers, 4 soft-deleted items for Trash.

### Known deviations / limits
* **Hours calibration.** The storyline pins PRJ-001 "logged ~1100h" and PRJ-006 "cost ~640000" but also the "8h x allocation" rule; these conflict (the rule gives ~2650h
  and ~1.9M). The seed scales the daily hours per project to hit the pinned totals (001: ~0.46x, 006: ~0.33x; 002 and 003 use the plain rule). Result: 001 = 1109h,
  006 = 1601h / INR 6.37 lakh, 002 = 3022h, 003 = 5612h.
* Leave days used to skip hour logs come from a deterministic per-employee RNG in this seed; they are not read from HRMS.
* Notifications use a 10 day TTL index (model design): re-run `--reset` to refresh them.
* Milestone evidence is entered as links (name + URL) in the UI; seeded evidence points at placeholder files in the project Files folder.
* Mail settings, form-builder configs and column preferences are not seeded (the app creates defaults on first use).
* Running the app against a DB rewrites `/settings/permission.json` and `role.json` (git-ignored, generated); they follow whichever DB the server last started on.

## 3. Verification done (local throwaway MongoDB, since dropped)
Seed run, second run (no-op), `--reset` run, remote-host refusal, then the API exercised on a local server: login for admin / PM / TL / user, milestone get / submit /
approve / reject (permission 403 for a plain user), approval pushed to a mock CRM (first attempt answered 500, retry succeeded, status `synced`), timesheet
submission list / approve / reject / duplicate submit, `projectEmployeeHours`, `employees-lite`, extended `projects/add` + duplicate `projectCode` (409) + `projects/get`
filter, plus dashboard / hours / bugs / notes / complaints / expenses / trash / employees / resource matrix endpoints returning seeded data.
