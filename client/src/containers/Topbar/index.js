import React from "react";
import { Layout } from "antd";
import Auxiliary from "../../util/Auxiliary";
import { toggleCollapsedSideNav } from "../../appRedux/actions";
import {
  NAV_STYLE_DRAWER,
  NAV_STYLE_FIXED,
  NAV_STYLE_MINI_SIDEBAR,
  TAB_SIZE,
} from "../../constants/ThemeSetting";
import { useDispatch, useSelector } from "react-redux";
import UserProfile from "../Sidebar/UserProfile";

const { Header } = Layout;

function Topbar() {
  const { navStyle } = useSelector(({ settings }) => settings);
  const { navCollapsed, width } = useSelector(({ common }) => common);
  const dispatch = useDispatch();

  return (
    <>
      <Header className="top-header top-header-icons">
        { navStyle === NAV_STYLE_DRAWER ||
          ((navStyle === NAV_STYLE_FIXED ||
            navStyle === NAV_STYLE_MINI_SIDEBAR) &&
            width < TAB_SIZE) ? (
          <div className="gx-linebar gx-mr-3">
            <i
              className="fi fi-rr-menu-burger icon-menu"
              onClick={ () => {
                dispatch(toggleCollapsedSideNav(!navCollapsed));
              } }
            />
          </div>
        ) : null }

        { width >= TAB_SIZE ? null : (
          <Auxiliary>
            <div className="topbar-icons">
              <i className="fi fi-rr-settings"></i>
              <i className="fi fi-rr-bell"></i>
            </div>
          </Auxiliary>
        ) }

        { width >= TAB_SIZE ? (
          <UserProfile />
        ) : (
          <>
          </>
        ) }
      </Header>
    </>
  );
}

export default Topbar;
