let express=require('express')
var Router=express.Router()
var projectTypes=require('../../controller/projectTypes')
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["settings_add"]), projectTypes.addProjectTypes);
Router.post("/get", projectTypes.getProjectTypes);
Router.post("/update", requirePermission(["settings_edit"]), projectTypes.updateProjectType);
Router.post("/delete", requirePermission(["settings_delete"]), projectTypes.deleteProjectType);
Router.get("/get/slug", projectTypes.getProjectTypeSlug);

module.exports=Router