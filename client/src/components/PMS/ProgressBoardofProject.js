import React, { useState, useEffect, memo } from "react";
import {
  Menu,
  Popconfirm,
  Popover,
  message,
  Modal,
  Form,
  Input,
  Table,
  Switch,
  Radio,
} from "antd";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { Header } from "antd/lib/layout/layout";

import CalendarPMS from "./CalendarPMS";
import DiscussionForm from "../Discussion/DiscussionForm";
import TimeForPMS from "./TimeForPMS";
import TasksPMS from "../../pages/Tasks/index";
import NotesPMS from "./NotesPMS";
import Service from "../../service";
import Overview from "../../pages/Overview/index";
import BugsPMS from "../../pages/Bugs/index";
import FileModule from "../FileModule.js/FileModule";
import queryString from "query-string";
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import {
  getSubscribersList,
} from "../../appRedux/reducers/ApiData";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import { getRoles, hasPermission } from "../../util/hasPermission";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";
import DrawerComponent from "../Drawer/DrawerComponent";
import "./ProgressBoard.css";
import ManagePeopleModal from "../Modal/ManagePeopleModal";
import { generateCacheKey } from "../../util/generateCacheKey";

function ProgressBoardofProject() {
  const companySlug = localStorage.getItem("companyDomain");

  const { emitEvent } = useSocketAction();
  const { projectId } = useParams();
  const history = useHistory();
  const location = useLocation();
  const { tab, taskID, listID } = queryString.parse(location.search);
  const dispatch = useDispatch();

  const [selectedTab, setSelectedTab] = useState("Overview");
  const [projStatus, setProjStatus] = useState([]);
  const [category, setCategory] = useState([]);
  const [projectData, setProjectData] = useState({});
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [manageModal, setManageModal] = useState(false);
  const [manageTabs, setTabsModal] = useState(false);
  const [popOver, setPopOver] = useState(false);
  const [managerList, setManager] = useState([]);
  const [accountManagerList, setAccountManagerList] = useState([]);
  const [clientList, setClientList] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [columnDetails, setColumnDetails] = useState([]);
  const [assigneesflag, setAssigneesFlag] = useState(0);
  const [managePeopleForm] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [initialDetails, setInitialDetails] = useState({});
  const [peopleValues, setPeopleValues] = useState({
    assignees: [],
    clients: [],
    manager: [],
    acc_manager: []
  });

  const handleChange = (name, value) => {
    setPeopleValues({ ...peopleValues, [name]: value });
  };

  const handleCancelManageModal = () => {
    setManageModal(false);
  };

  const columns = [
    {
      title: "Tabs",
      dataIndex: "tabs",
      key: "tabs",
      text: "Testing",
      render: (text, record, index) => {
        return (
          <span style={{ textTransform: "capitalize" }}>
            {record?.tab_id?.name}
          </span>
        );
      },
    },
    {
      title: "Enable",
      dataIndex: "isEnable",
      key: "isEnable",
      render: (text, record, index) => {
        return (
          <Switch
            checked={record.isEnable}
            disabled={record?.isDefault === true}
            onChange={(checked) => {
              handleTabChange(
                record?._id,
                projectId,
                checked,
                record?.isDefault
              );
            }}
            size="small"
          />
        );
      },
    },
    {
      title: "Set as Default",
      dataIndex: "isDefault",
      key: "isDefault",
      render: (text, record, index) => {
        return (
          <Radio
            checked={record?.isDefault}
            disabled={record?.isEnable === false}
            onChange={(checked) =>
              handleTabChange(
                record._id,
                projectId,
                record.isEnable,
                checked?.target?.checked
              )
            }
          >
            Default
          </Radio>
        );
      },
    },
  ];

  const handleTabChange = async (id, projectId, isEnable, isDefault) => {
    try {
      const reqBody = {
        setting_id: id,
        project_id: projectId,
        isEnable: isEnable,
        isDefault: isDefault,
      };

      const updatedColumns = columnDetails.map((column) => {
        if (column._id === id) {
          return { ...column, isDefault: isDefault };
        }
        return column;
      });

      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.EditTabSetting,
        body: reqBody,
      });

      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setColumnDetails(updatedColumns);
        getManageTabs();
        getProjectByID();
        // setTabsModal(false);
      }
    } catch (error) {
      console.log(error, "Manage Tabs");
    }
  };

  const getManageTabs = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getTabSetting + `${projectId}`,
      });
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setColumnDetails(response.data.data);
      }
    } catch (error) {
      console.log(error, "Manage Tabs");
    }
  };
  const handleLiClick = (tab) => {
    // Update the selectedTab state with the clicked tab
    setSelectedTab(tab);
    // Extract current search parameters
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("tab", tab);
    searchParams.delete("listID", listID);

    if (taskID) {
      searchParams.set("listID", listID);
      searchParams.delete("taskID", taskID);
    }

    // Update the URL without reloading the page
    history.push({
      pathname: window.location.pathname,
      search: searchParams.toString(),
    });
  };

  const goToEditProjectPage = () => {
    history.push(`/${companySlug}/project-list/edit/${projectId}`);
  };
  const getProjectByID = async () => {
    try {
      const reqBody = {
        _id: projectId,
      };
      let Key = generateCacheKey("project", reqBody);
      
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: {
          "cachekey": Key
        }
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setProjectData(response.data.data);
        setInitialDetails(response.data.data);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteProject = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteProjectdetails + `/${projectId}`,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        history.push(`/${companySlug}/project-list`);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getManager = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectManager,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setManager(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

   const getAccountManager = async (values) => {
      try {
        dispatch(showAuthLoader());
        const reqBody = {
          ...values,
        };
        const response = await Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: Service.getAccountManager,
          body: reqBody,
        });
        dispatch(hideAuthLoader());
        if (response?.data && response?.data?.data) {
          setAccountManagerList(response?.data?.data);
        }
      } catch (error) {
        console.log(error);
      }
    };

  const getClients = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getClients,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setClientList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getAssignees = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getEmployees,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setAssignees(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleManagePeople = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        manager: values.manager,
        acc_manager: values.acc_manager,
        assignees: values.assignees,
        pms_clients: values.clients,
      };
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.managePeople}/${projectId}`,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        dispatch(hideAuthLoader());
        message.success(response.data.message);
        setAssigneesFlag(1);
        getProjectByID();
        dispatch(getSubscribersList(projectId));

        let assignee = new Set(
          initialDetails?.assignees.map((item) => item._id)
        );
        let newAssignees = values.assignees.filter((id) => !assignee.has(id));

        let client = new Set(
          initialDetails?.pms_clients.map((item) => item._id)
        );
        let newClients = values.clients.filter((id) => !client.has(id));
        let newManagerId;

        if (initialDetails.manager._id !== values.manager) {
          newManagerId = values.manager;
        }

        await emitEvent(socketEvents.EDIT_PROJECT_ASSIGNEE, {
          _id: projectId,
          manager: newManagerId,
          assignees: newAssignees,
          pms_clients: newClients,
        });
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
    setManageModal(false);
  };

  useEffect(() => {
    getManager();
    getAccountManager();
    getClients();
    getAssignees();
    getProjectByID();
    getManageTabs();
  }, [projectId]);

  useEffect(() => {
    myProjects();
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    switch (tab) {
      case "Tasks":
        setSelectedTab("Tasks");
        break;
      case "Time":
        setSelectedTab("Time");
        break;
      case "Bugs":
        setSelectedTab("Bugs");
        break;
      case "Discussion":
        setSelectedTab("Discussion");
        break;
      case "Files":
        setSelectedTab("Files");
        break;
      case "Notes":
        setSelectedTab("Notes");
        break;
      default:
        setSelectedTab("Overview");
        break;
    }
  }, [tab]);

  const tabsAfterSettings = columnDetails.filter(
    (item) => item.isEnable === true
  );
  const tabOptions = [
    {
      key: "Overview",
      label: (
        <Menu.Item onClick={() => handleLiClick("Overview")}>
          Overview
        </Menu.Item>
      ),
    },
    {
      key: "Discussion",
      label: (
        <Menu.Item onClick={() => handleLiClick("Discussion")}>
          Discussion
        </Menu.Item>
      ),
    },
    {
      key: "Tasks",
      label: (
        <Menu.Item onClick={() => handleLiClick("Tasks")}>Tasks</Menu.Item>
      ),
    },
    {
      key: "Bugs",
      label: <Menu.Item onClick={() => handleLiClick("Bugs")}>Bugs</Menu.Item>,
    },
    {
      key: "Notes",
      label: (
        <Menu.Item onClick={() => handleLiClick("Notes")}>Notes</Menu.Item>
      ),
    },
    {
      key: "Files",
      label: (
        <Menu.Item onClick={() => handleLiClick("Files")}>Files</Menu.Item>
      ),
    },
    {
      key: "Time",
      label: "Time",
      label: <Menu.Item onClick={() => handleLiClick("Time")}>Time</Menu.Item>,
    },
    {
      key: "Calendar",
      label: (
        <Menu.Item onClick={() => handleLiClick("Calendar")}>
          Calendar
        </Menu.Item>
      ),
    },
  ];

  const filteredTabOptions = tabOptions.filter((tab) => {
    return tabsAfterSettings.some((item) => item.tab_id.name === tab.key);
  });

  const title = projectData?.title;
  const formattedTitle = title?.replace(
    /(?:^|\s)([a-z])/g,
    function (match, group1) {
      return match?.charAt(0) + group1?.toUpperCase();
    }
  );

  const showDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setSearchQuery("");
  };

  const handleBookmark = async (item) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        api_url: `${Service.bookmarked}/${item?._id}`,
        methodName: Service.putMethod,
        body: { isStarred: !item.isStarred },
      });
      if (response?.data) {
        dispatch(hideAuthLoader());
        myProjects();
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get project list
  const myProjects = async () => {
    try {
      dispatch(showAuthLoader());
      let reqBody;
      if (category && category.length > 0) {
        reqBody = {
          ...reqBody,
          category: category,
          category: category,
        };
      }
      if (projStatus && projStatus.length > 0) {
        reqBody = {
          ...reqBody,
          project_status: projStatus,
        };
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: reqBody,
      });

      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setProjectList(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "myProject error");
    }
  };

  const getSortingKey = (title) => {
    const parts = title.split("/");
    return parts.length > 2 ? parts.slice(2).join("/") : title;
  };

  const filteredProjectList = projectList.filter((item) =>
    item.title?.toLowerCase().includes(searchQuery?.toLowerCase())
  );

  const sortedProjectList = [...filteredProjectList].sort((a, b) => {
    if (a.isStarred && !b.isStarred) return -1;
    if (!a.isStarred && b.isStarred) return 1;

    const titleA = getSortingKey(a.title?.toLowerCase());
    const titleB = getSortingKey(b.title?.toLowerCase());
    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;
    return 0;
  });

  return (
    <>
      <Header className="main-header progress-board-wrapper">
        <div className="project-name">
          <h3 onClick={showDrawer} style={{ cursor: "pointer" }}>
            {formattedTitle?.length > 59
              ? `${formattedTitle.slice(0, 59)}...`
              : formattedTitle}
          </h3>
          <DrawerComponent
            visible={drawerVisible}
            onClose={closeDrawer}
            title="Projects"
          >
            <div style={{ marginBottom: "16px" }} className="project-list">
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            {sortedProjectList.length === 0 ? (
              <p className="no-data-found-drawer-antd">No data found</p>
            ) : (
              sortedProjectList.map((item, index) => (
                <div key={index} className="project-name-drawers">
                  <span
                    onClick={() => {
                      handleBookmark(item);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {item.isStarred ? (
                      <StarFilled style={{ color: "#ffd200" }} />
                    ) : (
                      <StarOutlined />
                    )}
                  </span>
                  <Link
                    to={`/${companySlug}/project/app/${item?._id}?tab=${item?.defaultTab?.name}`}
                  >
                    <p
                      onClick={() => {
                        setDrawerVisible(false);
                        setSearchQuery("");
                      }}
                    >
                      {item.title?.length > 24
                        ? `${item.title.slice(0, 23)}...`
                        : item.title}
                    </p>
                  </Link>
                </div>
              ))
            )}
          </DrawerComponent>

          <div>
            <Popover
              trigger="click"
              placement="bottom"
              arrow={false}
              visible={popOver}
              onVisibleChange={setPopOver}
              content={
                <div className="progressboard-pop">
                  <Menu>
                    {hasPermission(["manage_people"]) && (
                      <Menu.Item
                        onClick={() => {
                          setPopOver(false);
                          setManageModal(true);
                          managePeopleForm.setFieldsValue({
                            clients: projectData?.pms_clients?.map(
                              (client) =>
                                clientList.find(
                                  (item) => item.full_name === client.full_name
                                )._id
                            ),
                            manager: projectData?.manager?._id,
                            acc_manager: projectData?.acc_manager?._id,
                            assignees: projectData?.assignees?.map(
                              (assignee) =>
                                assignees.find(
                                  (item) => item.full_name === assignee.name
                                )?._id
                            ),
                          });
                        }}
                      >
                        <i className="fi fi-rr-users"></i>{" "}
                        <span>Manage People</span>
                      </Menu.Item>
                    )}

                    {hasPermission(["project_edit"]) && (
                      <Menu.Item onClick={goToEditProjectPage}>
                        <span>
                          <EditOutlined />
                          <span>Edit</span>
                        </span>
                      </Menu.Item>
                    )}
                    {hasPermission(["project_delete"]) && (
                      <Menu.Item>
                        <Popconfirm
                          title="Are you sure you want to delete this?"
                          onConfirm={handleDeleteProject}
                          okText="Yes"
                          cancelText="No"
                          placement="bottom"
                          arrow={false}
                          className="ant-delete"
                        >
                          <span>
                            <DeleteOutlined />
                            <span> Delete</span>
                          </span>
                        </Popconfirm>
                      </Menu.Item>
                    )}
                    {getRoles(["Admin"]) && (
                      <Menu.Item
                        onClick={() => {
                          setPopOver(false);
                          setTabsModal(true);
                        }}
                      >
                        <i class="fa-solid fa-bars-staggered"></i>
                        <span>Manage Tabs</span>
                      </Menu.Item>
                    )}
                  </Menu>
                </div>
              }
            >
              {(hasPermission(["project_edit"]) ||
                hasPermission(["project_delete"])) && (
                <div>
                  <DownOutlined style={{ cursor: "pointer" }} />
                </div>
              )}
            </Popover>
          </div>
        </div>

        {windowWidth <= 991 ? (
          <>
            <Popover
              content={
                <Menu>
                  {filteredTabOptions.map((option) => (
                    <Menu.Item
                      key={option.key}
                      onClick={() => handleLiClick(option.key)}
                    >
                      {option.key}
                    </Menu.Item>
                  ))}
                </Menu>
              }
              placement="bottomLeft"
              trigger="click"
            >
              <div className="header_tabination">
                <i class="fi fi-bs-menu-dots"></i>
              </div>
            </Popover>
          </>
        ) : (
          <div className="header_tabination">
            <ul className="tab_menu">
              {filteredTabOptions.map((option) => (
                <li
                  key={option.key}
                  className={selectedTab === option.key ? "active-tab" : ""}
                  onClick={() => handleLiClick(option.key)}
                >
                  {option.key}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Header>

      {selectedTab === "Overview" && <Overview />}
      {selectedTab === "Discussion" && <DiscussionForm />}
      {selectedTab === "Tasks" && <TasksPMS flag={assigneesflag} />}
      {selectedTab === "Bugs" && <BugsPMS />}
      {selectedTab === "Notes" && <NotesPMS />}
      {selectedTab === "Files" && <FileModule />}
      {selectedTab === "Time" && <TimeForPMS />}
      {selectedTab === "Calendar" && <CalendarPMS />}

      <Modal
        title={null}
        open={manageTabs}
        footer={null}
        onCancel={() => {
          setTabsModal(false);
        }}
        className="copy-task-modal add-list-modal"
      >
        <div className="modal-header">
          <h1>Project Tabs</h1>
        </div>
        <div className="overview-modal-wrapper">
          <Form>
            <div className="topic-cancel-wrapper task-list-pop-wrapper">
              <Table
                columns={columns}
                dataSource={columnDetails}
                pagination={false}
              />
            </div>
          </Form>
          <br></br>
          <p style={{ fontWeight: "500" }}>
            Note: The tab has to be enabled in order to be default.
          </p>
        </div>
      </Modal>
      <ManagePeopleModal
        open={manageModal}
        cancel={handleCancelManageModal}
        formName={managePeopleForm}
        onFinish={handleManagePeople}
        onChange={handleChange}
        subscribersList={assignees}
        clientsList={clientList}
        type="project"
        assignees={peopleValues.assignees}
        clients={peopleValues.clients}
        manager={peopleValues.manager}
        acc_manager={peopleValues.acc_manager}
        managerList={managerList}
        accManagerList={accountManagerList}
      />
    </>
  );
}

export default memo(ProgressBoardofProject);
