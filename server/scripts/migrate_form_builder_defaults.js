/**
 * Migration: Apply canonical default fields to all existing company form configs.
 *
 * What it does:
 *   - For each existing task_form_configs record:
 *       • Replaces default-field definitions with the canonical ones (label, type,
 *         optionSource, linkedModule, options are always reset to source-of-truth).
 *       • Preserves each default field's user-configured `required` setting if present.
 *       • Keeps all custom (non-default) fields unchanged.
 *       • Purges any field whose key is in REMOVED_FIELD_KEYS.
 *       • Re-orders: defaults first (in canonical order), then custom fields appended.
 *   - Same logic applied to project_form_configs.
 *   - Companies with NO existing config are skipped — they will get defaults on first
 *     API call via addDefaultConfigIfMissing.
 *
 * Usage:
 *   Dry run (no writes):   node scripts/migrate_form_builder_defaults.js
 *   Apply changes:         node scripts/migrate_form_builder_defaults.js --run
 */

"use strict";

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
dotenv.config({ path: path.resolve(__dirname, `../env/${envFile}`) });

require("../models");

// ─── Task form defaults (must stay in sync with taskFormBuilder.js) ───────────

const DEFAULT_TASK_FIELDS = [
  { key: "id",                label: "ID",                type: "text",     required: true,  isDefault: true },
  { key: "project_id",        label: "Project",           type: "text",     required: true,  isDefault: true },
  { key: "project_task_list", label: "Project Task List", type: "select",   required: false, isDefault: true, optionSource: "linked", linkedModule: "project_lists", options: [] },
  { key: "title",             label: "Title",             type: "text",     required: true,  isDefault: true },
  { key: "description",       label: "Description",       type: "textarea", required: false, isDefault: true },
  { key: "start_date",        label: "Start Date",        type: "date",     required: false, isDefault: true },
  { key: "end_date",          label: "End Date",          type: "date",     required: false, isDefault: true },
  { key: "assignee_id",       label: "Assignee",          type: "text",     required: false, isDefault: true },
  { key: "priority",          label: "Priority",          type: "text",     required: false, isDefault: true },
  { key: "labels",            label: "Labels",            type: "select",   required: false, isDefault: true, options: [] },
  { key: "created_by",        label: "Created By",        type: "text",     required: true,  isDefault: true },
  { key: "created_at",        label: "Created At",        type: "datetime", required: true,  isDefault: true },
  { key: "updated_at",        label: "Updated At",        type: "datetime", required: true,  isDefault: true },
];
const TASK_REMOVED_KEYS = new Set(["status"]);
const TASK_DEFAULT_KEY_SET = new Set(DEFAULT_TASK_FIELDS.map((f) => f.key));

// ─── Project form defaults (must stay in sync with projectFormBuilder.js) ─────

const DEFAULT_PROJECT_FIELDS = [
  { key: "id",              label: "ID",                    type: "text",        required: true,  isDefault: true },
  { key: "title",           label: "Project Title",         type: "text",        required: true,  isDefault: true },
  { key: "descriptions",    label: "Description",           type: "textarea",    required: false, isDefault: true },
  { key: "start_date",      label: "Start Date",            type: "date",        required: true,  isDefault: true },
  { key: "end_date",        label: "End Date",              type: "date",        required: false, isDefault: true },
  { key: "project_type",    label: "Category",              type: "select",      required: true,  isDefault: true },
  { key: "pms_clients",     label: "Client",                type: "multiselect", required: false, isDefault: false },
  { key: "assignees",       label: "Assignee / Team Group", type: "multiselect", required: false, isDefault: true },
  { key: "manager",         label: "Project Manager",       type: "select",      required: true,  isDefault: true },
  { key: "acc_manager",     label: "Account Manager",       type: "select",      required: false, isDefault: false },
  { key: "workFlow",        label: "Associate Workflow",    type: "select",      required: true,  isDefault: true },
  { key: "project_status",  label: "Status",                type: "select",      required: true,  isDefault: true },
  { key: "estimatedHours",  label: "Estimated Hours",       type: "number",      required: true,  isDefault: true },
  { key: "recurringType",   label: "Recurring",             type: "select",      required: false, isDefault: true, options: ["monthly", "yearly"] },
  { key: "isBillable",      label: "Billable Project",      type: "checkbox",    required: false, isDefault: true },
  { key: "created_by",      label: "Created By",            type: "text",        required: true,  isDefault: true },
  { key: "created_at",      label: "Created At",            type: "datetime",    required: true,  isDefault: true },
  { key: "updated_at",      label: "Updated At",            type: "datetime",    required: true,  isDefault: true },
];
const PROJECT_REMOVED_KEYS = new Set(["technology"]);
const PROJECT_DEFAULT_KEY_SET = new Set(DEFAULT_PROJECT_FIELDS.map((f) => f.key));

// ─── Merge helper ─────────────────────────────────────────────────────────────

function buildCanonicalFields(canonicalDefaults, defaultKeySet, removedKeys, existingFields) {
  const existingByKey = new Map(
    (existingFields || []).map((f) => [String(f.key || "").trim().toLowerCase(), f])
  );

  // Rebuild each default field from canonical source, preserving only `required`
  // if the company had explicitly set it.
  const mergedDefaults = canonicalDefaults.map((defaultField, index) => {
    const existing = existingByKey.get(defaultField.key.toLowerCase());
    return {
      key:          defaultField.key,
      label:        defaultField.label,
      type:         defaultField.type,
      isDefault:    true,
      required:     typeof existing?.required === "boolean"
                      ? existing.required
                      : Boolean(defaultField.required),
      optionSource: defaultField.optionSource || "static",
      linkedModule: defaultField.linkedModule || null,
      options:      defaultField.options || [],
      order:        index,
    };
  });

  // Keep custom fields that are not in the default set and not removed.
  const customFields = (existingFields || [])
    .filter((f) => {
      const key = String(f.key || "").trim().toLowerCase();
      return key && !defaultKeySet.has(key) && !removedKeys.has(key);
    })
    .map((f, idx) => ({
      ...f,
      isDefault: false,
      order:     canonicalDefaults.length + idx,
    }));

  return [...mergedDefaults, ...customFields];
}

// ─── Diff check ───────────────────────────────────────────────────────────────

function needsUpdate(existingFields, nextFields) {
  if (existingFields.length !== nextFields.length) return true;
  return existingFields.some((f, i) => {
    const n = nextFields[i];
    return (
      f.key          !== n.key          ||
      f.label        !== n.label        ||
      f.type         !== n.type         ||
      f.order        !== n.order        ||
      f.optionSource !== n.optionSource ||
      f.linkedModule !== n.linkedModule
    );
  });
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function migrateCollection(modelName, canonicalDefaults, defaultKeySet, removedKeys, dryRun) {
  const Model = mongoose.model(modelName);
  const configs = await Model.find({ isDeleted: false }).lean();

  console.log(`\n[${modelName}] Found ${configs.length} existing config(s).`);

  let updated = 0;
  let skipped = 0;

  for (const config of configs) {
    const nextFields = buildCanonicalFields(
      canonicalDefaults,
      defaultKeySet,
      removedKeys,
      config.fields
    );

    if (!needsUpdate(config.fields || [], nextFields)) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY-RUN] Would update companyId=${config.companyId}  (${(config.fields || []).length} → ${nextFields.length} fields)`);
    } else {
      await Model.findByIdAndUpdate(config._id, {
        $set: {
          fields:    nextFields,
          updatedAt: new Date(),
        },
      });
      console.log(`  [UPDATED] companyId=${config.companyId}  (${(config.fields || []).length} → ${nextFields.length} fields)`);
    }
    updated++;
  }

  console.log(`  Done — ${updated} to update, ${skipped} already up-to-date.`);
}

async function run() {
  const dryRun = !process.argv.includes("--run");

  if (dryRun) {
    console.log("=== DRY RUN — no writes will be made. Pass --run to apply. ===");
  } else {
    console.log("=== LIVE RUN — changes will be written to the database. ===");
  }

  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB.");

  await migrateCollection(
    "task_form_configs",
    DEFAULT_TASK_FIELDS,
    TASK_DEFAULT_KEY_SET,
    TASK_REMOVED_KEYS,
    dryRun
  );

  await migrateCollection(
    "project_form_configs",
    DEFAULT_PROJECT_FIELDS,
    PROJECT_DEFAULT_KEY_SET,
    PROJECT_REMOVED_KEYS,
    dryRun
  );

  console.log("\nMigration complete.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
