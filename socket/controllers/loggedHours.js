const mongoose = require("mongoose");
const { getDB } = require("../helpers/db");
const { getProjectQuery, getCreatedUpdatedDeletedByQuery } = require("../helpers/common");
const { Models } = require("../helpers/constants");

class LoggedHoursFn {
  getTaskLoggedHoursDetails = async (loggedId) => {
    try {
      const query = [
        ...(await getProjectQuery()),
        ...(await getCreatedUpdatedDeletedByQuery()),
        {
          $match: {
            _id: new mongoose.Types.ObjectId(loggedId),
            isDeleted: false,
          },
        },
      ];
      const data = await getDB().TaskLoggedHours.aggregate(query).toArray();
      return data[0];
    } catch (error) {
      console.log("🚀 ~ LoggedHoursFn ~ getDiscussionTopic= ~ error:", error);
    }
  };
}

module.exports = new LoggedHoursFn();
