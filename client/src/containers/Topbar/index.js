import React from "react";
import { Layout } from "antd";
import { toggleCollapsedSideNav } from "../../appRedux/actions";
import { useDispatch, useSelector } from "react-redux";
import UserProfile from "../Sidebar/UserProfile";

const { Header } = Layout;

function Topbar() {
  const { navCollapsed } = useSelector(({ common }) => common);
  const dispatch = useDispatch();

  return (
    <Header className="top-header top-header-icons">
      <div className="topbar-left-section">
        <div className="gx-linebar">
          <i
            className="fi fi-rr-menu-burger icon-menu"
            onClick={() => dispatch(toggleCollapsedSideNav(!navCollapsed))}
          />
        </div>
      </div>
      <div className="topbar-right-section">
        <UserProfile />
      </div>
    </Header>
  );
}

export default Topbar;
