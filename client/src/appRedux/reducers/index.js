import { combineReducers } from '@reduxjs/toolkit';
import { connectRouter } from 'connected-react-router'
import Settings from "./Settings";
import Auth from "./Auth";
import Common from "./Common";
import ApiData from './ApiData'

const createRootReducer = (history) => combineReducers({
  router: connectRouter(history),
  settings: Settings,
  auth: Auth,
  common: Common,
  apiData: ApiData
});

export default createRootReducer
