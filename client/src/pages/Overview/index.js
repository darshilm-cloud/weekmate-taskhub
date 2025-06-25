import React from "react";
import { Table, Modal, Select } from "antd";
import ReactApexChart from "react-apexcharts";
import OverviewController from "./OverviewController";
import { useSelector } from "react-redux";
import "./OverviewStyle.css";
import moment from "moment";
import { hasPermission } from "../../util/hasPermission";
import MyAvatarGroup from "../../components/AvatarGroup/MyAvatarGroup";
import { Link } from "react-router-dom/cjs/react-router-dom";
import { removeTitle } from "../../util/nameFilter";
import MyAvatar from "../../components/Avatar/MyAvatar";

const Overview = () => {
  const {
    isModalOpenUser,
    handleCancelUser,
    showModalUser,
    Search,
    convertTimeToHours,
    generateChartData,
    goToEditProjectPage,
    filterAssigneeSearchInput,
    setFilterAssigneeSearchInput,
    filterClientSearchInput,
    setFilterClientSearchInput,
    setModalVisible,
    isModalVisible,
    setTitle,
    title,
    allTaskData,
    myTaskData,
    getTaskList,
    taskListData,
  } = OverviewController();

  const { Option } = Select;

  const { projectOverviewData } = useSelector((state) => state.apiData);

  const Column = [
    {
      title: "Time on task",
      dataIndex: "time_on_task",
      key: "task",
    },
    {
      title: <></>,
      dataIndex: "value",
      key: "value",
    },
  ];

  const ColumnData = [
    {
      key: 1,
      time_on_task: "Total Estimated Time",
      value: `${projectOverviewData?.estimatedHours} Hrs`,
    },
    {
      key: 2,
      time_on_task: "Total Logged Time",
      value: `${projectOverviewData?.total_logged_time} Hrs`,
    },
  ];

  const BarchartData = {
    series: [
      {
        data: [
          projectOverviewData?.estimatedHours,
          convertTimeToHours(projectOverviewData?.total_logged_time),
        ],
      },
    ],
    options: {
      chart: {
        type: "bar",
        height: 350,
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      xaxis: {
        categories: ["Estimated", "Logged"],
      },
    },
  };

  const ChartData = {
    series: [
      {
        name: "Progress",
        data:
          generateChartData(
            projectOverviewData?.start_date ?? moment().format(),
            projectOverviewData?.end_date ?? moment().add(7, "days").format(),
            projectOverviewData?.tasks_summary ?? []
          ) || [],
      },
    ],
    options: {
      chart: {
        type: "area",
        stacked: false,
        height: 250,
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: true,
          offsetX: 0,
          offsetY: 0,
          tools: {
            zoom: true,
            zoomin: true,
            zoomout: true,
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "straight",
      },
      title: {
        text: "Project Progress",
        align: "left",
      },
      xaxis: {
        type: "numeric",
        min: moment(projectOverviewData?.start_date ?? moment().format())
          .startOf("day")
          .valueOf(),
        max: moment(
          projectOverviewData?.end_date ?? moment().add(7, "days").format()
        )
          .endOf("day")
          .add(1, "day")
          .valueOf(),
        labels: {
          formatter: function (val) {
            return moment(val).format("DD MMM YYYY");
          },
        },
      },
      yaxis: {
        min: 0,
        max: 100,
      },
      legend: {
        horizontalAlign: "left",
      },
    },
  };

  const dataSourceTask = [
    {
      key: "1",
      tasks: "Overdue",
      my: myTaskData?.overDue > 0 ? myTaskData?.overDue : "-",
      all: allTaskData?.overDue > 0 ? allTaskData?.overDue : "-",
    },
    {
      key: "2",
      tasks: "Today",
      my: myTaskData?.today > 0 ? myTaskData?.today : "-",
      all: allTaskData?.today > 0 ? allTaskData?.today : "-",
    },
    {
      key: "3",
      tasks: "Upcoming",
      my: myTaskData?.upComing > 0 ? myTaskData?.upComing : "-",
      all: allTaskData?.upComing > 0 ? allTaskData?.upComing : "-",
    },
    {
      key: "4",
      tasks: "No date set",
      my: myTaskData?.noDate > 0 ? myTaskData?.noDate : "-",
      all: allTaskData?.noDate > 0 ? allTaskData?.noDate : "-",
    },
  ];

  const columnTasks = [
    {
      title: `Tasks(${allTaskData?.totalTasks})`,
      dataIndex: "tasks",
      key: "tasks",
    },
    {
      title: "My",
      dataIndex: "my",
      key: "my",
    },
    {
      title: "All",
      dataIndex: "all",
      key: "all",
    },
  ];

  const tasklist = [
    {
      title: ``,
      dataIndex: "tasks",
      key: "tasks",
      render: (_, record) => {
        let formattedDate = "";
        if (moment(record?.due_date).isValid()) {
          formattedDate = moment(record?.due_date).format("DD MMM");
        }
        return (
          <Link
            to={`/project/app/${record?.project_id}?tab=Tasks&listID=${record?.main_task_id}&taskID=${record?._id}`}
          >
            <div className="overdue_block">
              {formattedDate && (
                <span className="overdue_date">{formattedDate}</span>
              )}
              <p>{record?.title} </p>

              {record?.taskLabels?.map((val) => (
                <span
                  className="highlabel"
                  style={{
                    backgroundColor: val.color,
                    textTransform: "capitalize",
                    color: "white",
                  }}
                >
                  {" "}
                  {val.title.charAt(0).toUpperCase() + val.title.slice(1)}
                </span>
              ))}
            </div>
          </Link>
        );
      },
    },
    {
      title: ``,
      dataIndex: "assignees",
      key: "assignees",
      render: (text, record) => {
        return (
          <span>
            {
              <MyAvatarGroup
                customStyle={{ height: "30px", width: "30px" }}
                record={record?.assignees}
                maxPopoverTrigger={"click"}
              />
            }
          </span>
        );
      },
    },
  ];

  const handleClick = (record, columnIndex) => {
    const column = columnTasks[columnIndex];
    getTaskList(record.tasks, column.title);
    setTitle(record.tasks);
    setModalVisible(true);
  };

  const project_title = projectOverviewData?.title;
  const formattedTitle = project_title?.replace(
    /(?:^|\s)([a-z])/g,
    function (match, group1) {
      return match?.charAt(0) + group1?.toUpperCase();
    }
  );

  let startDate = "";
  let endDate = "";
  if (moment(projectOverviewData?.start_date).isValid()) {
    startDate = moment(projectOverviewData?.start_date).format("DD MMM YY");
  }

  if (moment(projectOverviewData?.end_date).isValid()) {
    endDate = moment(projectOverviewData?.end_date).format("DD MMM YY");
  }

  return (
    <>
      <div className="project-wrapper new-project-overview">
        <div className="peoject-page">
          <div className="project-panel-header">
            <div className="header">
              <h1>
                <span>
                  {formattedTitle?.length > 59
                    ? `${formattedTitle.slice(0, 59)}...`
                    : formattedTitle}
                </span>

                {/* edit icon only in Active projects   */}
                {projectOverviewData?.project_status?.title == "Active" &&
                  hasPermission(["project_edit"]) && (
                    <i
                      style={{ cursor: "pointer" }}
                      onClick={goToEditProjectPage}
                      className="fi fi-rr-pencil edit-btn"
                    ></i>
                  )}
              </h1>
            </div>

            <div className="project-status">
              <ul>
                <li>
                  <label className="status-label">
                    {projectOverviewData?.project_type?.title}
                  </label>
                </li>
                <li>
                  <Select
                    placeholder="Technologies"
                    defaultValue={
                      projectOverviewData?.technologyDetails?.length > 0
                        ? projectOverviewData.technologyDetails[0]._id
                        : undefined
                    }
                  >
                    {projectOverviewData?.technologyDetails?.length > 0 ? (
                      projectOverviewData.technologyDetails.map((tech) => (
                        <Option key={tech._id} value={tech._id}>
                          {tech.project_tech}
                        </Option>
                      ))
                    ) : (
                      <Option disabled>No Technologies Available</Option>
                    )}
                  </Select>
                </li>

                <li>
                  <i
                    className="fi fi-ss-check-circle"
                    style={{
                      color: "#35C03B",
                      fontSize: "16px",
                      lineHeight: 0,
                    }}
                  ></i>
                  {projectOverviewData?.project_status?.title}
                </li>

                <li>
                  {startDate} - {endDate}
                </li>
                <li className="text-black" onClick={showModalUser}>
                  {projectOverviewData?.total_assignees > 1 ? (
                    <i
                      className="fi fi-sr-users"
                      style={{ cursor: "pointer" }}
                    ></i>
                  ) : (
                    <i
                      className="fi fi-sr-user"
                      style={{ cursor: "pointer" }}
                    ></i>
                  )}
                  <span> {projectOverviewData?.total_assignees}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="project-panel">
            <h1 style={{ textAlign: "center", width: "100%" }}>Summary</h1>

            <div className="project-progress-wrapper">
              <ReactApexChart
                options={ChartData?.options}
                series={ChartData?.series}
                type="area"
                height={300}
                className="project-progress-chart"
              />
            </div>
            <div className="project-time-task">
              <div className="hourTable">
                <Table
                  columns={Column}
                  dataSource={ColumnData}
                  pagination={false}
                />
              </div>

              <ReactApexChart
                className="ReactApexChart"
                options={BarchartData?.options}
                series={BarchartData?.series}
                type="bar"
                height={300}
                width={300}
              />
            </div>
          </div>

          <div className="task-table">
            <Table
              columns={columnTasks}
              dataSource={dataSourceTask}
              pagination={false}
              onRow={(record) => ({
                onClick: (e) => {
                  const cellIndex = Array.from(
                    e.currentTarget.children
                  ).indexOf(e.target);
                  if (cellIndex > 0) {
                    handleClick(record, cellIndex);
                  }
                },
              })}
            />
          </div>
        </div>
      </div>

      <Modal
        open={isModalOpenUser}
        width={700}
        onCancel={handleCancelUser}
        title={null}
        footer={null}
        className="overview-modal modal-overview-details"
      >
        <div className="modal-header ">
          <div className="project-name">
            <h3 style={{ textTransform: "capitalize" }}>
              {projectOverviewData?.title}{" "}
              <span>{projectOverviewData?.estimatedHours}h</span>
            </h3>
          </div>
        </div>

        <div className="overview-modal-wrapper">
          <div className="overview-modal-content">
            <div className="assignees-clients">
              <div className="overview-assignees-clients">
                <h3>Assignees</h3>
                <ul>
                  <li>
                    <Search
                      value={filterAssigneeSearchInput}
                      onSearch={(val) => setFilterAssigneeSearchInput(val)}
                      onChange={(e) =>
                        setFilterAssigneeSearchInput(e.target.value)
                      }
                    />
                  </li>
                  <div className="assignees-list">
                    {projectOverviewData?.assignees &&
                    projectOverviewData.assignees.length > 0 ? (
                      (() => {
                        const filteredAssignees =
                          projectOverviewData.assignees.filter((data) =>
                            data.name
                              ?.toLowerCase()
                              .includes(
                                filterAssigneeSearchInput?.toLowerCase()
                              )
                          );

                        if (filteredAssignees.length > 0) {
                          return filteredAssignees.map((item, index) => (
                            <li key={item._id}>
                              <MyAvatar
                                userName={item.name}
                                alt={item.name}
                                key={item._id}
                                src={item.emp_img}
                              />
                              {removeTitle(item.name)}
                            </li>
                          ));
                        } else {
                          return <p className="error-message">No data</p>;
                        }
                      })()
                    ) : (
                      <p className="error-message">No data</p>
                    )}
                  </div>
                </ul>
              </div>
              <div className="overview-assignees-clients">
                <h3>Clients</h3>
                <ul>
                  <li>
                    <Search
                      value={filterClientSearchInput}
                      onSearch={(val) => setFilterClientSearchInput(val)}
                      onChange={(e) =>
                        setFilterClientSearchInput(e.target.value)
                      }
                    />
                  </li>
                  <div className="assignees-list">
                    {projectOverviewData?.pms_clients &&
                    projectOverviewData.pms_clients.length > 0 ? (
                      (() => {
                        const filteredClients =
                          projectOverviewData.pms_clients.filter((data) =>
                            data.full_name
                              ?.toLowerCase()
                              .includes(filterClientSearchInput?.toLowerCase())
                          );

                        if (filteredClients.length > 0) {
                          return filteredClients.map((item, index) => (
                            <li key={item._id}>
                              <MyAvatar
                                userName={item.full_name}
                                alt={item.full_name}
                                key={item._id}
                                src={item.client_img}
                              />
                              {removeTitle(item.full_name)}
                            </li>
                          ));
                        } else {
                          return <p className="error-message">No data</p>;
                        }
                      })()
                    ) : (
                      <p className="error-message">No data</p>
                    )}
                  </div>
                </ul>
              </div>
            </div>
            <h3>Manager</h3>
            <ul>
              <li>
                <MyAvatar
                  src={projectOverviewData?.manager?.emp_img}
                  alt={projectOverviewData?.manager?.full_name}
                  userName={projectOverviewData?.manager?.full_name}
                />{" "}
                {removeTitle(projectOverviewData?.manager?.full_name)}
              </li>
            </ul>
            <h3>Creator</h3>
            <ul>
              <li>
                <MyAvatar
                  src={projectOverviewData?.createdBy?.emp_img}
                  alt={projectOverviewData?.createdBy?.full_name}
                  userName={projectOverviewData?.createdBy?.full_name}
                />
                {removeTitle(projectOverviewData?.createdBy?.full_name)}
              </li>
            </ul>
          </div>
        </div>
      </Modal>

      <Modal
        visible={isModalVisible}
        onCancel={() => {
          setModalVisible(false);
        }}
        footer={false}
        width={600}
      >
        <div className="modal-header ">
          <h1>{title}</h1>
        </div>
        <div className="overview-task-list">
          <Table
            columns={tasklist}
            dataSource={taskListData}
            pagination={false}
          />
        </div>
      </Modal>
    </>
  );
};

export default Overview;
