const Joi = require("joi");
const mongoose = require("mongoose");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");

const ProjectFormConfig = mongoose.model("project_form_configs");

const DEFAULT_PROJECT_FIELDS = [
  { key: "id", label: "ID", type: "text", required: true, isDefault: true },
  { key: "title", label: "Project Title", type: "text", required: true, isDefault: true },
  { key: "descriptions", label: "Description", type: "textarea", required: false, isDefault: true },
  { key: "start_date", label: "Start Date", type: "date", required: true, isDefault: true },
  { key: "end_date", label: "End Date", type: "date", required: false, isDefault: true },
  { key: "project_type", label: "Category", type: "select", required: true, isDefault: true },
  { key: "pms_clients", label: "Client", type: "multiselect", required: false, isDefault: false },
  { key: "assignees", label: "Assignee / Team Group", type: "multiselect", required: false, isDefault: true },
  { key: "manager", label: "Project Manager", type: "select", required: true, isDefault: true },
  { key: "acc_manager", label: "Account Manager", type: "select", required: false, isDefault: false },
  { key: "workFlow", label: "Associate Workflow", type: "select", required: true, isDefault: true },
  { key: "project_status", label: "Status", type: "select", required: true, isDefault: true },
  { key: "estimatedHours", label: "Estimated Hours", type: "number", required: true, isDefault: true },
  { key: "recurringType", label: "Recurring", type: "select", required: false, isDefault: true, options: ["monthly", "yearly"] },
  { key: "isBillable", label: "Billable Project", type: "checkbox", required: false, isDefault: true },
  { key: "created_by", label: "Created By", type: "text", required: true, isDefault: true },
  { key: "created_at", label: "Created At", type: "datetime", required: true, isDefault: true },
  { key: "updated_at", label: "Updated At", type: "datetime", required: true, isDefault: true },
];

const DEFAULT_FIELD_KEY_SET = new Set(DEFAULT_PROJECT_FIELDS.map((field) => field.key));
// Keys that should be purged from existing company configs on next GET
const REMOVED_FIELD_KEYS = new Set(["technology"]);
const ALLOWED_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "datetime",
  "file",
  "select",
  "multiselect",
  "checkbox",
];
const ALLOWED_OPTION_SOURCES = ["static", "linked"];
const ALLOWED_LINKED_MODULES = [
  "employees",
  "clients",
  "projects",
  "project_types",
  "project_statuses",
  "workflows",
  "departments",
  "managers",
  "account_managers",
];

const normalizeField = (field, order) => {
  const key = String(field?.key || "")
    .trim()
    .replace(/\s+/g, "_");
  const options = Array.isArray(field?.options)
    ? field.options.map((option) => String(option || "").trim()).filter(Boolean)
    : [];
  const normalizedType = ALLOWED_FIELD_TYPES.includes(field?.type) ? field.type : "text";
  const optionSource = ALLOWED_OPTION_SOURCES.includes(field?.optionSource)
    ? field.optionSource
    : "static";
  const linkedModule = ALLOWED_LINKED_MODULES.includes(field?.linkedModule)
    ? field.linkedModule
    : null;

  return {
    key,
    label: String(field?.label || "").trim(),
    type: normalizedType,
    required: Boolean(field?.required),
    isDefault: Boolean(field?.isDefault),
    optionSource:
      normalizedType === "select" || normalizedType === "multiselect"
        ? optionSource
        : "static",
    linkedModule:
      normalizedType === "select" || normalizedType === "multiselect"
        ? linkedModule
        : null,
    options:
      normalizedType === "select" || normalizedType === "multiselect"
        ? options
        : [],
    order,
  };
};

const mergeWithDefaultFields = (incomingFields = []) => {
  const normalizedIncoming = incomingFields.map((field, index) =>
    normalizeField(field, index)
  );
  const incomingByKey = new Map(normalizedIncoming.map((field) => [field.key, field]));

  const lockedDefaults = DEFAULT_PROJECT_FIELDS.map((defaultField, index) => {
    const incoming = incomingByKey.get(defaultField.key);
    return {
      ...defaultField,
      isDefault: true,
      order: Number.isFinite(incoming?.order) ? incoming.order : index,
      options: defaultField.options || [],
      optionSource: defaultField.optionSource || "static",
      linkedModule: defaultField.linkedModule || null,
      required:
        typeof incoming?.required === "boolean"
          ? incoming.required
          : Boolean(defaultField.required),
    };
  });

  const customFields = normalizedIncoming
    .filter((field) => field.key && !DEFAULT_FIELD_KEY_SET.has(field.key) && !REMOVED_FIELD_KEYS.has(field.key))
    .map((field, idx) => ({
      ...field,
      isDefault: false,
      order: Number.isFinite(field.order)
        ? field.order
        : DEFAULT_PROJECT_FIELDS.length + idx,
    }));

  return [...lockedDefaults, ...customFields]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((field, index) => ({ ...field, order: index }));
};

const addDefaultConfigIfMissing = async (req) => {
  const companyId = req.user?.companyId;
  const now = configs.utcDefault();

  let config = await ProjectFormConfig.findOne({
    companyId: new mongoose.Types.ObjectId(companyId),
    isDeleted: false,
  }).lean();

  if (!config) {
    const created = await ProjectFormConfig.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      fields: DEFAULT_PROJECT_FIELDS.map((field, index) => ({
        ...field,
        order: index,
        options: field.options || [],
      })),
      createdBy: req.user._id,
      updatedBy: req.user._id,
      createdAt: now,
      updatedAt: now,
    });
    config = created.toObject();
  } else {
    const existingFields = Array.isArray(config.fields) ? config.fields : [];
    const existingByKey = new Map(
      existingFields.map((field) => [String(field.key || "").trim(), field])
    );

    const customFields = existingFields.filter((field) => {
      const key = String(field.key || "").trim();
      return !DEFAULT_FIELD_KEY_SET.has(key) && !REMOVED_FIELD_KEYS.has(key);
    });

    const mergedDefaults = DEFAULT_PROJECT_FIELDS.map((defaultField, index) => {
      const existing = existingByKey.get(defaultField.key);
      if (!existing) {
        return {
          ...defaultField,
          order: existingFields.length + index,
          options: defaultField.options || [],
        };
      }
      return {
        ...existing,
        key: defaultField.key,
        label: defaultField.label,
        type: defaultField.type,
        isDefault: true,
        required:
          typeof existing.required === "boolean"
            ? existing.required
            : Boolean(defaultField.required),
        options: defaultField.options || [],
        optionSource: existing.optionSource || defaultField.optionSource || "static",
        linkedModule: existing.linkedModule || defaultField.linkedModule || null,
        order: Number(existing.order || index),
      };
    });

    const normalizedCustom = customFields.map((field, idx) => ({
      ...field,
      isDefault: false,
      order: Number(field.order || mergedDefaults.length + idx),
    }));

    const nextFields = [...mergedDefaults, ...normalizedCustom]
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((field, index) => ({ ...field, order: index }));

    const currentKeys = existingFields.map((field) => String(field.key || "").trim());
    const nextKeys = nextFields.map((field) => String(field.key || "").trim());
    const hasFieldDiff =
      currentKeys.length !== nextKeys.length ||
      currentKeys.some((key, index) => key !== nextKeys[index]);

    if (hasFieldDiff) {
      await ProjectFormConfig.findByIdAndUpdate(config._id, {
        $set: {
          fields: nextFields,
          updatedBy: req.user._id,
          updatedAt: now,
        },
      });
      config = (await ProjectFormConfig.findById(config._id).lean()) || config;
    }
  }

  return config;
};

exports.getProjectFormConfig = async (req, res) => {
  try {
    const config = await addDefaultConfigIfMissing(req);
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, config);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.addEditProjectFormConfig = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      fields: Joi.array()
        .items(
          Joi.object({
            key: Joi.string().required(),
            label: Joi.string().required(),
            type: Joi.string()
              .valid(
                "text",
                "textarea",
                "number",
                "date",
                "datetime",
                "file",
                "select",
                "multiselect",
                "checkbox"
              )
              .required(),
            required: Joi.boolean().optional(),
            isDefault: Joi.boolean().optional(),
            options: Joi.array().items(Joi.string()).optional(),
            optionSource: Joi.string().valid("static", "linked").optional(),
            linkedModule: Joi.string()
              .valid(
                "employees",
                "clients",
                "projects",
                "project_types",
                "project_statuses",
                "workflows",
                "departments",
                "managers"
                // "account_managers" // AM hidden
              )
              .allow(null, "")
              .optional(),
          })
        )
        .required(),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const mergedFields = mergeWithDefaultFields(value.fields);
    const duplicateKeys = mergedFields
      .map((field) => field.key)
      .filter((key, idx, arr) => arr.indexOf(key) !== idx);

    if (duplicateKeys.length > 0) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        "Duplicate field keys are not allowed."
      );
    }

    const where = {
      companyId: new mongoose.Types.ObjectId(req.user.companyId),
      isDeleted: false,
    };

    const existing = await ProjectFormConfig.findOne(where);
    const payload = {
      fields: mergedFields,
      updatedBy: req.user._id,
      updatedAt: configs.utcDefault(),
    };

    if (!existing) {
      await ProjectFormConfig.create({
        ...payload,
        companyId: req.user.companyId,
        createdBy: req.user._id,
        createdAt: configs.utcDefault(),
      });
    } else {
      await ProjectFormConfig.findByIdAndUpdate(existing._id, payload);
    }

    const latest = await ProjectFormConfig.findOne(where).lean();

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.UPDATED,
      latest
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
