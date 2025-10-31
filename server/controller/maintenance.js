const mongoose = require("mongoose");
const chalk = require("chalk");
const messages = require("../helpers/messages");
const { statusCode } = require("../helpers/constant");
const { successResponse, errorResponse, catchBlockErrorResponse } = require("../helpers/response");
const { generateRandomId } = require("../helpers/common");
const configs = require("../configs");
const CONFIG_JSON = require("../settings/config.json");
const DEFAULT_DATA = require("../helpers/constant").DEFAULT_DATA;
const Models = require("../models");

class MaintenanceController {
  async deleteCompanyData(req, res) {
    try {
      const { companyId } = req.body || {};

      if (!companyId || !global.validObjectId(companyId)) {
        return errorResponse(res, statusCode.BAD_REQUEST, "Invalid or missing companyId");
      }

      const companyObjectId = global.newObjectId(companyId);

      const session = await mongoose.startSession();
      await session.withTransaction(async () => {
        const modelEntries = Object.entries(Models);

        for (const [, model] of modelEntries) {
          if (!model || !model.schema || !model.schema.paths) continue;

          const hasCompanyIdPath = Object.prototype.hasOwnProperty.call(model.schema.paths, "companyId");

          if (hasCompanyIdPath) {
            await model.deleteMany({ companyId: companyObjectId }).session(session);
          }
        }

        if (Models.CompanyModel) {
          await Models.CompanyModel.deleteOne({ _id: companyObjectId }).session(session);
        }
      });
      session.endSession();

      return successResponse(res, statusCode.SUCCESS, messages.DELETED, { companyId });
    } catch (err) {
      return errorResponse(res, statusCode.SERVER_ERROR, err && err.message ? err.message : messages.SERVER_ERROR);
    }
  }

  /**
   * Add dummy test data for a company
   * Creates a complete project with all hierarchical data (DFS pattern)
   * Creates one employee per PMS role
   */
  async addDummyTestData(req, res) {
    try {
      const { companyId } = req.body;

      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        return errorResponse(res, statusCode.BAD_REQUEST, "Invalid company ID");
      }

      // Check if company exists
      const Company = mongoose.model("companies");
      const company = await Company.findById(companyId).lean();
      if (!company) {
        return errorResponse(res, statusCode.NOT_FOUND, "Company not found");
      }

      console.log(chalk.green(`✅ Starting dummy data creation for company: ${companyId}`));

      // Import all models
      const Projects = mongoose.model("projects");
      const ProjectMainTask = mongoose.model("projectmaintasks");
      const ProjectTasks = mongoose.model("projecttasks");
      const Notes = mongoose.model("notes_pms");
      const NoteBook = mongoose.model("notebook");
      const Employees = mongoose.model("employees");
      const PMSRoles = mongoose.model("pms_roles");
      const PMSClients = mongoose.model("pmsclients");
      const ProjectType = mongoose.model("projecttypes");
      const ProjectTech = mongoose.model("projecttechs");
      const ProjectStatus = mongoose.model("projectstatus");
      const ProjectWorkFlow = mongoose.model("projectworkflows");
      const WorkFlowStatus = mongoose.model("workflowstatus");
      const BugsWorkFlowStatus = mongoose.model("bugsworkflowstatus");
      const TaskLabels = mongoose.model("tasklabels");
      const FileFolders = mongoose.model("filefolders");
      const ProjectTimeSheet = mongoose.model("projecttimesheets");
      const TaskHoursLogs = mongoose.model("projecttaskhourlogs");
      const Comments = mongoose.model("Comments");

      const createdData = {
        project: null,
        employees: [],
        pmsClients: [],
        projectType: null,
        projectTechs: [],
        projectStatuses: [],
        workflow: null,
        workflowStatuses: [],
        bugWorkflowStatuses: [],
        labels: [],
        fileFolder: null,
        timesheet: null,
        mainTasks: [],
        tasks: [],
        taskLogs: [],
        notebooks: [],
        notes: []
      };

      // Step 1: Create employees for each PMS role
      console.log(chalk.blue("📋 Step 1: Creating employees for each role..."));
      const allRoles = await PMSRoles.find({ isDeleted: false }).lean();
      const roleMap = {};
      
      for (const role of allRoles) {
        roleMap[role.role_name.toLowerCase()] = role;
      }

      const employeeRoles = [
        CONFIG_JSON.PMS_ROLES.ADMIN,
        CONFIG_JSON.PMS_ROLES.USER,
        CONFIG_JSON.PMS_ROLES.TL,
        CONFIG_JSON.PMS_ROLES.AM,
        CONFIG_JSON.PMS_ROLES.PC
      ];

      for (let i = 0; i < employeeRoles.length; i++) {
        const roleName = employeeRoles[i];
        const role = roleMap[roleName.toLowerCase()];
        
        if (!role) {
          console.log(chalk.yellow(`⚠️  Role not found: ${roleName}`));
          continue;
        }

        const employeeData = {
          first_name: roleName.split(" ")[0],
          last_name: "User",
          full_name: `${roleName.split(" ")[0]} User`,
          email: `${roleName.toLowerCase().replace(/ /g, "_")}_${i + 1}@test.com`,
          phone_number: `+91111111111${i}`,
          password: "123456",
          companyId: new mongoose.Types.ObjectId(companyId),
          pms_role_id: role._id,
          isActivate: true,
          isAdmin: roleName === CONFIG_JSON.PMS_ROLES.ADMIN,
          createdBy: new mongoose.Types.ObjectId(companyId), // Will be updated later
          updatedBy: new mongoose.Types.ObjectId(companyId)
        };

        const employee = new Employees(employeeData);
        await employee.save();
        createdData.employees.push(employee);
        console.log(chalk.green(`  ✓ Created ${roleName} employee: ${employee.email}`));
      }

      // Use first employee as creator for all data
      const creatorEmployee = createdData.employees[0];

      // Step 2: Create PMS Client
      console.log(chalk.blue("📋 Step 2: Creating PMS client..."));
      const clientRole = roleMap[CONFIG_JSON.PMS_ROLES.CLIENT.toLowerCase()];
      if (clientRole) {
        const clientData = {
          first_name: "Test",
          last_name: "Client",
          full_name: "Test Client",
          email: "testclient@test.com",
          phone_number: "+91222222222",
          password: "123456",
          plain_password: "123456",
          companyId: new mongoose.Types.ObjectId(companyId),
          pms_role_id: clientRole._id,
          isActivate: true,
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id
        };

        const client = new PMSClients(clientData);
        await client.save();
        createdData.pmsClients.push(client);
        console.log(chalk.green(`  ✓ Created PMS Client: ${client.email}`));
      }

      // Step 3: Get or create Project Type
      console.log(chalk.blue("📋 Step 3: Setting up project type..."));
      let projectType = await ProjectType.findOne({
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      }).lean();

      if (!projectType) {
        const newProjectType = new ProjectType({
          companyId: new mongoose.Types.ObjectId(companyId),
          project_type: "Web Development",
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id
        });
        await newProjectType.save();
        projectType = newProjectType;
        console.log(chalk.green(`  ✓ Created project type: ${projectType.project_type}`));
      } else {
        console.log(chalk.yellow(`  ↻ Using existing project type: ${projectType.project_type}`));
      }
      createdData.projectType = projectType;

      // Step 4: Create Project Technologies
      console.log(chalk.blue("📋 Step 4: Creating project technologies..."));
      const techNames = ["React", "Node.js", "MongoDB"];
      for (const techName of techNames) {
        const tech = new ProjectTech({
          companyId: new mongoose.Types.ObjectId(companyId),
          project_tech: techName,
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id
        });
        await tech.save();
        createdData.projectTechs.push(tech);
        console.log(chalk.green(`  ✓ Created tech: ${techName}`));
      }

      // Step 5: Get or create Project Statuses
      console.log(chalk.blue("📋 Step 5: Setting up project statuses..."));
      const activeStatus = await ProjectStatus.findOne({
        companyId: new mongoose.Types.ObjectId(companyId),
        title: DEFAULT_DATA.PROJECT_STATUS.ACTIVE,
        isDeleted: false
      }).lean();

      if (!activeStatus) {
        const newActiveStatus = new ProjectStatus({
          companyId: new mongoose.Types.ObjectId(companyId),
          title: DEFAULT_DATA.PROJECT_STATUS.ACTIVE,
          isDefault: true,
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id
        });
        await newActiveStatus.save();
        createdData.projectStatuses.push(newActiveStatus);
        console.log(chalk.green(`  ✓ Created project status: Active`));
      } else {
        createdData.projectStatuses.push(activeStatus);
        console.log(chalk.yellow(`  ↻ Using existing project status: Active`));
      }

      const archivedStatus = await ProjectStatus.findOne({
        companyId: new mongoose.Types.ObjectId(companyId),
        title: DEFAULT_DATA.PROJECT_STATUS.ARCHIVED,
        isDeleted: false
      }).lean();

      if (!archivedStatus) {
        const newArchivedStatus = new ProjectStatus({
          companyId: new mongoose.Types.ObjectId(companyId),
          title: DEFAULT_DATA.PROJECT_STATUS.ARCHIVED,
          isDefault: true,
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id
        });
        await newArchivedStatus.save();
        createdData.projectStatuses.push(newArchivedStatus);
        console.log(chalk.green(`  ✓ Created project status: Archived`));
      } else {
        createdData.projectStatuses.push(archivedStatus);
        console.log(chalk.yellow(`  ↻ Using existing project status: Archived`));
      }

      // Step 6: Get or create Workflow
      console.log(chalk.blue("📋 Step 6: Setting up workflow..."));
      let workflow = await ProjectWorkFlow.findOne({
        companyId: new mongoose.Types.ObjectId(companyId),
        project_workflow: DEFAULT_DATA.WORKFLOW.STANDARD,
        isDeleted: false
      }).lean();

      if (!workflow) {
        const newWorkflow = new ProjectWorkFlow({
          companyId: new mongoose.Types.ObjectId(companyId),
          project_workflow: DEFAULT_DATA.WORKFLOW.STANDARD,
          status: "active",
          isDefault: true,
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id
        });
        await newWorkflow.save();
        workflow = newWorkflow;
        console.log(chalk.green(`  ✓ Created workflow: ${workflow.project_workflow}`));
      } else {
        console.log(chalk.yellow(`  ↻ Using existing workflow: ${workflow.project_workflow}`));
      }
      createdData.workflow = workflow;

      // Step 7: Create Workflow Statuses
      console.log(chalk.blue("📋 Step 7: Creating workflow statuses..."));
      const existingStatuses = await WorkFlowStatus.find({
        workflow_id: workflow._id,
        isDeleted: false
      }).lean();

      if (existingStatuses.length === 0) {
        const workflowStatuses = [
          { title: DEFAULT_DATA.WORKFLOW_STATUS.TODO, color: "#616161", sequence: 1, isDefault: true },
          { title: "In Progress", color: "#FFA500", sequence: 2 },
          { title: "Review", color: "#9370DB", sequence: 3 },
          { title: DEFAULT_DATA.WORKFLOW_STATUS.DONE, color: "#228B22", sequence: 4 }
        ];

        for (const status of workflowStatuses) {
          const newStatus = new WorkFlowStatus({
            ...status,
            workflow_id: workflow._id,
            createdBy: creatorEmployee._id,
            updatedBy: creatorEmployee._id
          });
          await newStatus.save();
          createdData.workflowStatuses.push(newStatus);
          console.log(chalk.green(`  ✓ Created workflow status: ${status.title}`));
        }
      } else {
        createdData.workflowStatuses = existingStatuses;
        console.log(chalk.yellow(`  ↻ Using existing workflow statuses (${existingStatuses.length} found)`));
      }

      // Step 8: Create Bug Workflow Statuses
      console.log(chalk.blue("📋 Step 8: Setting up bug workflow statuses..."));
      const existingBugStatuses = await BugsWorkFlowStatus.find({ isDeleted: false }).lean();

      if (existingBugStatuses.length === 0) {
        const bugStatuses = [
          { title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.TODO, color: "#89CFF0", sequence: 1 },
          { title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.IN_PROGRESS, color: "#89CFF0", sequence: 2 },
          { title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.TO_BE_TESTED, color: "#89CFF0", sequence: 3 },
          { title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.ON_HOLD, color: "#89CFF0", sequence: 4 },
          { title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.DONE, color: "#89CFF0", sequence: 5 }
        ];

        for (const status of bugStatuses) {
          const newStatus = new BugsWorkFlowStatus({
            ...status,
            createdBy: creatorEmployee._id,
            updatedBy: creatorEmployee._id
          });
          await newStatus.save();
          createdData.bugWorkflowStatuses.push(newStatus);
          console.log(chalk.green(`  ✓ Created bug workflow status: ${status.title}`));
        }
      } else {
        createdData.bugWorkflowStatuses = existingBugStatuses;
        console.log(chalk.yellow(`  ↻ Using existing bug workflow statuses (${existingBugStatuses.length} found)`));
      }

      // Step 9: Create Project
      console.log(chalk.blue("📋 Step 9: Creating project..."));
      const managerEmployee = createdData.employees.find(e => e.pms_role_id?.toString() === roleMap[CONFIG_JSON.PMS_ROLES.TL.toLowerCase()]?._id?.toString()) || creatorEmployee;
      const amEmployee = createdData.employees.find(e => e.pms_role_id?.toString() === roleMap[CONFIG_JSON.PMS_ROLES.AM.toLowerCase()]?._id?.toString());

      const projectData = {
        companyId: new mongoose.Types.ObjectId(companyId),
        title: "Sample Project - Test Data",
        projectId: generateRandomId(),
        color: CONFIG_JSON.COLORS[0],
        descriptions: "This is a sample project created for testing purposes",
        technology: createdData.projectTechs.map(t => t._id),
        project_type: projectType._id,
        project_status: createdData.projectStatuses.find(s => s.title === DEFAULT_DATA.PROJECT_STATUS.ACTIVE)._id,
        manager: managerEmployee._id,
        acc_manager: amEmployee?._id || null,
        assignees: [creatorEmployee._id, ...createdData.employees.slice(0, 2).map(e => e._id)],
        pms_clients: createdData.pmsClients.map(c => c._id),
        workFlow: workflow._id,
        estimatedHours: "80",
        isBillable: true,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdBy: creatorEmployee._id,
        updatedBy: creatorEmployee._id,
        createdByModel: "employees",
        updatedByModel: "employees"
      };

      const project = new Projects(projectData);
      await project.save();
      createdData.project = project;
      console.log(chalk.green(`  ✓ Created project: ${project.title}`));

      // Step 10: Create default file folder (automatically created with project)
      console.log(chalk.blue("📋 Step 10: Creating default file folder..."));
      const fileFolder = new FileFolders({
        name: project.title,
        isDefault: true,
        project_id: project._id,
        createdBy: creatorEmployee._id,
        updatedBy: creatorEmployee._id
      });
      await fileFolder.save();
      createdData.fileFolder = fileFolder;
      console.log(chalk.green(`  ✓ Created file folder: ${fileFolder.name}`));

      // Step 11: Create default timesheet (automatically created with project)
      console.log(chalk.blue("📋 Step 11: Creating default timesheet..."));
      const timesheet = new ProjectTimeSheet({
        title: `${project.title} - Timesheet`,
        isDefault: true,
        project_id: project._id,
        createdBy: creatorEmployee._id,
        updatedBy: creatorEmployee._id
      });
      await timesheet.save();
      createdData.timesheet = timesheet;
      console.log(chalk.green(`  ✓ Created timesheet: ${timesheet.title}`));

      // Step 12: Create Task Labels
      console.log(chalk.blue("📋 Step 12: Creating task labels..."));
      const labels = [
        { title: "High Priority", color: "#FF0000" },
        { title: "Medium Priority", color: "#FFA500" },
        { title: "Low Priority", color: "#00FF00" }
      ];

      for (const label of labels) {
        const newLabel = new TaskLabels({
          ...label,
          companyId: new mongoose.Types.ObjectId(companyId),
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id
        });
        await newLabel.save();
        createdData.labels.push(newLabel);
        console.log(chalk.green(`  ✓ Created label: ${label.title}`));
      }

      // Step 13: Create Main Tasks (Project Main Task Lists)
      console.log(chalk.blue("📋 Step 13: Creating main tasks..."));
      const mainTaskTitles = ["Backend Development", "Frontend Development", "Testing"];
      
      for (const title of mainTaskTitles) {
        const mainTask = new ProjectMainTask({
          title: title,
          project_id: project._id,
          subscribers: [creatorEmployee._id, ...createdData.employees.slice(0, 2).map(e => e._id)],
          pms_clients: createdData.pmsClients.map(c => c._id),
          status: "active",
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id,
          createdByModel: "employees",
          updatedByModel: "employees"
        });
        await mainTask.save();
        createdData.mainTasks.push(mainTask);
        console.log(chalk.green(`  ✓ Created main task: ${mainTask.title}`));

        // Step 14: Create Tasks for this Main Task
        console.log(chalk.blue(`📋 Step 14: Creating tasks for ${mainTask.title}...`));
        const taskTitles = [
          "Setup database schema",
          "Implement API endpoints",
          "Write unit tests"
        ];

        for (const taskTitle of taskTitles) {
          const taskData = {
            title: taskTitle,
            taskId: generateRandomId(),
            project_id: project._id,
            main_task_id: mainTask._id,
            status: "active",
            descriptions: `Description for ${taskTitle}`,
            task_labels: [createdData.labels[0]._id], // High priority
            assignees: [creatorEmployee._id, createdData.employees[1]._id],
            pms_clients: [createdData.pmsClients[0]._id],
            estimated_hours: "08",
            estimated_minutes: "00",
            task_progress: "50",
            task_status: createdData.workflowStatuses[0]._id, // To-Do
            task_status_history: [{
              task_status: createdData.workflowStatuses[0]._id,
              updatedBy: creatorEmployee._id,
              updatedAt: configs.utcDefault()
            }],
            createdBy: creatorEmployee._id,
            updatedBy: creatorEmployee._id,
            createdByModel: "employees",
            updatedByModel: "employees"
          };

          const task = new ProjectTasks(taskData);
          await task.save();
          createdData.tasks.push(task);
          console.log(chalk.green(`    ✓ Created task: ${task.title}`));

          // Step 15: Create Task Hours Logs for each task
          console.log(chalk.blue(`📋 Step 15: Creating logged hours for ${task.title}...`));
          const hoursLog = new TaskHoursLogs({
            employee_id: creatorEmployee._id,
            project_id: project._id,
            task_id: task._id,
            timesheet_id: timesheet._id,
            descriptions: "Worked on task implementation",
            logged_hours: "04",
            logged_minutes: "30",
            logged_date: new Date(),
            isManuallyAdded: true,
            logged_status: "Billable",
            createdBy: creatorEmployee._id,
            updatedBy: creatorEmployee._id,
            createdByModel: "employees",
            updatedByModel: "employees"
          });
          await hoursLog.save();
          createdData.taskLogs.push(hoursLog);
          console.log(chalk.green(`    ✓ Created logged hours: 4h 30m`));

          // Step 16: Create Task Comments
          console.log(chalk.blue(`📋 Step 16: Creating comments for ${task.title}...`));
          const comment = new Comments({
            task_id: task._id,
            employee_id: creatorEmployee._id,
            comment: `This is a test comment for ${taskTitle}`,
            createdBy: creatorEmployee._id,
            updatedBy: creatorEmployee._id,
            createdByModel: "employees",
            updatedByModel: "employees"
          });
          await comment.save();
          console.log(chalk.green(`    ✓ Created comment`));
        }
      }

      // Step 17: Create Notebook
      console.log(chalk.blue("📋 Step 17: Creating notebook..."));
      const notebook = new NoteBook({
        title: "Project Meeting Notes",
        project_id: project._id,
        isBookmark: false,
        isDeleted: false,
        createdBy: creatorEmployee._id,
        updatedBy: creatorEmployee._id
      });
      await notebook.save();
      createdData.notebooks.push(notebook);
      console.log(chalk.green(`  ✓ Created notebook: ${notebook.title}`));

      // Step 18: Create Notes
      console.log(chalk.blue("📋 Step 18: Creating notes..."));
      const noteTitles = [
        "Meeting Notes - Sprint Planning",
        "Technical Decisions",
        "Client Requirements"
      ];

      for (const noteTitle of noteTitles) {
        const note = new Notes({
          title: noteTitle,
          color: CONFIG_JSON.COLORS[1],
          project_id: project._id,
          noteBook_id: notebook._id,
          subscribers: [creatorEmployee._id, ...createdData.employees.slice(0, 1).map(e => e._id)],
          pms_clients: [createdData.pmsClients[0]._id],
          notesInfo: `Content for ${noteTitle}`,
          isPrivate: false,
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id,
          createdByModel: "employees",
          updatedByModel: "employees"
        });
        await note.save();
        createdData.notes.push(note);
        console.log(chalk.green(`  ✓ Created note: ${note.title}`));
      }

      // Update all employees with proper createdBy reference (all created by the first admin)
      console.log(chalk.blue("📋 Final: Updating employee references..."));
      for (const employee of createdData.employees) {
        await Employees.findByIdAndUpdate(
          employee._id,
          {
            createdBy: creatorEmployee._id,
            updatedBy: creatorEmployee._id
          },
          { new: true }
        );
      }
      console.log(chalk.green(`  ✓ Updated employee references`));

      console.log(chalk.green("\n✅ Dummy test data created successfully!\n"));

      return successResponse(
        res,
        statusCode.CREATED,
        "Dummy test data created successfully",
        {
          companyId: companyId,
          projectId: project._id,
          projectTitle: project.title,
          employeesCreated: createdData.employees.length,
          pmsClientsCreated: createdData.pmsClients.length,
          mainTasksCreated: createdData.mainTasks.length,
          tasksCreated: createdData.tasks.length,
          loggedHoursCreated: createdData.taskLogs.length,
          notebooksCreated: createdData.notebooks.length,
          notesCreated: createdData.notes.length,
          labelsCreated: createdData.labels.length
        }
      );

    } catch (error) {
      console.log(chalk.red("❌ Error creating dummy test data:"), error);
      return catchBlockErrorResponse(res, error.message);
    }
  }
}

module.exports = new MaintenanceController();


