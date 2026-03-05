import { applyMiddleware, createStore, compose } from 'redux';
import { thunk as thunkMiddleware } from 'redux-thunk'; // Change here
import createRootReducer from '../reducers';
import { createBrowserHistory } from 'history';
import { routerMiddleware } from 'connected-react-router';
import createSagaMiddleware from 'redux-saga';

export const history = createBrowserHistory();
const sagaMiddleware = createSagaMiddleware();
const routeMiddleware = routerMiddleware(history);

const middlewares = [thunkMiddleware, sagaMiddleware, routeMiddleware];

const store = createStore(
  createRootReducer(history),
  compose(applyMiddleware(...middlewares))
);

export default store;
