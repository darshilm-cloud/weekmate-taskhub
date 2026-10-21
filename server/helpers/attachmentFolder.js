const FileFolders = require("../models/fileFolders");

/**
 * Folder (in the project's Files tab) that attachments are filed under when
 * the client didn't pick one - e.g. the project has no folders yet, or the
 * client couldn't resolve the project. Prefers the project's default folder,
 * then its oldest folder, else creates a default "Attachments" folder.
 */
const resolveAttachmentFolderId = async (projectId, userId) => {
  if (!projectId) return null;
  const existing = await FileFolders.findOne({ project_id: projectId, isDeleted: false })
    .sort({ isDefault: -1, createdAt: 1 })
    .select("_id")
    .lean();
  if (existing?._id) return existing._id;
  if (!userId) return null;
  const created = await FileFolders.create({
    name: "Attachments",
    project_id: projectId,
    isDefault: true,
    createdBy: userId,
    updatedBy: userId,
  });
  return created._id;
};

module.exports = { resolveAttachmentFolderId };
