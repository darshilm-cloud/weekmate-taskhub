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
import './assets/css/mobile-responsive.css';
import './assets/css/mobile/worker-a.css';
import './assets/css/mobile/worker-b.css';
import './assets/css/mobile/worker-c.css';
import './assets/css/mobile/forms.css';
import './assets/css/mobile/tables.css';
import './assets/css/mobile/reports.css';
import './assets/css/mobile/dark.css';
import './assets/css/Scroll.css'
import { BrowserRouter } from "react-router-dom/cjs/react-router-dom.min";
import './assets/css/common-buttons.css';
import './assets/css/EnterpriseDarkTheme.css';

// ApexCharts global defaults: every chart's legend like the Dashboard's
// Project Statistics legend - under the chart, centred, square markers,
// 13px labels in the series colour. Charts can still override per chart.
window.Apex = {
  ...(window.Apex || {}),
  legend: {
    position: "bottom",
    horizontalAlign: "center",
    fontSize: "13px",
    fontWeight: 400,
    labels: { useSeriesColors: true },
    markers: { size: 6, shape: "square", radius: 0 },
    itemMargin: { horizontal: 8, vertical: 5 },
  },
};

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
      <ErrorBoundary history={ history }>
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
