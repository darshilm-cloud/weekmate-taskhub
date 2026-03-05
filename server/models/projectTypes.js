const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const Schema = mongoose.Schema;

const projectTypesSchema = new mongoose.Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "companies" },
  project_type: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    default: "",
  },
  // project_workflow_id: { type: Schema.Types.ObjectId, ref: "projectworkflows"},
  createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  createdAt: { type: Date, default: utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  updatedAt: { type: Date, default: utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

projectTypesSchema.pre("save", function (next) {
  this.slug = generateSlug(this.project_type);
  next();
});

// Custom function to generate slug based on project type name
function generateSlug(project_type) {
  const slug = project_type.replace(/[^a-zA-Z0-9]/g, " ");

  let initials = slug
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  // Use initials as slug

  if (initials.length === 1) {
    initials = initials + slug.charAt(slug.length - 1).toUpperCase();
  }

  return initials;
}

module.exports = mongoose.model("projecttypes", projectTypesSchema);