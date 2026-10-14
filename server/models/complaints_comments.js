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

// [perf-indexes] query-driven indexes for list/aggregation endpoints
ComplaintsComplaintsSchema.index({ complaint_id: 1, isDeleted: 1, _id: -1 });

module.exports = mongoose.model("complaints_comments", ComplaintsComplaintsSchema);
