const mongoose = require("mongoose");
const moment = require("moment");
const ProjectTasks = mongoose.model("projecttasks");
const ProjectSubTasks = mongoose.model("projectsubtasks");
const ProjectTaskUpdateHistory = mongoose.model("taskupdatehistory");
const CommentsModel = mongoose.model("Comments");
const Project = mongoose.model("projects");
const ProjectMainTasks = mongoose.model("projectmaintasks");
const ProjectTimeSheet = mongoose.model("projecttimesheets");
const fileFolders = mongoose.model("filefolders");
const ProjectWorkFlowStatus = mongoose.model("workflowstatus");
const { generateRandomId, getRefModelFromLoginUser } = require("../helpers/common");
const configs = require("../configs");
const { DEFAULT_DATA } = require("../helpers/constant");

/**
 * Create monthly recurring tasks for the next month
 * This function should be called at the end of each month by cron job
 */
exports.createMonthlyRecurringTasks = async () => {
  try {
    console.log("🔄 Starting recurring tasks creation for next month...");
    
    // Get current date and calculate next month's start and end dates
    const currentDate = moment();
    const nextMonth = currentDate.clone().add(1, 'month');
    const nextMonthStart = nextMonth.clone().startOf('month');
    const nextMonthEnd = nextMonth.clone().endOf('month');
    
    console.log(`📅 Next month: ${nextMonth.format('YYYY-MM')}`);
    console.log(`📅 Next month start: ${nextMonthStart.format('YYYY-MM-DD')}`);
    console.log(`📅 Next month end: ${nextMonthEnd.format('YYYY-MM-DD')}`);
    
    // Find all tasks that are recurring and active
    // Only get tasks created in the current month to avoid copying already copied tasks
    const currentMonthStart = currentDate.clone().startOf('month');
    const currentMonthEnd = currentDate.clone().endOf('month');
    
    const recurringTasks = await ProjectTasks.find({
      recurringType: "monthly", // Only monthly recurring tasks
      isDeleted: false,
      status: 'active',
      createdAt: {
        $gte: currentMonthStart.toDate(),
        $lte: currentMonthEnd.toDate()
      }
    }).populate('project_id main_task_id task_status assignees pms_clients task_labels');
    
    console.log(`📋 Found ${recurringTasks.length} recurring tasks to process`);
    
    let createdTasksCount = 0;
    let createdSubTasksCount = 0;
    
    for (const originalTask of recurringTasks) {
      try {
        // Create a carbon copy of the task
        const newTaskData = {
          title: originalTask.title,
          taskId: generateRandomId(),
          project_id: originalTask.project_id._id,
          main_task_id: originalTask.main_task_id._id,
          task_status: originalTask.task_status ? originalTask.task_status._id : null,
          assignees: originalTask.assignees.map(assignee => assignee._id),
          pms_clients: originalTask.pms_clients.map(client => client._id),
          status: originalTask.status,
          descriptions: originalTask.descriptions,
          task_labels: originalTask.task_labels.map(label => label._id),
          estimated_hours: 0,
          estimated_minutes: 0,
          task_progress: originalTask.task_progress, // Reset progress for new month
          recurringType: originalTask.recurringType, // Keep the same recurring type
          isImported: false,
          
          // Update dates to next month
          start_date: originalTask.start_date ? 
            nextMonthStart.clone().add(moment(originalTask.start_date).date() - 1, 'days').toDate() : 
            nextMonthStart.toDate(),
          due_date: originalTask.due_date ? 
            nextMonthEnd.clone().subtract(moment(originalTask.due_date).date() - 1, 'days').toDate() : 
            nextMonthEnd.toDate(),
          
          // Task status history
          task_status_history: originalTask.task_status ? [{
            task_status: originalTask.task_status._id,
            updatedBy: originalTask.createdBy,
            updatedAt: configs.utcDefault()
          }] : [],
          
          // Metadata
          createdBy: originalTask.createdBy,
          updatedBy: originalTask.createdBy,
          ...(await getRefModelFromLoginUser({ _id: originalTask.createdBy }))
        };
        
        // Create the new task
        const newTask = new ProjectTasks(newTaskData);
        const savedTask = await newTask.save();
        
        console.log(`✅ Created recurring task: ${savedTask.title} (${savedTask.taskId})`);
        createdTasksCount++;
        
        // Copy comments from original task
        const originalComments = await CommentsModel.find({
          task_id: originalTask._id,
          isDeleted: false
        });
        
        if (originalComments.length > 0) {
          const newComments = originalComments.map(async (comment) => {
            return {
              ...comment.toObject(), // Convert Mongoose document to plain JavaScript object
              _id: new mongoose.Types.ObjectId(),
              task_id: savedTask._id,
              createdBy: originalTask.createdBy,
              updatedBy: originalTask.createdBy,
              createdAt: configs.utcDefault(),
              updatedAt: configs.utcDefault(),
              ...(await getRefModelFromLoginUser({ _id: originalTask.createdBy }))
            };
          });
          
          // Save the new comments
          await CommentsModel.insertMany(newComments);
          console.log(`✅ Copied ${originalComments.length} comments for task: ${savedTask.title}`);
        }
        
        // Create task history entry
        const taskHistory = new ProjectTaskUpdateHistory({
          project_id: originalTask.project_id._id,
          main_task_id: originalTask.main_task_id._id,
          task_id: savedTask._id,
          updated_key: "recurring_task_created",
          pervious_value: `Original task: ${originalTask.taskId}`,
          new_value: `Recurring task for ${nextMonth.format('YYYY-MM')}`,
          createdBy: originalTask.createdBy,
          updatedBy: originalTask.createdBy,
          ...(await getRefModelFromLoginUser({ _id: originalTask.createdBy }))
        });
        await taskHistory.save();
        
        // Now handle subtasks if they exist
        const originalSubTasks = await ProjectSubTasks.find({
          task_id: originalTask._id,
          isDeleted: false,
          status: 'active'
        });
        
        for (const originalSubTask of originalSubTasks) {
          const newSubTaskData = {
            title: originalSubTask.title,
            subTaskId: generateRandomId(),
            project_id: originalSubTask.project_id,
            main_task_id: originalSubTask.main_task_id,
            task_id: savedTask._id, // Link to the new task
            task_status: originalSubTask.task_status,
            assignees: originalSubTask.assignees,
            status: originalSubTask.status,
            descriptions: originalSubTask.descriptions,
            task_labels: originalSubTask.task_labels,
            estimated_hours: originalSubTask.estimated_hours,
            estimated_minutes: originalSubTask.estimated_minutes,
            task_progress: "0", // Reset progress for new month
            
            // Update dates to next month
            start_date: originalSubTask.start_date ? 
              nextMonthStart.clone().add(moment(originalSubTask.start_date).date() - 1, 'days').toDate() : 
              nextMonthStart.toDate(),
            due_date: originalSubTask.due_date ? 
              nextMonthEnd.clone().subtract(moment(originalSubTask.due_date).date() - 1, 'days').toDate() : 
              nextMonthEnd.toDate(),
            
            // Task status history
            task_status_history: originalSubTask.task_status ? [{
              task_status: originalSubTask.task_status,
              updatedBy: originalSubTask.createdBy,
              updatedAt: configs.utcDefault()
            }] : [],
            
            // Metadata
            createdBy: originalSubTask.createdBy,
            updatedBy: originalSubTask.createdBy
          };
          
          const newSubTask = new ProjectSubTasks(newSubTaskData);
          await newSubTask.save();
          
          console.log(`✅ Created recurring subtask: ${newSubTask.title} (${newSubTask.subTaskId})`);
          createdSubTasksCount++;
          
          // Copy comments from original subtask
          const originalSubTaskComments = await CommentsModel.find({
            subTask_id: originalSubTask._id,
            isDeleted: false
          });
          
          if (originalSubTaskComments.length > 0) {
            const newSubTaskComments = originalSubTaskComments.map((comment) => {
              return {
                ...comment.toObject(),
                _id: new mongoose.Types.ObjectId(),
                subTask_id: newSubTask._id,
                createdBy: originalSubTask.createdBy,
                updatedBy: originalSubTask.createdBy,
                createdAt: configs.utcDefault(),
                updatedAt: configs.utcDefault()
              };
            });
            
            await CommentsModel.insertMany(newSubTaskComments);
            console.log(`✅ Copied ${originalSubTaskComments.length} comments for subtask: ${newSubTask.title}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error creating recurring task ${originalTask.title}:`, error);
      }
    }
    
    console.log(`🎉 Recurring tasks creation completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Tasks created: ${createdTasksCount}`);
    console.log(`   - Subtasks created: ${createdSubTasksCount}`);
    console.log(`   - Next month: ${nextMonth.format('YYYY-MM')}`);
    
    return {
      success: true,
      createdTasksCount,
      createdSubTasksCount,
      nextMonth: nextMonth.format('YYYY-MM'),
      message: `Successfully created ${createdTasksCount} recurring tasks and ${createdSubTasksCount} subtasks for ${nextMonth.format('YYYY-MM')}`
    };
    
  } catch (error) {
    console.error("❌ Error in createRecurringTasksForNextMonth:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to create recurring tasks"
    };
  }
};

/**
 * Create yearly recurring tasks for the next year
 * This function should be called at the end of each year by cron job
 */
exports.createYearlyRecurringTasks = async () => {
  try {
    console.log("🔄 Starting yearly recurring tasks creation for next year...");
    
    // Get current date and calculate next year's start and end dates
    const currentDate = moment();
    const nextYear = currentDate.clone().add(1, 'year');
    const nextYearStart = nextYear.clone().startOf('year');
    const nextYearEnd = nextYear.clone().endOf('year');
    
    console.log(`📅 Next year: ${nextYear.format('YYYY')}`);
    console.log(`📅 Next year start: ${nextYearStart.format('YYYY-MM-DD')}`);
    console.log(`📅 Next year end: ${nextYearEnd.format('YYYY-MM-DD')}`);
    
    // Find all tasks that are yearly recurring and active
    // Only get tasks created in the current year to avoid copying already copied tasks
    const currentYearStart = currentDate.clone().startOf('year');
    const currentYearEnd = currentDate.clone().endOf('year');
    
    const recurringTasks = await ProjectTasks.find({
      recurringType: "yearly", // Only yearly recurring tasks
      isDeleted: false,
      status: 'active',
      createdAt: {
        $gte: currentYearStart.toDate(),
        $lte: currentYearEnd.toDate()
      }
    }).populate('project_id main_task_id task_status assignees pms_clients task_labels');
    
    console.log(`📋 Found ${recurringTasks.length} yearly recurring tasks to process`);
    
    let createdTasksCount = 0;
    let createdSubTasksCount = 0;
    
    for (const originalTask of recurringTasks) {
      try {
        // Create a carbon copy of the task
        const newTaskData = {
          title: originalTask.title,
          taskId: generateRandomId(),
          project_id: originalTask.project_id._id,
          main_task_id: originalTask.main_task_id._id,
          task_status: originalTask.task_status ? originalTask.task_status._id : null,
          assignees: originalTask.assignees.map(assignee => assignee._id),
          pms_clients: originalTask.pms_clients.map(client => client._id),
          status: originalTask.status,
          descriptions: originalTask.descriptions,
          task_labels: originalTask.task_labels.map(label => label._id),
          estimated_hours: 0,
          estimated_minutes: 0,
          task_progress: originalTask.task_progress, // Reset progress for new year
          recurringType: originalTask.recurringType, // Keep the same recurring type
          isImported: false,
          
          // Update dates to next year
          start_date: originalTask.start_date ? 
            nextYearStart.clone().add(moment(originalTask.start_date).date() - 1, 'days').add(moment(originalTask.start_date).month(), 'months').toDate() : 
            nextYearStart.toDate(),
          due_date: originalTask.due_date ? 
            nextYearEnd.clone().subtract(moment(originalTask.due_date).date() - 1, 'days').subtract(11 - moment(originalTask.due_date).month(), 'months').toDate() : 
            nextYearEnd.toDate(),
          
          // Task status history
          task_status_history: originalTask.task_status ? [{
            task_status: originalTask.task_status._id,
            updatedBy: originalTask.createdBy,
            updatedAt: configs.utcDefault()
          }] : [],
          
          // Metadata
          createdBy: originalTask.createdBy,
          updatedBy: originalTask.createdBy,
          ...(await getRefModelFromLoginUser({ _id: originalTask.createdBy }))
        };
        
        // Create the new task
        const newTask = new ProjectTasks(newTaskData);
        const savedTask = await newTask.save();
        
        console.log(`✅ Created yearly recurring task: ${savedTask.title} (${savedTask.taskId})`);
        createdTasksCount++;
        
        // Copy comments from original task
        const originalComments = await CommentsModel.find({
          task_id: originalTask._id,
          isDeleted: false
        });
        
        if (originalComments.length > 0) {
          const newComments = originalComments.map(async (comment) => {
            return {
              ...comment.toObject(), // Convert Mongoose document to plain JavaScript object
              _id: new mongoose.Types.ObjectId(),
              task_id: savedTask._id,
              createdBy: originalTask.createdBy,
              updatedBy: originalTask.createdBy,
              createdAt: configs.utcDefault(),
              updatedAt: configs.utcDefault(),
              ...(await getRefModelFromLoginUser({ _id: originalTask.createdBy }))
            };
          });
          
          // Save the new comments
          await CommentsModel.insertMany(newComments);
          console.log(`✅ Copied ${originalComments.length} comments for yearly task: ${savedTask.title}`);
        }
        
        // Create task history entry
        const taskHistory = new ProjectTaskUpdateHistory({
          project_id: originalTask.project_id._id,
          main_task_id: originalTask.main_task_id._id,
          task_id: savedTask._id,
          updated_key: "yearly_recurring_task_created",
          pervious_value: `Original task: ${originalTask.taskId}`,
          new_value: `Yearly recurring task for ${nextYear.format('YYYY')}`,
          createdBy: originalTask.createdBy,
          updatedBy: originalTask.createdBy,
          ...(await getRefModelFromLoginUser({ _id: originalTask.createdBy }))
        });
        await taskHistory.save();
        
        // Handle subtasks for yearly recurring tasks
        const originalSubTasks = await ProjectSubTasks.find({
          task_id: originalTask._id,
          isDeleted: false,
          status: 'active'
        });
        
        for (const originalSubTask of originalSubTasks) {
          const newSubTaskData = {
            title: originalSubTask.title,
            subTaskId: generateRandomId(),
            project_id: originalSubTask.project_id,
            main_task_id: originalSubTask.main_task_id,
            task_id: savedTask._id, // Link to the new task
            task_status: originalSubTask.task_status,
            assignees: originalSubTask.assignees,
            status: originalSubTask.status,
            descriptions: originalSubTask.descriptions,
            task_labels: originalSubTask.task_labels,
            estimated_hours: originalSubTask.estimated_hours,
            estimated_minutes: originalSubTask.estimated_minutes,
            task_progress: "0", // Reset progress for new year
            
            // Update dates to next year
            start_date: originalSubTask.start_date ? 
              nextYearStart.clone().add(moment(originalSubTask.start_date).date() - 1, 'days').add(moment(originalSubTask.start_date).month(), 'months').toDate() : 
              nextYearStart.toDate(),
            due_date: originalSubTask.due_date ? 
              nextYearEnd.clone().subtract(moment(originalSubTask.due_date).date() - 1, 'days').subtract(11 - moment(originalSubTask.due_date).month(), 'months').toDate() : 
              nextYearEnd.toDate(),
            
            // Task status history
            task_status_history: originalSubTask.task_status ? [{
              task_status: originalSubTask.task_status,
              updatedBy: originalSubTask.createdBy,
              updatedAt: configs.utcDefault()
            }] : [],
            
            // Metadata
            createdBy: originalSubTask.createdBy,
            updatedBy: originalSubTask.createdBy
          };
          
          const newSubTask = new ProjectSubTasks(newSubTaskData);
          await newSubTask.save();
          
          console.log(`✅ Created yearly recurring subtask: ${newSubTask.title} (${newSubTask.subTaskId})`);
          createdSubTasksCount++;
          
          // Copy comments from original subtask
          const originalSubTaskComments = await CommentsModel.find({
            subTask_id: originalSubTask._id,
            isDeleted: false
          });
          
          if (originalSubTaskComments.length > 0) {
            const newSubTaskComments = originalSubTaskComments.map((comment) => {
              return {
                ...comment.toObject(),
                _id: new mongoose.Types.ObjectId(),
                subTask_id: newSubTask._id,
                createdBy: originalSubTask.createdBy,
                updatedBy: originalSubTask.createdBy,
                createdAt: configs.utcDefault(),
                updatedAt: configs.utcDefault()
              };
            });
            
            await CommentsModel.insertMany(newSubTaskComments);
            console.log(`✅ Copied ${originalSubTaskComments.length} comments for yearly subtask: ${newSubTask.title}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error creating yearly recurring task ${originalTask.title}:`, error);
      }
    }
    
    console.log(`🎉 Yearly recurring tasks creation completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Tasks created: ${createdTasksCount}`);
    console.log(`   - Subtasks created: ${createdSubTasksCount}`);
    console.log(`   - Next year: ${nextYear.format('YYYY')}`);
    
    return {
      success: true,
      createdTasksCount,
      createdSubTasksCount,
      nextYear: nextYear.format('YYYY'),
      message: `Successfully created ${createdTasksCount} yearly recurring tasks and ${createdSubTasksCount} subtasks for ${nextYear.format('YYYY')}`
    };
    
  } catch (error) {
    console.error("❌ Error in createYearlyRecurringTasks:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to create yearly recurring tasks"
    };
  }
};

/**
 * Create monthly recurring projects for the next month
 * This function should be called at the end of each month by cron job
 */
exports.createMonthlyRecurringProjects = async () => {
  try {
    console.log("🔄 Starting recurring projects creation for next month...");
    
    // Get current date and calculate next month's start and end dates
    const currentDate = moment();
    const nextMonth = currentDate.clone().add(1, 'month');
    const nextMonthStart = nextMonth.clone().startOf('month');
    const nextMonthEnd = nextMonth.clone().endOf('month');
    
    console.log(`📅 Next month: ${nextMonth.format('YYYY-MM')}`);
    console.log(`📅 Next month start: ${nextMonthStart.format('YYYY-MM-DD')}`);
    console.log(`📅 Next month end: ${nextMonthEnd.format('YYYY-MM-DD')}`);
    
    // Find all projects that are recurring and active
    // For TESTING: Get all monthly recurring projects (no date filter)
    // For PRODUCTION: Add createdAt filter to only get projects created in current month
    const currentMonthStart = currentDate.clone().startOf('month');
    const currentMonthEnd = currentDate.clone().endOf('month');
    
    const recurringProjects = await Project.find({
      recurringType: "monthly",
      isDeleted: false,
      // TESTING: Commented out to test with all projects
      // createdAt: {
      //   $gte: currentMonthStart.toDate(),
      //   $lte: currentMonthEnd.toDate()
      // }
    }).populate('project_type project_status manager acc_manager assignees pms_clients technology workFlow');
    
    console.log(`📋 Found ${recurringProjects.length} recurring projects to process`);
    
    let createdProjectsCount = 0;
    let createdMainTasksCount = 0;
    let createdTasksCount = 0;
    
    for (const originalProject of recurringProjects) {
      try {
        // Create a carbon copy of the project
        const newProjectData = {
          companyId: originalProject.companyId,
          title: `${originalProject.title} - ${nextMonth.format('MMM YYYY')}`,
          projectId: generateRandomId(),
          color: originalProject.color,
          descriptions: originalProject.descriptions,
          technology: originalProject.technology.map(tech => tech._id),
          project_type: originalProject.project_type._id,
          project_status: originalProject.project_status._id,
          manager: originalProject.manager._id,
          acc_manager: originalProject.acc_manager ? originalProject.acc_manager._id : null,
          assignees: originalProject.assignees.map(assignee => assignee._id),
          pms_clients: originalProject.pms_clients.map(client => client._id),
          workFlow: originalProject.workFlow._id,
          estimatedHours: originalProject.estimatedHours,
          isBillable: originalProject.isBillable,
          recurringType: originalProject.recurringType,
          
          // Update dates to next month
          start_date: originalProject.start_date ? 
            nextMonthStart.clone().add(moment(originalProject.start_date).date() - 1, 'days').toDate() : 
            nextMonthStart.toDate(),
          end_date: originalProject.end_date ? 
            nextMonthEnd.clone().subtract(moment(originalProject.end_date).date() - 1, 'days').toDate() : 
            nextMonthEnd.toDate(),
          
          // Metadata
          createdBy: originalProject.createdBy,
          updatedBy: originalProject.createdBy,
          ...(await getRefModelFromLoginUser({ _id: originalProject.createdBy }))
        };
        
        // Create the new project
        const newProject = new Project(newProjectData);
        const savedProject = await newProject.save();
        
        console.log(`✅ Created recurring project: ${savedProject.title} (${savedProject.projectId})`);
        createdProjectsCount++;
        
        // Add default project folder
        let projectFolder = new fileFolders({
          name: savedProject.title,
          isDefault: true,
          project_id: savedProject._id,
          createdBy: originalProject.createdBy,
          updatedBy: originalProject.createdBy
        });
        await projectFolder.save();
        
        // Add default project timesheet (plain, no data)
        let timeSheet = new ProjectTimeSheet({
          title: `${savedProject.title} - Timesheet`,
          isDefault: true,
          project_id: savedProject._id,
          createdBy: originalProject.createdBy,
          updatedBy: originalProject.createdBy
        });
        await timeSheet.save();
        console.log(`✅ Created default timesheet for project: ${savedProject.title}`);
        
        // Get TODO workflow status for the cloned project
        const todoWorkflowStatus = await ProjectWorkFlowStatus.findOne({
          workflow_id: savedProject.workFlow,
          title: DEFAULT_DATA.WORKFLOW_STATUS.TODO,
          isDeleted: false
        });
        
        // Now clone all main tasks
        const originalMainTasks = await ProjectMainTasks.find({
          project_id: originalProject._id,
          isDeleted: false
        });
        
        for (const originalMainTask of originalMainTasks) {
          const newMainTaskData = {
            title: originalMainTask.title,
            project_id: savedProject._id,
            subscribers: originalMainTask.subscribers,
            pms_clients: originalMainTask.pms_clients,
            subscriber_stages: originalMainTask.subscriber_stages,
            status: originalMainTask.status,
            task_status: originalMainTask.task_status,
            task_status_history: originalMainTask.task_status ? [{
              task_status: originalMainTask.task_status,
              updatedBy: originalProject.createdBy,
              updatedAt: configs.utcDefault()
            }] : [],
            isPrivateList: originalMainTask.isPrivateList,
            isDisplayInGantt: originalMainTask.isDisplayInGantt,
            createdBy: originalProject.createdBy,
            updatedBy: originalProject.createdBy,
            ...(await getRefModelFromLoginUser({ _id: originalProject.createdBy }))
          };
          
          const newMainTask = new ProjectMainTasks(newMainTaskData);
          const savedMainTask = await newMainTask.save();
          
          console.log(`✅ Created recurring main task: ${savedMainTask.title}`);
          createdMainTasksCount++;
          
          // Now clone all tasks under this main task (without comments)
          const originalTasks = await ProjectTasks.find({
            main_task_id: originalMainTask._id,
            project_id: originalProject._id,
            isDeleted: false
          });
          
          for (const originalTask of originalTasks) {
            const newTaskData = {
              title: originalTask.title,
              taskId: generateRandomId(),
              project_id: savedProject._id,
              main_task_id: savedMainTask._id,
              task_status: todoWorkflowStatus ? todoWorkflowStatus._id : null, // Always set to TODO
              assignees: originalTask.assignees,
              pms_clients: originalTask.pms_clients,
              status: originalTask.status,
              descriptions: originalTask.descriptions,
              task_labels: originalTask.task_labels,
              estimated_hours: originalTask.estimated_hours,
              estimated_minutes: originalTask.estimated_minutes,
              task_progress: "0", // Reset progress for new month
              recurringType: originalTask.recurringType,
              isImported: false,
              
              // Update dates to next month
              start_date: originalTask.start_date ? 
                nextMonthStart.clone().add(moment(originalTask.start_date).date() - 1, 'days').toDate() : 
                null,
              due_date: originalTask.due_date ? 
                nextMonthEnd.clone().subtract(moment(originalTask.due_date).date() - 1, 'days').toDate() : 
                null,
              
              // Task status history - Always set to TODO
              task_status_history: todoWorkflowStatus ? [{
                task_status: todoWorkflowStatus._id,
                updatedBy: originalProject.createdBy,
                updatedAt: configs.utcDefault()
              }] : [],
              
              // Metadata
              createdBy: originalProject.createdBy,
              updatedBy: originalProject.createdBy,
              ...(await getRefModelFromLoginUser({ _id: originalProject.createdBy }))
            };
            
            const newTask = new ProjectTasks(newTaskData);
            const savedTask = await newTask.save();
            
            console.log(`✅ Created recurring task: ${savedTask.title} (${savedTask.taskId})`);
            createdTasksCount++;
          }
        }
        
      } catch (error) {
        console.error(`❌ Error creating recurring project ${originalProject.title}:`, error);
      }
    }
    
    console.log(`🎉 Recurring projects creation completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Projects created: ${createdProjectsCount}`);
    console.log(`   - Main tasks created: ${createdMainTasksCount}`);
    console.log(`   - Tasks created: ${createdTasksCount}`);
    console.log(`   - Next month: ${nextMonth.format('YYYY-MM')}`);
    
    return {
      success: true,
      createdProjectsCount,
      createdMainTasksCount,
      createdTasksCount,
      nextMonth: nextMonth.format('YYYY-MM'),
      message: `Successfully created ${createdProjectsCount} recurring projects with ${createdMainTasksCount} main tasks and ${createdTasksCount} tasks for ${nextMonth.format('YYYY-MM')}`
    };
    
  } catch (error) {
    console.error("❌ Error in createMonthlyRecurringProjects:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to create monthly recurring projects"
    };
  }
};

/**
 * Create yearly recurring projects for the next year
 * This function should be called at the end of each year by cron job
 */
exports.createYearlyRecurringProjects = async () => {
  try {
    console.log("🔄 Starting yearly recurring projects creation for next year...");
    
    // Get current date and calculate next year's start and end dates
    const currentDate = moment();
    const nextYear = currentDate.clone().add(1, 'year');
    const nextYearStart = nextYear.clone().startOf('year');
    const nextYearEnd = nextYear.clone().endOf('year');
    
    console.log(`📅 Next year: ${nextYear.format('YYYY')}`);
    console.log(`📅 Next year start: ${nextYearStart.format('YYYY-MM-DD')}`);
    console.log(`📅 Next year end: ${nextYearEnd.format('YYYY-MM-DD')}`);
    
    // Find all projects that are yearly recurring and active
    // For TESTING: Get all yearly recurring projects (no date filter)
    // For PRODUCTION: Add createdAt filter to only get projects created in current year
    const currentYearStart = currentDate.clone().startOf('year');
    const currentYearEnd = currentDate.clone().endOf('year');
    
    const recurringProjects = await Project.find({
      recurringType: "yearly",
      isDeleted: false,
      // TESTING: Commented out to test with all projects
      // createdAt: {
      //   $gte: currentYearStart.toDate(),
      //   $lte: currentYearEnd.toDate()
      // }
    }).populate('project_type project_status manager acc_manager assignees pms_clients technology workFlow');
    
    console.log(`📋 Found ${recurringProjects.length} yearly recurring projects to process`);
    
    let createdProjectsCount = 0;
    let createdMainTasksCount = 0;
    let createdTasksCount = 0;
    
    for (const originalProject of recurringProjects) {
      try {
        // Create a carbon copy of the project
        const newProjectData = {
          companyId: originalProject.companyId,
          title: `${originalProject.title} - ${nextYear.format('YYYY')}`,
          projectId: generateRandomId(),
          color: originalProject.color,
          descriptions: originalProject.descriptions,
          technology: originalProject.technology.map(tech => tech._id),
          project_type: originalProject.project_type._id,
          project_status: originalProject.project_status._id,
          manager: originalProject.manager._id,
          acc_manager: originalProject.acc_manager ? originalProject.acc_manager._id : null,
          assignees: originalProject.assignees.map(assignee => assignee._id),
          pms_clients: originalProject.pms_clients.map(client => client._id),
          workFlow: originalProject.workFlow._id,
          estimatedHours: originalProject.estimatedHours,
          isBillable: originalProject.isBillable,
          recurringType: originalProject.recurringType,
          
          // Update dates to next year
          start_date: originalProject.start_date ? 
            nextYearStart.clone().add(moment(originalProject.start_date).date() - 1, 'days').add(moment(originalProject.start_date).month(), 'months').toDate() : 
            nextYearStart.toDate(),
          end_date: originalProject.end_date ? 
            nextYearEnd.clone().subtract(moment(originalProject.end_date).date() - 1, 'days').subtract(11 - moment(originalProject.end_date).month(), 'months').toDate() : 
            nextYearEnd.toDate(),
          
          // Metadata
          createdBy: originalProject.createdBy,
          updatedBy: originalProject.createdBy,
          ...(await getRefModelFromLoginUser({ _id: originalProject.createdBy }))
        };
        
        // Create the new project
        const newProject = new Project(newProjectData);
        const savedProject = await newProject.save();
        
        console.log(`✅ Created yearly recurring project: ${savedProject.title} (${savedProject.projectId})`);
        createdProjectsCount++;
        
        // Add default project folder
        let projectFolder = new fileFolders({
          name: savedProject.title,
          isDefault: true,
          project_id: savedProject._id,
          createdBy: originalProject.createdBy,
          updatedBy: originalProject.createdBy
        });
        await projectFolder.save();
        
        // Add default project timesheet (plain, no data)
        let timeSheet = new ProjectTimeSheet({
          title: `${savedProject.title} - Timesheet`,
          isDefault: true,
          project_id: savedProject._id,
          createdBy: originalProject.createdBy,
          updatedBy: originalProject.createdBy
        });
        await timeSheet.save();
        console.log(`✅ Created default timesheet for yearly project: ${savedProject.title}`);
        
        // Get TODO workflow status for the cloned project
        const todoWorkflowStatus = await ProjectWorkFlowStatus.findOne({
          workflow_id: savedProject.workFlow,
          title: DEFAULT_DATA.WORKFLOW_STATUS.TODO,
          isDeleted: false
        });
        
        // Now clone all main tasks
        const originalMainTasks = await ProjectMainTasks.find({
          project_id: originalProject._id,
          isDeleted: false
        });
        
        for (const originalMainTask of originalMainTasks) {
          const newMainTaskData = {
            title: originalMainTask.title,
            project_id: savedProject._id,
            subscribers: originalMainTask.subscribers,
            pms_clients: originalMainTask.pms_clients,
            subscriber_stages: originalMainTask.subscriber_stages,
            status: originalMainTask.status,
            task_status: originalMainTask.task_status,
            task_status_history: originalMainTask.task_status ? [{
              task_status: originalMainTask.task_status,
              updatedBy: originalProject.createdBy,
              updatedAt: configs.utcDefault()
            }] : [],
            isPrivateList: originalMainTask.isPrivateList,
            isDisplayInGantt: originalMainTask.isDisplayInGantt,
            createdBy: originalProject.createdBy,
            updatedBy: originalProject.createdBy,
            ...(await getRefModelFromLoginUser({ _id: originalProject.createdBy }))
          };
          
          const newMainTask = new ProjectMainTasks(newMainTaskData);
          const savedMainTask = await newMainTask.save();
          
          console.log(`✅ Created yearly recurring main task: ${savedMainTask.title}`);
          createdMainTasksCount++;
          
          // Now clone all tasks under this main task (without comments)
          const originalTasks = await ProjectTasks.find({
            main_task_id: originalMainTask._id,
            project_id: originalProject._id,
            isDeleted: false
          });
          
          for (const originalTask of originalTasks) {
            const newTaskData = {
              title: originalTask.title,
              taskId: generateRandomId(),
              project_id: savedProject._id,
              main_task_id: savedMainTask._id,
              task_status: todoWorkflowStatus ? todoWorkflowStatus._id : null, // Always set to TODO
              assignees: originalTask.assignees,
              pms_clients: originalTask.pms_clients,
              status: originalTask.status,
              descriptions: originalTask.descriptions,
              task_labels: originalTask.task_labels,
              estimated_hours: originalTask.estimated_hours,
              estimated_minutes: originalTask.estimated_minutes,
              task_progress: "0", // Reset progress for new year
              recurringType: originalTask.recurringType,
              isImported: false,
              
              // Update dates to next year
              start_date: originalTask.start_date ? 
                nextYearStart.clone().add(moment(originalTask.start_date).date() - 1, 'days').add(moment(originalTask.start_date).month(), 'months').toDate() : 
                null,
              due_date: originalTask.due_date ? 
                nextYearEnd.clone().subtract(moment(originalTask.due_date).date() - 1, 'days').subtract(11 - moment(originalTask.due_date).month(), 'months').toDate() : 
                null,
              
              // Task status history - Always set to TODO
              task_status_history: todoWorkflowStatus ? [{
                task_status: todoWorkflowStatus._id,
                updatedBy: originalProject.createdBy,
                updatedAt: configs.utcDefault()
              }] : [],
              
              // Metadata
              createdBy: originalProject.createdBy,
              updatedBy: originalProject.createdBy,
              ...(await getRefModelFromLoginUser({ _id: originalProject.createdBy }))
            };
            
            const newTask = new ProjectTasks(newTaskData);
            const savedTask = await newTask.save();
            
            console.log(`✅ Created yearly recurring task: ${savedTask.title} (${savedTask.taskId})`);
            createdTasksCount++;
          }
        }
        
      } catch (error) {
        console.error(`❌ Error creating yearly recurring project ${originalProject.title}:`, error);
      }
    }
    
    console.log(`🎉 Yearly recurring projects creation completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Projects created: ${createdProjectsCount}`);
    console.log(`   - Main tasks created: ${createdMainTasksCount}`);
    console.log(`   - Tasks created: ${createdTasksCount}`);
    console.log(`   - Next year: ${nextYear.format('YYYY')}`);
    
    return {
      success: true,
      createdProjectsCount,
      createdMainTasksCount,
      createdTasksCount,
      nextYear: nextYear.format('YYYY'),
      message: `Successfully created ${createdProjectsCount} yearly recurring projects with ${createdMainTasksCount} main tasks and ${createdTasksCount} tasks for ${nextYear.format('YYYY')}`
    };
    
  } catch (error) {
    console.error("❌ Error in createYearlyRecurringProjects:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to create yearly recurring projects"
    };
  }
};

