const mongoose = require("mongoose");
const { logDelete } = require("./activityLoggerHelper");
const { getUserInfoForLogging } = require("./activityLoggerHelper");
const configs = require("./configs");

/**
 * Helper function to perform soft delete with activity logging
 * Converts hard deletes to soft deletes and logs the operation
 * @param {Object} params - Delete operation parameters
 * @param {Object} params.Model - Mongoose model
 * @param {Object|String|Array} params.query - Query to find records (ObjectId, query object, or array of IDs)
 * @param {Object} params.reqUser - Request user object (req.user)
 * @param {String} params.moduleName - Module name (e.g., "tasks", "projects", "notes")
 * @param {Boolean} params.isMultiple - Whether deleting multiple records (default: false)
 * @param {Object} params.additionalData - Additional data to store in log
 * @returns {Object} - { success: boolean, deletedCount: number, deletedIds: Array, deletedRecords: Array }
 */
exports.performSoftDelete = async (params) => {
  try {
    const {
      Model,
      query,
      reqUser,
      moduleName,
      isMultiple = false,
      additionalData = null
    } = params;

    if (!Model || !query || !reqUser || !moduleName) {
      throw new Error("Missing required parameters for soft delete");
    }

    // Get user info for logging
    const userInfo = await getUserInfoForLogging(reqUser);
    if (!userInfo) {
      throw new Error("Unable to get user information for logging");
    }

    // Build query object
    let findQuery = {};
    if (mongoose.Types.ObjectId.isValid(query)) {
      // Single ID
      findQuery = { _id: global.newObjectId(query), isDeleted: false };
    } else if (Array.isArray(query)) {
      // Array of IDs
      findQuery = {
        _id: { $in: query.map(id => global.newObjectId(id)) },
        isDeleted: false
      };
    } else {
      // Query object
      findQuery = { ...query, isDeleted: false };
    }

    // Fetch records before deletion (for logging)
    const recordsToDelete = await Model.find(findQuery).lean();

    if (!recordsToDelete || recordsToDelete.length === 0) {
      return {
        success: false,
        deletedCount: 0,
        deletedIds: [],
        deletedRecords: []
      };
    }

    const deletedIds = recordsToDelete.map(r => r._id.toString());
    const deletedRecords = recordsToDelete;

    // Determine deletedBy based on model schema
    let deletedByField = {};
    const schema = Model.schema;
    
    // Check if model has deletedBy field
    if (schema && schema.paths && schema.paths.deletedBy) {
      deletedByField.deletedBy = global.newObjectId(userInfo._id);
    }
    
    // Check if model has deletedByModel field (for refPath)
    if (schema && schema.paths && schema.paths.deletedByModel) {
      // Determine if user is employee or client
      const Employees = mongoose.model("employees");
      const user = await Employees.findById(userInfo._id).lean();
      if (user && user.pms_role_id) {
        const PMSRoles = mongoose.model("pms_roles");
        const role = await PMSRoles.findById(user.pms_role_id).lean();
        if (role && role.role_name === "Client") {
          deletedByField.deletedByModel = "pmsclients";
        } else {
          deletedByField.deletedByModel = "employees";
        }
      } else {
        deletedByField.deletedByModel = "employees";
      }
    }

    // Perform soft delete
    const updateQuery = {
      isDeleted: true,
      deletedAt: configs.utcDefault(),
      ...deletedByField
    };

    const updateResult = await Model.updateMany(findQuery, { $set: updateQuery });

    const deletedCount = updateResult.modifiedCount || 0;

    // Log the delete operation
    if (deletedCount > 0) {
      const logAdditionalData = {
        ...additionalData,
        deletedRecordIds: deletedIds,
        isSoftDelete: true,
        deletedCount: deletedCount
      };

      // If single record, include the record ID in additionalData
      if (!isMultiple && deletedIds.length === 1) {
        logAdditionalData.recordId = deletedIds[0];
      }

      await logDelete({
        companyId: userInfo.companyId,
        moduleName: moduleName,
        email: userInfo.email,
        createdBy: userInfo._id,
        deletedBy: userInfo._id,
        additionalData: logAdditionalData
      });
    }

    return {
      success: true,
      deletedCount: deletedCount,
      deletedIds: deletedIds,
      deletedRecords: deletedRecords
    };
  } catch (error) {
    console.error("DeleteHelper Error:", error);
    throw error;
  }
};

/**
 * Helper function to handle delete operations (automatically converts hard deletes to soft deletes)
 * @param {Object} params - Same as performSoftDelete
 * @returns {Object} - Same as performSoftDelete
 */
exports.handleDelete = async (params) => {
  return await exports.performSoftDelete(params);
};

