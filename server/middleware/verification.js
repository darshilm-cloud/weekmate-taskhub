const mongoose = require("mongoose");
const Projects = mongoose.model("projects");
const { errorResponse } = require("../helpers/response");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const { checkUserIsAdmin } = require("../controller/authentication");
const { hasPermission } = require("../helpers/permissionHelper");

exports.verification = async (req, res, next) => {
  const projectId = req?.params?.id
    ? req?.params?.id
    : req?.body?.project_id || req?.body?._id;

  if (!projectId) {
    const isAdmin = await checkUserIsAdmin(req?.user?._id);
    const hasProjectAccess = await hasPermission(req?.user?.pms_role_id?._id || req?.user?.pms_role_id, "Projects");
    
    if (hasProjectAccess || isAdmin) return next();
    return errorResponse(res, statusCode.FORBIDDEN, messages.UNAUTHORIZED);
  } else {
    const project = await Projects.findById(projectId);
    if (!project) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    }

    // Dynamic Permission Check
    const hasDynamicAccess = await hasPermission(req?.user?.pms_role_id?._id || req?.user?.pms_role_id, "Projects");

    // Static / Ownership Checks
    const isAdmin = await checkUserIsAdmin(req?.user?._id);
    const isAssignedtoUser = project?.assignees?.includes(req?.user?._id);
    const isManager = project?.manager == req?.user?._id;
    const isAccManager = project?.acc_manager == req?.user?._id;
    const isCreatedBy = project?.createdBy == req?.user?._id;
    const isClient = project?.pms_clients?.includes(req?.user?._id);

    if (
      hasDynamicAccess ||
      isManager ||
      isAccManager ||
      isAdmin ||
      isAssignedtoUser ||
      isCreatedBy ||
      isClient
    ) {
      next();
    } else {
      return errorResponse(res, statusCode.FORBIDDEN, messages.UNAUTHORIZED);
    }
  }
};
