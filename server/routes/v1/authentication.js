let express=require('express')
var Router=express.Router()
var authentication=require('../../controller/authentication')

Router.post('/redirectToBack',authentication.authenticationGetData)
Router.post("/login", authentication.login);
Router.post("/client/updatePassword", authentication.updatePassword); // client change password.
// Router.post("/client/forgotPassword", authentication.forgotPassword); // client change password.
// Router.post("/client/resetPassword", authentication.resetPassword); // client change password.

Router.post("/updatePassword",authentication.updatePassword)
Router.post("/forgotPassword",authentication.forgotPassword)
Router.post("/resetPassword",authentication.resetPassword)


// Router.post("/forgotPassword", auth.forgotPassword);


module.exports=Router