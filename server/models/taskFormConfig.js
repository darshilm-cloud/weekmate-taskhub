const mongoose = require("mongoose");
const { utcDefault } = require("../configs");

const { Schema } = mongoose;

const taskFormFieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        "text",
        "textarea",
        "number",
        "date",
        "datetime",
        "file",
        "select",
        "multiselect",
        "checkbox",
      ],
      default: "text",
    },
    required: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    optionSource: {
      type: String,
      enum: ["static", "linked"],
      default: "static",
    },
    linkedModule: { type: String, trim: true, default: null },
    options: [{ type: String, trim: true }],
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const taskFormConfigSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "companies", required: true, unique: true },
  fields: { type: [taskFormFieldSchema], default: [] },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  createdAt: { type: Date, default: utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  updatedAt: { type: Date, default: utcDefault },
});

module.exports = mongoose.model("task_form_configs", taskFormConfigSchema);
