let express=require('express')
var Router=express.Router()
var authentication=require('../../controller/authentication')

Router.post('/redirectToBack',authentication.authenticationGetData)
Router.post("/login", authentication.login);
Router.post("/updatePassword",authentication.updatePassword)
Router.post("/forgotPassword",authentication.forgotPassword)
Router.post("/resetPassword",authentication.resetPassword)


// Router.post("/forgotPassword", auth.forgotPassword);


module.exports=Router