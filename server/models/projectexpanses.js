const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const projectExpansesSchema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true,
  },

  purchase_request_details: {
    type: String,
    required: true,
  },

  cost_in_usd: {
    type: Number,
    required: true,
  },

  need_to_bill_customer: {
    type: Boolean,
    default: true, // ✅ Default is Yes (true)
  },

  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Paid"],
    required: true,
    default: 'Pending'
  },

  projectexpences: {
    type: [String], default: []
  },
  details: {
    type: String, required: false
  },
  nature_Of_expense: {
    type: String, required: false
  },
  
  billing_cycle: { type: String, required: false },
  is_recuring: {
    type: Boolean, default: false
  },
  // code:{type:Number,required:false},
  ...commonSchema(), // ✅ Inherits common fields (createdAt, updatedAt, etc.)
});

module.exports = mongoose.model("projectexpanses", projectExpansesSchema);
