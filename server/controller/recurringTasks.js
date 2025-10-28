const mongoose = require("mongoose");
const moment = require("moment");
const ProjectTasks = mongoose.model("projecttasks");
const ProjectSubTasks = mongoose.model("projectsubtasks");
const ProjectTaskUpdateHistory = mongoose.model("taskupdatehistory");
const CommentsModel = mongoose.model("Comments");
const { generateRandomId, getRefModelFromLoginUser } = require("../helpers/common");
const configs = require("../configs");

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

