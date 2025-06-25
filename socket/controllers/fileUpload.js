const mongoose = require("mongoose");
const { getDB } = require("../helpers/db");
const {
  getProjectQuery,
  getCreatedUpdatedDeletedByQuery,
  getAssigneeData,
} = require("../helpers/common");
const { Models } = require("../helpers/constants");

class FileSocketFn {
  getFileDetails = async (fileId) => {
    try {
      const query = [
        ...(await getProjectQuery()),
        ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
        ...(await getAssigneeData("subscribers")),
        ...(await getAssigneeData("pms_clients", Models.PMSClients)),
        {
          $match: {
            _id: new mongoose.Types.ObjectId(fileId),
            isDeleted: false,
          },
        },
      ];
      const data = await getDB().FileUpload.aggregate(query).toArray();
      return data[0];
    } catch (error) {
      console.log("🚀 ~ FileSocketFn ~ getFileDetails= ~ error:", error);
    }
  };
}

module.exports = new FileSocketFn();
