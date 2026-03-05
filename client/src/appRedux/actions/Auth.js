import {
  HIDE_MESSAGE,
  INIT_URL,
  ON_HIDE_LOADER,
  ON_SHOW_LOADER,
  SHOW_MESSAGE,
  SIGNIN_USER,
  SIGNIN_USER_SUCCESS,
  SIGNOUT_USER_SUCCESS,
  SIGNUP_USER,
  SIGNUP_USER_SUCCESS,
  SIGNIN_USER_PERMISSION,
  SIGNIN_USER_ROLE,
  USER_HANDLER
} from "../../constants/ActionTypes";
import removeCookie from "../../hooks/removeCookie";
import Service from "../../service";

export const userSignUp = (user) => {
  return {
    type: SIGNUP_USER,
    payload: user
  };
};
export const userSignIn = (user) => {
  return {
    type: SIGNIN_USER,
    payload: user
  };
};
export const userSignOut = () => {
  return async (dispatch) => {
    try {
      // Call logout API to log the activity
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        try {
          await Service.makeAPICall({
            props: {},
            methodName: Service.postMethod,
            api_url: Service.logout,
            body: {},
          });
        } catch (error) {
          // Continue with logout even if API call fails
          console.error("Logout API error:", error);
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage and cookies
      localStorage.removeItem('user_data')
      localStorage.removeItem('is_reporting_manager')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('title')
      localStorage.removeItem('headerLogo')
      localStorage.removeItem('loginLogo')  
      localStorage.removeItem('logoMode')
      localStorage.removeItem('favIcon')
      localStorage.removeItem('companyDomain')

      removeCookie("user_permission")
      removeCookie("pms_role_id")

      dispatch({
        type: SIGNOUT_USER_SUCCESS
      });
    }
  };
};
export const userSignUpSuccess = (authUser) => {
  return {
    type: SIGNUP_USER_SUCCESS,
    payload: authUser
  };
};

export const userpermission = (permission) => {
  return {
    type: SIGNIN_USER_PERMISSION,
    payload: permission
  };
};

export const userRole = (role) =>{
  return {
    type : SIGNIN_USER_ROLE,
    payload : role
  }
}

export const userSignInSuccess = (authUser) => {
  return {
    type: SIGNIN_USER_SUCCESS,
    payload: authUser
  }
};
export const userSignOutSuccess = () => {
  return {
    type: SIGNOUT_USER_SUCCESS,
  }
};

export const showAuthMessage = (message) => {
  return {
    type: SHOW_MESSAGE,
    payload: message
  };
};


export const userData=(userDetail)=>{
  return{
    type:USER_HANDLER,
    payload:userDetail
  }
}
export const setInitUrl = (url) => {
  return {
    type: INIT_URL,
    payload: url
  };
};

export const showAuthLoader = () => {
  return {
    type: ON_SHOW_LOADER,
  };
};

export const hideMessage = () => {
  return {
    type: HIDE_MESSAGE,
  };
};
export const hideAuthLoader = () => {
  return {
    type: ON_HIDE_LOADER,
  };
};
