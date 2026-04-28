import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Form,
  Input,
  Modal,
  Popover,
  message,
  Dropdown,
  Space,
  Tabs,
  Radio,
  Checkbox,
  Switch,
  Menu,
  Row,
  Col,
} from "antd";
import PropTypes from "prop-types";
import {
  UserOutlined,
  BellOutlined,
  CloseCircleOutlined,
  DownOutlined,
  EyeOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Link, withRouter, useHistory } from "react-router-dom";
import Service from "../../service";

import {
  userSignOut,
  showAuthLoader,
  hideAuthLoader,
} from "../../appRedux/actions/Auth";
import { setThemeType } from "../../appRedux/actions/Setting";
import { THEME_TYPE_LITE, THEME_TYPE_DARK } from "../../constants/ThemeSetting";
import { FaRegFileArchive } from "react-icons/fa";
import "./UserProfile.css";
import { useSocket } from "../../context/SocketContext";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";
import { checkNotificationType } from "../../util/NotificationTypeCheck";
import moment from "moment";
import { getRoles } from "../../util/hasPermission";
import { notificationType } from "../../settings/notificationTypes";
import { UserProfileBaseUrl } from "../../constants";
import UserProfileModal from "./UserProfileModal";

const LOCAL_PROJECT_NOTIFICATION_TYPE = "localProjectCreated";

function UserProfile() {
  const companySlug = localStorage.getItem("companyDomain");

  const { authUser } = useSelector(({ auth }) => auth);
  const { themeType } = useSelector(({ settings }) => settings);
  const history = useHistory();
  const [emailSetting] = Form.useForm();
  const dispatch = useDispatch();
  const isLightTheme = themeType === THEME_TYPE_LITE;
  const handleThemeToggle = () => {
    dispatch(setThemeType(isLightTheme ? THEME_TYPE_DARK : THEME_TYPE_LITE));
  };
  const socket = useSocket();
  const { emitEvent, listenEvent } = useSocketAction();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settingModal, setSettingModal] = useState(false);
  const [dataCount, setCountdata] = useState([]);
  const [visible, setVisible] = useState(false);
  const [flag, setflag] = useState(false);
  const [notificationData, setNotificationData] = useState([]);
  const [notificationReadData, setNotificationReadData] = useState([]);
  const [localNotificationData, setLocalNotificationData] = useState([]);
  const [activeTab, setActiveTab] = useState("unread");
  const [unReadId, setUnReadId] = useState([]);
  const { TabPane } = Tabs;
  const [selectedRadio, setSelectedRadio] = useState(null);
  const [settingsSearch, setSettingsSearch] = useState("");

  const [selectedCheckbox, setSelectedCheckbox] = useState("All");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const avatarSrc = authUser?.emp_img
    ? `${process.env.REACT_APP_API_URL}/public/${authUser.emp_img}`
    : "";

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [authUser?.emp_img]);

  const getLocalProjectNotificationKey = () =>
    `weekmate-project-notifications-${companySlug || "default"}`;

  const loadLocalProjectNotifications = () => {
    try {
      const stored = localStorage.getItem(getLocalProjectNotificationKey());
      const parsed = stored ? JSON.parse(stored) : [];
      setLocalNotificationData(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      setLocalNotificationData([]);
    }
  };

  const saveLocalProjectNotifications = (items) => {
    localStorage.setItem(getLocalProjectNotificationKey(), JSON.stringify(items));
    setLocalNotificationData(items);
  };

  const unreadNotifications = [...localNotificationData, ...notificationData];

  const handleCheckboxChange = (type) => {
    setSelectedCheckbox(type); // Update selected checkbox type
  };

  const shouldShowNotification = (type) => {
    if (selectedCheckbox === "All") {
      return true; // Show all notifications if 'All' is selected
    } else {
      // Specific logic to show notifications based on type
      switch (selectedCheckbox) {
        case "Comments":
          return type === notificationType.TASK_COMMENT_ADDED;
        case "Timesheet":
          return type === notificationType.TASK_LOGGED_HOURS;
        case "Mention":
          return (
            type === notificationType.TASK_COMMENT_ASSIGNED ||
            type === notificationType.BUG_COMMENTS ||
            type === notificationType.NOTE_COMMENTS_TAGGED_USERS ||
            type === notificationType.DISCUSSION_TAGGED_USERS
          );
        default:
          return false; // Default to not showing if none match
      }
    }
  };

  const handleRadioChange = (e) => {
    const next = e.target.value;
    setSelectedRadio(next);
    emailSetting.setFieldsValue({ notificationPreference: next });
  };
  const switchToTab = (tab) => {
    setActiveTab(tab);
  };

  const handleVisibleChange = (visible) => {
    setVisible(visible);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (authUser) {
        await emitEvent(socketEvents.GET_UNREAD_NOTIFICATIONS, {
          user_id: authUser._id,
        });

        await emitEvent(socketEvents.GET_READ_NOTIFICATIONS, {
          user_id: authUser._id,
        });

        const notificationCleanup = listenEvent(
          socketEvents.GET_UNREAD_NOTIFICATIONS,
          (data) => {
            if (isMounted) {
              setNotificationData(data?.data);
              setCountdata(data?.data?.length);
              setUnReadId(notificationData.map((item) => item?._id));
            }
          }
        );
        const notificationReadCleanUp = listenEvent(
          socketEvents.GET_READ_NOTIFICATIONS,
          (data) => {
            if (isMounted) {
              setNotificationReadData(data.data);
            }
          }
        );
        return notificationCleanup, notificationReadCleanUp;
      }
    };

    fetchData();
    loadLocalProjectNotifications();
    const notificationCleanup = listenEvent(socketEvents.NOTIFICATIONS, () => {
      setflag(!flag);
    });
    const notificationReadCleanUp = listenEvent(
      socketEvents.NOTIFICATIONS,
      () => {
        setflag(!flag);
      }
    );

    const handleLocalProjectNotification = () => {
      loadLocalProjectNotifications();
    };
    window.addEventListener("weekmate:project-notification", handleLocalProjectNotification);

    return () => {
      isMounted = false;
      window.removeEventListener("weekmate:project-notification", handleLocalProjectNotification);
      if (notificationCleanup) notificationCleanup();
      if (notificationReadCleanUp) notificationReadCleanUp();
    };
  }, [authUser, history, socket, flag, visible]);

  const notificationMarkAsRead = async (id) => {
    if (localNotificationData.some((item) => item?._id === id)) {
      saveLocalProjectNotifications(
        localNotificationData.filter((item) => item?._id !== id)
      );
      return;
    }
    await emitEvent(socketEvents.READ_NOTIFICATIONS, {
      user_id: authUser._id,
      notification_ids: [id],
    });
    setflag(!flag);
  };

  const notificationMarkAllAsRead = async () => {
    if (localNotificationData.length > 0) {
      saveLocalProjectNotifications([]);
    }
    await emitEvent(socketEvents.READ_NOTIFICATIONS, {
      user_id: authUser._id,
      notification_ids: unReadId,
    });
    setflag(!flag);
  };

  const goToModuleByNotification = async (
    id,
    notificationID,
    type,
    main_task_id,
    taskId,
    bug_id,
    logged_hours_id
  ) => {
    switch (type) {
      case "projectAssign":
        return {
          title: "Assign project",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }`
          ),
        };

      case "listAssign":
        return {
          title: "Assign new task list",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }&listID=${main_task_id}`
          ),
        };

      case "taskAssign":
        return {
          title: "Assign task",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }&listID=${main_task_id}&taskID=${taskId}`
          ),
        };

      case "taskCommentsTagged":
        return {
          title: "Mention in task comment",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }&listID=${main_task_id}&taskID=${taskId}`
          ),
        };

      case "taskCommentsAdded":
        return {
          title: "Task Comment added",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }&listID=${main_task_id}&taskID=${taskId}`
          ),
        };

      case "discussionSubscribed":
        return {
          title: "Subscribe in discussion",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }`
          ),
        };
      case "discussionTagged":
        return {
          title: "Mention in discussion",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }`
          ),
        };
      case "bugsAssigned":
        return {
          title: "Assign bug",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }&bugID=${bug_id}`
          ),
        };
      case "bugCommentsTagged":
        return {
          title: "Mention in bug",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }&bugID=${bug_id}`
          ),
        };
      case "loggedHours":
        return {
          title: "Hours logged in task",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }&loggedID=${logged_hours_id}`
          ),
        };
      case "noteSubscribed":
        return {
          title: "Subscribe in note",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }`
          ),
        };
      case "noteCommentsTagged":
        return {
          title: "Mention in note",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }`
          ),
        };
      case "fileSubscribed":
        return {
          title: "Subscribed in files",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${checkNotificationType(type).tab
            }`
          ),
        };
      default:
        return {
          title: "You have a notification",
        };
    }
  };

  const changepassword = async (value) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        oldpassword: value?.current_password,
        newPassword: value?.confirm_password,
        user_id: authUser?._id,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.pmschangepassword,
        body: reqBody,
      });
      if (response.data.statusCode === 200) {
        message.success(response?.data?.message);
        setIsModalOpen(false);
        dispatch(userSignOut());
      } else {
        message.error(response?.data?.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleOk = () => {
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };


  const emailPreference = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        api_url: Service.getSettings,
        methodName: Service.getMethod,
      });
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        let data = response?.data?.data;
        let radioValue = "Immediate";
        if (data?.never) {
          radioValue = "Never";
        } else if (data?.quarterlyMail) {
          radioValue = "four_hours";
        }
        setSelectedRadio(radioValue);
        emailSetting.setFieldsValue({
          projectAssigned: data?.project_assigned,
          discussionSubscribed: data?.discussion_subscribed,
          discussionComments: data?.discussion_tagged,
          tasklistSubscribed: data?.maintask_subscribed,
          taskAssigned: data?.task_assigned,
          taskComments: data?.task_tagged_comments,
          bugAssigned: data?.bug_assigned,
          bugComments: data?.bug_tagged_comments,
          noteAssigned: data?.note_assigned,
          noteComments: data?.note_tagged_comments,
          fileSubscribed: data?.file_subscribed,
          hoursLogged: data?.logged_hours,
          notificationPreference: radioValue,
        });
      }
    } catch (error) {
      console.log(error, "getMethod error");
    }
  };

  const handleSettings = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBodyNever = {
        never: true,
      };
      const reqBodyFour = {
        quarterlyMail: true,
      };
      const reqBody = {
        project_assigned: values?.projectAssigned || false,
        discussion_subscribed: values?.discussionSubscribed || false,
        discussion_tagged: values?.discussionComments || false,
        maintask_subscribed: values?.tasklistSubscribed || false,
        task_assigned: values?.taskAssigned || false,
        task_tagged_comments: values?.taskComments || false,
        bug_assigned: values?.bugAssigned || false,
        bug_tagged_comments: values?.bugComments || false,
        note_assigned: values?.noteAssigned || false,
        note_tagged_comments: values?.noteComments || false,
        file_subscribed: values?.fileSubscribed || false,
        logged_hours: values?.hoursLogged || false,
      };
      const response = await Service.makeAPICall({
        api_url: Service.updateSettings,
        methodName: Service.putMethod,
        body:
          values.notificationPreference == "Never"
            ? reqBodyNever
            : values.notificationPreference == "four_hours"
              ? reqBodyFour
              : reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.status === 1) {
        message.success(response?.data?.message || "Settings updated successfully");
        setSettingModal(false);
      } else {
        message.error(response?.data?.message || "Failed to update settings");
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error, "error");
      message.error("Something went wrong. Please try again.");
    }
  };
  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 10 },
    },
    wrapperCol: {
      xs: { span: 24 },
      sm: { span: 14 },
    },
  };

  const userMenuOptions = (
    <ul className="gx-user-popover">
      {authUser?._id && (
        <>
          {getRoles(["Client"]) && (
            <li onClick={() => { setUserMenuOpen(false); showModal(); }}>Change Password</li>
          )}
          {!getRoles(["Client"]) && (
            <>
              <li onClick={() => { setUserMenuOpen(false); setIsProfileModalOpen(true); }}>
                Profile
              </li>
              {/* <li onClick={() => { setUserMenuOpen(false); setSettingModal(true); setSettingsSearch(""); emailPreference(); }}>
                General Settings
              </li> */}
            </>
          )}
          {/* {getRoles(["Admin"]) && (
            <li onClick={() => setUserMenuOpen(false)}>
              <Link to={`/${companySlug}/admin/company-management`} style={{ color: "inherit" }}>
                Company Management
              </Link>
            </li>
          )} */}
          <li onClick={() => { setUserMenuOpen(false); dispatch(userSignOut()); }}>Logout</li>
        </>
      )}
    </ul>
  );

  const admin = [
    {
      label: getRoles(["Admin"]) && (
        <Link to={`/${companySlug}/workflows`}>
          <span className="setting-menu">
            {" "}
            <i className="fi fi-rr-workflow-setting-alt"></i>
            WorkFlow
          </span>
        </Link>
      ),
      key: "1",
    },
    // Departments menu item hidden
    // {
    //   label: (
    //     <Link to={`/${companySlug}/project-technologies`}>
    //       <span className="setting-menu">
    //         {" "}
    //         <i className="fi fi-rr-microchip"></i>
    //         Departments
    //       </span>
    //     </Link>
    //   ),
    //   key: "2",
    // },
    {
      label: (
        <Link to={`/${companySlug}/manage-project-type`}>
          <span className="setting-menu">
            <i className="fi fi-rs-workflow-alt"></i>
            Categories
          </span>
        </Link>
      ),
      key: "3",
    },
    {
      label: (
        <Link to={`/${companySlug}/project-status`}>
          <span className="setting-menu">
            <FaRegFileArchive />
            Status
          </span>
        </Link>
      ),
      key: "4",
    },
    {
      label: (
        <Link to={`/${companySlug}/project-labels`}>
          <span className="setting-menu">
            <FaRegFileArchive />
            Labels
          </span>
        </Link>
      ),
      key: "5",
    },
    {
      label: (
        <Link to={`/${companySlug}/resources`}>
          <span className="setting-menu">
            {" "}
            <i className="fi fi-rr-poll-h"></i>
            Resource
          </span>
        </Link>
      ),
      key: "6",
    },

    {
      label: (
        <Link to={`/${companySlug}/project-archieved`}>
          <span className="setting-menu">
            {" "}
            <i className="fi fi-rr-poll-h"></i>
            Archived Project
          </span>
        </Link>
      ),
      key: "7",
    },
    {
      label: (
        <Link to={`/${companySlug}/trash`}>
          <span className="setting-menu">
            {" "}
            <i class="fa fa-trash-o"></i>
            Trash
          </span>
        </Link>
      ),
      key: "8",
    },
  ];

  const user = [
    {
      label: (
        <Link to={`/${companySlug}/project-archieved`}>
          <span className="setting-menu">
            {" "}
            <i className="fi fi-rr-poll-h"></i>
            Archived Project
          </span>
        </Link>
      ),
      key: "7",
    },
  ];

  const passwordRules = [
    {
      required: true,
      message: "Please enter Password",
    },
    {
      validator: (_, value) => {
        if (!value) {
          return Promise.resolve();
        }

        const passwordPattern =
          /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

        if (!passwordPattern.test(value)) {
          return Promise.reject(
            new Error(
              "Password must be 8-20 char long & uppercase letter, lowercase letter, number, special character"
            )
          );
        }

        return Promise.resolve();
      },
    },
  ];

  return (
    <>
      <div className="main-heading">
        <div className="head-title"></div>
        <div className="header-wrapper">
          <div className="gx-flex-row gx-align-items-center gx-avatar-row">
            {!getRoles(["Client"]) && (
              <Dropdown
                menu={{
                  items: getRoles(["Admin"]) ? admin : user,
                }}
                trigger={["click"]}
              >
                <a onClick={(e) => e.preventDefault()}>
                  <Space>
                    <div className="search-pms">
                      <i className="fi fi-rr-settings width-18"></i>
                    </div>
                    <DownOutlined />
                  </Space>
                </a>
              </Dropdown>
            )}

            {/* <button
              type="button"
              className={`taskpad-theme-toggle ${isLightTheme ? "theme-light" : "theme-dark"}`}
              onClick={handleThemeToggle}
              aria-label={isLightTheme ? "Switch to dark theme" : "Switch to light theme"}
              title={isLightTheme ? "Switch to dark theme" : "Switch to light theme"}
            >
              <span className="taskpad-theme-sun" aria-hidden>☀</span>
              <span className="taskpad-theme-moon" aria-hidden>🌙</span>
              <span className="taskpad-theme-knob" />
            </button> */}

            <Popover
              placement="bottomRight"
              visible={visible}
              onVisibleChange={handleVisibleChange}
              overlayClassName="weekmate-notification-popover"
              content={
                <div>
                  <div className="notifiction-pop">
                    <Tabs
                      activeKey={activeTab}
                      defaultActiveKey="unread"
                      onChange={switchToTab}
                      tabBarExtraContent={
                        <Dropdown
                          overlay={
                            <Menu>
                              <Menu.Item
                                onClick={() => {
                                  notificationMarkAllAsRead();
                                }}
                              >
                                Mark all as read
                              </Menu.Item>
                            </Menu>
                          }
                        >
                          <MoreOutlined
                            style={{ fontSize: "16px", cursor: "pointer" }}
                          />
                        </Dropdown>
                      }
                    >
                      <TabPane key="unread" tab="Unread">
                        <div className="notidication-modal">
                          {notificationData.length > 0 ? (
                            <div className="filter-notification-checkbox">
                              <ul>
                                <li
                                  className={`${selectedCheckbox === "All" ? "active" : ""
                                    }`}
                                  onClick={() => handleCheckboxChange("All")}
                                >
                                  All
                                </li>
                                <li
                                  onClick={() =>
                                    handleCheckboxChange("Comments")
                                  }
                                  className={`${selectedCheckbox === "Comments"
                                      ? "active"
                                      : ""
                                    }`}
                                >
                                  Comments
                                </li>
                                <li
                                  onClick={() =>
                                    handleCheckboxChange("Timesheet")
                                  }
                                  className={`${selectedCheckbox === "Timesheet"
                                      ? "active"
                                      : ""
                                    }`}
                                >
                                  Timesheet
                                </li>
                                <li
                                  onClick={() =>
                                    handleCheckboxChange("Mention")
                                  }
                                  className={`${selectedCheckbox === "Mention"
                                      ? "active"
                                      : ""
                                    }`}
                                >
                                  Mention
                                </li>
                              </ul>
                            </div>
                          ) : (
                            <></>
                          )}

                          <ul>
                            {unreadNotifications.length > 0 ? (
                              unreadNotifications.filter((ele) => {
                                // Filter notifications based on selected checkbox and type
                                return (
                                  (selectedCheckbox === "All" &&
                                    ![
                                      "Comments",
                                      "Timesheet",
                                      "Mention",
                                    ].includes(ele.type)) ||
                                  shouldShowNotification(ele.type)
                                );
                              }).length > 0 ? (
                                unreadNotifications.map((ele, index) => {
                                  // Check if the notification should be shown based on selected checkbox and type
                                  if (
                                    (selectedCheckbox === "All" &&
                                      ![
                                        "Comments",
                                        "Timesheet",
                                        "Mention",
                                      ].includes(ele.type)) ||
                                    shouldShowNotification(ele.type)
                                  ) {
                                    return (
                                      <li key={index}>
                                        <div className="notification-content-wrapper">
                                          <h3>
                                            {ele?.localTitle ||
                                              checkNotificationType(ele?.type)
                                                ?.title || "New Notification"}
                                          </h3>
                                          <div>
                                            <button
                                              onClick={() => {
                                                notificationMarkAsRead(
                                                  ele?._id
                                                );
                                                if (ele?.type === LOCAL_PROJECT_NOTIFICATION_TYPE) {
                                                  history.push(
                                                    `/${companySlug}/project/app/${ele?.project_id}?tab=Overview`
                                                  );
                                                } else {
                                                  goToModuleByNotification(
                                                    ele?.project_id,
                                                    ele?._id,
                                                    ele?.type,
                                                    ele?.main_task_id,
                                                    ele?.task_id,
                                                    ele?.bug_id,
                                                    ele?.logged_hours_id
                                                  );
                                                }
                                                setVisible(false);
                                              }}
                                            >
                                              <EyeOutlined />
                                            </button>
                                            <button
                                              onClick={() =>
                                                notificationMarkAsRead(ele?._id)
                                              }
                                            >
                                              <CloseCircleOutlined />
                                            </button>
                                          </div>
                                        </div>
                                        <p>{ele?.message}</p>
                                        <div className="notification-time">
                                          {moment(ele?.createdAt).fromNow()}
                                        </div>
                                      </li>
                                    );
                                  } else {
                                    return null; // Skip rendering if type doesn't match selected checkbox or isn't one of the specified types
                                  }
                                })
                              ) : (
                                <p
                                  style={{
                                    color: "gray",
                                    display: "flex",
                                    justifyContent: "center",
                                  }}
                                >
                                  No Data
                                </p>
                              )
                            ) : (
                              <p
                                style={{
                                  color: "gray",
                                  display: "flex",
                                  justifyContent: "center",
                                }}
                              >
                                No Data
                              </p>
                            )}
                          </ul>
                        </div>
                      </TabPane>
                      <TabPane key="read" tab="Read">
                        <div className="notidication-modal">
                          {notificationReadData.length > 0 ? (
                            <div className="filter-notification-checkbox">
                              <ul>
                                <li
                                  className={`${selectedCheckbox === "All" ? "active" : ""
                                    }`}
                                  onClick={() => handleCheckboxChange("All")}
                                >
                                  All
                                </li>
                                <li
                                  onClick={() =>
                                    handleCheckboxChange("Comments")
                                  }
                                  className={`${selectedCheckbox === "Comments"
                                      ? "active"
                                      : ""
                                    }`}
                                >
                                  Comments
                                </li>
                                <li
                                  onClick={() =>
                                    handleCheckboxChange("Timesheet")
                                  }
                                  className={`${selectedCheckbox === "Timesheet"
                                      ? "active"
                                      : ""
                                    }`}
                                >
                                  Timesheet
                                </li>
                                <li
                                  onClick={() =>
                                    handleCheckboxChange("Mention")
                                  }
                                  className={`${selectedCheckbox === "Mention"
                                      ? "active"
                                      : ""
                                    }`}
                                >
                                  Mention
                                </li>
                              </ul>
                            </div>
                          ) : (
                            <></>
                          )}

                          <ul>
                            {notificationReadData.length > 0 ? (
                              notificationReadData.filter((ele) => {
                                // Filter notifications based on selected checkbox and type
                                return (
                                  (selectedCheckbox === "All" &&
                                    ![
                                      "Comments",
                                      "Timesheet",
                                      "Mention",
                                    ].includes(ele.type)) ||
                                  shouldShowNotification(ele.type)
                                );
                              }).length > 0 ? (
                                notificationReadData.map((ele, index) => {
                                  // Check if the notification should be shown based on selected checkbox and type
                                  if (
                                    (selectedCheckbox === "All" &&
                                      ![
                                        "Comments",
                                        "Timesheet",
                                        "Mention",
                                      ].includes(ele.type)) ||
                                    shouldShowNotification(ele.type)
                                  ) {
                                    return (
                                      <li key={index}>
                                        <div className="notification-content-wrapper">
                                          <h3>
                                            {checkNotificationType(ele?.type)
                                              ?.title || "New Notification"}
                                          </h3>
                                          <div>
                                            <button
                                              onClick={() => {
                                                goToModuleByNotification(
                                                  ele?.project_id,
                                                  ele?._id,
                                                  ele?.type,
                                                  ele?.main_task_id,
                                                  ele?.task_id,
                                                  ele?.bug_id,
                                                  ele?.logged_hours_id
                                                );
                                                notificationMarkAsRead(
                                                  ele?._id
                                                );
                                                setVisible(false);
                                              }}
                                            >
                                              <EyeOutlined />
                                            </button>
                                          </div>
                                        </div>
                                        <p>{ele?.message}</p>
                                        <div className="notification-time">
                                          {moment(ele?.createdAt).fromNow()}
                                        </div>
                                      </li>
                                    );
                                  } else {
                                    return null; // Skip rendering if type doesn't match selected checkbox or isn't one of the specified types
                                  }
                                })
                              ) : (
                                <p
                                  style={{
                                    color: "gray",
                                    display: "flex",
                                    justifyContent: "center",
                                  }}
                                >
                                  No Data
                                </p>
                              )
                            ) : (
                              <p
                                style={{
                                  color: "gray",
                                  display: "flex",
                                  justifyContent: "center",
                                }}
                              >
                                No Data
                              </p>
                            )}
                          </ul>
                        </div>
                      </TabPane>
                    </Tabs>
                  </div>
                </div>
              }
              trigger="click"
            >
              <div className="bell-icon">
                <BellOutlined />
                {unreadNotifications.length > 0 && (
                  <span className="count">{unreadNotifications.length}</span>
                )}
              </div>
            </Popover>

            <Popover
              placement="bottomRight"
              content={userMenuOptions}
              trigger="click"
              open={userMenuOpen}
              onOpenChange={setUserMenuOpen}
              className="user-profile"
              overlayClassName="wm-user-menu-popover"
            >
              <div className="user-pill">
                {avatarSrc && !avatarLoadFailed ? (
                  <img
                    src={avatarSrc}
                    className="avatar-user"
                    alt="User"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <span className="avatar-user avatar-user-fallback" aria-label="User">
                    <UserOutlined />
                  </span>
                )}
                <span className="user-pill-name">
                  {authUser?.full_name ||
                    authUser?.name ||
                    (companySlug ? companySlug.replace(/-/g, " ") : "User")}
                </span>
                <DownOutlined className="user-pill-caret" />
              </div>
            </Popover>

            <Modal
              footer={false}
              visible={isModalOpen}
              onOk={handleOk}
              onCancel={handleCancel}
            >
              <div className="modal-header">
                <h1>Change Password</h1>
              </div>
              <div className="overview-modal-wrapper">
                <Form
                  onFinish={(values) => {
                    changepassword(values);
                  }}
                  {...formItemLayout}
                >
                  <div className="topic-cancel-wrapper">
                    <Form.Item
                      label="Current Password"
                      name="current_password"
                      className="search-row"
                      rules={[
                        {
                          required: true,
                          message: "Please enter Current Password!",
                        },
                      ]}
                    >
                      <Input.Password />
                    </Form.Item>
                    <Form.Item
                      label="New Password"
                      name="new_password"
                      className="search-row"
                      rules={passwordRules}
                    >
                      <Input.Password />
                    </Form.Item>
                    <Form.Item
                      label="Confirm Password"
                      name="confirm_password"
                      className="search-row"
                      rules={[
                        {
                          required: true,
                          message: "Please enter Confirm Password!",
                        },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (
                              !value ||
                              getFieldValue("new_password") === value
                            ) {
                              return Promise.resolve();
                            }
                            return Promise.reject(
                              "The confirm passwords that you entered do not match!"
                            );
                          },
                        }),
                      ]}
                    >
                      <Input.Password />
                    </Form.Item>
                    <div className="modal-footer-flex">
                      <div className="flex-btn">
                        <Button
                          key="back"
                          type="primary"
                          className="ant-delete"
                          onClick={handleCancel}
                        >
                          Cancel
                        </Button>
                        <Button type="primary" htmlType="submit">
                          Change Password
                        </Button>
                      </div>
                    </div>
                  </div>
                </Form>
              </div>
            </Modal>

            <Modal
              className="setting-main-wrapper wm-settings-modal"
              open={settingModal}
              width={820}
              centered
              destroyOnClose
              maskClosable={false}
              onCancel={() => {
                setSettingModal(false);
              }}
              title={
                <>

                  <h2>Settings</h2>
                  <h5 className="modal-subtitle">
                    Control how you receive email notifications.
                  </h5>

                </>
              }
              footer={[
                <Button

                  key="cancel"
                  onClick={() => {
                    setSettingModal(false);
                    setSettingsSearch("");
                  }}
                  className="delete-btn"
                >
                  Cancel
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  htmlType="submit"
                  className="add-btn"
                  onClick={() => emailSetting.submit()}
                >
                  Save 
                </Button>,
              ]}
            >
              <Form onFinish={handleSettings} form={emailSetting} className="wm-settings__form">
                <Row gutter={[16, 16]}>

                  {/* LEFT SECTION */}
                  <Col xs={24} md={10}>
                    <div className="wm-settings__left">
                      <div className="wm-settings__sectionTitle">Email Delivery</div>

                      <Form.Item name="notificationPreference" className="wm-settings__radioWrap">
                        <Radio.Group
                          onChange={handleRadioChange}
                          value={selectedRadio}
                          className="wm-settings__radioGroup"
                        >
                          <label className={`wm-settings__radioCard ${selectedRadio === "Never" ? "active" : ""}`}>
                            <Radio value="Never" />
                            <div>
                              <div className="wm-settings__radioTitle">Never</div>
                              <div className="wm-settings__radioDesc">
                                Don’t send me email notifications.
                              </div>
                            </div>
                          </label>

                          <label className={`wm-settings__radioCard ${selectedRadio === "four_hours" ? "active" : ""}`}>
                            <Radio value="four_hours" />
                            <div>
                              <div className="wm-settings__radioTitle">Every 4 hours</div>
                              <div className="wm-settings__radioDesc">
                                Send me a digest email every four hours.
                              </div>
                            </div>
                          </label>

                          <label className={`wm-settings__radioCard ${selectedRadio === "Immediate" ? "active" : ""}`}>
                            <Radio value="Immediate" />
                            <div>
                              <div className="wm-settings__radioTitle">Immediate</div>
                              <div className="wm-settings__radioDesc">
                                Send emails as soon as things happen.
                              </div>
                            </div>
                          </label>
                        </Radio.Group>
                      </Form.Item>

                      <div className="wm-settings__hint">
                        {selectedRadio !== "Immediate"
                          ? "Event-level toggles are available only for Immediate emails."
                          : "Choose what should trigger an email."}
                      </div>
                    </div>
                  </Col>

                  {/* RIGHT SECTION */}
                  <Col xs={24} md={14}>
                    <div className="wm-settings__right">

                      <Row gutter={[12, 12]} className="wm-settings__rightTop">
                        <Col xs={24}>
                          <div className="wm-settings__sectionTitle">Event Triggers</div>
                        </Col>

                        <Col xs={24}>
                          <Input
                            placeholder="Search triggers..."
                            value={settingsSearch}
                            onChange={(e) => setSettingsSearch(e.target.value)}
                            allowClear
                            className="wm-settings__search"
                          />
                        </Col>

                        <Col xs={24}>
                          <div className="wm-settings__bulkActions">
                            <Button
                              type="link"
                              disabled={selectedRadio !== "Immediate"}
                              onClick={() => {
                                const next = {
                                  projectAssigned: true,
                                  discussionSubscribed: true,
                                  discussionComments: true,
                                  tasklistSubscribed: true,
                                  taskAssigned: true,
                                  taskComments: true,
                                  bugAssigned: true,
                                  bugComments: true,
                                  noteAssigned: true,
                                  noteComments: true,
                                  fileSubscribed: true,
                                };
                                if (getRoles(["PC", "TL", "Admin"])) next.hoursLogged = true;
                                emailSetting.setFieldsValue(next);
                              }}
                            >
                              Enable all
                            </Button>

                            <Button
                              type="link"
                              disabled={selectedRadio !== "Immediate"}
                              onClick={() => {
                                const next = {
                                  projectAssigned: false,
                                  discussionSubscribed: false,
                                  discussionComments: false,
                                  tasklistSubscribed: false,
                                  taskAssigned: false,
                                  taskComments: false,
                                  bugAssigned: false,
                                  bugComments: false,
                                  noteAssigned: false,
                                  noteComments: false,
                                  fileSubscribed: false,
                                  hoursLogged: false,
                                };
                                emailSetting.setFieldsValue(next);
                              }}
                            >
                              Clear
                            </Button>
                          </div>
                        </Col>
                      </Row>

                      <div className="wm-settings__list">
                        {[
                          {
                            group: "Projects",
                            items: [{ name: "projectAssigned", label: "A project is assigned to me" }],
                          },
                          {
                            group: "Discussions",
                            items: [
                              { name: "discussionSubscribed", label: "A discussion is subscribed to me" },
                              { name: "discussionComments", label: "Somebody has mentioned me in discussion" },
                            ],
                          },
                          {
                            group: "Tasks",
                            items: [
                              { name: "tasklistSubscribed", label: "A tasklist is subscribed to me" },
                              { name: "taskAssigned", label: "A task is assigned to me" },
                              { name: "taskComments", label: "Somebody has mentioned me in task comments" },
                            ],
                          },
                          {
                            group: "Bugs",
                            items: [
                              { name: "bugAssigned", label: "A bug is assigned to me" },
                              { name: "bugComments", label: "Somebody has mentioned me in bug comments" },
                            ],
                          },
                          {
                            group: "Notes",
                            items: [
                              { name: "noteAssigned", label: "A note is assigned to me" },
                              { name: "noteComments", label: "Somebody has mentioned me in notes comments" },
                            ],
                          },
                          {
                            group: "Files",
                            items: [{ name: "fileSubscribed", label: "A file is subscribed to me" }],
                          },
                          ...(getRoles(["PC", "TL", "Admin"])
                            ? [
                              {
                                group: "Timesheet",
                                items: [{ name: "hoursLogged", label: "Somebody has logged hours" }],
                              },
                            ]
                            : []),
                        ]
                          .map((g) => ({
                            ...g,
                            items: g.items.filter((it) =>
                              settingsSearch?.trim()
                                ? it.label.toLowerCase().includes(settingsSearch.trim().toLowerCase())
                                : true
                            ),
                          }))
                          .filter((g) => g.items.length > 0)
                          .map((g) => (
                            <div key={g.group} className="wm-settings__group">
                              <div className="wm-settings__groupTitle">{g.group}</div>
                              <div className="wm-settings__groupBody">
                                {g.items.map((it) => (
                                  <div
                                    key={it.name}
                                    className={`wm-settings__row ${selectedRadio !== "Immediate" ? "disabled" : ""
                                      }`}
                                  >
                                    <div className="wm-settings__rowLabel">{it.label}</div>
                                    <Form.Item name={it.name} valuePropName="checked" noStyle>
                                      <Switch size="small" disabled={selectedRadio !== "Immediate"} />
                                    </Form.Item>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                        {settingsSearch?.trim() && (
                          <div className="wm-settings__emptyNote">
                            No triggers match your search.
                          </div>
                        )}
                      </div>
                    </div>
                  </Col>

                </Row>
              </Form>
            </Modal>
            <UserProfileModal
              isModalOpen={isProfileModalOpen}
              handleClose={() => setIsProfileModalOpen(false)}
            />
          </div>
        </div>
      </div>
    </>
  );
}

UserProfile.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }).isRequired,
};

export default withRouter(UserProfile);
