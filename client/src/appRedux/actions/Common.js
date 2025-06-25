import { FETCH_ERROR, FETCH_START, FETCH_SUCCESS, SHOW_MESSAGE, SET_FAV_ICON, SET_LOGO, UPDATE_WORKFLOW_STATUS } from "../../constants/ActionTypes";

export const fetchStart = () => {
  return {
    type: FETCH_START
  }
};

export const fetchSuccess = () => {
  return {
    type: FETCH_SUCCESS
  }
};

export const fetchError = (error) => {
  return {
    type: FETCH_ERROR,
    payload: error
  }
};

export const showMessage = (message) => {
  return {
    type: SHOW_MESSAGE,
    payload: message
  }
};

// export const hideMessage = () => {
//   return {
//     type: HIDE_MESSAGE
//   }
// };

export const setFavIcon = (base64) => {
  return {
    type: SET_FAV_ICON,
    payload: base64
  }
}

export const setLogo = (base64) => {
  return {
    type: SET_LOGO,
    payload: base64
  }
}

export const moveWorkFlowTaskHandler = (selectedTaskListIds) => {
  return {
    type: UPDATE_WORKFLOW_STATUS,
    payload: selectedTaskListIds
  }
}




