import React from "react";
import { Layout } from "antd";
import { useSelector } from "react-redux";
import UserProfile from "../Sidebar/UserProfile";
import "./Topbar.css";

const { Header } = Layout;

function Topbar() {
  const companySlug = typeof localStorage !== "undefined" ? localStorage.getItem("companyDomain") : "";

  return (
    <Header className="top-header top-header-icons weekmate-header taskpad-header weekmate-header-shell">
      <div className="weekmate-header-card">
        <div className="weekmate-header-left">
          <div className="weekmate-header-title">
            {companySlug ? companySlug.replace(/-/g, " ") : "Demo Tech"}
          </div>
        </div>
        <div className="weekmate-header-right">
          <UserProfile />
        </div>
      </div>
    </Header>
  );
}

export default Topbar;
