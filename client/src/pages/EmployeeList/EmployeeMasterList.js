import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Calendar, Card, Empty, Input, Select, Tabs } from "antd";
import {
  AppstoreOutlined,
  BarsOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  CalendarOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  UserOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import "./EmployeeMasterList.css";
import EmployeeListTabClient from "./EmployeeListTabClient";
import EmployeeListTabUsers from "./EmployeeListTabUsers";
import { useLocation } from "react-router-dom/cjs/react-router-dom.min";
import Service from "../../service";

const EmployeeMasterList = () => {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const param = searchParams.get("tab");

  const [activeView, setActiveView] = useState("overview");
  const [activeListTab, setActiveListTab] = useState(
    param === "client" ? "clients" : "employees"
  );
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(dayjs());
  const [overviewStats, setOverviewStats] = useState({
    active: 0,
    inactive: 0,
    total: 0
  });

  const fetchUsersOverviewStats = async () => {
    setIsStatsLoading(true);
    try {
      const [activeRes, allRes] = await Promise.all([
        Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getUsermaster,
          body: {
            pageNo: 1,
            limit: 1,
            includeDeactivated: false
          }
        }),
        Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getUsermaster,
          body: {
            pageNo: 1,
            limit: 1,
            includeDeactivated: true
          }
        })
      ]);

      const activeCount = activeRes?.data?.metadata?.total || 0;
      const totalCount = allRes?.data?.metadata?.total || 0;
      const inactiveCount = Math.max(totalCount - activeCount, 0);

      setOverviewStats({
        active: activeCount,
        inactive: inactiveCount,
        total: totalCount
      });
    } catch (error) {
      setOverviewStats({
        active: 0,
        inactive: 0,
        total: 0
      });
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersOverviewStats();
  }, []);

  const overviewCards = useMemo(
    () => [
      { key: "active", label: "Completed Tasks", value: overviewStats.active },
      {
        key: "inactive",
        label: "Incomplete Tasks",
        value: overviewStats.inactive
      },
      { key: "total", label: "Total Tasks", value: overviewStats.total }
    ],
    [overviewStats]
  );

  const loggedInUser = useMemo(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
      return userData?.full_name || userData?.first_name || "User";
    } catch (error) {
      return "User";
    }
  }, []);

  const calendarEvents = useMemo(
    () => ({
      [calendarMonth.date(5).format("YYYY-MM-DD")]: ["Setup project"],
      [calendarMonth.date(31).format("YYYY-MM-DD")]: ["test2"]
    }),
    [calendarMonth]
  );

  const renderCalendarCell = (value) => {
    const key = value.format("YYYY-MM-DD");
    const events = calendarEvents[key] || [];
    return (
      <div className="users-calendar-cell">
        {events.map((item) => (
          <div className="users-calendar-event" key={item}>
            {item}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="employee-card addleave-btn user-module-wrapper">
      <div className="users-layout">
        <div className="users-left-panel">
          <Input placeholder="Type here to search" />
        </div>
        <div className="users-right-panel">
          <div className="users-shell-header">
            <div className="users-shell-title">
              <Avatar size={18} icon={<UserOutlined />} />
              <h2>{loggedInUser}</h2>
            </div>
            <Button type="primary" icon={<PlusOutlined />}>
              Add Task
            </Button>
          </div>

          <Tabs
            className="users-main-tabs"
            activeKey={activeView}
            onChange={setActiveView}
            tabBarGutter={8}
            items={[
              {
                key: "overview",
                label: (
                  <span>
                    <UnorderedListOutlined /> Overviews
                  </span>
                ),
                children: (
                  <div className="users-overview-content">
                    <div className="users-view-actions users-view-actions-right">
                      <Select
                        size="small"
                        defaultValue="default"
                        options={[{ label: "Default", value: "default" }]}
                      />
                      <div className="users-period-switch">
                        <Button size="small" type="default">
                          All
                        </Button>
                        <Button size="small" type="primary">
                          Month
                        </Button>
                        <Button size="small" type="default">
                          Week
                        </Button>
                        <Button size="small" type="default">
                          Yesterday
                        </Button>
                        <Button size="small" type="default">
                          Today
                        </Button>
                      </div>
                    </div>
                    <div className="users-overview-cards">
                      {overviewCards.map((card) => (
                        <div className="users-overview-card" key={card.key}>
                          <p>{card.label}</p>
                          <h3>{isStatsLoading ? "-" : card.value}</h3>
                        </div>
                      ))}
                    </div>
                    <div className="users-overview-analytics">
                      <div className="analytics-block">
                        <h4>Priority Analysis</h4>
                        <div className="donut-wrap">
                          <div className="priority-donut">
                            <span>{overviewStats.total}</span>
                          </div>
                          <div className="chart-legend">
                            <span>Low</span>
                            <span>Medium</span>
                            <span>High</span>
                          </div>
                        </div>
                      </div>
                      <div className="analytics-block">
                        <h4>Performance Analysis</h4>
                        <div className="performance-grid">
                          <div>On Track</div>
                          <div>Before Time</div>
                          <div>Delayed</div>
                        </div>
                      </div>
                    </div>
                    <div className="analytics-block users-bottom-analysis">
                      <h4>Incompleted Task Analysis</h4>
                      <div className="analysis-bar-wrap">
                        <div className="analysis-bar" />
                      </div>
                    </div>
                  </div>
                )
              },
              {
                key: "list",
                label: (
                  <span>
                    <BarsOutlined /> List
                  </span>
                ),
                children: (
                  <div>
                    <div className="users-view-actions users-view-actions-right">
                      <Button size="small">Customize</Button>
                      <Button size="small">More</Button>
                    </div>
                    <Tabs
                      className="users-list-tabs"
                      activeKey={activeListTab}
                      onChange={setActiveListTab}
                      items={[
                        {
                          key: "employees",
                          label: "Employees",
                          children: <EmployeeListTabUsers taskLikeDesign />
                        },
                        {
                          key: "clients",
                          label: "Clients",
                          children: <EmployeeListTabClient taskLikeDesign />
                        }
                      ]}
                    />
                  </div>
                )
              },
              {
                key: "kanban",
                label: (
                  <span>
                    <AppstoreOutlined /> Kanban
                  </span>
                ),
                children: (
                  <div className="users-empty-view">
                    <div className="users-empty-toolbar users-kanban-toolbar">
                      <div>
                        <span className="users-toolbar-label">Select Pipeline :</span>
                        <Select
                          size="small"
                          defaultValue="none"
                          options={[{ label: "Select", value: "none" }]}
                        />
                      </div>
                      <div className="users-kanban-stage">Stages</div>
                      <Button size="small" icon={<SettingOutlined />}>
                        Setting
                      </Button>
                    </div>
                    <Empty description="Please Select OR Set Pipeline" />
                  </div>
                )
              },
              {
                key: "calendar",
                label: (
                  <span>
                    <CalendarOutlined /> Calendar
                  </span>
                ),
                children: (
                  <div className="users-calendar-view">
                    <div className="users-calendar-toolbar">
                      <div className="users-calendar-month">
                        <span>{calendarMonth.format("MMMM YYYY")}</span>
                        <Button
                          size="small"
                          icon={<LeftOutlined />}
                          onClick={() =>
                            setCalendarMonth((prev) => prev.subtract(1, "month"))
                          }
                        />
                        <Button
                          size="small"
                          icon={<RightOutlined />}
                          onClick={() =>
                            setCalendarMonth((prev) => prev.add(1, "month"))
                          }
                        />
                        <Button
                          size="small"
                          onClick={() => setCalendarMonth(dayjs())}
                        >
                          Today
                        </Button>
                      </div>
                      <div className="users-calendar-actions">
                        <Button size="small" icon={<SettingOutlined />}>
                          Setting
                        </Button>
                        <Button size="small" type="primary">
                          Month
                        </Button>
                        <Button size="small">Week</Button>
                        <Button size="small">Day</Button>
                      </div>
                    </div>
                    <Calendar
                      value={calendarMonth}
                      fullscreen
                      onPanelChange={(value) => setCalendarMonth(value)}
                      dateFullCellRender={renderCalendarCell}
                      headerRender={() => null}
                    />
                  </div>
                )
              }
            ]}
          />
        </div>
      </div>
    </Card>
  );
};

export default EmployeeMasterList;
