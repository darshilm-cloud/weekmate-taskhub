const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
const envPath = path.resolve(__dirname, `./env/${envFile}`);
dotenv.config({ path: envPath });

async function checkCompanyId() {
  try {
    await mongoose.connect(process.env.DB_URL);
    require("./models");
    const Project = mongoose.model("projects");
    
    const seeded = await Project.findOne({ title: /Alpha|Beta|v2/ });
    if (seeded) {
      console.log("Seeded Project Title:", seeded.title);
      console.log("Seeded Project companyId:", seeded.companyId);
    } else {
      console.log("No seeded project found.");
    }

    const targetCompanyId = "691adec37c5d2f83953c44da";
    const targetProjectsCount = await Project.countDocuments({ companyId: new mongoose.Types.ObjectId(targetCompanyId) });
    console.log(`Count for company ${targetCompanyId}:`, targetProjectsCount);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCompanyId();
