let express=require('express')
var Router=express.Router()
var projectTypes=require('../../controller/projectTypes')

Router.post("/add", projectTypes.addProjectTypes);
Router.post("/get", projectTypes.getProjectTypes);
Router.post("/update", projectTypes.updateProjectType);
Router.post("/delete", projectTypes.deleteProjectType);
Router.get("/get/slug", projectTypes.getProjectTypeSlug);

module.exports=Router