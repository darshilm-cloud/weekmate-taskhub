const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
const envPath = path.resolve(__dirname, `./env/${envFile}`);
dotenv.config({ path: envPath });

async function checkTasks() {
  try {
    console.log("Connecting to:", process.env.DB_URL);
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected!");

    const ProjectTasks = mongoose.connection.db.collection("projecttasks");
    const Projects = mongoose.connection.db.collection("projects");

    const totalTasks = await ProjectTasks.countDocuments();
    const activeTasks = await ProjectTasks.countDocuments({ isDeleted: false });
    
    console.log(`Total Tasks: ${totalTasks}`);
    console.log(`Active (non-deleted) Tasks: ${activeTasks}`);

    if (totalTasks > 0) {
      const sampleBatch = await ProjectTasks.find({ isDeleted: false }).limit(5).toArray();
      console.log("\nSample Task Project IDs:");
      for (let t of sampleBatch) {
        console.log(`Task ID: ${t._id}, Project ID: ${t.project_id}, Status: ${t.status}`);
      }
    }

    const projectsCount = await Projects.countDocuments();
    console.log(`\nTotal Projects: ${projectsCount}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTasks();
