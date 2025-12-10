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
      console.error("ActivityLogger: Missing required fields", {
        companyId: !!companyId,
        operationName: !!operationName,
        email: !!email,
        createdBy: !!createdBy,
        params
      });
      return;
    }

    // Ensure companyId and createdBy are valid ObjectIds
    let companyIdObj;
    let createdByObj;
    
    try {
      companyIdObj = global.newObjectId(companyId);
      createdByObj = global.newObjectId(createdBy);
    } catch (idError) {
      console.error("ActivityLogger: Invalid ObjectId", {
        companyId,
        createdBy,
        error: idError.message
      });
      return;
    }

    const logEntryData = {
      companyId: companyIdObj,
      operationName: operationName.toUpperCase(),
      moduleName: moduleName || null,
      email,
      createdBy: createdByObj,
      createdAt: configs.utcDefault(),
      additionalData,
      updatedData
    };

    // Add updatedBy if provided (for UPDATE operations)
    if (updatedBy) {
      try {
        logEntryData.updatedBy = global.newObjectId(updatedBy);
      } catch (idError) {
        console.error("ActivityLogger: Invalid updatedBy ObjectId", updatedBy);
      }
    }

    // Add deletedBy if provided (for DELETE operations)
    if (deletedBy) {
      try {
        logEntryData.deletedBy = global.newObjectId(deletedBy);
      } catch (idError) {
        console.error("ActivityLogger: Invalid deletedBy ObjectId", deletedBy);
      }
    }

    const logEntry = new ActivityLog(logEntryData);

    await logEntry.save();
    console.log(`Activity logged: ${operationName} - ${email} - ${moduleName || 'N/A'}`);
  } catch (error) {
    // Don't throw error, just log it to avoid breaking the main flow
    console.error("ActivityLogger Error:", error.message || error);
  }
};

/**
 * Log login activity
 * @param {Object} userData - User data from login
 */
exports.logLogin = async (userData) => {
  try {
    if (!userData || !userData._id || !userData.email) {
      console.error("ActivityLogger: Invalid user data for login log", userData);
      return;
    }

    // Extract companyId - handle both object and direct ID
    let companyId = null;
    if (userData.companyId) {
      companyId = userData.companyId._id || userData.companyId;
    } else if (userData.companyDetails && userData.companyDetails._id) {
      companyId = userData.companyDetails._id;
    }

    if (!companyId) {
      console.error("ActivityLogger: Missing companyId for login log", userData);
      return;
    }

    await exports.logActivity({
      companyId: companyId,
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
    if (!userData || !userData._id || !userData.email) {
      console.error("ActivityLogger: Invalid user data for logout log", userData);
      return;
    }

    // Extract companyId - handle both object and direct ID
    let companyId = null;
    if (userData.companyId) {
      companyId = userData.companyId._id || userData.companyId;
    } else if (userData.companyDetails && userData.companyDetails._id) {
      companyId = userData.companyDetails._id;
    }

    if (!companyId) {
      console.error("ActivityLogger: Missing companyId for logout log", userData);
      return;
    }

    await exports.logActivity({
      companyId: companyId,
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
 * Detects if isDeleted is being set to true and logs it as DELETE operation instead
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

    // Check if this is a soft delete operation (isDeleted being set to true)
    const isSoftDelete = newData && (
      newData.isDeleted === true || 
      newData.isDeleted === "true" ||
      (oldData && oldData.isDeleted === false && newData.isDeleted === true)
    );

    if (isSoftDelete) {
      // Log as DELETE operation instead of UPDATE
      const recordId = additionalData?.recordId || additionalData?._id || oldData?._id || newData?._id;
      
      await exports.logDelete({
        companyId,
        moduleName,
        email,
        createdBy,
        deletedBy: updatedBy || createdBy,
        deletedRecord: newData || oldData,
        additionalData: {
          ...additionalData,
          recordId: recordId,
          isSoftDelete: true,
          deletedFromUpdate: true
        }
      });
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

