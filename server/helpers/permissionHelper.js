const mongoose = require("mongoose");
const RolePermissions = mongoose.model("role_permissions");
const Resource = mongoose.model("resource");

/**
 * Checks if a specific role has access to a resource.
 * @param {string} roleId - The ID of the user's role.
 * @param {string} resourceName - The name of the resource (e.g., 'Projects', 'Tasks').
 * @returns {Promise<boolean>}
 */
exports.hasPermission = async (roleId, resourceName) => {
  try {
    // 1. Find the resource ID by name
    const resource = await Resource.findOne({ 
      resource_name: { $regex: new RegExp(`^${resourceName}$`, 'i') },
      isDeleted: false 
    });

    if (!resource) return false;

    // 2. Check if the role has this resource assigned in role_permissions
    const permission = await RolePermissions.findOne({
      pms_role_id: roleId,
      resource_id: resource._id,
      isDeleted: false
    });

    return !!permission;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
};
