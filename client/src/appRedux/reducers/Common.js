import {TOGGLE_COLLAPSED_NAV, WINDOW_WIDTH, FETCH_ERROR, FETCH_START, FETCH_SUCCESS, HIDE_MESSAGE, SHOW_MESSAGE, SET_FAV_ICON, SET_LOGO, UPDATE_WORKFLOW_STATUS} from '../../constants/ActionTypes'

const INIT_STATE = {
  error: "",
  loading: false,
  message: '',
  navCollapsed: true,
  width: window.innerWidth,
  pathname: '/',
  favicon : '', 
  logo : '',
  task_ids: []
};

const reducer = (state = INIT_STATE, action) => {
  switch (action.type) {
    case '@@router/LOCATION_CHANGE': {
      return {
        ...state,
        pathname: action.payload.location.pathname,
        navCollapsed: false
      }
    }
    
    case WINDOW_WIDTH:
      return {
        ...state,
        width: action.width,
      };

    case TOGGLE_COLLAPSED_NAV: {
      return {
        ...state,
        navCollapsed: action.navCollapsed
      }
    }

    case FETCH_START: {
      return {...state, error: '', message: '', loading: true};
    }

    case FETCH_SUCCESS: {
      return {...state, error: '', message: '', loading: false};
    }

    case SHOW_MESSAGE: {
      return {...state, error: '', message: action.payload, loading: false};
    }

    case FETCH_ERROR: {
      return {...state, loading: false, error: action.payload, message: ''};
    }

    case HIDE_MESSAGE: {
      return {...state, loading: false, error: '', message: ''};
    }

    case SET_FAV_ICON : {
      return {...state, favicon : action.payload, loading: false}
    }

    case SET_LOGO : {
      return {...state, logo : action.payload, loading: false}
    }

    case UPDATE_WORKFLOW_STATUS : {
      return {...state, task_ids : action.payload, loading: false}
    }

    default:
      return state;
  }
}
export default reducer;
