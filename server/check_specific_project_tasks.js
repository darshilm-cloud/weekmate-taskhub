const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
const envPath = path.resolve(__dirname, `./env/${envFile}`);
dotenv.config({ path: envPath });

async function findProjectTasks() {
  try {
    await mongoose.connect(process.env.DB_URL);
    const Project = mongoose.connection.db.collection("projects");
    const ProjectTasks = mongoose.connection.db.collection("projecttasks");

    // Search for the project in the screenshot
    const project = await Project.findOne({ title: /ABC cache 434/i });
    if (!project) {
      console.log("Project 'ABC cache 434' not found.");
    } else {
      const count = await ProjectTasks.countDocuments({ project_id: project._id, isDeleted: false });
      console.log(`Project: ${project.title} (_id: ${project._id}) has ${count} tasks.`);
    }

    // List some projects that HAVE many tasks
    const topProjects = await ProjectTasks.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$project_id", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();

    console.log("\nProjects with the most tasks:");
    for (let p of topProjects) {
      const proj = await Project.findOne({ _id: p._id });
      console.log(`Project: ${proj?.title || p._id} | Tasks: ${p.count}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findProjectTasks();
