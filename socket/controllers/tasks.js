const mongoose = require("mongoose");
const { getDB } = require("../helpers/db");
const {
  getProjectQuery,
  getTaskQuery,
  getCreatedUpdatedDeletedByQuery,
  commonLookupQuery,
  getAssigneeData,
} = require("../helpers/common");
const { Models } = require("../helpers/constants");

class TaskSocketFn {
  getTaskDetails = async (taskId) => {
    try {
      const query = [
        ...(await getProjectQuery()),
        ...(await commonLookupQuery(
          Models.MainTasks,
          "main_task_id",
          "mainTask"
        )),
        ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
        ...(await getAssigneeData()),
        ...(await getAssigneeData("pms_clients", Models.PMSClients)),
        {
          $match: {
            _id: new mongoose.Types.ObjectId(taskId),
            isDeleted: false,
          },
        },
      ];
      const task = await getDB().Tasks.aggregate(query).toArray();
      return task[0];
    } catch (error) {
      console.log("🚀 ~ TaskSocketFn ~ getTaskDetails= ~ error:", error);
    }
  };

  getTaskCommentsDetails = async (comments_id) => {
    try {
      const query = [
        ...(await getTaskQuery()),
        ...(await getProjectQuery("task.project_id")),
        ...(await commonLookupQuery(
          Models.MainTasks,
          "task.main_task_id",
          "mainTask"
        )),
        ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
        {
          $match: {
            _id: new mongoose.Types.ObjectId(comments_id),
            isDeleted: false,
          },
        },
      ];

      const comments = await getDB().TaskComments.aggregate(query).toArray();

      return comments[0];
    } catch (error) {
      console.log(
        "🚀 ~ TaskSocketFn ~ getTaskCommentsDetails= ~ error:",
        error
      );
    }
  };
}

module.exports = new TaskSocketFn();
