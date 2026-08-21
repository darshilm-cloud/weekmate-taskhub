/**
 * A small but coherent slice of the production graph.
 *
 * The socket controllers reach documents through $lookup pipelines, so a bare
 * insert is not enough - a task needs a project that needs a manager that needs
 * a role, or the aggregation returns nothing and the handler exits early
 * without touching the code the test is meant to cover.
 */
const { MongoClient, ObjectId } = require('mongodb');
const { Models } = require('../helpers/constants');

// The seed opens its own connection rather than borrowing the one helpers/db.js
// holds. That module exposes only a fixed map of collections, and the fixtures
// need "roles" too, which is not in it - reaching for it through driver
// internals would break on the next driver upgrade.
let seedClient;
async function rawDb() {
  if (!seedClient) {
    seedClient = new MongoClient(process.env.DB_URL);
    await seedClient.connect();
  }
  return seedClient.db(process.env.DB_NAME);
}
async function closeSeed() {
  if (seedClient) {
    await seedClient.close();
    seedClient = undefined;
  }
}

const oid = (n) => new ObjectId(String(n).padStart(24, '0'));

const ids = {
  roleEmployee: oid(1),
  roleClient: oid(2),
  manager: oid(10),
  assignee: oid(11),
  client: oid(12),
  project: oid(20),
  mainTask: oid(30),
  task: oid(40),
  taskComment: oid(50),
  topic: oid(60),
  topicDetail: oid(70),
  bug: oid(80),
  bugComment: oid(90),
  loggedHours: oid(100),
  note: oid(110),
  noteComment: oid(120),
  fileUpload: oid(130),
  notification: oid(140),
};

const base = { isDeleted: false, isSoftDeleted: false, isActivate: true };

async function seed() {
  const raw = await rawDb();
  const db = Object.fromEntries(
    Object.entries(Models).map(([key, name]) => [key, raw.collection(name)])
  );

  await raw.collection('roles').insertMany([
    { _id: ids.roleEmployee, role_type: 'employee', isDeleted: false },
    { _id: ids.roleClient, role_type: 'pms_client', isDeleted: false },
  ]);

  await db.Employees.insertMany([
    { _id: ids.manager, first_name: 'Mara', last_name: 'Okonjo',
      role_id: ids.roleEmployee, companyId: oid(5), ...base },
    { _id: ids.assignee, first_name: 'Devi', last_name: '',
      role_id: ids.roleEmployee, companyId: oid(5), ...base },
  ]);

  await db.PMSClients.insertOne({
    _id: ids.client, first_name: 'Ines', last_name: 'Ferreira',
    role_id: ids.roleClient, companyId: oid(5), ...base,
  });

  await db.Projects.insertOne({
    _id: ids.project, title: 'Apollo', manager: ids.manager,
    assignees: [ids.assignee], pms_clients: [ids.client],
    createdBy: ids.manager, updatedBy: ids.manager,
    createdByModel: 'employees', updatedByModel: 'employees', ...base,
  });

  await db.MainTasks.insertOne({
    _id: ids.mainTask, title: 'Milestone one', project_id: ids.project,
    subscribers: [ids.assignee], updatedBy: ids.manager,
    updatedByModel: 'employees', ...base,
  });

  await db.Tasks.insertOne({
    _id: ids.task, title: 'Wire the export', project_id: ids.project,
    main_task_id: ids.mainTask, assignees: [ids.assignee],
    pms_clients: [ids.client], updatedBy: ids.manager,
    updatedByModel: 'employees', ...base,
  });

  await db.TaskComments.insertOne({
    _id: ids.taskComment, task_id: ids.task, comment: 'Looks right to me',
    tagged_users: [ids.assignee], updatedBy: ids.manager,
    updatedByModel: 'employees', ...base,
  });

  await db.DiscussionTopics.insertOne({
    _id: ids.topic, title: 'Release plan', project_id: ids.project,
    subscribers: [ids.assignee], updatedBy: ids.manager,
    updatedByModel: 'employees', ...base,
  });

  await db.DiscussionTopicsDetails.insertOne({
    _id: ids.topicDetail, discussion_topic_id: ids.topic,
    tagged_users: [ids.assignee], updatedBy: ids.manager,
    updatedByModel: 'employees', ...base,
  });

  await db.Bugs.insertOne({
    _id: ids.bug, title: 'Export drops the last row', project_id: ids.project,
    task_id: ids.task, main_task_id: ids.mainTask, assignees: [ids.assignee],
    pms_clients: [ids.client], updatedBy: ids.manager,
    updatedByModel: 'employees', ...base,
  });

  await db.BugsComments.insertOne({
    _id: ids.bugComment, bug_id: ids.bug, comment: 'Reproduced on staging',
    tagged_users: [ids.assignee], updatedBy: ids.manager,
    updatedByModel: 'employees', ...base,
  });

  await db.TaskLoggedHours.insertOne({
    _id: ids.loggedHours, task_id: ids.task, bug_id: ids.bug,
    project_id: ids.project, logged_hours: '2:30', updatedBy: ids.assignee,
    updatedByModel: 'employees', ...base,
  });

  await db.Notes.insertOne({
    _id: ids.note, title: 'Handover', project_id: ids.project,
    subscribers: [ids.assignee], updatedBy: ids.manager,
    updatedByModel: 'employees', ...base,
  });

  await db.NoteComments.insertOne({
    _id: ids.noteComment, note_id: ids.note, comment: 'Added the checklist',
    tagged_users: [ids.assignee], updatedBy: ids.manager,
    updatedByModel: 'employees', ...base,
  });

  await db.FileUpload.insertOne({
    _id: ids.fileUpload, name: 'spec.pdf', project_id: ids.project,
    subscribers: [ids.assignee], updatedBy: ids.manager,
    updatedByModel: 'employees', ...base,
  });
}

async function wipe() {
  const raw = await rawDb();
  await Promise.all(
    [...Object.values(Models), 'roles'].map((c) =>
      raw.collection(c).deleteMany({})
    )
  );
}

module.exports = { seed, wipe, closeSeed, ids, oid };
