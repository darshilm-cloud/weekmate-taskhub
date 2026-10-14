const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// A user's chosen visible columns for one listing page (mirrors HRMS's
// column_preference). userId may be an employee or a pms client, so it has no
// fixed ref.
const ColumnPreferenceSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "companies", default: null },
    userId: { type: Schema.Types.ObjectId, required: true },
    pageKey: { type: String, required: true, trim: true },
    visibleColumns: { type: [String], default: [] },
  },
  { timestamps: true }
);

// One document per user per page per company — the only lookup this feature
// does, so it doubles as the uniqueness constraint for the upsert.
ColumnPreferenceSchema.index({ companyId: 1, userId: 1, pageKey: 1 }, { unique: true });

module.exports = mongoose.model("column_preferences", ColumnPreferenceSchema);
