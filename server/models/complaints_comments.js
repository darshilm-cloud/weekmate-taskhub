const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const ComplaintsComplaintsSchema = new mongoose.Schema({
    complaint_id: {
        type: Schema.Types.ObjectId,
        ref: "complaints",
        required: true,
    },
    comment: {
        type: String,
        required: true,
    },
    ...commonSchema(),
});

module.exports = mongoose.model("complaints_comments", ComplaintsComplaintsSchema);
