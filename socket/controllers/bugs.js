const mongoose = require("mongoose");
const { getDB } = require("../helpers/db");
const {
  getProjectQuery,
  commonLookupQuery,
  getCreatedUpdatedDeletedByQuery,
  getAssigneeData,
} = require("../helpers/common");
const { Models } = require("../helpers/constants");

class BugsSocketFn {
  getBugsDetails = async (bugId) => {
    try {
      const query = [
        ...(await getProjectQuery()),
        ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
        ...(await getAssigneeData()),
        {
          $match: {
            _id: new mongoose.Types.ObjectId(bugId),
            isDeleted: false,
          },
        },
      ];
      const data = await getDB().Bugs.aggregate(query).toArray();
      return data[0];
    } catch (error) {
      console.log("🚀 ~ BugsSocketFn ~ getDiscussionTopic= ~ error:", error);
    }
  };

  getBugCommentsDetails = async (commentId) => {
    try {
      const query = [
        ...(await commonLookupQuery(Models.Bugs, "bug_id", "bug")),
        ...(await getProjectQuery("bug.project_id")),
        ...(await commonLookupQuery(
          Models.Employees,
          "updatedBy",
          "updatedBy"
        )),
        {
          $match: {
            _id: new mongoose.Types.ObjectId(commentId),
            isDeleted: false,
          },
        },
      ];

      const data = await getDB().BugsComments.aggregate(query).toArray();
      return data[0];
    } catch (error) {
      console.log("🚀 ~ BugsSocketFn ~ getBugCommentsDetails= ~ error:", error);
    }
  };
}

module.exports = new BugsSocketFn();
