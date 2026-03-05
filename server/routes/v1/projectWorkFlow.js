let express=require('express')
var Router=express.Router()
var projectWorkFlow=require('../../controller/projectWorkFlow')

Router.post('/addProjectWorkFlow',projectWorkFlow.addProjectWorkFlow)
Router.post('/getProjectWorkFlow',projectWorkFlow.getProjectWorkFlow)
Router.post('/updateProjectWorkFlow',projectWorkFlow.updateProjectWorkFlow)
Router.post('/deleteProjectWorkFlow',projectWorkFlow.deleteProjectWorkFlow)

module.exports=Router