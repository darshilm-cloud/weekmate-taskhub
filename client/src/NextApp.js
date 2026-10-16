import React from "react";
import { Provider } from "react-redux";
import { ConnectedRouter } from "connected-react-router";
import { Route, Switch } from "react-router-dom";
import configureStore, { history } from "./appRedux/store";
import App from "./containers/App/index";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { ConfigProvider } from "antd";
import NoDataFoundIcon from "./components/common/NoDataFoundIcon";
import './assets/css/style.css';
import './assets/css/pms.css';
import './assets/css/Scroll.css'
import { BrowserRouter } from "react-router-dom/cjs/react-router-dom.min";
import './assets/css/common-buttons.css';
import './assets/css/EnterpriseDarkTheme.css';

// One empty-state illustration for every AntD Table / Select / List etc.
// Compact variant inside dropdown panels where the full artwork is too big.
const COMPACT_EMPTY_COMPONENTS = new Set(["Select", "TreeSelect", "Cascader", "Transfer", "Mentions"]);
const renderEmpty = (componentName) => (
  <NoDataFoundIcon compact={COMPACT_EMPTY_COMPONENTS.has(componentName)} />
);

function NextApp() {

  return <Provider store={ configureStore }>
    <div className="app-theme">
      <ConfigProvider renderEmpty={renderEmpty}>
      <ErrorBoundary>
        <ConnectedRouter history={ history }>
          <BrowserRouter>
            <Route path="/" component={ App } />
          </BrowserRouter>
        </ConnectedRouter>
      </ErrorBoundary>
      </ConfigProvider>
    </div>
  </Provider>
}

export default NextApp;
