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

const TaskFormConfig = mongoose.model("task_form_configs");

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
const REMOVED_FIELD_KEYS = new Set(["status"]);

const DEFAULT_FIELD_KEY_SET = new Set(DEFAULT_TASK_FIELDS.map((field) => field.key));
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
  "project_labels",
  "projects",
  "project_lists",
];

const normalizeField = (field, order) => {
  const key = String(field?.key || "")
    .trim()
    .toLowerCase()
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
  const incomingByKey = new Map(
    normalizedIncoming.map((field) => [field.key, field])
  );

  const lockedDefaults = DEFAULT_TASK_FIELDS.map((defaultField, index) => {
    const incoming = incomingByKey.get(defaultField.key);
    return {
      ...defaultField,
      isDefault: true,
      // Preserve drag-drop order from UI if provided.
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
    .filter(
      (field) =>
        field.key &&
        !DEFAULT_FIELD_KEY_SET.has(field.key) &&
        !REMOVED_FIELD_KEYS.has(field.key)
    )
    .map((field, idx) => ({
      ...field,
      isDefault: false,
      order: Number.isFinite(field.order) ? field.order : DEFAULT_TASK_FIELDS.length + idx,
    }));

  return [...lockedDefaults, ...customFields]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((field, index) => ({ ...field, order: index }));
};

const addDefaultConfigIfMissing = async (req) => {
  const companyId = req.user?.companyId;
  const now = configs.utcDefault();

  let config = await TaskFormConfig.findOne({
    companyId: new mongoose.Types.ObjectId(companyId),
    isDeleted: false,
  }).lean();

  if (!config) {
    const created = await TaskFormConfig.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      fields: DEFAULT_TASK_FIELDS.map((field, index) => ({
        ...field,
        order: index,
        options: [],
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
      existingFields.map((field) => [String(field.key || "").trim().toLowerCase(), field])
    );

    const customFields = existingFields.filter(
      (field) => {
        const key = String(field.key || "").trim().toLowerCase();
        return !DEFAULT_FIELD_KEY_SET.has(key) && !REMOVED_FIELD_KEYS.has(key);
      }
    );

    const mergedDefaults = DEFAULT_TASK_FIELDS.map((defaultField, index) => {
      const existing = existingByKey.get(defaultField.key);
      if (!existing) {
        return { ...defaultField, order: existingFields.length + index, options: defaultField.options || [] };
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
    const currentKeys = existingFields.map((field) => String(field.key || "").trim().toLowerCase());
    const nextKeys = nextFields.map((field) => String(field.key || "").trim().toLowerCase());
    const hasFieldDiff =
      currentKeys.length !== nextKeys.length ||
      currentKeys.some((key, index) => key !== nextKeys[index]);

    if (hasFieldDiff) {
      await TaskFormConfig.findByIdAndUpdate(config._id, {
        $set: {
          fields: nextFields,
          updatedBy: req.user._id,
          updatedAt: now,
        },
      });
      config = (await TaskFormConfig.findById(config._id).lean()) || config;
    }
  }

  return config;
};

exports.getTaskFormConfig = async (req, res) => {
  try {
    const config = await addDefaultConfigIfMissing(req);
    return successResponse(res, statusCode.SUCCESS, messages.LISTING, config);
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.addEditTaskFormConfig = async (req, res) => {
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
                "project_labels",
                "projects",
                "project_lists"
              )
              .allow(null, "")
              .optional(),
            order: Joi.number().integer().min(0).optional(),
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

    const existing = await TaskFormConfig.findOne(where);
    const payload = {
      fields: mergedFields,
      updatedBy: req.user._id,
      updatedAt: configs.utcDefault(),
    };

    if (!existing) {
      await TaskFormConfig.create({
        ...payload,
        companyId: req.user.companyId,
        createdBy: req.user._id,
        createdAt: configs.utcDefault(),
      });
    } else {
      await TaskFormConfig.findByIdAndUpdate(existing._id, payload);
    }

    const latest = await TaskFormConfig.findOne(where).lean();

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.TASK_FORM_SETTING_UPDATED || messages.UPDATED,
      latest
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};
