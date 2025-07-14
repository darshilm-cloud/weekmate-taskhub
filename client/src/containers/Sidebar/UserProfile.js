import React, { useEffect, useRef, useState } from "react";
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
  Menu,
} from "antd";
import PropTypes from "prop-types";
import {
  CloseCircleOutlined,
  CloseOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  EyeTwoTone,
  MoreOutlined,
  TrophyOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import ProfileImage from "../../assets/images/default_profile.jpg";
import { Link, withRouter, useHistory } from "react-router-dom";
import Service from "../../service";

import {
  userSignOut,
  showAuthLoader,
  hideAuthLoader,
} from "../../appRedux/actions/Auth";
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

function UserProfile() {
  const companySlug = localStorage.getItem("companyDomain");

  const { authUser } = useSelector(({ auth }) => auth);
  const history = useHistory();
  const [emailSetting] = Form.useForm();
  const [apiDetailSetting] = Form.useForm();
  const [generalSetting] = Form.useForm();
  const dispatch = useDispatch();
  const socket = useSocket();
  const { emitEvent, listenEvent, showBrowserNotification } = useSocketAction();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settingModal, setSettingModal] = useState(false);
  const [dataCount, setCountdata] = useState([]);
  const [visible, setVisible] = useState(false);
  const [flag, setflag] = useState(false);
  const [notificationData, setNotificationData] = useState([]);
  const [notificationReadData, setNotificationReadData] = useState([]);
  const [activeTab, setActiveTab] = useState("unread");
  const [unReadId, setUnReadId] = useState([]);
  const { TabPane } = Tabs;
  const [selectedRadio, setSelectedRadio] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiId, setApiId] = useState("");
  const [logoModeRadio, setLogoModeRadio] = useState();
  const [fileLists, setFileLists] = useState({
    login_logo: null,
    header_logo: null,
    fav_logo: null,
  });
  const attachmentfileRefs = {
    login_logo: useRef(null),
    header_logo: useRef(null),
    fav_logo: useRef(null),
  };
  const [generalApp, setGeneralApp] = useState([]);
  const [generalAdd, setGeneralAdd] = useState([]);
  const [tempurl, setTempUrl] = useState({
    login_logo: null,
    header_logo: null,
    fav_logo: null,
  });
  const [selectedCheckbox, setSelectedCheckbox] = useState("All");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

  const handleTabChange = (activeKey) => {
    if (activeKey == 2) {
      getApiKey();
    }
  };

  const dimensionConstraints = {
    login_logo: { width: 250, height: 50 },
    header_logo: { width: 135, height: 25 },
    fav_logo: { width: 16, height: 16 },
  };

  const handleFileChange = async (e, itemName) => {
    const file = e.target.files[0];
    const allowedExtensions = ["png", "jpg", "jpeg", "svg", "ico"];
    const extension = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      message.error(
        `File "${file.name}" is not a valid image format. Please select PNG, JPG, JPEG, or SVG file.`
      );
      return;
    }

    const dimensions = await getImageDimensions(file);
    const constraints = dimensionConstraints[itemName];
    if (!constraints) {
      message.error(`No dimension constraints found for item "${itemName}".`);
      return;
    }

    if (
      dimensions.width !== constraints.width ||
      dimensions.height !== constraints.height
    ) {
      message.error(`Image "${itemName}" must be exactly ${constraints.width}x${constraints.height} pixels.
       The uploaded image is ${dimensions.width}x${dimensions.height} pixels.
       `);
      return;
    }

    setFileLists((prevLists) => ({
      ...prevLists,
      [itemName]: file,
    }));

    setTempUrl((prevUrls) => ({
      ...prevUrls,
      [itemName]: URL.createObjectURL(file),
    }));
  };

  // Helper function to get image dimensions
  const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleRemoveFile = (itemName) => {
    setFileLists((prevLists) => ({
      ...prevLists,
      [itemName]: null,
    }));
    setTempUrl((prevUrls) => ({
      ...prevUrls,
      [itemName]: null,
    }));
    if (attachmentfileRefs[itemName].current) {
      attachmentfileRefs[itemName].current.value = null;
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleRadioChange = (e) => {
    setSelectedRadio(e.target.value);
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
              setNotificationData(data.data);
              setCountdata(data.data.length);
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
    const notificationCleanup = listenEvent(socketEvents.NOTIFICATIONS, () => {
      setflag(!flag);
    });
    const notificationReadCleanUp = listenEvent(
      socketEvents.NOTIFICATIONS,
      () => {
        setflag(!flag);
      }
    );

    return () => {
      isMounted = false;
      if (notificationCleanup) notificationCleanup();
      if (notificationReadCleanUp) notificationReadCleanUp();
    };
  }, [authUser, history, socket, flag, visible]);

  const notificationMarkAsRead = async (id) => {
    await emitEvent(socketEvents.READ_NOTIFICATIONS, {
      user_id: authUser._id,
      notification_ids: [id],
    });
    setflag(!flag);
  };

  const notificationMarkAllAsRead = async () => {
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
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }`
          ),
        };

      case "listAssign":
        return {
          title: "Assign new task list",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }&listID=${main_task_id}`
          ),
        };

      case "taskAssign":
        return {
          title: "Assign task",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }&listID=${main_task_id}&taskID=${taskId}`
          ),
        };

      case "taskCommentsTagged":
        return {
          title: "Mention in task comment",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }&listID=${main_task_id}&taskID=${taskId}`
          ),
        };

      case "taskCommentsAdded":
        return {
          title: "Task Comment added",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }&listID=${main_task_id}&taskID=${taskId}`
          ),
        };

      case "discussionSubscribed":
        return {
          title: "Subscribe in discussion",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }`
          ),
        };
      case "discussionTagged":
        return {
          title: "Mention in discussion",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }`
          ),
        };
      case "bugsAssigned":
        return {
          title: "Assign bug",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }&bugID=${bug_id}`
          ),
        };
      case "bugCommentsTagged":
        return {
          title: "Mention in bug",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }&bugID=${bug_id}`
          ),
        };
      case "loggedHours":
        return {
          title: "Hours logged in task",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }&loggedID=${logged_hours_id}`
          ),
        };
      case "noteSubscribed":
        return {
          title: "Subscribe in note",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }`
          ),
        };
      case "noteCommentsTagged":
        return {
          title: "Mention in note",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
            }`
          ),
        };
      case "fileSubscribed":
        return {
          title: "Subscribed in files",
          url: history.push(
            `/${companySlug}/project/app/${id}?tab=${
              checkNotificationType(type).tab
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

  const handleResetApi = () => {
    const generateRandomKey = () => {
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < 25; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
      }
      return result;
    };
    const newApiKey = generateRandomKey();
    setApiKey(newApiKey);
    updateApiKey(newApiKey, apiId);
  };

  const uploadFiles = async (files, type) => {
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("document", file);
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileUpload}?file_for=${type}`,
        body: formData,
        options: {
          "content-type": "multipart/form-data",
        },
      });
      return response?.data?.data;
    } catch (error) {
      console.log(error);
    }
  };

  const handlegeneralSetting = async (values) => {
    const fileAttachment = Object.keys(fileLists)
      .map((key) => ({ key, file: fileLists[key] }))
      .filter(({ file }) => file instanceof File);
    const uploadedPaths = {};

    if (fileAttachment.length > 0) {
      const filesToUpload = fileAttachment.map(({ file }) => file);
      const uploadedFiles = await uploadFiles(filesToUpload, "appSetting");

      if (uploadedFiles.length > 0) {
        fileAttachment.forEach(({ key }, index) => {
          uploadedPaths[key] = uploadedFiles[index].file_path;
        });
      } else {
        return message.error("File not uploaded, something went wrong");
      }
    }

    try {
      dispatch(showAuthLoader());
      const reqBody = {
        title: values.title,
        fav_icon: uploadedPaths.fav_logo || fileLists.fav_logo.name,
        logo_mode: values.logo_mode || logoModeRadio,
        login_logo: uploadedPaths.login_logo || fileLists.fav_logo.name,
        header_logo: uploadedPaths.header_logo || fileLists.fav_logo.name,
      };

      const response = await Service.makeAPICall({
        api_url: Service.addGeneralSetting,
        methodName: Service.postMethod,
        body: reqBody,
      });

      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setGeneralAdd(response?.data?.data);
        generalSettingApp();

        console.log(generalAdd, "add edit api response");
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error, "add general setting error");
    }
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

  const getApiKey = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        api_url: Service.getApiKey,
        methodName: Service.getMethod,
      });
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setApiKey(response?.data?.data?.api_key);
        setApiId(response?.data?.data?._id);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error, "getMethod error");
    }
  };

  const generalSettingApp = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        api_url: Service.getGeneralSetting,
        methodName: Service.getMethod,
      });
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setGeneralApp(response?.data?.data);
        generalSetting.setFieldValue({
          title: response?.data?.data?.title,
        });
        setFileLists({
          fav_logo: response.data.data.fav_icon
            ? {
                name: response.data.data.fav_icon,
                url: response.data.data.fav_icon,
              }
            : null,
          login_logo: response.data.data.login_logo
            ? {
                name: response.data.data.login_logo,
                url: response.data.data.login_logo,
              }
            : null,
          header_logo: response.data.data.header_logo
            ? {
                name: response.data.data.header_logo,
                url: response.data.data.header_logo,
              }
            : null,
        });
        setLogoModeRadio(response.data.data.logo_mode);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error, "getGeneral setting error");
    }
  };

  const updateApiKey = async (newKey, apiId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        api_url: Service.updateApiKey,
        methodName: Service.putMethod,
        body: {
          id: apiId,
          api_key: newKey,
          key_for: "hrmstimesync",
        },
      });
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setApiKey(response?.data?.data?.api_key);
        message.success(response?.data?.message);
        getApiKey();
      }
    } catch (error) {
      console.log(error, "putmethod error");
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
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setSettingModal(false);
      }
    } catch (error) {
      console.log(error, "error");
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
          {getRoles(["Client"]) && <li onClick={showModal}>Change Password</li>}
          {!getRoles(["Client"]) && (
            <>
            <li
              onClick={() => {
                setIsProfileModalOpen(true);
              }}
            >
              Profile
            </li>
            <li
              onClick={() => {
                setSettingModal(true);
                emailPreference();
                generalSettingApp();
              }}
            >
              General Settings
            </li>
            </>
          )}

          <li onClick={() => dispatch(userSignOut())}>Logout</li>
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
    {
      label: (
        <Link to={`/${companySlug}/project-technologies`}>
          <span className="setting-menu">
            {" "}
            <i className="fi fi-rr-microchip"></i>
            Technologies
          </span>
        </Link>
      ),
      key: "2",
    },
    {
      label: (
        <Link to={`/${companySlug}/manage-project-type`}>
          <span className="setting-menu">
            <i className="fi fi-rs-workflow-alt"></i>
            Project Types
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

            <Popover
              placement="bottomRight"
              visible={visible}
              onVisibleChange={handleVisibleChange}
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
                                  className={`${
                                    selectedCheckbox === "All" ? "active" : ""
                                  }`}
                                  onClick={() => handleCheckboxChange("All")}
                                >
                                  All
                                </li>
                                <li
                                  onClick={() =>
                                    handleCheckboxChange("Comments")
                                  }
                                  className={`${
                                    selectedCheckbox === "Comments"
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
                                  className={`${
                                    selectedCheckbox === "Timesheet"
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
                                  className={`${
                                    selectedCheckbox === "Mention"
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
                            {notificationData.length > 0 ? (
                              notificationData.filter((ele) => {
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
                                notificationData.map((ele, index) => {
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
                                                notificationMarkAsRead(
                                                  ele?._id
                                                );
                                                goToModuleByNotification(
                                                  ele?.project_id,
                                                  ele?._id,
                                                  ele?.type,
                                                  ele?.main_task_id,
                                                  ele?.task_id,
                                                  ele?.bug_id,
                                                  ele?.logged_hours_id
                                                );
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
                                  className={`${
                                    selectedCheckbox === "All" ? "active" : ""
                                  }`}
                                  onClick={() => handleCheckboxChange("All")}
                                >
                                  All
                                </li>
                                <li
                                  onClick={() =>
                                    handleCheckboxChange("Comments")
                                  }
                                  className={`${
                                    selectedCheckbox === "Comments"
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
                                  className={`${
                                    selectedCheckbox === "Timesheet"
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
                                  className={`${
                                    selectedCheckbox === "Mention"
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
                <i className="fi fi-rr-bell width-18"></i>
                {dataCount > 0 && <span className="count">{dataCount}</span>}
              </div>
            </Popover>

            <Popover
              placement="bottomRight"
              content={userMenuOptions}
              trigger="click"
              className="user-profile"
            >
              <div>
                <img
                  src={
                    authUser?.emp_img
                      ? `${process.env.REACT_APP_API_URL}/public/${authUser.emp_img}`
                      : ProfileImage
                  }
                  className="avatar-user"
                  alt="User"
                />
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
              className="setting-main-wrapper"
              footer={false}
              visible={settingModal}
              onOk={() => {
                setSettingModal(false);
              }}
              onCancel={() => {
                setSettingModal(false);
              }}
            >
              <div className="modal-header">
                <h1>Settings</h1>
              </div>
              <Tabs onChange={handleTabChange}>
                <TabPane key="1" tab="Email Preference">
                  <div className="overview-modal-wrapper">
                    <Form onFinish={handleSettings} form={emailSetting}>
                      <div className="topic-cancel-wrapper">
                        <Form.Item name="notificationPreference">
                          <Radio.Group
                            onChange={handleRadioChange}
                            value={selectedRadio}
                          >
                            <ul className="no-bullets">
                              <li>
                                <Radio value="Never" name="never">
                                  <strong>Never</strong> send me email
                                  notification
                                </Radio>
                              </li>
                              <li>
                                <Radio value="four_hours" name="four_hours">
                                  Send me email digest after{" "}
                                  <strong>every four hours</strong>
                                </Radio>
                              </li>
                              <li>
                                <Radio value="Immediate">
                                  <strong>Immediately</strong> send me email
                                  notification
                                </Radio>
                              </li>
                            </ul>
                          </Radio.Group>
                        </Form.Item>
                        <div style={{ paddingLeft: "70px" }}>
                          <ul className="no-bullets">
                            <Form.Item
                              name="projectAssigned"
                              valuePropName="checked"
                            >
                              <Checkbox
                                disabled={selectedRadio !== "Immediate"}
                              >
                                A project is assigned to me
                              </Checkbox>
                            </Form.Item>
                            <Form.Item
                              name="discussionSubscribed"
                              valuePropName="checked"
                            >
                              <Checkbox
                                disabled={selectedRadio !== "Immediate"}
                              >
                                A Discussion is subscribed to me
                              </Checkbox>
                            </Form.Item>
                            <Form.Item
                              name="discussionComments"
                              valuePropName="checked"
                            >
                              <Checkbox
                                disabled={selectedRadio !== "Immediate"}
                              >
                                Somebody has mentioned me in discussion
                              </Checkbox>
                            </Form.Item>
                            <Form.Item
                              name="tasklistSubscribed"
                              valuePropName="checked"
                            >
                              <Checkbox
                                disabled={selectedRadio !== "Immediate"}
                              >
                                A tasklist is subscribed to me
                              </Checkbox>
                            </Form.Item>
                            <Form.Item
                              name="taskAssigned"
                              valuePropName="checked"
                            >
                              <Checkbox
                                disabled={selectedRadio !== "Immediate"}
                              >
                                A task is assigned to me
                              </Checkbox>
                            </Form.Item>
                            <ul className="no-bullets">
                              <Form.Item
                                name="taskComments"
                                valuePropName="checked"
                              >
                                <Checkbox
                                  disabled={selectedRadio !== "Immediate"}
                                >
                                  Somebody has mentioned me in task comments
                                </Checkbox>
                              </Form.Item>
                            </ul>
                            <Form.Item
                              name="bugAssigned"
                              valuePropName="checked"
                            >
                              <Checkbox
                                disabled={selectedRadio !== "Immediate"}
                              >
                                A bug is assigned to me
                              </Checkbox>
                            </Form.Item>
                            <ul className="no-bullets">
                              <Form.Item
                                name="bugComments"
                                valuePropName="checked"
                              >
                                <Checkbox
                                  disabled={selectedRadio !== "Immediate"}
                                >
                                  Somebody has mentioned me in bug comments
                                </Checkbox>
                              </Form.Item>
                            </ul>
                            <Form.Item
                              name="noteAssigned"
                              valuePropName="checked"
                            >
                              <Checkbox
                                disabled={selectedRadio !== "Immediate"}
                              >
                                A note is assigned to me
                              </Checkbox>
                            </Form.Item>
                            <ul className="no-bullets">
                              <Form.Item
                                name="noteComments"
                                valuePropName="checked"
                              >
                                <Checkbox
                                  disabled={selectedRadio !== "Immediate"}
                                >
                                  Somebody has mentioned me in notes comments
                                </Checkbox>
                              </Form.Item>
                            </ul>
                            <Form.Item
                              name="fileSubscribed"
                              valuePropName="checked"
                            >
                              <Checkbox
                                disabled={selectedRadio !== "Immediate"}
                              >
                                A file is subscribed to me
                              </Checkbox>
                            </Form.Item>
                            {getRoles(["PC", "TL", "Admin", "Admin", "AM"]) && (
                              <Form.Item
                                name="hoursLogged"
                                valuePropName="checked"
                              >
                                <Checkbox
                                  disabled={selectedRadio !== "Immediate"}
                                >
                                  Somebody has logged hours
                                </Checkbox>
                              </Form.Item>
                            )}
                          </ul>
                        </div>
                      </div>
                      <div className="modal-footer-flex">
                        <div className="flex-btn">
                          <Button type="primary" htmlType="submit">
                            Update
                          </Button>
                          <Button
                            onClick={() => {
                              setSettingModal(false);
                            }}
                            className="ant-delete"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </div>
                </TabPane>
                {getRoles(["Admin"]) && (
                  <TabPane key="2" tab="API details">
                    <Form form={apiDetailSetting} onFinish={handleResetApi}>
                      <div className="overview-modal-wrapper">
                        <Form.Item
                          label="API key"
                          labelCol={{ span: 24 }}
                          wrapperCol={{ span: 24 }}
                        >
                          <div>
                            <Input
                              style={{ maxHeight: "40px" }}
                              type={passwordVisible ? "text" : "password"}
                              value={apiKey}
                              min={8}
                              readOnly
                              autoComplete="off"
                              suffix={
                                <Button
                                  type="link"
                                  onClick={togglePasswordVisibility}
                                  style={{ paddingTop: "5px" }}
                                  icon={
                                    passwordVisible ? (
                                      <EyeTwoTone />
                                    ) : (
                                      <EyeInvisibleOutlined />
                                    )
                                  }
                                />
                              }
                            />
                          </div>
                        </Form.Item>
                      </div>
                      <div className="modal-footer-flex-setting-api">
                        <div className="flex-btn">
                          <Button type="primary" htmlType="submit">
                            Reset API
                          </Button>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(apiKey);
                              message.info("Copied to clipboard");
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="setting-api-note">
                        Note : When you reset your API key , any apps using the
                        previous key are disconnected until you set the new API
                        key in your app.
                      </div>
                    </Form>
                  </TabPane>
                )}
                {getRoles(["Admin"]) && (
                  <TabPane key="3" tab="General Setting">
                    <Form form={generalSetting} onFinish={handlegeneralSetting}>
                      <div className="overview-modal-wrapper">
                        <div className="logosettings-wrapper">
                          <h4>Login logo : &nbsp;&nbsp;</h4>
                          <span>(This logo will appear on loginpage)</span>
                          <Form.Item name="login_logo">
                            <div className="upload-btn-img-wrapper">
                              {(fileLists.login_logo || tempurl.login_logo) && (
                                <div className="logo-view-wrapper">
                                  <img
                                    src={
                                      tempurl.login_logo
                                        ? tempurl.login_logo
                                        : `${Service.Server_Base_URL}/public/${fileLists.login_logo.url}`
                                    }
                                    alt={
                                      fileLists?.login_logo
                                        ? fileLists.login_logo.name
                                        : ""
                                    }
                                    style={{ height: "50px", width: "150px" }}
                                  />
                                </div>
                              )}

                              <Button
                                className="link-btn"
                                onClick={() =>
                                  attachmentfileRefs.login_logo.current.click()
                                }
                                disabled={
                                  fileLists.login_logo || tempurl.login_logo
                                    ? true
                                    : false
                                }
                              >
                                <UploadOutlined /> Upload Login Logo
                              </Button>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handleFileChange(e, "login_logo")
                                }
                                hidden
                                ref={attachmentfileRefs.login_logo}
                              />
                              {(fileLists.login_logo || tempurl.login_logo) && (
                                <Button
                                  icon={<CloseOutlined />}
                                  onClick={() => handleRemoveFile("login_logo")}
                                  size="small"
                                />
                              )}
                            </div>
                          </Form.Item>
                        </div>

                        {/* Header Logo */}
                        <div className="logosettings-wrapper">
                          <h4>Header logo : &nbsp;&nbsp;</h4>
                          <span>(This logo will appear on Header)</span>
                          <Form.Item name="header_logo">
                            <div className="upload-btn-img-wrapper">
                              {(fileLists?.header_logo ||
                                tempurl?.header_logo) && (
                                <div className="logo-view-wrapper">
                                  <img
                                    src={
                                      tempurl.header_logo
                                        ? tempurl.header_logo
                                        : `${Service.Server_Base_URL}/public/${fileLists.header_logo.url}`
                                    }
                                    alt={
                                      fileLists?.header_logo
                                        ? fileLists?.header_logo?.name
                                        : ""
                                    }
                                    style={{ height: "50px", width: "150px" }}
                                  />
                                </div>
                              )}

                              <Button
                                className="link-btn"
                                onClick={() =>
                                  attachmentfileRefs.header_logo.current.click()
                                }
                                disabled={
                                  fileLists?.header_logo || tempurl?.header_logo
                                    ? true
                                    : false
                                }
                              >
                                <UploadOutlined /> Upload Header Logo
                              </Button>

                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handleFileChange(e, "header_logo")
                                }
                                hidden
                                ref={attachmentfileRefs.header_logo}
                              />

                              {(fileLists.header_logo ||
                                tempurl.header_logo) && (
                                <Button
                                  icon={<CloseOutlined />}
                                  onClick={() =>
                                    handleRemoveFile("header_logo")
                                  }
                                  size="small"
                                />
                              )}
                            </div>
                          </Form.Item>
                        </div>

                        {/* FavIcon */}
                        <div className="logosettings-wrapper">
                          <h4>FavIcon logo : &nbsp;&nbsp;</h4>
                          <span>(This logo will appear on Title)</span>
                          <Form.Item name="fav_logo">
                            <div className="upload-btn-img-wrapper">
                              {(fileLists?.fav_logo || tempurl?.fav_logo) && (
                                <div className="favicon-view-wrapper">
                                  <img
                                    src={
                                      tempurl.fav_logo
                                        ? tempurl.fav_logo
                                        : `${Service.Server_Base_URL}/public/${fileLists.fav_logo.url}`
                                    }
                                    alt={
                                      fileLists?.fav_logo
                                        ? fileLists?.fav_logo?.name
                                        : ""
                                    }
                                  />
                                </div>
                              )}

                              <Button
                                className="link-btn"
                                onClick={() =>
                                  attachmentfileRefs.fav_logo.current.click()
                                }
                                disabled={
                                  fileLists?.fav_logo || tempurl?.fav_logo
                                    ? true
                                    : false
                                }
                              >
                                <UploadOutlined /> Upload FavIcon Logo
                              </Button>

                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handleFileChange(e, "fav_logo")
                                }
                                hidden
                                ref={attachmentfileRefs.fav_logo}
                              />

                              {(fileLists.fav_logo || tempurl.fav_logo) && (
                                <Button
                                  icon={<CloseOutlined />}
                                  onClick={() => handleRemoveFile("fav_logo")}
                                  size="small"
                                />
                              )}
                            </div>
                          </Form.Item>
                        </div>

                        <div className="logosettings-wrapper">
                          <h4>Title</h4>
                          <Form.Item
                            wrapperCol={{ span: 24 }}
                            name="title"
                            initialValue={generalApp.title}
                          >
                            <Input
                              name="titleinput"
                              defaultValue={generalApp.title}
                              type="text"
                            />
                          </Form.Item>
                        </div>
                      </div>

                      <div className="modal-footer-flex-setting-api">
                        <div className="flex-btn">
                          <Button type="primary" htmlType="submit">
                            Update
                          </Button>
                          <Button
                            onClick={() => {
                              setSettingModal(false);
                            }}
                            className="ant-delete"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </TabPane>
                )}
              </Tabs>
            </Modal>

            <UserProfileModal
              isModalOpen={isProfileModalOpen}
              handleClose={()=>setIsProfileModalOpen(false)}
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
