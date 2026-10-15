let express=require('express')
var Router=express.Router()
var projectWorkFlow=require('../../controller/projectWorkFlow')
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post('/addProjectWorkFlow', requirePermission(["settings_add"]),projectWorkFlow.addProjectWorkFlow)
Router.post('/getProjectWorkFlow',projectWorkFlow.getProjectWorkFlow)
Router.post('/updateProjectWorkFlow', requirePermission(["settings_edit"]),projectWorkFlow.updateProjectWorkFlow)
Router.post('/deleteProjectWorkFlow', requirePermission(["settings_delete"]),projectWorkFlow.deleteProjectWorkFlow)

module.exports=Router