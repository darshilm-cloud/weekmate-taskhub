import React, { memo, useMemo, useEffect } from "react";
import { Layout, message } from "antd";

import Sidebar from "../Sidebar/index";
import HorizontalDefault from "../Topbar/HorizontalDefault/index";
import HorizontalDark from "../Topbar/HorizontalDark/index";
import InsideHeader from "../Topbar/InsideHeader/index";
import AboveHeader from "../Topbar/AboveHeader/index";
import BelowHeader from "../Topbar/BelowHeader/index";
import Topbar from "../Topbar/index";
import App from "../../routes";
import { useSelector } from "react-redux";
import {
  NAV_STYLE_ABOVE_HEADER,
  NAV_STYLE_BELOW_HEADER,
  NAV_STYLE_DARK_HORIZONTAL,
  NAV_STYLE_DEFAULT_HORIZONTAL,
  NAV_STYLE_DRAWER,
  NAV_STYLE_FIXED,
  NAV_STYLE_INSIDE_HEADER_HORIZONTAL,
  NAV_STYLE_MINI_SIDEBAR,
  NAV_STYLE_NO_HEADER_EXPANDED_SIDEBAR,
  NAV_STYLE_NO_HEADER_MINI_SIDEBAR,
} from "../../constants/ThemeSetting";
import NoHeaderNotification from "../Topbar/NoHeaderNotification/index";
import { useRouteMatch } from "react-router-dom";
import Customizer from "../Customizer";
import "../../assets/css/modal.css"
import "../../assets/css/theme-variables.css"
import "../../assets/css/ui-remap.css"
import "../../assets/css/theme-utilities.css"
import "../../assets/css/dark-theme-overrides.css"
const { Content } = Layout;

// Configure message once outside component
message.config({ maxCount: 1 });

const HORIZONTAL_STYLES = new Set([
  NAV_STYLE_DARK_HORIZONTAL,
  NAV_STYLE_DEFAULT_HORIZONTAL,
  NAV_STYLE_INSIDE_HEADER_HORIZONTAL,
  NAV_STYLE_BELOW_HEADER,
  NAV_STYLE_ABOVE_HEADER,
]);

function MainApp() {
  const { userPermission } = useSelector(({ auth }) => auth);
  const { navStyle } = useSelector(({ settings }) => settings);
  const match = useRouteMatch();

  const containerClass = useMemo(
    () => HORIZONTAL_STYLES.has(navStyle) ? "gx-container-wrap" : "",
    [navStyle]
  );

  const navComponent = useMemo(() => {
    switch (navStyle) {
      case NAV_STYLE_DEFAULT_HORIZONTAL:
        return <HorizontalDefault />;
      case NAV_STYLE_DARK_HORIZONTAL:
        return <HorizontalDark />;
      case NAV_STYLE_INSIDE_HEADER_HORIZONTAL:
        return <InsideHeader />;
      case NAV_STYLE_ABOVE_HEADER:
        return <AboveHeader />;
      case NAV_STYLE_BELOW_HEADER:
        return <BelowHeader />;
      case NAV_STYLE_FIXED:
      case NAV_STYLE_DRAWER:
      case NAV_STYLE_MINI_SIDEBAR:
        return <Topbar />;
      case NAV_STYLE_NO_HEADER_MINI_SIDEBAR:
      case NAV_STYLE_NO_HEADER_EXPANDED_SIDEBAR:
        return <NoHeaderNotification />;
      default:
        return null;
    }
  }, [navStyle]);

  return (
    <Layout className="gx-app-layout admin ">
      <Sidebar />
      <Layout>
        {navComponent}
        <Content className={`gx-layout-content ${containerClass} page-layout`}>
          <App match={match} userPermission={userPermission} />
        </Content>
        <Customizer />
      </Layout>
    </Layout>
  );
}

export default memo(MainApp);
