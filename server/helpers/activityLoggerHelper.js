const mongoose = require("mongoose");
const ActivityLog = mongoose.model("activitylogs");
const configs = require("../configs");
const Employees = mongoose.model("employees");

/**
 * Log activity for login, logout, delete, and update operations
 * @param {Object} params - Logging parameters
 * @param {String} params.companyId - Company ID
 * @param {String} params.operationName - Operation name (LOGIN, LOGOUT, DELETE, UPDATE)
 * @param {String} params.moduleName - Module name (for delete/update operations, e.g., "employees", "projects", "tasks")
 * @param {String} params.email - User email
 * @param {String} params.createdBy - User ID who performed the operation
 * @param {String} params.updatedBy - User ID who updated (for UPDATE operations)
 * @param {String} params.deletedBy - User ID who deleted (for DELETE operations)
 * @param {Object} params.additionalData - Optional additional data
 * @param {Object} params.updatedData - Optional updated data with oldData and newData
 */
exports.logActivity = async (params) => {
  try {
    const {
      companyId,
      operationName,
      moduleName = null,
      email,
      createdBy,
      updatedBy = null,
      deletedBy = null,
      additionalData = null,
      updatedData = null
    } = params;

    // Validate required fields
    if (!companyId || !operationName || !email || !createdBy) {
      console.error("ActivityLogger: Missing required fields", params);
      return;
    }

    const logEntryData = {
      companyId: global.newObjectId(companyId),
      operationName: operationName.toUpperCase(),
      moduleName: moduleName || null,
      email,
      createdBy: global.newObjectId(createdBy),
      createdAt: configs.utcDefault(),
      additionalData,
      updatedData
    };

    // Add updatedBy if provided (for UPDATE operations)
    if (updatedBy) {
      logEntryData.updatedBy = global.newObjectId(updatedBy);
    }

    // Add deletedBy if provided (for DELETE operations)
    if (deletedBy) {
      logEntryData.deletedBy = global.newObjectId(deletedBy);
    }

    const logEntry = new ActivityLog(logEntryData);

    await logEntry.save();
    console.log(`Activity logged: ${operationName} - ${email} - ${moduleName || 'N/A'}`);
  } catch (error) {
    // Don't throw error, just log it to avoid breaking the main flow
    console.error("ActivityLogger Error:", error);
  }
};

/**
 * Log login activity
 * @param {Object} userData - User data from login
 */
exports.logLogin = async (userData) => {
  try {
    if (!userData || !userData._id || !userData.email || !userData.companyId) {
      console.error("ActivityLogger: Invalid user data for login log");
      return;
    }

    await exports.logActivity({
      companyId: userData.companyId._id || userData.companyId,
      operationName: "LOGIN",
      email: userData.email,
      createdBy: userData._id
    });
  } catch (error) {
    console.error("ActivityLogger: Login log error", error);
  }
};

/**
 * Log logout activity
 * @param {Object} userData - User data
 */
exports.logLogout = async (userData) => {
  try {
    if (!userData || !userData._id || !userData.email || !userData.companyId) {
      console.error("ActivityLogger: Invalid user data for logout log");
      return;
    }

    await exports.logActivity({
      companyId: userData.companyId || userData.companyId?._id,
      operationName: "LOGOUT",
      email: userData.email,
      createdBy: userData._id
    });
  } catch (error) {
    console.error("ActivityLogger: Logout log error", error);
  }
};

/**
 * Log delete operation
 * @param {Object} params - Delete operation parameters
 * @param {String} params.companyId - Company ID
 * @param {String} params.moduleName - Module name (e.g., "employees", "projects", "tasks")
 * @param {String} params.email - User email
 * @param {String} params.createdBy - User ID who performed the delete
 * @param {String} params.deletedBy - User ID who deleted the record (optional, extracted from deletedRecord if not provided)
 * @param {Object} params.deletedRecord - The deleted record object (optional, used to extract deletedBy)
 * @param {Object} params.additionalData - Optional additional data
 */
exports.logDelete = async (params) => {
  try {
    const {
      companyId,
      moduleName,
      email,
      createdBy,
      deletedBy = null,
      deletedRecord = null,
      additionalData = null
    } = params;

    if (!companyId || !moduleName || !email || !createdBy) {
      console.error("ActivityLogger: Missing required fields for delete log", params);
      return;
    }

    // Extract deletedBy from deletedRecord if not provided
    let finalDeletedBy = deletedBy;
    if (!finalDeletedBy && deletedRecord) {
      // Try different possible field names
      if (deletedRecord.deletedBy) {
        finalDeletedBy = deletedRecord.deletedBy;
      } else if (deletedRecord.deleted_by) {
        finalDeletedBy = deletedRecord.deleted_by;
      } else if (deletedRecord.deletedBy_id) {
        finalDeletedBy = deletedRecord.deletedBy_id;
      }
    }

    // Use createdBy as fallback if deletedBy is still not found
    if (!finalDeletedBy) {
      finalDeletedBy = createdBy;
    }

    await exports.logActivity({
      companyId,
      operationName: "DELETE",
      moduleName,
      email,
      createdBy,
      deletedBy: finalDeletedBy,
      additionalData
    });
  } catch (error) {
    console.error("ActivityLogger: Delete log error", error);
  }
};

/**
 * Log update operation
 * @param {Object} params - Update operation parameters
 * @param {String} params.companyId - Company ID
 * @param {String} params.moduleName - Module name (e.g., "employees", "projects", "tasks")
 * @param {String} params.email - User email
 * @param {String} params.createdBy - User ID who performed the update
 * @param {String} params.updatedBy - User ID who updated the record (optional, extracted from newData if not provided)
 * @param {Object} params.oldData - Old data before update
 * @param {Object} params.newData - New data after update
 * @param {Object} params.additionalData - Optional additional data (e.g., recordId)
 */
exports.logUpdate = async (params) => {
  try {
    const {
      companyId,
      moduleName,
      email,
      createdBy,
      updatedBy = null,
      oldData = null,
      newData = null,
      additionalData = null
    } = params;

    if (!companyId || !moduleName || !email || !createdBy) {
      console.error("ActivityLogger: Missing required fields for update log", params);
      return;
    }

    // Extract updatedBy from newData if not provided
    let finalUpdatedBy = updatedBy;
    if (!finalUpdatedBy && newData) {
      // Try different possible field names
      if (newData.updatedBy) {
        finalUpdatedBy = newData.updatedBy;
      } else if (newData.updated_by) {
        finalUpdatedBy = newData.updated_by;
      } else if (newData.updatedBy_id) {
        finalUpdatedBy = newData.updatedBy_id;
      }
    }

    // Use createdBy as fallback if updatedBy is still not found
    if (!finalUpdatedBy) {
      finalUpdatedBy = createdBy;
    }

    // Prepare updatedData object
    const updatedData = {
      oldData: oldData || null,
      newData: newData || null
    };

    await exports.logActivity({
      companyId,
      operationName: "UPDATE",
      moduleName,
      email,
      createdBy,
      updatedBy: finalUpdatedBy,
      additionalData: additionalData || null,
      updatedData: updatedData
    });
  } catch (error) {
    console.error("ActivityLogger: Update log error", error);
  }
};

/**
 * Get user email and companyId from req.user or database
 * @param {Object} reqUser - req.user object
 * @returns {Object} { _id, email, companyId } or null
 */
exports.getUserInfoForLogging = async (reqUser) => {
  try {
    if (!reqUser || !reqUser._id) {
      return null;
    }

    let userEmail = reqUser.email;
    let userCompanyId = reqUser.companyId;

    // If email or companyId not in req.user, fetch from database
    if (!userEmail || !userCompanyId) {
      const userData = await Employees.findById(reqUser._id)
        .select("email companyId")
        .lean();
      
      if (userData) {
        userEmail = userEmail || userData.email;
        userCompanyId = userCompanyId || userData.companyId;
      }
    }

    if (userEmail && userCompanyId) {
      return {
        _id: reqUser._id,
        email: userEmail,
        companyId: userCompanyId._id || userCompanyId
      };
    }

    return null;
  } catch (error) {
    console.error("ActivityLogger: Error getting user info", error);
    return null;
  }
};

