let express=require('express')
var Router=express.Router()
var resources=require('../../controller/resourcesManager')
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post('/addResource', requirePermission(["settings_add"]),resources.addResource);
Router.post('/getResource',resources.getResource);
Router.post('/updateResource', requirePermission(["settings_edit"]),resources.updateResource);
Router.post('/deleteResource', requirePermission(["settings_delete"]),resources.deleteResource);


module.exports=Router