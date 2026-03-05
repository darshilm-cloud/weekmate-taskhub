const mongoose = require("mongoose");
const { getDB } = require("../helpers/db");
const {
  getProjectQuery,
  getCreatedUpdatedDeletedByQuery,
  getAssigneeData,
} = require("../helpers/common");
const { Models } = require("../helpers/constants");

class MainTaskSocketFn {
  getMainDetails = async (mainTaskId) => {
    try {
      const query = [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(mainTaskId),
            isDeleted: false,
          },
        },
        ...(await getProjectQuery()),
        ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
        ...(await getAssigneeData("subscribers")),
        ...(await getAssigneeData("pms_clients", Models.PMSClients)),
      ];
      const mainTask = await getDB().MainTasks.aggregate(query).toArray();
      return mainTask[0];
    } catch (error) {
      console.log("🚀 ~ MainTaskSocketFn ~ getTaskDetails= ~ error:", error);
    }
  };
}

module.exports = new MainTaskSocketFn();
