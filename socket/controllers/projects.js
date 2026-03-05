const mongoose = require("mongoose");
const { getDB } = require("../helpers/db");
const { getCreatedUpdatedDeletedByQuery } = require("../helpers/common");

class ProjectSocketFn {
  getProjectDetails = async (projectId) => {
    console.log(
      "🚀 ~ ProjectSocketFn ~ getProjectDetails= ~ projectId:",
      projectId
    );
    try {
      const query = [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(projectId),
            isDeleted: false,
          },
        },
        ...(await getCreatedUpdatedDeletedByQuery("updatedBy"))
      ];
      const project = await getDB().Projects.aggregate(query).toArray();

      return project[0];
    } catch (error) {
      console.log("🚀 ~ ProjectSocketFn ~ getProjectDetails= ~ error:", error);
    }
  };
}

module.exports = new ProjectSocketFn();
