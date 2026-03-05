const { MongoClient } = require("mongodb");
const { Models } = require("./constants");
require("dotenv").config();

const uri = process.env.DB_URL;
const client = new MongoClient(uri);

let db;

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB...");
    db = client.db(process.env.DB_NAME);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

function getDB() {
  if (!db) {
    throw new Error("Database not connected");
  }
  return {
    Employees: db.collection(Models.Employees),
    Tasks: db.collection(Models.Tasks),
    Projects: db.collection(Models.Projects),
    MainTasks: db.collection(Models.MainTasks),
    PMSClients: db.collection(Models.PMSClients),
    Notifications: db.collection(Models.Notifications),
    TaskComments: db.collection(Models.TaskComments),
    DiscussionTopics: db.collection(Models.DiscussionTopics),
    DiscussionTopicsDetails: db.collection(Models.DiscussionTopicsDetails),
    Bugs: db.collection(Models.Bugs),
    BugsComments: db.collection(Models.BugsComments),
    TaskLoggedHours: db.collection(Models.TaskLoggedHours),
    Notes: db.collection(Models.Notes),
    NoteComments: db.collection(Models.NoteComments),
    FileUpload: db.collection(Models.FileUpload),
  };
}

module.exports = { connectToDatabase, getDB };
