const mongoose = require("mongoose");
const { getDB } = require("../helpers/db");
const {
  getProjectQuery,
  commonLookupQuery,
  getCreatedUpdatedDeletedByQuery,
  getAssigneeData,
} = require("../helpers/common");
const { Models } = require("../helpers/constants");

class NoteSocketFn {
  getNoteDetails = async (noteId) => {
    try {
      const query = [
        ...(await getProjectQuery()),
        ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
        ...(await getAssigneeData("subscribers")),
        ...(await getAssigneeData("pms_clients", Models.PMSClients)),
        {
          $match: {
            _id: new mongoose.Types.ObjectId(noteId),
            isDeleted: false,
          },
        },
      ];
      const data = await getDB().Notes.aggregate(query).toArray();
      return data[0];
    } catch (error) {
      console.log("🚀 ~ NoteSocketFn ~ getNoteDetails= ~ error:", error);
    }
  };

  getNoteCommentsDetails = async (commentId) => {
    try {
      const query = [
        ...(await commonLookupQuery(Models.Notes, "note_id", "note")),
        ...(await getProjectQuery("note.project_id")),
        ...(await getCreatedUpdatedDeletedByQuery("updatedBy")),
        {
          $match: {
            _id: new mongoose.Types.ObjectId(commentId),
            isDeleted: false,
          },
        },
      ];

      const data = await getDB().NoteComments.aggregate(query).toArray();

      return data[0];
    } catch (error) {
      console.log(
        "🚀 ~ NoteSocketFn ~ getNoteCommentsDetails= ~ error:",
        error
      );
    }
  };
}

module.exports = new NoteSocketFn();
