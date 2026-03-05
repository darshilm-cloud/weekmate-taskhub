const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { utcDefault } = require("../configs");

const FeedBackFormSchema = new mongoose.Schema({
    complaint_id: {
        type: Schema.Types.ObjectId,
        ref: "complaints",
        required: true,
    },
    satisfaction: {
        type: Number,
        required: true,
        min: 0,
        max: 5,
    },
    rate_reviews: {
        type: Number,
        required: true,
        min: 0,
        max: 5,
    },
    additional_comments: { type: String },
    createdAt: {
        type: Date,
        default: utcDefault,
    },
});

module.exports = mongoose.model("consumer_feedback_forms", FeedBackFormSchema);
