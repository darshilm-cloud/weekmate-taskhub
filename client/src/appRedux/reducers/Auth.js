import {
  HIDE_MESSAGE,
  INIT_URL,
  ON_HIDE_LOADER,
  ON_SHOW_LOADER,
  SHOW_MESSAGE,
  SIGNIN_USER_SUCCESS,
  SIGNOUT_USER_SUCCESS,
  SIGNIN_USER_PERMISSION,
  SIGNIN_USER_ROLE
} from "../../constants/ActionTypes";
import getCookie from "../../hooks/getCookie";

const INIT_STATE = {
  loader: false,
  alertMessage: "",
  showMessage: false,
  initURL: "",
  
};


const userDataString = localStorage.getItem("user_data");
if (userDataString && userDataString!== "undefined") {
  try {
    INIT_STATE.authUser = JSON.parse(userDataString);
  } catch (error) {
    console.error("Error parsing user data from localStorage:", error);
  }
}

// Retrieve user permission data from localStorage
const userPermissionString = getCookie("user_permission");
if (userPermissionString && userPermissionString !== "undefined") {
  try {
    INIT_STATE.userPermission = JSON.parse(userPermissionString);
  } catch (error) {
    console.error("Error parsing user permission data from localStorage:", error);
  }
}

const userRoleString = getCookie("pms_role_id");
if(userRoleString && userRoleString !== "undefined"){
  try{
    INIT_STATE.userRole = userRoleString;
  }
  catch(error){
    console.log("error userRole",error)
  }
}


const reducer = (state = INIT_STATE, action) => {
  switch (action.type) {
    case SIGNIN_USER_SUCCESS: {
      return {
        ...state,
        // loader: false,
        authUser: action.payload,
      };
    }
    case SIGNIN_USER_PERMISSION: {
      return {
        ...state,
        userPermission: action.payload
      }
    }
    case SIGNIN_USER_ROLE : {
      return{
        ...state,
        userRole : action.payload
      }
    }
    case INIT_URL: {
      return {
        ...state,
        initURL: action.payload,
      };
    }
    case SIGNOUT_USER_SUCCESS: {
      return {
        ...state,
        authUser: null,
        initURL: "/",
        loader: false,
      };
    }
    case SHOW_MESSAGE: {
      return {
        ...state,
        alertMessage: action.payload,
        showMessage: true,
        loader: false,
      };
    }
    case HIDE_MESSAGE: {
      return {
        ...state,
        alertMessage: "",
        showMessage: false,
        loader: false,
      };
    }
    case ON_SHOW_LOADER: {
      return {
        ...state,
        loader: true,
      };
    }
    case ON_HIDE_LOADER: {
      return {
        ...state,
        loader: false,
      };
    }
    default:
      return state;
  }
};


export default reducer;