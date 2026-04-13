/*
  Project Seeder for Weekmate Taskhub
  This script seeds the 'projects' collection with dummy data.
  Usage: node server/seeders/projectSeeder.js [count]
  Default count is 5000.
*/

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const chalk = require("chalk");
const moment = require("moment");

// Load Environment Variables
const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
const envPath = path.resolve(__dirname, `../env/${envFile}`);
dotenv.config({ path: envPath });

console.log(chalk.cyan(`Loading environment from: ${envPath}`));

// Import Models
require("../models");
const Project = mongoose.model("projects");
const ProjectType = mongoose.model("projecttypes");
const ProjectStatus = mongoose.model("projectstatus");
const Employee = mongoose.model("employees");
const ProjectWorkFlow = mongoose.model("projectworkflows");
const Company = mongoose.model("companies");

async function seedProjects() {
  try {
    const count = parseInt(process.argv[2]) || 5000;
    
    console.log(chalk.blue("Connecting to database..."));
    if (!process.env.DB_URL) {
      throw new Error("DB_URL not found in environment variables. Check your .env file.");
    }
    
    await mongoose.connect(process.env.DB_URL);
    console.log(chalk.green("Connected to database successfully!"));

    // Fetch required IDs to maintain referential integrity
    console.log(chalk.blue("Fetching reference data..."));
    
    const company = await Company.findOne({ isDeleted: false });
    const projectTypes = await ProjectType.find({ isDeleted: false }).limit(10);
    const projectStatuses = await ProjectStatus.find({ isDeleted: false }).limit(10);
    const employees = await Employee.find({ isDeleted: false }).limit(20);
    const workFlows = await ProjectWorkFlow.find({ isDeleted: false }).limit(10);

    if (!company) throw new Error("No active Company found. Please seed companies first.");
    if (projectTypes.length === 0) throw new Error("No ProjectTypes found. Please seed projecttypes first.");
    if (projectStatuses.length === 0) throw new Error("No ProjectStatus found. Please seed projectstatus first.");
    if (employees.length === 0) throw new Error("No Employees found. Please seed employees first.");
    if (workFlows.length === 0) throw new Error("No ProjectWorkFlows found. Please seed projectworkflows first.");

    const projectsToSeed = [];
    console.log(chalk.blue(`Generating ${count} projects...`));

    const adjectives = ['Global', 'Scalable', 'Modern', 'Secure', 'Intuitive', 'Enterprise', 'Agile', 'Dynamic'];
    const domains = ['FinTech', 'HealthCare', 'E-commerce', 'Logistics', 'Education', 'Real Estate', 'SaaS'];
    const suffixes = ['Alpha', 'Beta', 'v2', 'Solution', 'Portal', 'Matrix', 'Nexus'];

    for (let i = 1; i <= count; i++) {
      const randomType = projectTypes[Math.floor(Math.random() * projectTypes.length)];
      const randomStatus = projectStatuses[Math.floor(Math.random() * projectStatuses.length)];
      const randomManager = employees[Math.floor(Math.random() * employees.length)];
      const randomWorkflow = workFlows[Math.floor(Math.random() * workFlows.length)];
      const randomCreator = employees[Math.floor(Math.random() * employees.length)];
      
      const title = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${domains[Math.floor(Math.random() * domains.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]} ${Math.random().toString(36).substring(7).toUpperCase()}`;

      projectsToSeed.push({
        companyId: company._id,
        title: title,
        projectId: `P-${Date.now().toString().slice(-4)}-${i.toString().padStart(5, '0')}`,
        color: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796', '#5a5c69'][Math.floor(Math.random() * 7)],
        descriptions: `Automated seeder generated description for project ${i}. This project aims to revolutionize the ${domains[Math.floor(Math.random() * domains.length)]} industry through ${adjectives[Math.floor(Math.random() * adjectives.length)]} technology.`,
        project_type: randomType._id,
        project_status: randomStatus._id,
        manager: randomManager._id,
        acc_manager: employees[Math.floor(Math.random() * employees.length)]._id,
        assignees: [
          employees[Math.floor(Math.random() * employees.length)]._id, 
          employees[Math.floor(Math.random() * employees.length)]._id
        ],
        workFlow: randomWorkflow._id,
        estimatedHours: (Math.floor(Math.random() * 500) + 50).toString(),
        isBillable: Math.random() > 0.2, // 80% billable
        start_date: moment().subtract(Math.floor(Math.random() * 60), 'days').toDate(),
        end_date: moment().add(Math.floor(Math.random() * 120) + 30, 'days').toDate(),
        recurringType: Math.random() > 0.9 ? 'Monthly' : '',
        
        // Fields from commonSchema()
        createdBy: randomCreator._id,
        createdByModel: "employees",
        updatedBy: randomCreator._id,
        updatedByModel: "employees",
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      });
      
      if (i % 1000 === 0) {
        console.log(chalk.gray(`Generated ${i} records...`));
      }
    }

    console.log(chalk.magenta(`Inserting ${count} projects into database in batches...`));
    
    // Using batches to avoid BSON limit (16MB) and memory overflow
    const batchSize = 1000;
    for (let i = 0; i < projectsToSeed.length; i += batchSize) {
      const batch = projectsToSeed.slice(i, i + batchSize);
      await Project.insertMany(batch, { lean: true });
      console.log(chalk.gray(`Progress: ${Math.min(i + batchSize, count)} / ${count} records inserted.`));
    }

    console.log(chalk.green.bold(`\n✅ Successfully seeded ${count} project records!`));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red("\n❌ Error during seeding:"), error);
    process.exit(1);
  }
}

seedProjects();
