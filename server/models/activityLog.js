const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const configs = require("../configs");

const activityLogSchema = new Schema({
  companyId: { 
    type: Schema.Types.ObjectId, 
    ref: "companies",
    required: true 
  },
  operationName: { 
    type: String, 
    required: true 
  }, // e.g., "LOGIN", "LOGOUT", "DELETE", "UPDATE"
  moduleName: { 
    type: String, 
    default: null 
  }, // e.g., "employees", "projects", "tasks" (for delete/update operations)
  email: { 
    type: String, 
    required: true 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: "employees",
    required: true 
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: "employees",
    default: null
  }, // For UPDATE operations, stores who updated the record
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: "employees",
    default: null
  }, // For DELETE operations, stores who deleted the record
  createdAt: { 
    type: Date, 
    default: configs.utcDefault 
  },
  additionalData: {
    type: Schema.Types.Mixed,
    default: null
  }, // For storing any additional context like deleted record IDs, etc.
  updatedData: {
    type: Schema.Types.Mixed,
    default: null
  } // For storing old and new data for update operations: { oldData: {...}, newData: {...} }
});

// Index for faster queries
activityLogSchema.index({ companyId: 1, createdAt: -1 });
activityLogSchema.index({ email: 1, createdAt: -1 });
activityLogSchema.index({ operationName: 1, createdAt: -1 });

module.exports = mongoose.model("activitylogs", activityLogSchema);

