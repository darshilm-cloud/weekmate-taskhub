const mongoose = require("mongoose");
const { getDB } = require("../helpers/db");
const {
  getProjectQuery,
  getCreatedUpdatedDeletedByQuery,
  getAssigneeData,
} = require("../helpers/common");
const { Models } = require("../helpers/constants");

class DiscussionSocketFn {
  getDiscussionTopic = async (discussionId) => {
    try {
      const query = [
        ...(await getProjectQuery()),
        ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
        ...(await getAssigneeData("subscribers")),
        ...(await getAssigneeData("pms_clients", Models.PMSClients)),
        {
          $match: {
            _id: new mongoose.Types.ObjectId(discussionId),
            isDeleted: false,
          },
        },
      ];
      const data = await getDB().DiscussionTopics.aggregate(query).toArray();
      return data[0];
    } catch (error) {
      console.log(
        "🚀 ~ DiscussionSocketFn ~ getDiscussionTopic= ~ error:",
        error
      );
    }
  };

  getDiscussionTopicDetails = async (detailsId) => {
    try {
      const query = [
        ...(await getProjectQuery()),
        ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
        {
          $match: {
            _id: new mongoose.Types.ObjectId(detailsId),
            isDeleted: false,
          },
        },
      ];

      const data = await getDB()
        .DiscussionTopicsDetails.aggregate(query)
        .toArray();
      return data[0];
    } catch (error) {
      console.log(
        "🚀 ~ DiscussionSocketFn ~ getDiscussionTopicDetails= ~ error:",
        error
      );
    }
  };
}

module.exports = new DiscussionSocketFn();
