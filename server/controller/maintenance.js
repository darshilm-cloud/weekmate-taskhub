const mongoose = require("mongoose");
const chalk = require("chalk");
const messages = require("../helpers/messages");
const { statusCode } = require("../helpers/constant");
const {
  successResponse,
  errorResponse,
  catchBlockErrorResponse
} = require("../helpers/response");
const { generateRandomId } = require("../helpers/common");
const configs = require("../configs");
const CONFIG_JSON = require("../settings/config.json");
const DEFAULT_DATA = require("../helpers/constant").DEFAULT_DATA;
const Models = require("../models");
const { getEmailValidationSchema } = require("../validation");
const { getDataForLoginUser } = require("./authentication");

class MaintenanceController {
  async deleteCompanyData(req, res) {
    try {
      const { companyId } = req.body || {};

      if (!companyId || !global.validObjectId(companyId)) {
        return errorResponse(res, statusCode.BAD_REQUEST, "Invalid or missing companyId");
      }

      const companyObjectId = global.newObjectId(companyId);

      const modelEntries = Object.entries(Models);

      for (const [, model] of modelEntries) {
        if (!model || !model.schema || !model.schema.paths) continue;

        const hasCompanyIdPath = Object.prototype.hasOwnProperty.call(model.schema.paths, "companyId");

        if (hasCompanyIdPath) {
          await model.deleteMany({ companyId: companyObjectId });
        }
      }

      if (Models.CompanyModel) {
        await Models.CompanyModel.deleteOne({ _id: companyObjectId });
      }

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
      console.log(companyId)

      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        return errorResponse(res, statusCode.BAD_REQUEST, "Invalid company ID");
      }

      // Check if company exists
      const Company = mongoose.model("companies");
      const company = await Company.findById(companyId).lean();
      if (!company) {
        return errorResponse(res, statusCode.NOT_FOUND, "Company not found");
      }

      console.log(
        chalk.green(`✅ Starting dummy data creation for company: ${companyId}`)
      );

      // Import all models
      const Projects = mongoose.model("projects");
      const ProjectMainTask = mongoose.model("projectmaintasks");
      const ProjectTasks = mongoose.model("projecttasks");
      const ProjectBugs = mongoose.model("projecttaskbugs");
      const Notes = mongoose.model("notes_pms");
      const NoteBook = mongoose.model("notebook");
      const DiscussionsTopics = mongoose.model("discussionstopics");
      const DiscussionsTopicsDetails = mongoose.model(
        "discussionstopicsdetails"
      );
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
        bugs: [],
        notebooks: [],
        notes: [],
        discussionTopics: [],
        discussionTopicsDetails: [],
        comments: []
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

        const email = `${roleName.toLowerCase().replace(/ /g, "_")}_${
          i + 1
        }@test.com`;

        // Check if email already exists and is NOT deleted
        const existingEmployee = await Employees.findOne({
          email: email.toLowerCase(),
          companyId: companyId,
          isDeleted: false,
          isSoftDeleted: false
        });
        if (existingEmployee) {
          console.log(
            chalk.yellow(
              `  ↻ Employee with email ${email} already exists, skipping...`
            )
          );
          createdData.employees.push(existingEmployee);
          continue;
        }

        const employeeData = {
          first_name: roleName.split(" ")[0],
          last_name: "User",
          full_name: `${roleName.split(" ")[0]} User`,
          email: email,
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
        console.log(
          chalk.green(`  ✓ Created ${roleName} employee: ${employee.email}`)
        );
      }

      // Use first employee as creator for all data
      if (!createdData.employees || createdData.employees.length === 0) {
        return errorResponse(
          res,
          statusCode.SERVER_ERROR,
          "No employees created or found"
        );
      }
      const creatorEmployee = createdData.employees[0];

      // Step 2: Create PMS Client
      console.log(chalk.blue("📋 Step 2: Creating PMS client..."));
      const clientRole = roleMap[CONFIG_JSON.PMS_ROLES.CLIENT.toLowerCase()];
      if (clientRole) {
        const clientEmail = "testclient@test.com";

        // Check if client email already exists and is NOT deleted
        const existingClient = await PMSClients.findOne({
          email: clientEmail.toLowerCase(),
          isDeleted: false,
          isSoftDeleted: false
        });
        if (existingClient) {
          console.log(
            chalk.yellow(
              `  ↻ PMS Client with email ${clientEmail} already exists, skipping...`
            )
          );
          createdData.pmsClients.push(existingClient);
        } else {
          const clientData = {
            first_name: "Test",
            last_name: "Client",
            full_name: "Test Client",
            email: clientEmail,
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
        console.log(
          chalk.green(`  ✓ Created project type: ${projectType.project_type}`)
        );
      } else {
        console.log(
          chalk.yellow(
            `  ↻ Using existing project type: ${projectType.project_type}`
          )
        );
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
        console.log(
          chalk.yellow(`  ↻ Using existing project status: Archived`)
        );
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
        console.log(
          chalk.green(`  ✓ Created workflow: ${workflow.project_workflow}`)
        );
      } else {
        console.log(
          chalk.yellow(
            `  ↻ Using existing workflow: ${workflow.project_workflow}`
          )
        );
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
          {
            title: DEFAULT_DATA.WORKFLOW_STATUS.TODO,
            color: "#616161",
            sequence: 1,
            isDefault: true
          },
          { title: "In Progress", color: "#FFA500", sequence: 2 },
          { title: "Review", color: "#9370DB", sequence: 3 },
          {
            title: DEFAULT_DATA.WORKFLOW_STATUS.DONE,
            color: "#228B22",
            sequence: 4
          }
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
          console.log(
            chalk.green(`  ✓ Created workflow status: ${status.title}`)
          );
        }
      } else {
        createdData.workflowStatuses = existingStatuses;
        console.log(
          chalk.yellow(
            `  ↻ Using existing workflow statuses (${existingStatuses.length} found)`
          )
        );
      }

      // Step 8: Create Bug Workflow Statuses
      console.log(chalk.blue("📋 Step 8: Setting up bug workflow statuses..."));
      const existingBugStatuses = await BugsWorkFlowStatus.find({
        isDeleted: false
      }).lean();

      if (existingBugStatuses.length === 0) {
        const bugStatuses = [
          {
            title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.TODO,
            color: "#89CFF0",
            sequence: 1
          },
          {
            title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.IN_PROGRESS,
            color: "#89CFF0",
            sequence: 2
          },
          {
            title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.TO_BE_TESTED,
            color: "#89CFF0",
            sequence: 3
          },
          {
            title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.ON_HOLD,
            color: "#89CFF0",
            sequence: 4
          },
          {
            title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.DONE,
            color: "#89CFF0",
            sequence: 5
          }
        ];

        for (const status of bugStatuses) {
          const newStatus = new BugsWorkFlowStatus({
            ...status,
            createdBy: creatorEmployee._id,
            updatedBy: creatorEmployee._id
          });
          await newStatus.save();
          createdData.bugWorkflowStatuses.push(newStatus);
          console.log(
            chalk.green(`  ✓ Created bug workflow status: ${status.title}`)
          );
        }
      } else {
        createdData.bugWorkflowStatuses = existingBugStatuses;
        console.log(
          chalk.yellow(
            `  ↻ Using existing bug workflow statuses (${existingBugStatuses.length} found)`
          )
        );
      }

      // Step 9: Create Project
      console.log(chalk.blue("📋 Step 9: Creating project..."));
      const managerEmployee =
        createdData.employees.find(
          (e) =>
            e.pms_role_id?.toString() ===
            roleMap[CONFIG_JSON.PMS_ROLES.TL.toLowerCase()]?._id?.toString()
        ) || creatorEmployee;
      const amEmployee = createdData.employees.find(
        (e) =>
          e.pms_role_id?.toString() ===
          roleMap[CONFIG_JSON.PMS_ROLES.AM.toLowerCase()]?._id?.toString()
      );

      const projectData = {
        companyId: new mongoose.Types.ObjectId(companyId),
        title: "Sample Project - Test Data",
        projectId: generateRandomId(),
        color: CONFIG_JSON.COLORS[0],
        descriptions: "This is a sample project created for testing purposes",
        technology: createdData.projectTechs.map((t) => t._id),
        project_type: projectType._id,
        project_status: createdData.projectStatuses.find(
          (s) => s.title === DEFAULT_DATA.PROJECT_STATUS.ACTIVE
        )._id,
        manager: managerEmployee._id,
        acc_manager: amEmployee?._id || null,
        assignees: [
          creatorEmployee._id,
          ...createdData.employees.slice(0, 2).map((e) => e._id)
        ],
        pms_clients: createdData.pmsClients.map((c) => c._id),
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
      const mainTaskTitles = [
        "Backend Development",
        "Frontend Development",
        "Testing"
      ];

      for (const title of mainTaskTitles) {
        const mainTask = new ProjectMainTask({
          title: title,
          project_id: project._id,
          subscribers: [
            creatorEmployee._id,
            ...createdData.employees.slice(0, 2).map((e) => e._id)
          ],
          pms_clients: createdData.pmsClients.map((c) => c._id),
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
        console.log(
          chalk.blue(`📋 Step 14: Creating tasks for ${mainTask.title}...`)
        );
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
            task_status_history: [
              {
                task_status: createdData.workflowStatuses[0]._id,
                updatedBy: creatorEmployee._id,
                updatedAt: configs.utcDefault()
              }
            ],
            createdBy: creatorEmployee._id,
            updatedBy: creatorEmployee._id,
            createdByModel: "employees",
            updatedByModel: "employees"
          };

          const task = new ProjectTasks(taskData);
          await task.save();
          createdData.tasks.push(task);
          console.log(chalk.green(`    ✓ Created task: ${task.title}`));

          // Step 15: Create Task Hours Logs for each task with different users
          console.log(
            chalk.blue(`📋 Step 15: Creating logged hours for ${task.title}...`)
          );
          // Create logs with different employees
          const logEmployees = createdData.employees.slice(
            0,
            Math.min(3, createdData.employees.length)
          );
          const logDurations = [
            { hours: "02", minutes: "00" },
            { hours: "03", minutes: "30" },
            { hours: "01", minutes: "45" }
          ];

          for (let logIdx = 0; logIdx < logEmployees.length; logIdx++) {
            const logEmployee = logEmployees[logIdx];
            const duration = logDurations[logIdx] || {
              hours: "02",
              minutes: "00"
            };

            const hoursLog = new TaskHoursLogs({
              employee_id: logEmployee._id,
              project_id: project._id,
              task_id: task._id,
              timesheet_id: timesheet._id,
              descriptions: `Worked on task implementation by ${logEmployee.full_name}`,
              logged_hours: duration.hours,
              logged_minutes: duration.minutes,
              logged_date: new Date(),
              isManuallyAdded: true,
              logged_status: "Billable",
              createdBy: logEmployee._id,
              updatedBy: logEmployee._id,
              createdByModel: "employees",
              updatedByModel: "employees"
            });
            await hoursLog.save();
            createdData.taskLogs.push(hoursLog);
            console.log(
              chalk.green(
                `    ✓ Created logged hours: ${duration.hours}h ${duration.minutes}m by ${logEmployee.full_name}`
              )
            );
          }

          // Step 16: Create Task Comments
          console.log(
            chalk.blue(`📋 Step 16: Creating comments for ${task.title}...`)
          );
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
          createdData.comments.push(comment);
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

      // Step 17: Create Bugs
      console.log(chalk.blue("📋 Step 17: Creating bugs..."));
      const bugTitles = [
        "Login page not redirecting after authentication",
        "Database connection timeout issue"
      ];

      for (const bugTitle of bugTitles) {
        const bugData = {
          title: bugTitle,
          bugId: generateRandomId(),
          project_id: project._id,
          task_id: createdData.tasks[0]?._id || null,
          status: "active",
          descriptions: `Description and steps to reproduce: ${bugTitle}`,
          bug_labels: [createdData.labels[0]._id], // High priority
          assignees: [creatorEmployee._id, createdData.employees[1]._id],
          pms_clients: [createdData.pmsClients[0]._id],
          estimated_hours: "04",
          estimated_minutes: "00",
          progress: "0",
          bug_status: createdData.bugWorkflowStatuses[0]._id, // Todo
          bug_status_history: [
            {
              bug_status: createdData.bugWorkflowStatuses[0]._id,
              updatedBy: creatorEmployee._id,
              updatedAt: configs.utcDefault()
            }
          ],
          isImported: false,
          isRepeated: false,
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id,
          createdByModel: "employees",
          updatedByModel: "employees"
        };

        const bug = new ProjectBugs(bugData);
        await bug.save();
        createdData.bugs.push(bug);
        console.log(chalk.green(`  ✓ Created bug: ${bug.title}`));
      }

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
          subscribers: [
            creatorEmployee._id,
            ...createdData.employees.slice(0, 1).map((e) => e._id)
          ],
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

      // Step 19: Create Discussion Topics
      console.log(chalk.blue("📋 Step 19: Creating discussion topics..."));
      const discussionTopicTitles = [
        "Architecture Discussion",
        "Performance Optimization",
        "Feature Planning"
      ];

      for (const topicTitle of discussionTopicTitles) {
        const discussionTopic = new DiscussionsTopics({
          title: topicTitle,
          project_id: project._id,
          status: "active",
          descriptions: `Discussion about ${topicTitle}`,
          subscribers: [
            creatorEmployee._id,
            ...createdData.employees.slice(0, 2).map((e) => e._id)
          ],
          pms_clients: [createdData.pmsClients[0]._id],
          isPinToTop: false,
          isPrivate: false,
          isBookMark: false,
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id,
          createdByModel: "employees",
          updatedByModel: "employees"
        });
        await discussionTopic.save();
        createdData.discussionTopics.push(discussionTopic);
        console.log(
          chalk.green(`  ✓ Created discussion topic: ${discussionTopic.title}`)
        );

        // Create default topic detail
        console.log(
          chalk.blue(
            `📋 Step 20: Creating discussion topic details for ${topicTitle}...`
          )
        );
        const topicDetail = new DiscussionsTopicsDetails({
          topic_id: discussionTopic._id,
          title: `Added discussion about ${topicTitle}`,
          isDefault: true,
          project_id: project._id,
          taggedUsers: [],
          createdBy: creatorEmployee._id,
          updatedBy: creatorEmployee._id,
          createdByModel: "employees",
          updatedByModel: "employees"
        });
        await topicDetail.save();
        createdData.discussionTopicsDetails.push(topicDetail);
        console.log(chalk.green(`    ✓ Created topic detail`));
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

      // Build the return object with collection names as keys and arrays of _id strings as values
      const createdRecords = {};
      
      // Map createdData to collection names
      if (createdData.project?._id) {
        createdRecords.projects = [createdData.project._id.toString()];
      }
      if (createdData.employees?.length > 0) {
        createdRecords.employees = createdData.employees.map(e => e?._id?.toString()).filter(Boolean);
      }
      if (createdData.pmsClients?.length > 0) {
        createdRecords.pmsclients = createdData.pmsClients.map(c => c?._id?.toString()).filter(Boolean);
      }
      if (createdData.projectType?._id) {
        createdRecords.projecttypes = [createdData.projectType._id.toString()];
      }
      if (createdData.projectTechs?.length > 0) {
        createdRecords.projecttechs = createdData.projectTechs.map(t => t?._id?.toString()).filter(Boolean);
      }
      if (createdData.projectStatuses?.length > 0) {
        createdRecords.projectstatus = createdData.projectStatuses.map(s => s?._id?.toString()).filter(Boolean);
      }
      if (createdData.workflow?._id) {
        createdRecords.projectworkflows = [createdData.workflow._id.toString()];
      }
      if (createdData.workflowStatuses?.length > 0) {
        createdRecords.workflowstatus = createdData.workflowStatuses.map(s => s?._id?.toString()).filter(Boolean);
      }
      if (createdData.bugWorkflowStatuses?.length > 0) {
        createdRecords.bugsworkflowstatus = createdData.bugWorkflowStatuses.map(s => s?._id?.toString()).filter(Boolean);
      }
      if (createdData.labels?.length > 0) {
        createdRecords.tasklabels = createdData.labels.map(l => l?._id?.toString()).filter(Boolean);
      }
      if (createdData.fileFolder?._id) {
        createdRecords.filefolders = [createdData.fileFolder._id.toString()];
      }
      if (createdData.timesheet?._id) {
        createdRecords.projecttimesheets = [createdData.timesheet._id.toString()];
      }
      if (createdData.mainTasks?.length > 0) {
        createdRecords.projectmaintasks = createdData.mainTasks.map(mt => mt?._id?.toString()).filter(Boolean);
      }
      if (createdData.tasks?.length > 0) {
        createdRecords.projecttasks = createdData.tasks.map(t => t?._id?.toString()).filter(Boolean);
      }
      if (createdData.taskLogs?.length > 0) {
        createdRecords.projecttaskhourlogs = createdData.taskLogs.map(log => log?._id?.toString()).filter(Boolean);
      }
      if (createdData.bugs?.length > 0) {
        createdRecords.projecttaskbugs = createdData.bugs.map(b => b?._id?.toString()).filter(Boolean);
      }
      if (createdData.notebooks?.length > 0) {
        createdRecords.notebook = createdData.notebooks.map(nb => nb?._id?.toString()).filter(Boolean);
      }
      if (createdData.notes?.length > 0) {
        createdRecords.notes_pms = createdData.notes.map(n => n?._id?.toString()).filter(Boolean);
      }
      if (createdData.discussionTopics?.length > 0) {
        createdRecords.discussionstopics = createdData.discussionTopics.map(dt => dt?._id?.toString()).filter(Boolean);
      }
      if (createdData.discussionTopicsDetails?.length > 0) {
        createdRecords.discussionstopicsdetails = createdData.discussionTopicsDetails.map(dtd => dtd?._id?.toString()).filter(Boolean);
      }
      if (createdData.comments?.length > 0) {
        createdRecords.Comments = createdData.comments.map(c => c?._id?.toString()).filter(Boolean);
      }

      return successResponse(
        res,
        statusCode.CREATED,
        "Dummy test data created successfully",
        createdRecords
      );
    } catch (error) {
      console.log(chalk.red("❌ Error creating dummy test data:"), error);
      return catchBlockErrorResponse(res, error.message);
    }
  }

  /**
   * Delete dummy test data for a company
   * Accepts an object with collection names as keys and arrays of _id strings as values
   * Deletes only the specified records
   */
  async deleteDummyTestData(req, res) {
    try {
      const { recordIds: createdRecords }= req.body;

      if (!createdRecords || typeof createdRecords !== "object" || Array.isArray(createdRecords)) {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          "Invalid request body. Expected an object with collection names as keys and arrays of _id strings as values"
        );
      }

      console.log(
        chalk.blue(`🗑️  Starting dummy data deletion...`)
      );

      // Map of collection names to mongoose model names
      const collectionModelMap = {
        projects: "projects",
        employees: "employees",
        pmsclients: "pmsclients",
        projecttypes: "projecttypes",
        projecttechs: "projecttechs",
        projectstatus: "projectstatus",
        projectworkflows: "projectworkflows",
        workflowstatus: "workflowstatus",
        bugsworkflowstatus: "bugsworkflowstatus",
        tasklabels: "tasklabels",
        filefolders: "filefolders",
        projecttimesheets: "projecttimesheets",
        projectmaintasks: "projectmaintasks",
        projecttasks: "projecttasks",
        projecttaskhourlogs: "projecttaskhourlogs",
        projecttaskbugs: "projecttaskbugs",
        notebook: "notebook",
        notes_pms: "notes_pms",
        discussionstopics: "discussionstopics",
        discussionstopicsdetails: "discussionstopicsdetails",
        Comments: "Comments"
      };

      const deletionResults = {};
      let totalDeleted = 0;

      // Iterate through each collection in the createdRecords object
      for (const [collectionName, idArray] of Object.entries(createdRecords)) {
        if (!Array.isArray(idArray) || idArray.length === 0) {
          console.log(
            chalk.yellow(
              `  ⚠️  Skipping ${collectionName}: invalid or empty array`
            )
          );
          continue;
        }

        const modelName = collectionModelMap?.[collectionName];
        if (!modelName) {
          console.log(
            chalk.yellow(
              `  ⚠️  Unknown collection name: ${collectionName}, skipping...`
            )
          );
          continue;
        }

        try {
          const Model = mongoose.model(modelName);
          
          // Convert string IDs to ObjectIds
          const objectIds = idArray
            .filter(id => id && mongoose.Types?.ObjectId?.isValid?.(id))
            .map(id => new mongoose.Types.ObjectId(id));

          if (objectIds.length === 0) {
            console.log(
              chalk.yellow(
                `  ⚠️  No valid ObjectIds found for ${collectionName}`
              )
            );
            deletionResults[collectionName] = { deleted: 0, skipped: idArray?.length || 0 };
            continue;
          }

          // Delete records by _id
          const deleteResult = await Model.deleteMany({
            _id: { $in: objectIds }
          });

          const deletedCount = deleteResult?.deletedCount || 0;
          deletionResults[collectionName] = {
            deleted: deletedCount,
            requested: objectIds.length
          };
          totalDeleted += deletedCount;

          console.log(
            chalk.green(
              `  ✓ Deleted ${deletedCount} record(s) from ${collectionName}`
            )
          );
        } catch (error) {
          console.log(
            chalk.red(
              `  ❌ Error deleting from ${collectionName}: ${error?.message || "Unknown error"}`
            )
          );
          deletionResults[collectionName] = {
            deleted: 0,
            error: error?.message || "Unknown error"
          };
        }
      }

      console.log(chalk.green(`\n✅ Dummy test data deletion completed!\n`));
      console.log(chalk.blue(`Total records deleted: ${totalDeleted}`));

      return successResponse(
        res,
        statusCode.SUCCESS,
        "Dummy test data deleted successfully",
        {
          totalDeleted,
          deletionResults
        }
      );
    } catch (error) {
      console.log(chalk.red("❌ Error deleting dummy test data:"), error);
      return catchBlockErrorResponse(res, error.message);
    }
  }

  async getEmployeeOverviewData(req, res) {
    try {
      const { error, value } = configs.validateFormatter(
        getEmailValidationSchema(),
        req.body
      );
      if (error) {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          error.details[0].message
        );
      }

      const userData = await getDataForLoginUser(value);
      if (!userData) {
        return errorResponse(res, statusCode.BAD_REQUEST, "User not found");
      }

      const employeeId = userData._id;

      // Helper: convert minutes -> HH:MM
      const minutesToHHMM = (totalMinutes) => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        return `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;
      };

      // Find "Active" project status ID
      const ProjectStatus = await Models.projectStatus.findOne({
        companyId: userData.companyId,
        title: "Active"
      });

      // Get user's active projects
      const projects = await Models.projects
        .find({
          assignees: employeeId,
          project_status: ProjectStatus?._id,
          isDeleted: false
        })
        .select("_id title projectId isBillable")
        .lean();

      if (!projects || projects.length === 0) {
        return successResponse(res, statusCode.OK, "No projects found", []);
      }

      const projectIds = projects.map((p) => p._id);

      // Get tasks (with completion progress)
      const tasks = await Models.tasks
        .find({
          project_id: { $in: projectIds },
          assignees: employeeId,
          isDeleted: false
        })
        .select(
          "project_id estimated_hours estimated_minutes assignees completion_progress"
        )
        .lean();

      // Get logged time entries
      const loggedHours = await Models.taskHoursLogs
        .find({
          project_id: { $in: projectIds },
          employee_id: employeeId,
          isDeleted: false
        })
        .select("project_id logged_hours logged_minutes")
        .lean();

      // Initialize project map
      const projectMap = new Map();
      projects.forEach((p) => {
        projectMap.set(p._id.toString(), {
          projectId: p.projectId,
          projectName: p.title,
          isBillable: p.isBillable,
          totalAssignedMinutes: 0,
          totalLoggedMinutes: 0,
          totalCompletionProgress: 0,
          taskCount: 0,
          weightedProgressSum: 0,
          weightedTotalMinutes: 0
        });
      });

      // Step 1: Calculate assigned hours and weighted progress
      tasks.forEach((task) => {
        const projectKey = task.project_id.toString();
        const projectData = projectMap.get(projectKey);
        if (!projectData) return;

        const estimatedHours = parseFloat(task.estimated_hours || 0);
        const estimatedMinutes = parseFloat(task.estimated_minutes || 0);
        const totalMinutes = estimatedHours * 60 + estimatedMinutes;

        const assigneeCount = task.assignees?.length || 1;
        const userShareMinutes = totalMinutes / assigneeCount;

        const completionProgress = parseFloat(task.completion_progress || 0); // 0–100

        // Weighted completion by estimated minutes
        projectData.weightedProgressSum +=
          completionProgress * userShareMinutes;
        projectData.weightedTotalMinutes += userShareMinutes;

        projectData.totalAssignedMinutes += userShareMinutes;
        projectData.taskCount += 1;
      });

      // Step 2: Calculate logged hours
      loggedHours.forEach((log) => {
        const projectKey = log.project_id.toString();
        const projectData = projectMap.get(projectKey);
        if (!projectData) return;

        const hours = parseFloat(log.logged_hours || 0);
        const minutes = parseFloat(log.logged_minutes || 0);
        const totalMinutes = hours * 60 + minutes;

        projectData.totalLoggedMinutes += totalMinutes;
      });

      // Step 3: Final computation for each project
      const result = Array.from(projectMap.values()).map((project) => {
        const assignedMins = Math.round(project.totalAssignedMinutes);
        const loggedMins = Math.round(project.totalLoggedMinutes);

        // Weighted completion percentage across tasks
        let completionProgress = 0;
        if (project.weightedTotalMinutes > 0) {
          completionProgress =
            project.weightedProgressSum / project.weightedTotalMinutes;
        }

        // Calculate productivity (balanced logic)
        let productivity = 0;
        if (assignedMins === 0 || loggedMins === 0) {
          productivity = 0;
        } else {
          if (loggedMins < assignedMins) {
            // work not completed yet — lower productivity proportionally
            productivity = (loggedMins / assignedMins) * 100;
          } else {
            // logged more than assigned — lower productivity due to overrun
            productivity = (assignedMins / loggedMins) * 100;
          }
        }
        productivity = parseFloat(Math.min(productivity, 100).toFixed(2));

        // Completion % based on actual logged vs assigned (capped)
        let completionPercentage = 0;
        if (assignedMins > 0) {
          completionPercentage = Math.min(
            (loggedMins / assignedMins) * 100,
            100
          );
        }

        return {
          projectId: project.projectId,
          projectName: project.projectName,
          isBillable: project.isBillable,
          taskCount: project.taskCount,
          totalAssignedHours: parseFloat((assignedMins / 60).toFixed(2)),
          totalLoggedHours: parseFloat((loggedMins / 60).toFixed(2)),
          totalAssignedHoursFormatted: minutesToHHMM(assignedMins),
          totalLoggedHoursFormatted: minutesToHHMM(loggedMins),
          completionProgress: parseFloat(completionProgress.toFixed(2)),
          completionPercentage: parseFloat(completionPercentage.toFixed(2)),
          productivity
        };
      });

      // Step 4: Sort projects alphabetically
      result.sort((a, b) => a.projectName.localeCompare(b.projectName));

      // Step 5: Calculate overall summary (simple average)
      const summary = result.reduce(
        (acc, p) => {
          acc.totalAssignedMinutes += p.totalAssignedHours * 60;
          acc.totalLoggedMinutes += p.totalLoggedHours * 60;
          acc.totalTasks += p.taskCount;
          acc.totalProductivity += p.productivity;
          return acc;
        },
        {
          totalAssignedMinutes: 0,
          totalLoggedMinutes: 0,
          totalTasks: 0,
          totalProductivity: 0
        }
      );

      const summaryAssignedMins = Math.round(summary.totalAssignedMinutes);
      const summaryLoggedMins = Math.round(summary.totalLoggedMinutes);

      // Simple average productivity across projects
      const overallProductivity =
        result.length > 0
          ? parseFloat((summary.totalProductivity / result.length).toFixed(2))
          : 0;

      // Overall completion %
      let overallCompletionPercentage = 0;
      if (summaryAssignedMins > 0) {
        overallCompletionPercentage = Math.min(
          (summaryLoggedMins / summaryAssignedMins) * 100,
          100
        );
      }

      const overallSummary = {
        totalProjects: result.length,
        totalTasks: summary.totalTasks,
        totalAssignedHours: parseFloat((summaryAssignedMins / 60).toFixed(2)),
        totalLoggedHours: parseFloat((summaryLoggedMins / 60).toFixed(2)),
        totalAssignedHoursFormatted: minutesToHHMM(summaryAssignedMins),
        totalLoggedHoursFormatted: minutesToHHMM(summaryLoggedMins),
        completionPercentage: parseFloat(
          overallCompletionPercentage.toFixed(2)
        ),
        productivity: overallProductivity
      };

      return successResponse(
        res,
        statusCode.OK,
        "Employee overview data fetched successfully",
        {
          projects: result,
          summary: overallSummary
        }
      );
    } catch (error) {
      console.log("🚀 ~ getEmployeeOverviewData ~ error:", error);
      return catchBlockErrorResponse(res, error.message);
    }
  }

  async getEmployeeProjectTaskOverviewData(req, res) {
    try {
      const { error, value } = configs.validateFormatter(
        getEmailValidationSchema(),
        req.body
      );
      if (error) {
        return errorResponse(
          res,
          statusCode.BAD_REQUEST,
          error.details[0].message
        );
      }

      const userData = await getDataForLoginUser(value);
      if (!userData) {
        return errorResponse(res, statusCode.BAD_REQUEST, "User not found");
      }

      const employeeId = userData._id;

      // Find "Active" project status ID
      const ProjectStatus = await Models.projectStatus.findOne({
        companyId: userData.companyId,
        title: "Active"
      });

      // Get user's active projects with populated manager and account manager
      const projects = await Models.projects
        .find({
          assignees: employeeId,
          project_status: ProjectStatus?._id,
          isDeleted: false
        })
        .select(
          "_id title projectId color descriptions isBillable estimatedHours start_date end_date manager acc_manager assignees technology project_type project_status"
        )
        .populate({
          path: "manager",
          select: "full_name email"
        })
        .populate({
          path: "acc_manager",
          select: "full_name email"
        })
        .populate({
          path: "project_type",
          select: "project_type"
        })
        .lean();

      if (!projects || projects.length === 0) {
        return successResponse(res, statusCode.OK, "No projects found", {
          projects: [],
          summary: {
            totalProjects: 0,
            totalTasks: 0
          }
        });
      }

      const projectIds = projects.map((p) => p._id);

      // Get tasks with populated task_status
      // const tasks = await Models.tasks
      //   .find({
      //     project_id: { $in: projectIds },
      //     assignees: employeeId,
      //     isDeleted: false
      //   })
      //   .select(
      //     "_id title taskId project_id main_task_id descriptions start_date due_date assignees estimated_hours estimated_minutes task_progress task_status task_labels status"
      //   )
      //   .populate({
      //     path: "task_status",
      //     select: "title color"
      //   })
      //   .populate({
      //     path: "task_labels",
      //     select: "title color"
      //   })
      //   .lean();

      // console.log("🚀 ~ getEmployeeProjectTaskOverviewData ~ tasks:", tasks.length);

      // Group tasks by project
      const projectTaskMap = new Map();

      // Initialize map with project data
      projects.forEach((project) => {
        projectTaskMap.set(project._id.toString(), {
          projectId: project.projectId,
          projectName: project.title,
          projectColor: project.color,
          projectDescription: project.descriptions,
          isBillable: project.isBillable,
          estimatedHours: project.estimatedHours,
          startDate: project.start_date,
          endDate: project.end_date,
          projectType: project.project_type?.project_type || null,
          manager: project.manager
            ? {
                id: project.manager._id,
                name: project.manager.full_name,
                email: project.manager.email
              }
            : null,
          accountManager: project.acc_manager
            ? {
                id: project.acc_manager._id,
                name: project.acc_manager.full_name,
                email: project.acc_manager.email
              }
            : null,
          totalAssignees: project.assignees?.length || 0
          // tasks: []
        });
      });

      // Add tasks to their respective projects
      // tasks.forEach((task) => {
      //   const projectKey = task.project_id.toString();
      //   const projectData = projectTaskMap.get(projectKey);

      //   if (projectData) {
      //     projectData.tasks.push({
      //       taskId: task.taskId,
      //       title: task.title,
      //       description: task.descriptions,
      //       startDate: task.start_date,
      //       dueDate: task.due_date,
      //       estimatedHours: task.estimated_hours,
      //       estimatedMinutes: task.estimated_minutes,
      //       taskProgress: task.task_progress,
      //       status: task.status,
      //       taskStatus: task.task_status
      //         ? {
      //             title: task.task_status.title,
      //             color: task.task_status.color
      //           }
      //         : null,
      //       taskLabels: task.task_labels?.map((label) => ({
      //         title: label.title,
      //         color: label.color
      //       })) || [],
      //       totalAssignees: task.assignees?.length || 0,
      //       mainTaskId: task.main_task_id
      //     });
      //   }
      // });

      // Convert map to array with task counts
      const result = Array.from(projectTaskMap.values()).map((project) => ({
        ...project
        // totalTasks: project.tasks.length
      }));

      // Sort projects by name
      result.sort((a, b) => a.projectName.localeCompare(b.projectName));

      // Calculate summary
      const summary = {
        totalProjects: result.length
        // totalTasks: tasks.length,
        // projectsWithTasks: result.filter(p => p.totalTasks > 0).length,
        // projectsWithoutTasks: result.filter(p => p.totalTasks === 0).length
      };

      return successResponse(
        res,
        statusCode.OK,
        "Employee project and task overview fetched successfully",
        result
      );
    } catch (error) {
      console.log("🚀 ~ getEmployeeProjectTaskOverviewData ~ error:", error);
      return catchBlockErrorResponse(res, error.message);
    }
  }
}

module.exports = new MaintenanceController();
