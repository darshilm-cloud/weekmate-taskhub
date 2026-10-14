const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const ComplaintsStatusSchema = new mongoose.Schema({
    complaint_id: {
        type: Schema.Types.ObjectId,
        ref: "complaints",
        required: true,
    },
    status: {
        type: String,
        enum: ["open", "in_progress", "client_review", "resolved", "reopened", "customer_lost"],
        default: "open",
        required: true,
    },
    root_cause: {
        type: String,
        required: true,
    },
    immediate_action: {
        type: String,
    },
    corrective_action: {
        type: String,
    },
    

    ...commonSchema(),
});

// [perf-indexes] query-driven indexes for list/aggregation endpoints
ComplaintsStatusSchema.index({ complaint_id: 1, isDeleted: 1, _id: -1 });

module.exports = mongoose.model("complaints_status", ComplaintsStatusSchema);
