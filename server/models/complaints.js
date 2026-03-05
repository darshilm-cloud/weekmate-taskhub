const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const ComplaintsSchema = new mongoose.Schema({
    companyId: { type: Schema.Types.ObjectId, ref: "companies" },
    project_id: {
        type: Schema.Types.ObjectId,
        ref: "projects",
        required: true,
    },
    client_name: {
        type: String,
        required: true,
    },
    client_email: {
        type: String,
        required: true,
    },
    complaint: {
        type: String,
        required: true,
    },
    priority: {
        type: String,
        enum: ["critical", "high", "medium", "low"],
        required: true,
    },
    escalation_level: {
        type: String,
        enum: ["level1", "level2"],
        default: "level1",
    },
    status: {
        type: String,
        enum: ["open", "in_progress", "client_review", "resolved", "reopened", "customer_lost"],
        default: "open",
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },

    ...commonSchema(),
});

module.exports = mongoose.model("complaints", ComplaintsSchema);
