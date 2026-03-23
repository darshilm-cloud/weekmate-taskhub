require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { addUserIDInJson, removeBySocketId } = require("./helpers/modifyJSON");
const { socketEvents } = require("./settings/socketEventName");
const { connectToDatabase } = require("./helpers/db");
const {
  getNotificationEvent,
  readNotificationEvent,
  userJoinTheRoom,
  getReadNotificationEvent,
  getUnreadNotificationEvent,
} = require("./eventHandler/notifications");
const {
  addProjectAssigneeEvent,
  editProjectAssigneeEvent,
} = require("./eventHandler/project");
const {
  addMainTaskSubscribersEvent,
  editMainTaskSubscribersEvent,
} = require("./eventHandler/mainTask");
const {
  addTaskAssigneeEvent,
  editTaskAssigneeEvent,
} = require("./eventHandler/tasks");
const {
  addTaskCommentsAssigneeEvent,
  editTaskCommentsAssigneeEvent,
} = require("./eventHandler/taskComments");
const {
  addDiscussionTopicSubscribersEvent,
  editDiscussionTopicSubscribersEvent,
} = require("./eventHandler/discussionTopic");
const {
  addTopicDetailTaggedUserEvent,
  editTopicDetailTaggedUserEvent,
} = require("./eventHandler/discussionTopicDetails");
const {
  addBugsAssigneeEvent,
  editBugsAssigneeEvent,
} = require("./eventHandler/bugs");
const {
  addBugsCommentsTaggedUserEvent,
  editBugsCommentsTaggedUserEvent,
} = require("./eventHandler/bugsComments");
const {
  addTaskLoggedHoursEvent,
  addBugsLoggedHoursEvent,
} = require("./eventHandler/loggedHours");
const {
  addNoteSubscriberEvent,
  editNoteSubscriberEvent,
} = require("./eventHandler/notes");
const {
  addNoteCommentsTaggedUserEvent,
  editNoteCommentsTaggedUserEvent,
} = require("./eventHandler/noteComments");
const {
  addFileUploadSubscriberEvent,
  editFileUploadSubscriberEvent,
} = require("./eventHandler/fileUpload");
const {
  projectExpenseUpdatedEvent,
} = require("./eventHandler/projectExpense");

const app = express();
const server = http.createServer(app);

// enable CORS
app.use(cors());

// parse incoming JSON requests
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

async function start() {
  try {
    await connectToDatabase();
  } catch (err) {
    console.log("🚀 ~ start ~ err:", err);
  }
}

io.on(socketEvents.CONNECTION, async (socket) => {
  // Get joined user data...
  const userId = socket.handshake.query.userId;
  console.log(
    `Client connected with user ID: ${userId} and socket ID: ${socket.id}`
  );

  // save a socket id and user in json..
  addUserIDInJson(userId, socket.id);

  // join the room...
  await userJoinTheRoom(socket);

  // get notifications...
  await getNotificationEvent(socket);
  await getReadNotificationEvent(socket);
  await getUnreadNotificationEvent(socket);

  // Mark notification as read...
  await readNotificationEvent(socket);

  // Project event ...
  await addProjectAssigneeEvent(socket, io);
  await editProjectAssigneeEvent(socket, io);

  // Main task...
  await addMainTaskSubscribersEvent(socket, io);
  await editMainTaskSubscribersEvent(socket, io);

  // Task event..
  await addTaskAssigneeEvent(socket, io);
  await editTaskAssigneeEvent(socket, io);

  // Task comments event..
  await addTaskCommentsAssigneeEvent(socket, io);
  await editTaskCommentsAssigneeEvent(socket, io);

  // Discussion topic event..
  await addDiscussionTopicSubscribersEvent(socket, io);
  await editDiscussionTopicSubscribersEvent(socket, io);

  // Discussion topic details event...
  await addTopicDetailTaggedUserEvent(socket, io);
  await editTopicDetailTaggedUserEvent(socket, io);

  // Bugs event..
  await addBugsAssigneeEvent(socket, io);
  await editBugsAssigneeEvent(socket, io);

  // Bugs Comments events..
  await addBugsCommentsTaggedUserEvent(socket, io);
  await editBugsCommentsTaggedUserEvent(socket, io);

  // Logged hours events..
  await addTaskLoggedHoursEvent(socket, io);
  await addBugsLoggedHoursEvent(socket, io);

  // Note events...
  await addNoteSubscriberEvent(socket, io);
  await editNoteSubscriberEvent(socket, io);

  // Note comments events..
  await addNoteCommentsTaggedUserEvent(socket, io);
  await editNoteCommentsTaggedUserEvent(socket, io);

  // Files events...
  await addFileUploadSubscriberEvent(socket, io);
  await editFileUploadSubscriberEvent(socket, io);

  // Project Expense events...
  await projectExpenseUpdatedEvent(socket, io);

  socket.on(socketEvents.DISCONNECT, () => {
    removeBySocketId(socket.id);
    console.log(`Client Disconnected: ${socket.id}`);
  });
});

// start server
server.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
  start();
});
