import React, { useState } from "react";
import { Card, Tabs } from "antd";
import "./EmployeeMasterList.css";
import EmployeeListTabClient from "./EmployeeListTabClient";
import EmployeeListTabUsers from "./EmployeeListTabUsers";
import { useLocation } from "react-router-dom/cjs/react-router-dom.min";

const EmployeeMasterList = () => {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const param = searchParams.get("tab");

  const { TabPane } = Tabs;
  const [activeTab, setActiveTab] = useState(param == "client" ? "2" : "1");
  
  const callback = (key) => {
    setActiveTab(key);
  };

  return (
    <>
      <Card className="employee-card addleave-btn user-module-wrapper">
        <div className="heading-wrapper">
          <h2>Users</h2>
        </div>

        <Tabs activeKey={activeTab} defaultActiveKey="1" onChange={callback}>
          <TabPane key="1" tab="Employees">
            <EmployeeListTabUsers />
          </TabPane>

          <TabPane key="2" tab="Clients">
            <EmployeeListTabClient />
          </TabPane>
        </Tabs>
      </Card>
    </>
  );
}

export default EmployeeMasterList;
