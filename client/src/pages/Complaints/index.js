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
import ComplaintFilterComponent from "./ComplaintFilterComponent";

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

  const companySlug = localStorage.getItem("companyDomain");
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
                <Link
                  to={
                    `/${companySlug}/add/complaintForm-action-details/` +
                    text._id
                  }
                >
                  <EyeOutlined style={{ cursor: "pointer" }} />
                </Link>
                <Link to={`/${companySlug}/edit/complaintsForm/` + text._id}>
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
          <div className="heading-wrapper">
            <h2>Complaints</h2>
            {getRoles(["Admin", "PC", "AM", "TL"]) && (
              <Link to={`/${companySlug}/add/complaintsform`}>
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
          <div className="global-search ">
            <div className="filter-btn-wrapper">
              <ComplaintFilterComponent
                // Project props
                selectedProject={selectedProject}
                setSelectedProject={setSelectedProject}
                searchProject={searchProject}
                handleSearchProjects={handleSearchProjects}
                filteredProjectsList={filteredProjectsList}
                // Technology props (Admin only)
                technology={technology}
                setTechnology={setTechnology}
                searchTechnology={searchTechnology}
                handleSearchTechnology={handleSearchTechnology}
                filteredTechnologyList={filteredTechnologyList}
                // Manager props (Admin only)
                manager={manager}
                setManager={setManager}
                searchManager={searchManager}
                handleSearchManager={handleSearchManager}
                filteredManagerList={filteredManagerList}
                // Account Manager props (Admin only)
                accontManager={accontManager}
                setAccountManager={setAccountManager}
                searchAccountManager={searchAccountManager}
                handleSearchAccountManager={handleSearchAccountManager}
                filteredAccManagerList={filteredAccManagerList}
                // Priority props
                priority={priority}
                handlePriorityFilter={handlePriorityFilter}
                // Status props
                status={status}
                handleStatusFilter={handleStatusFilter}
                // Role function
                getRoles={getRoles}
                // Common props
                handleFilters={handleFilters}
                getComplaintList={getComplaintList}
              />

              {/* <Popover
                trigger="click"
                visible={popOver.project}
                onVisibleChange={(visible) =>
                  handleVisibleChange("project", visible)
                }
                placement="bottomRight"
                content={
                  <div className="right-popover-wrapper">
                    <ul className="assigness-data">
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
                        {filteredProjectsList.map((item) => (
                          <li key={item._id}>
                            <Checkbox
                              onChange={() =>
                                handleFilters(
                                  item,
                                  selectedProject,
                                  setSelectedProject
                                )
                              }
                              checked={selectedProject.includes(item._id)}
                            >
                              <span>{item?.title}</span>
                            </Checkbox>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="popver-footer-btn">
                      <Button
                        type="primary"
                        className="square-primary-btn ant-btn-primary"
                        onClick={() => {
                          getComplaintList();
                          handleVisibleChange("project", false);
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() => handleVisibleChange("project", false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                }
              >
                <Button className="dropdown-button">
                  <span className="filter-text">
                    <span>Project:</span>
                    <span>
                      {selectedProject.length === 0
                        ? "All"
                        : `Selected (${selectedProject.length})`}
                    </span>
                  </span>
                </Button>
              </Popover>
              {getRoles(["Admin"]) && (
                <>
                  <Popover
                    trigger="click"
                    visible={popOver.technology}
                    onVisibleChange={(visible) =>
                      handleVisibleChange("technology", visible)
                    }
                    placement="bottomRight"
                    content={
                      <div className="right-popover-wrapper">
                        <ul className="assigness-data">
                          <li>
                            <Checkbox
                              checked={technology.length === 0}
                              onChange={() =>
                                handleFilters("", technology, setTechnology)
                              }
                            >
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
                            {filteredTechnologyList.map((item) => (
                              <li key={item._id}>
                                <Checkbox
                                  onChange={() =>
                                    handleFilters(
                                      item,
                                      technology,
                                      setTechnology
                                    )
                                  }
                                  checked={technology.includes(item._id)}
                                >
                                  {item.project_tech}
                                </Checkbox>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="popver-footer-btn">
                          <Button
                            type="primary"
                            className="square-primary-btn ant-btn-primary"
                            onClick={() => {
                              getComplaintList();
                              handleVisibleChange("technology", false);
                            }}
                          >
                            Apply
                          </Button>
                          <Button
                            className="square-outline-btn ant-delete"
                            onClick={() =>
                              handleVisibleChange("technology", false)
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    }
                  >
                    <Button className="dropdown-button">
                      <span className="filter-text">
                        <span>Department:</span>
                        <span>
                          {technology.length === 0
                            ? "All"
                            : `Selected (${technology.length})`}
                        </span>
                      </span>
                    </Button>
                  </Popover>

                  <Popover
                    trigger="click"
                    visible={popOver.manager}
                    onVisibleChange={(visible) =>
                      handleVisibleChange("manager", visible)
                    }
                    placement="bottomRight"
                    content={
                      <div className="right-popover-wrapper">
                        <ul className="assigness-data">
                          <li>
                            <Checkbox
                              checked={manager.length === 0}
                              onChange={() =>
                                handleFilters("", manager, setManager)
                              }
                            >
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
                            {filteredManagerList.map((item) => (
                              <li key={item._id}>
                                <Checkbox
                                  onChange={() =>
                                    handleFilters(item, manager, setManager)
                                  }
                                  checked={manager.includes(item._id)}
                                >
                                  <MyAvatar
                                    userName={item?.manager_name || "-"}
                                    src={item?.emp_img}
                                    key={item?._id}
                                    alt={item?.manager_name}
                                  />
                                  <span>{removeTitle(item?.manager_name)}</span>
                                </Checkbox>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="popver-footer-btn">
                          <Button
                            type="primary"
                            className="square-primary-btn ant-btn-primary"
                            onClick={() => {
                              getComplaintList();
                              handleVisibleChange("manager", false);
                            }}
                          >
                            Apply
                          </Button>
                          <Button
                            className="square-outline-btn ant-delete"
                            onClick={() =>
                              handleVisibleChange("manager", false)
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    }
                  >
                    <Button className="dropdown-button">
                      <span className="filter-text">
                        <span>Manager:</span>
                        <span>
                          {manager.length === 0
                            ? "All"
                            : `Selected (${manager.length})`}
                        </span>
                      </span>
                    </Button>
                  </Popover>

                  <Popover
                    trigger="click"
                    visible={popOver.accontManager}
                    onVisibleChange={(visible) =>
                      handleVisibleChange("accontManager", visible)
                    }
                    placement="bottomRight"
                    content={
                      <div className="right-popover-wrapper">
                        <ul className="assigness-data">
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
                            {filteredAccManagerList.map((item) => (
                              <li key={item._id}>
                                <Checkbox
                                  onChange={() =>
                                    handleFilters(
                                      item,
                                      accontManager,
                                      setAccountManager
                                    )
                                  }
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
                        <div className="popver-footer-btn">
                          <Button
                            type="primary"
                            className="square-primary-btn ant-btn-primary"
                            onClick={() => {
                              getComplaintList();
                              handleVisibleChange("accontManager", false);
                            }}
                          >
                            Apply
                          </Button>
                          <Button
                            className="square-outline-btn ant-delete"
                            onClick={() =>
                              handleVisibleChange("accontManager", false)
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    }
                  >
                    <Button className="dropdown-button">
                      <span className="filter-text">
                        <span>Account Manager:</span>
                        <span>
                          {accontManager?.length === 0
                            ? "All"
                            : `Selected (${accontManager?.length})`}
                        </span>
                      </span>
                    </Button>
                  </Popover>
                </>
              )}

              <Popover
                trigger="click"
                visible={popOver.priority}
                onVisibleChange={(visible) =>
                  handleVisibleChange("priority", visible)
                }
                placement="bottomRight"
                content={
                  <div className="right-popover-wrapper">
                    <ul className="assigness-data">
                      <Radio.Group
                        onChange={handlePriorityFilter}
                        value={priority}
                      >
                        <li>
                          <Radio value="">All</Radio>
                        </li>
                        <li>
                          <Radio value="critical">Critical</Radio>
                        </li>
                        <li>
                          <Radio value="high">High</Radio>
                        </li>
                        <li>
                          <Radio value="medium">Medium</Radio>
                        </li>
                        <li>
                          <Radio value="low">Low</Radio>
                        </li>
                      </Radio.Group>
                    </ul>
                    <div className="popver-footer-btn">
                      <Button
                        type="primary"
                        className="square-primary-btn ant-btn-primary"
                        onClick={() => {
                          getComplaintList();
                          handleVisibleChange("priority", false);
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() => handleVisibleChange("priority", false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                }
              >
                <Button className="dropdown-button">
                  <span className="filter-text">
                    <span>Priority Level:</span>
                    <span>
                      {priority === ""
                        ? "All"
                        : priority === "critical"
                        ? "Critical"
                        : priority === "high"
                        ? "High"
                        : priority === "medium"
                        ? "Medium"
                        : "Low"}
                    </span>
                  </span>
                </Button>
              </Popover>

              <Popover
                trigger="click"
                visible={popOver.status}
                onVisibleChange={(visible) =>
                  handleVisibleChange("status", visible)
                }
                placement="bottomRight"
                content={
                  <div className="right-popover-wrapper">
                    <ul className="assigness-data">
                      <Radio.Group onChange={handleStatusFilter} value={status}>
                        <li>
                          <Radio value="">All</Radio>
                        </li>
                        <li>
                          <Radio value="open">Open</Radio>
                        </li>
                        <li>
                          <Radio value="in_progress">In Progress</Radio>
                        </li>
                        <li>
                          <Radio value="client_review">Client Review</Radio>
                        </li>
                        <li>
                          <Radio value="resolved">Resolved</Radio>
                        </li>
                        <li>
                          <Radio value="reopened">Reopen</Radio>
                        </li>
                        <li>
                          <Radio value="customer_lost">Customer Lost</Radio>
                        </li>
                      </Radio.Group>
                    </ul>
                    <div className="popver-footer-btn">
                      <Button
                        type="primary"
                        className="square-primary-btn ant-btn-primary"
                        onClick={() => {
                          getComplaintList();
                          handleVisibleChange("status", false);
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() => handleVisibleChange("status", false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                }
              >
                <Button className="dropdown-button">
                  <span className="filter-text">
                    <span>Status:</span>
                    <span>
                      {status === ""
                        ? "All"
                        : status === "open"
                        ? "Open"
                        : status === "in_progress"
                        ? "In Progress"
                        : status === "client_review"
                        ? "Client Review"
                        : status === "resolved"
                        ? "Resolved"
                        : status === "reopened"
                        ? "Reopen"
                        : "Customer Lost"}
                    </span>
                  </span>
                </Button>
              </Popover> */}
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
