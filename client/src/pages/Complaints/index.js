import React from "react";
import {
  Button,
  Card,
  Checkbox,
  Input,
  Popover,
  Table,
  Radio,
  Popconfirm,
} from "antd";

import ComplaintsFormController from "./ComplaintsFormController";
import { removeTitle } from "../../util/nameFilter";
import "../../components/AssignProject/AssignProject.css";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import MyAvatar from "../../components/Avatar/MyAvatar";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import moment from "moment";
import { getRoles } from "../../util/hasPermission";

const index = () => {
  const {
    popOver,
    setPopOver,
    handleVisibleChange,
    handleSearchTechnology,
    searchTechnology,
    filteredTechnologyList,
    technology,
    setTechnology,
    handleFilters,
    filteredManagerList,
    handleSearchManager,
    searchManager,
    manager,
    setManager,
    accontManager,
    setAccountManager,
    searchProject,
    handleSearchProjects,
    filteredProjectsList,
    selectedProject,
    setSelectedProject,
    handleSearchAccountManager,
    searchAccountManager,
    filteredAccManagerList,
    complaintList,
    handleTableChange,
    pagination,
    getComplaintList,
    handlePriorityFilter,
    priority,
    handleStatusFilter,
    status,
    deleteComplaints,
  } = ComplaintsFormController();

  const userHasAccess = getRoles(["Admin", "PC", "TL", "AM"]);

  const showTotal = (total) => `Total Records Count is ${total}`;

  function formatStatus(status) {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  const columns = [
    {
      title: "Project",
      render: (text) => (text?.project?.title ? text?.project?.title : "-"),
    },
    {
      title: "Created By",
      render: (text) =>
        text?.createdBy?.full_name ? text?.createdBy?.full_name : "-",
    },
    {
      title: "Account Manager",

      render: (text) =>
        text?.acc_manager?.full_name ? text?.acc_manager?.full_name : "-",
    },
    {
      title: "Project Manager",
      render: (text) =>
        text?.manager?.full_name ? text?.manager?.full_name : "-",
    },
    {
      title: "Client",
      render: (text) => (text?.client_name ? text?.client_name : "-"),
    },
    {
      title: "Status",
      render: (text) => (text?.status ? formatStatus(text.status) : "-"),
    },
    {
      title: "Date",

      render: (text) => {
        const createdDate = moment(text.createdAt).format("DD MMM YYYY");
        return <span>{createdDate ? createdDate : "-"}</span>;
      },
    },

    ...(userHasAccess
      ? [
          {
            title: "Actions",
            render: (text, record) => (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "20px",
                }}
              >
                {" "}
                <Link to={"/add/complaintForm-action-details/" + text._id}>
                  <EyeOutlined style={{ cursor: "pointer" }} />
                </Link>
                <Link to={"/edit/complaintsForm/" + text._id}>
                  <EditOutlined style={{ color: "green" }} />
                </Link>
                <Popconfirm
                  icon={
                    <QuestionCircleOutlined
                      style={{
                        color: "red",
                      }}
                    />
                  }
                  title="Are you sure to delete this Complaint?"
                  onConfirm={() => {
                    deleteComplaints(text._id);
                  }}
                  // onCancel={cancel}
                  okText="Yes"
                  cancelText="No"
                >
                  <DeleteOutlined style={{ color: "red" }} />
                </Popconfirm>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="ant-project-task  all-project-main-wrapper">
        <Card>
          <div className="profile-sub-head">
            <div className="head-box-inner">
              <div className="heading-main">
                <h2>Complaints</h2>
              </div>
              {getRoles(["Admin", "PC", "AM", "TL"]) && (
                <Link to="/add/complaintsform">
                  <Button
                    icon={<PlusOutlined />}
                    type="primary"
                    className="square-primary-btn"
                  >
                    Add Complaint
                  </Button>
                </Link>
              )}
            </div>

            <div className="status-content">
              <div style={{ cursor: "pointer" }}>
                <h6>Project:</h6>
                <Popover
                  trigger="click"
                  placement="bottomRight"
                  visible={popOver.project}
                  onVisibleChange={() => handleVisibleChange("project", true)}
                  content={
                    <div className="assignees-popover assign-global-height">
                      <ul>
                        <li>
                          <Checkbox
                            checked={selectedProject.length === 0}
                            onChange={() =>
                              handleFilters(
                                "",
                                selectedProject,
                                setSelectedProject
                              )
                            }
                          >
                            {" "}
                            All
                          </Checkbox>
                        </li>
                      </ul>
                      <div className="search-filter">
                        <Input
                          placeholder="Search"
                          value={searchProject}
                          onChange={handleSearchProjects}
                        />
                      </div>
                      <div>
                        <ul className="assigness-data">
                          {filteredProjectsList.map((item, index) => (
                            <>
                              <li key={item._id}>
                                <Checkbox
                                  onChange={() => {
                                    handleFilters(
                                      item,
                                      selectedProject,
                                      setSelectedProject
                                    );
                                  }}
                                  checked={selectedProject.includes(item._id)}
                                >
                                  <span>{item?.title}</span>
                                </Checkbox>
                              </li>
                            </>
                          ))}
                        </ul>
                      </div>
                      <div className="popover-footer-btn">
                        <Button
                          type="primary"
                          className="square-primary-btn ant-btn-primary"
                          onClick={() => {
                            getComplaintList();
                            setPopOver({ ...popOver, project: false });
                          }}
                        >
                          Apply
                        </Button>
                        <Button
                          className="square-outline-btn ant-delete"
                          onClick={() => {
                            setPopOver({ ...popOver, project: false });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <i class="fa-solid fa-list-check"></i>{" "}
                  {selectedProject.length == 0 ? "All" : "Selected"}
                </Popover>
              </div>
              {getRoles(["Admin"]) && (
                <>
                  <div style={{ cursor: "pointer" }}>
                    <h6>Technology:</h6>
                    <Popover
                      trigger="click"
                      placement="bottomRight"
                      visible={popOver.technology}
                      onVisibleChange={() =>
                        handleVisibleChange("technology", true)
                      }
                      content={
                        <div className="assignees-popover assign-global-height">
                          <ul>
                            <li>
                              <Checkbox
                                checked={technology.length === 0}
                                onChange={() =>
                                  handleFilters("", technology, setTechnology)
                                }
                              >
                                {" "}
                                All
                              </Checkbox>
                            </li>
                          </ul>
                          <div className="search-filter">
                            <Input
                              placeholder="Search"
                              value={searchTechnology}
                              onChange={handleSearchTechnology}
                            />
                          </div>
                          <div>
                            <ul className="assigness-data">
                              {filteredTechnologyList.map((item, index) => (
                                <li key={item._id}>
                                  <Checkbox
                                    onChange={() => {
                                      handleFilters(
                                        item,
                                        technology,
                                        setTechnology
                                      );
                                    }}
                                    checked={technology.includes(item._id)}
                                  >
                                    {item.project_tech}
                                  </Checkbox>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="popover-footer-btn">
                            <Button
                              type="primary"
                              className="square-primary-btn ant-btn-primary"
                              onClick={() => {
                                getComplaintList();
                                setPopOver({ ...popOver, technology: false });
                              }}
                            >
                              Apply
                            </Button>
                            <Button
                              className="square-outline-btn ant-delete"
                              onClick={() => {
                                handleVisibleChange("technology", false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      }
                    >
                      <i className="fas fa-briefcase"></i>{" "}
                      {technology.length == 0 ? "All" : "Selected"}
                    </Popover>
                  </div>
                  <div style={{ cursor: "pointer" }}>
                    <h6>Manager:</h6>
                    <Popover
                      trigger="click"
                      placement="bottomRight"
                      visible={popOver.manager}
                      onVisibleChange={() =>
                        handleVisibleChange("manager", true)
                      }
                      content={
                        <div className="assignees-popover assign-global-height">
                          <ul>
                            <li>
                              <Checkbox
                                checked={manager.length === 0}
                                onChange={() =>
                                  handleFilters("", manager, setManager)
                                }
                              >
                                {" "}
                                All
                              </Checkbox>
                            </li>
                          </ul>
                          <div className="search-filter">
                            <Input
                              placeholder="Search"
                              value={searchManager}
                              onChange={handleSearchManager}
                            />
                          </div>
                          <div>
                            <ul className="assigness-data">
                              {filteredManagerList.map((item, index) => (
                                <li key={item._id}>
                                  <Checkbox
                                    onChange={() => {
                                      handleFilters(item, manager, setManager);
                                    }}
                                    checked={manager.includes(item._id)}
                                  >
                                    <MyAvatar
                                      userName={item?.manager_name || "-"}
                                      src={item?.emp_img}
                                      key={item?._id}
                                      alt={item?.manager_name}
                                    />
                                    <span>
                                      {removeTitle(item?.manager_name)}
                                    </span>
                                  </Checkbox>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="popover-footer-btn">
                            <Button
                              type="primary"
                              className="square-primary-btn ant-btn-primary"
                              onClick={() => {
                                getComplaintList();
                                setPopOver({ ...popOver, manager: false });
                              }}
                            >
                              Apply
                            </Button>
                            <Button
                              className="square-outline-btn ant-delete"
                              onClick={() => {
                                setPopOver({ ...popOver, manager: false });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      }
                    >
                      <i className="fi fi-rr-users"></i>{" "}
                      {manager.length == 0 ? "All" : "Selected"}
                    </Popover>
                  </div>

                  <div style={{ cursor: "pointer" }}>
                    <h6>Account Manager:</h6>
                    <Popover
                      trigger="click"
                      placement="bottomRight"
                      visible={popOver.accontManager}
                      onVisibleChange={() =>
                        handleVisibleChange("accontManager", true)
                      }
                      content={
                        <div className="assignees-popover assign-global-height">
                          <ul>
                            <li>
                              <Checkbox
                                checked={accontManager?.length === 0}
                                onChange={() =>
                                  handleFilters(
                                    "",
                                    accontManager,
                                    setAccountManager
                                  )
                                }
                              >
                                {" "}
                                All
                              </Checkbox>
                            </li>
                          </ul>
                          <div className="search-filter">
                            <Input
                              placeholder="Search"
                              value={searchAccountManager}
                              onChange={handleSearchAccountManager}
                            />
                          </div>
                          <div>
                            <ul className="assigness-data">
                              {filteredAccManagerList.map((item, index) => (
                                <li key={item._id}>
                                  <Checkbox
                                    onChange={() => {
                                      handleFilters(
                                        item,
                                        accontManager,
                                        setAccountManager
                                      );
                                    }}
                                    checked={accontManager?.includes(item._id)}
                                  >
                                    <MyAvatar
                                      userName={item?.full_name || "-"}
                                      src={item?.emp_img}
                                      key={item?._id}
                                      alt={item?.full_name}
                                    />
                                    <span>{removeTitle(item?.full_name)}</span>
                                  </Checkbox>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="popover-footer-btn">
                            <Button
                              type="primary"
                              className="square-primary-btn ant-btn-primary"
                              onClick={() => {
                                getComplaintList();
                                setPopOver({
                                  ...popOver,
                                  accontManager: false,
                                });
                              }}
                            >
                              Apply
                            </Button>
                            <Button
                              className="square-outline-btn ant-delete"
                              onClick={() => {
                                setPopOver({
                                  ...popOver,
                                  accontManager: false,
                                });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      }
                    >
                      <i className="fi fi-rr-users"></i>{" "}
                      {accontManager?.length == 0 ? "All" : "Selected"}
                    </Popover>
                  </div>
                </>
              )}

              <div style={{ cursor: "pointer" }}>
                <h6>Priority Level:</h6>
                <Popover
                  trigger="click"
                  placement="bottomRight"
                  visible={popOver.priority}
                  onVisibleChange={() => handleVisibleChange("priority", true)}
                  content={
                    <div className="assignees-popover assign-global-height">
                      <ul>
                        <Radio.Group
                          onChange={handlePriorityFilter}
                          value={priority}
                        >
                          <li>
                            <Radio value={""}> All</Radio>
                          </li>
                          <li>
                            <Radio value={"critical"}> Critical</Radio>
                          </li>
                          <li>
                            <Radio value={"high"}> High</Radio>
                          </li>
                          <li>
                            <Radio value={"medium"}> Medium</Radio>
                          </li>
                          <li>
                            <Radio value={"low"}> Low</Radio>
                          </li>
                        </Radio.Group>
                      </ul>
                      <div className="popover-footer-btn">
                        <Button
                          type="primary"
                          className="square-primary-btn ant-btn-primary"
                          onClick={() => {
                            getComplaintList();
                            setPopOver({ ...popOver, priority: false });
                          }}
                        >
                          Apply
                        </Button>
                        <Button
                          className="square-outline-btn ant-delete"
                          onClick={() => {
                            setPopOver({ ...popOver, priority: false });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <i className="fa-solid fa-square-poll-vertical"></i>{" "}
                  {priority == "" ? "All" : "Selected"}
                </Popover>
              </div>

              <div style={{ cursor: "pointer" }}>
                <h6>Status:</h6>
                <Popover
                  trigger="click"
                  placement="bottomRight"
                  visible={popOver.status}
                  onVisibleChange={() => handleVisibleChange("status", true)}
                  content={
                    <div className="assignees-popover assign-global-height">
                      <ul>
                        <Radio.Group
                          onChange={handleStatusFilter}
                          value={status}
                        >
                          <li>
                            <Radio value={""}> All</Radio>
                          </li>
                          <li>
                            <Radio value={"open"}> Open</Radio>
                          </li>
                          <li>
                            <Radio value={"in_progress"}> In Progress</Radio>
                          </li>
                          <li>
                            <Radio value={"client_review"}>
                              {" "}
                              Client Review
                            </Radio>
                          </li>
                          <li>
                            <Radio value={"resolved"}> Resolved</Radio>
                          </li>
                          <li>
                            <Radio value={"reopened"}> Reopen</Radio>
                          </li>
                          <li>
                            <Radio value={"customer_lost"}>
                              {" "}
                              Customer Lost
                            </Radio>
                          </li>
                        </Radio.Group>
                      </ul>
                      <div className="popover-footer-btn">
                        <Button
                          type="primary"
                          className="square-primary-btn ant-btn-primary"
                          onClick={() => {
                            getComplaintList();
                            setPopOver({ ...popOver, status: false });
                          }}
                        >
                          Apply
                        </Button>
                        <Button
                          className="square-outline-btn ant-delete"
                          onClick={() => {
                            setPopOver({ ...popOver, status: false });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <i class="fa-regular fa-circle-check"></i>{" "}
                  {status == "" ? "All" : "Selected"}
                </Popover>
              </div>
            </div>
          </div>
          <Table
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "30"],
              showTotal: showTotal,
              ...pagination,
            }}
            columns={columns}
            onChange={handleTableChange}
            dataSource={complaintList}
          />
        </Card>
      </div>
    </>
  );
};

export default index;
