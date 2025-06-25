const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const ReviewsSchema = new mongoose.Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true,
  },
  client_name: {
    type: String,
    required: true,
  },
  feedback: {
    type: String,
    required: true,
  },
  feedback_type: {
    type: String,
    enum: ["Clutch Review", "Video Testimonial", "Text Testimonial", "Feedback", "Zoho Partner Profile"],
    required: true,
  },
  client_nda_sign: { type: Boolean },

  ...commonSchema(),
});

module.exports = mongoose.model("reviews", ReviewsSchema);
