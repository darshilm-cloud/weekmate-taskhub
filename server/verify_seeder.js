const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
const envPath = path.resolve(__dirname, `./env/${envFile}`);
dotenv.config({ path: envPath });

async function verifySeededData() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected!");

    require("./models");
    const Project = mongoose.model("projects");

    const count = await Project.countDocuments();
    console.log("Total projects in DB:", count);

    const latest = await Project.findOne({ title: /Alpha|Beta|v2/ }).sort({ createdAt: -1 });
    if (latest) {
      console.log("Found a seeded project:");
      console.log("Title:", latest.title);
      console.log("Created At:", latest.createdAt);
      console.log("ID:", latest._id);
    } else {
      console.log("No seeded project found with matching title pattern.");
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verifySeededData();
