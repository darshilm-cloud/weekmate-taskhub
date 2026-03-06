import React from "react";
import { Provider } from "react-redux";
import { ConnectedRouter } from "connected-react-router";
import { Route, Switch } from "react-router-dom";
import configureStore, { history } from "./appRedux/store";
import App from "./containers/App/index";
import ErrorBoundary from "./components/common/ErrorBoundary";
import './assets/css/style.css';
import './assets/css/pms.css';
import './assets/css/Scroll.css'
import { BrowserRouter } from "react-router-dom/cjs/react-router-dom.min";
import './assets/css/custom-btns.css';

function NextApp() {

  return <Provider store={ configureStore }>
    <ErrorBoundary>
      <ConnectedRouter history={ history }>
        <BrowserRouter>
          <Route path="/" component={ App } />
        </BrowserRouter>
      </ConnectedRouter>
    </ErrorBoundary>
  </Provider>
}

export default NextApp;
