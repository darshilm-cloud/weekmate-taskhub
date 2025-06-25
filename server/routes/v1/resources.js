let express=require('express')
var Router=express.Router()
var resources=require('../../controller/resourcesManager')

Router.post('/addResource',resources.addResource);
Router.post('/getResource',resources.getResource);
Router.post('/updateResource',resources.updateResource);
Router.post('/deleteResource',resources.deleteResource);


module.exports=Router