/*
  Task Seeder for Weekmate Taskhub
  This script seeds the 'projecttasks' collection for a specific project.
  
  Usage: 
  node server/seeders/taskSeeder.js <companyId> <projectId> <mainTaskId> <creatorId> [count]
  
  Example:
  node server/seeders/taskSeeder.js 662763d9c9f7fe9f0f916a4a 67b6da38e1a8bb36b9c9f7fe 67b6da38e1a8bb36b9c9f800 662763d9c9f7fe9f0f916a4b 1000
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
const Task = mongoose.model("projecttasks");
const Employee = mongoose.model("employees");
const WorkflowStatus = mongoose.model("workflowstatus");

async function seedTasks() {
  try {
    const args = process.argv.slice(2);
    if (args.length < 4) {
      console.log(chalk.yellow("\nUsage: node server/seeders/taskSeeder.js <companyId> <projectId> <mainTaskId> <creatorId> [count]"));
      process.exit(1);
    }

    const companyId = args[0];
    const projectId = args[1];
    const mainTaskId = args[2];
    const creatorId = args[3];
    const count = parseInt(args[4]) || 1000;

    console.log(chalk.blue("Connecting to database..."));
    if (!process.env.DB_URL) {
      throw new Error("DB_URL not found in environment variables. Check your .env file.");
    }

    await mongoose.connect(process.env.DB_URL);
    console.log(chalk.green("Connected to database successfully!"));

    // Fetch supporting data
    console.log(chalk.blue("Fetching workflow statuses and assignees..."));
    
    // Get all valid workflow statuses to assign them randomly
    const statuses = await WorkflowStatus.find({ isDeleted: false }).limit(20);
    // Get employees of this company to assign tasks randomly
    const companyEmployees = await Employee.find({ companyId: companyId, isDeleted: false }).limit(50);

    if (statuses.length === 0) {
      console.log(chalk.yellow("Warning: No WorkflowStatus found. Tasks will have null task_status."));
    }

    const tasksToSeed = [];
    console.log(chalk.blue(`Generating ${count} tasks for Project: ${projectId}...`));

    const verbs = ['Implement', 'Fix', 'Develop', 'Optimize', 'Refactor', 'Test', 'Review', 'Design', 'Doc', 'Update'];
    const components = ['Login Flow', 'Dashboard Grid', 'User Auth', 'API Middleware', 'Data Export', 'Sidebar Menu', 'Notification Hub', 'Payment Gateway', 'Search Logic', 'Profile Page'];
    const tags = ['v1.0', 'Critical', 'Low Priority', 'Internal', 'Client Feed', 'Optimization'];

    for (let i = 1; i <= count; i++) {
        const title = `${verbs[Math.floor(Math.random() * verbs.length)]} ${components[Math.floor(Math.random() * components.length)]} - ${tags[Math.floor(Math.random() * tags.length)]} #${Math.floor(Math.random() * 9999)}`;
        const randomStatus = statuses.length > 0 ? statuses[Math.floor(Math.random() * statuses.length)] : null;
        
        // Pick 1-2 random assignees
        const randomAssignees = [];
        if (companyEmployees.length > 0) {
            const numAssignees = Math.floor(Math.random() * 2) + 1;
            for (let j = 0; j < numAssignees; j++) {
                const emp = companyEmployees[Math.floor(Math.random() * companyEmployees.length)];
                if (!randomAssignees.includes(emp._id)) {
                    randomAssignees.push(emp._id);
                }
            }
        }

        tasksToSeed.push({
            title: title,
            project_id: projectId,
            main_task_id: mainTaskId,
            status: "active",
            descriptions: `Generated task ${i} for seeder testing. This task covers ${components[Math.floor(Math.random() * components.length)]} requirements.`,
            taskId: `#${Math.floor(100000 + Math.random() * 900000)}`,
            task_labels: [],
            start_date: moment().subtract(Math.floor(Math.random() * 30), 'days').toDate(),
            due_date: moment().add(Math.floor(Math.random() * 30), 'days').toDate(),
            assignees: randomAssignees,
            estimated_hours: (Math.floor(Math.random() * 8) + 1).toString().padStart(2, '0'),
            estimated_minutes: [0, 15, 30, 45][Math.floor(Math.random() * 4)].toString().padStart(2, '0'),
            task_progress: Math.floor(Math.random() * 101).toString(),
            task_status: randomStatus ? randomStatus._id : null,
            
            // Common Schema
            createdBy: creatorId,
            createdByModel: "employees",
            updatedBy: creatorId,
            updatedByModel: "employees",
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false
        });

        if (i % 500 === 0) {
            console.log(chalk.gray(`Generated ${i} records...`));
        }
    }

    console.log(chalk.magenta(`Inserting ${count} tasks in batches...`));
    
    const batchSize = 500;
    for (let i = 0; i < tasksToSeed.length; i += batchSize) {
      const batch = tasksToSeed.slice(i, i + batchSize);
      await Task.insertMany(batch, { lean: true });
      console.log(chalk.gray(`Progress: ${Math.min(i + batchSize, count)} / ${count} records inserted.`));
    }

    console.log(chalk.green.bold(`\n✅ Successfully seeded ${count} tasks for Project: ${projectId}!`));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red("\n❌ Error during seeding:"), error);
    process.exit(1);
  }
}

seedTasks();
