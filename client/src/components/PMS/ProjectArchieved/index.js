import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Form,
  Select,
  Modal,
  Input,
  Popover,
  Avatar,
  Radio,
  Table,
  message,
  Popconfirm,
  Row,
  Col,
  Checkbox,
  DatePicker,
  Tooltip,
} from "antd";
import {
  CheckSquareOutlined,
  PlusOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import Service from "../../../service";
import dayjs from "dayjs";
import "../ProjectArchieved/style.css";
import moment from "moment";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions";
import { useDispatch } from "react-redux";
import { getRoles } from "../../../util/hasPermission";
import { removeTitle } from "../../../util/nameFilter";
import MyAvatar from "../../Avatar/MyAvatar";
import { generateCacheKey } from "../../../util/generateCacheKey";

function ProjectArchieved() {
  const companySlug = localStorage.getItem("companyDomain");
  
  const [form] = Form.useForm();
  const { TextArea } = Input;
  const { Option } = Select;
  const dispatch = useDispatch();
  const Search = Input.Search;
  const searchRef = useRef();
  const [formData] = Form.useForm();

  const [pagination, setPagination] = useState({current: 1,pageSize: 30});
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sortColumn] = useState("_id");
  const [sortOrder] = useState("des");
  const [selectionType, setSelectionType] = useState("checkbox");
  const [modalMode] = useState("add");
  const [columnDetails, setColumnDetails] = useState([]);
  const [filterData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [data, setData] = useState([]);
  const [showSelectassignees, setShowSelectassignees] = useState(false);
  const [technologyList, setTechnologyList] = useState([]);
  const [projectTech, setProjectTech] = useState([]);
  const [projectTypeList, setProjectTypeList] = useState([]);
  const [projectStatusList, setProjectStatusList] = useState([]);
  const [projectAssigneesList, setProjectAssigneesList] = useState([]);
  const [projectManagerList, setProjectManagerList] = useState([]);
  const [showSelectproject, setShowSelectproject] = useState(false);
  const [selectedManager, setSelectedManager] = useState([]);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [selectedsassignees, setSelectedsassignees] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterDataState, setFilterData] = useState(null);

  //filters
  const [status, setStatus] = useState([]);
  const [manager, setManager] = useState([]);
  const [technology, setTechnology] = useState([]);
  const [projectType, setProjectType] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [sortOption, setSortOption] = useState("createdAt");
  const [popOver, setPopOver] = useState({
    status: false,
    manager: false,
    technology: false,
    type: false,
    assignees: false,
    sortBy: false,
  });

  const handleVisibleChange = (key, visible) => {
    if (!visible) {
      setPopOver(prevState => ({
        ...prevState,
        [key]: visible,
      }));
    } else {
      setPopOver(prevState => ({
        ...prevState,
        [key]: visible,
      }));
    }
  };

  const handleSortFilter = val => {
    setSortOption(val);
  };

  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 8 },
    },
    wrapperCol: {
      xs: { span: 24 },
      sm: { span: 16 },
    },
  };
 
  const filterEmp = async values => {
    setFilterData(values);
    setIsFilterModalOpen(false);
    formData.resetFields();
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
    setShowSelectassignees(false);
    setShowSelectproject(false);
  };

  const onSearch = value => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const resetSearchFilter = e => {
    const keyCode = e && e.keyCode ? e.keyCode : e;
    switch (keyCode) {
      case 8:
        if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
          searchRef.current.state.value = "";
          setSearchText("");
          setSearchEnabled(false);
        }
        break;
      case 46:
        if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
          searchRef.current.state.value = "";
          setSearchText("");
          setSearchEnabled(false);
        }
        break;
      default:
        break;
    }
  };

  const getFooterDetails = () => {
    return (
      <label>
        Total Records Count is {pagination.total > 0 ? pagination.total : 0}
      </label>
    );
  };

  const projectArchieved = async id => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.projectArchieved + "/" + id,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        getProjectListing();
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: "25%",
      render: (text, record) => {
        const Title = record?.title;
        const ProjectId = record?._id;
        const color = record?.color;
        return (
          <Link to={`/${companySlug}/project/app/${ProjectId}?tab=${record?.defaultTab?.name}`}>
            <div className="project_title_main_div">
              <span style={{ textTransform: "capitalize" }}>
                {Title}
              </span>
            </div>
          </Link>
        );
      },
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (_, record) => {
        const startDate = moment(record?.start_date).format("DD MMM YY");
        const endDate = moment(record?.end_date).format("DD MMM YY");
        return (
          <span style={{ textTransform: "capitalize" }}>
            {startDate} - {endDate}
          </span>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "project_status",
      key: "project_status",
      render: record => {
        const title = record?.title;
        return <span>{title}</span>;
      },
    },
    {
      title: "Manager",
      dataIndex: "manager",
      key: "manager",
      width: "12.5%",
      render: (text, record) => {
        const managerName = record?.manager?.full_name || "-";        

        return (
          <div className="avtar-group">
            <Tooltip title={removeTitle(managerName)}>

              <MyAvatar
                src={record?.manager?.emp_img}
                key={record.manager?._id}
                alt={record?.manager?.full_name}
                userName={record?.manager?.full_name}
              />
            </Tooltip>
          </div>
        );
      },
    },

    {
      title: "Assignees",
      dataIndex: "assignees",
      key: "assignees",
      width: "12.5%",
      render: (text, record) => {
        if (record?.assignees?.length) {
          return (
            <div className="avatar-group">
              <Avatar.Group
                maxCount={2}
                maxPopoverTrigger="click"
                size="default"
                maxStyle={{
                  color: "#f56a00",
                  backgroundColor: "#fde3cf",
                  cursor: "pointer",
                }}
              >
                {record.assignees.map(data => (
                  <Tooltip title={removeTitle(data.name)} key={data._id}>
                    <MyAvatar
                      src={data.emp_img}
                      key={data._id}
                      alt={data.name}
                      userName={data.name}
                    />
                  </Tooltip>
                ))}
              </Avatar.Group>
            </div>
          );
        }
        return "-";
      },
    },
    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      width: "12.5%",
      render: (text, record) => {
        return (
          <div className="edit-delete">
            <Popconfirm
              title="Do you want to activate the archived project?"
              okText="Yes"
              cancelText="No"
              onConfirm={() => projectArchieved(record?._id)}
            >
              <ProjectOutlined />
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  const onChange = (date, dateString) => {
    console.log(date, dateString);
  };

  useEffect(() => {
    setSelectedsassignees(data.assignees?.map(assignee => assignee._id));
    if (data?.assignees && data.assignees.length > 0) {
      setShowSelectassignees(true);
    } else {
      setShowSelectassignees(false);
    }
    if (data?.manager) {
      setShowSelectproject(true);
    } else {
      setShowSelectproject(false);
    }
    setSelectedColor(data.color);
    form.setFieldsValue({
      title: data.title?.trim(),
      technology: data.technology?.project_tech,
      project_type: data?.project_type?.project_type,
      descriptions: data.descriptions,
      assignees: data.assignees?.map(assignee => assignee._id),
      manager: data.manager?.full_name,
      estimatedHours: data.estimatedHours,
      project_status: data.project_status?.title,
      start_date: data.start_date ? dayjs(data.start_date) : null,
      end_date: data.end_date ? dayjs(data.end_date) : null,
    });
  }, [data]);

  const handleButtonassignees = () => {
    if (selectedsassignees?.length === 0) {
      setShowSelectassignees(!showSelectassignees);
    } else {
      setShowSelectassignees(true);
    }
  };

  const handleButtonproject = () => {
    if (selectedManager) {
      setShowSelectproject(true);
    } else {
      setShowSelectproject(!showSelectproject);
    }
  };

  const handleClearAssignees = () => {
    setSelectedsassignees([]);
    setShowSelectassignees(false);
  };

  useEffect(() => {
    getTechnologyList();
    getProjectType();
    getStatus();
    getProjectassignees();
    getManager();
  }, []);

  const handleProjectTech = val => {
    setProjectTech(val);
  };

  const handlerAssignes = val => {
    setSelectedsassignees(val);
  };

  const handleSelectProjectManager = val => {
    setSelectedManager(val);
  };

  // add the project
  const addProjectDetails = async values => {
    try {
      dispatch(showAuthLoader());
      // const assignees = Array.from(selectedsassignees);
      const assignees = [...(selectedsassignees || [])];

      const reqBody = {
        title: values?.title.trim(),
        // ...values,
        assignees: assignees,
        color: selectedColor || "#000000",
        start_date: values?.start_date,
        end_date: values?.end_date,
        estimatedHours: values?.estimatedHours || "0",
        manager: values?.manager,
        project_status: values?.project_status,
        project_type: values?.project_type,
        technology: values?.technology,
      };

      form.setFieldsValue({
        assignees: assignees,
      });
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectdetails,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        form.resetFields();
        getProjectListing();
        setIsModalOpen(false);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get tech list
  const getTechnologyList = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        sortBy: "desc",
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectTech,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setTechnologyList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get projecttype list
  const getProjectType = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListing,
      });
      dispatch(hideAuthLoader());
      if (response.data && response.data.data) {
        setProjectTypeList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get project assignees list
  const getProjectassignees = async values => {
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
        setProjectAssigneesList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get manager list
  const getManager = async values => {
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
        setProjectManagerList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get status list
  const getStatus = async () => {
    dispatch(showAuthLoader());
    try {
      const reqBody = {
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectStatus,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectStatusList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getProjectListing();
  }, [
    filterDataState,
    searchText,
    pagination.current,
    pagination.pageSize,
    sortOrder,
    sortColumn,
  ]);

  // get project list
  const getProjectListing = async mt => {
    try {
      dispatch(showAuthLoader());
      const defaultPayload = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        sortBy: "desc",
        filterBy: "all",
        color: "",
        isArchived: true,
        sort: sortOption,
      };
      const reqBody = {
        ...defaultPayload,
      };
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
        setSearchEnabled(true);
      }
      if (status && status.length > 0) {
        reqBody.project_status = status;
      }

      if (manager && manager.length > 0) {
        reqBody.manager_id = manager;
      }

      if (technology && technology.length > 0) {
        reqBody.technology = technology;
      }

      if (projectType && projectType.length > 0) {
        reqBody.project_type = projectType;
      }

      if (assignees && assignees.length > 0) {
        reqBody.assignee_id = assignees;
      }

      let Key = generateCacheKey("project", reqBody);


      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: {
          "cachekey": Key
        }
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data?.length > 0) {
        setColumnDetails(response.data.data);
        if (filterData?.isActive == true) {
          setPagination(prevPagination => ({
            ...prevPagination,
            total: response.data.metadata.total,
          }));
        } else {
          setPagination({
            ...pagination,
            total: response.data.metadata.total,
          });
        }
      } else {
        setColumnDetails([]);
        setPagination(prevPagination => ({ ...prevPagination, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getManagerIdByName = managerName => {
    const manager = projectManagerList.find(
      mgr => mgr.manager_name === managerName
    );
    return manager;
  };

  // edit project
  const editProjectdetails = async (id, values) => {
    console.log(values, "640");
    try {
      dispatch(showAuthLoader());
      const assignees = Array.from(selectedsassignees);
      const managerId = getManagerIdByName(values?.manager);

      const reqBody = {
        ...values,
        color: selectedColor,
        assignees: assignees,
        technology: values?.technology
          ? values?.technology
          : data?.technology?._id,
        project_type: values?.project_type
          ? values?.project_type
          : data.project_type?._id,
        project_status: values?.project_status
          ? values?.project_status
          : data.project_status?._id,
        manager: managerId ? managerId?._id : values?.manager,
      };
      const params = `/${id}`;

      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateProjectdetails + params,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setIsModalOpen(false);
        setData(response.data.data);
      } else {
        message.error(response?.data.message);
      }
      getProjectListing();
      //  else {
      // }
    } catch (error) {
      console.log(error);
    }
  };

  const handleTableChange = page => {
    setPagination({ ...pagination, ...page });
  };

  const handleCancelFilterModel = () => {
    setIsFilterModalOpen(false);
    formData.resetFields();
  };

  const onReset = () => {
    formData.resetFields();
    setFilterData(null);
  };

  const handleStatus = val => {
    if (val === "") {
      setStatus([]);
    } else {
      if (status.includes(val._id)) {
        setStatus(status.filter(id => id !== val._id));
      } else {
        setStatus([...status, val._id]);
      }
    }
  };

  const handleManager = val => {
    if (val === "") {
      setManager([]);
    } else {
      if (manager.includes(val._id)) {
        setManager(manager.filter(id => id !== val._id));
      } else {
        setManager([...manager, val._id]);
      }
    }
  };

  const handleTechnology = val => {
    if (val === "") {
      setTechnology([]);
    } else {
      if (technology.includes(val._id)) {
        setTechnology(technology.filter(id => id !== val._id));
      } else {
        setTechnology([...technology, val._id]);
      }
    }
  };

  const handleProjectType = val => {
    if (val === "") {
      setProjectType([]);
    } else {
      if (projectType.includes(val._id)) {
        setProjectType(projectType.filter(id => id !== val._id));
      } else {
        setProjectType([...projectType, val._id]);
      }
    }
  };

  const handleAssignees = val => {
    if (val === "") {
      setAssignees([]);
    } else {
      if (assignees.includes(val._id)) {
        setAssignees(assignees.filter(id => id !== val._id));
      } else {
        setAssignees([...assignees, val._id]);
      }
    }
  };

  const [searchAssignees, setsearchAssignees] = useState("");
  const [searchManager, setsearchManager] = useState("");
  const [searchTechnology, setsearchTechnology] = useState("");

  // Function to handle search term change
  const handleSearchTermAssignees = e => {
    setsearchAssignees(e.target.value);
  };

  const handleSearchManager = e => {
    setsearchManager(e.target.value);
  };

  const handleSearchTechnology = e => {
    setsearchTechnology(e.target.value);
  };

  // Function to filter technology list based on search term
  const filteredTechnologyList = technologyList.filter(item =>
    item?.project_tech?.toLowerCase().includes(searchTechnology?.toLowerCase())
  );

  const filteredManagerList = projectManagerList.filter(item =>
    item.manager_name?.toLowerCase().includes(searchManager?.toLowerCase())
  );

  const filteredAssigneesList = projectAssigneesList.filter(item =>
    item.full_name?.toLowerCase().includes(searchAssignees?.toLowerCase())
  );

  return (
    <div className="ant-project-task archived-main-wrapper ">
      <Card>
        <div className="profile-sub-head">
          <div className="head-box-inner">
            <div className="heading-main">
              <h2>Archived Projects</h2>
            </div>
            <Search
              ref={searchRef}
              placeholder="Search..."
              style={{ width: 200 }}
              onSearch={onSearch}
              onKeyUp={resetSearchFilter}
            />
          </div>

          <div className="status-content">
            <div style={{ cursor: "pointer" }}>
              <h6>Status:</h6>
              <Popover
                trigger="click"
                placement="bottomRight"
                visible={popOver.status}
                onVisibleChange={() => handleVisibleChange("status", true)}
                content={
                  <div className="assignees-popover">
                    <ul>
                      <li>
                        <Checkbox
                          checked={status.length === 0}
                          onChange={() => handleStatus("")}
                        >
                          {" "}
                          All
                        </Checkbox>
                      </li>
                      {projectStatusList
                        .filter(item => item.title != "Active")
                        .map(item => (
                          <li>
                            <Checkbox
                              onChange={() => handleStatus(item)}
                              checked={status.includes(item._id)}
                            >
                              {item?.title}
                            </Checkbox>
                          </li>
                        ))}
                    </ul>
                    <div className="popver-footer-btn">
                      <Button
                        type="primary"
                        className="square-primary-btn ant-btn-primary"
                        onClick={() => {
                          getProjectListing();
                          handleVisibleChange("status", false);
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() => {
                          handleVisibleChange("status", false);
                        }}

                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                }
              >
                <i className="fi fi-rs-check-circle"></i>{" "}
                {status.length == 0 ? "All" : "Selected"}
              </Popover>
            </div>

            {getRoles(["Admin"]) && (
              <div style={{ cursor: "pointer" }}>
                <h6>Manager:</h6>
                <Popover
                  trigger="click"
                  placement="bottomRight"
                  visible={popOver.manager}
                  onVisibleChange={() => handleVisibleChange("manager", true)}
                  content={
                    <div className="assignees-popover">
                      <ul>
                        <li>
                          <Checkbox
                            checked={manager.length === 0}
                            onChange={() => handleManager("")}
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
                      <ul className="assigness-data">
                        {filteredManagerList.map(item => (
                          <li key={item._id}>
                            <Checkbox
                              onChange={() => {
                                handleManager(item);
                              }}
                              checked={manager.includes(item._id)}
                            >
                              {item.manager_name}
                            </Checkbox>
                          </li>
                        ))}
                      </ul>
                      <div className="popover-footer-btn">
                        <Button
                          type="primary"
                          className="square-primary-btn ant-btn-primary"
                          onClick={() => {
                            getProjectListing();
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
            )}

            <div style={{ cursor: "pointer" }}>
              <h6>Technology:</h6>
              <Popover
                trigger="click"
                placement="bottomRight"
                visible={popOver.technology}
                onVisibleChange={visible =>
                  setPopOver({ ...popOver, technology: visible })
                }
                content={
                  <div className="assignees-popover">
                    <ul>
                      <li>
                        <Checkbox
                          checked={technology.length === 0}
                          onChange={() => handleTechnology("")}
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
                    <ul className="assigness-data">
                      {filteredTechnologyList.map(item => (
                        <li key={item._id}>
                          <Checkbox
                            onChange={() => {
                              handleTechnology(item);
                            }}
                            checked={technology.includes(item._id)}
                          >
                            {item?.project_tech}
                          </Checkbox>
                        </li>
                      ))}
                    </ul>
                    <div className="popover-footer-btn">
                      <Button
                        type="primary"
                        className="square-primary-btn ant-btn-primary"
                        onClick={() => {
                          getProjectListing();
                          setPopOver({ ...popOver, technology: false });
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() => {
                          setPopOver({ ...popOver, technology: false });
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
              <h6>Project Type:</h6>
              <Popover
                trigger="click"
                visible={popOver.type}
                onVisibleChange={() => handleVisibleChange("type", true)}
                placement="bottomRight"
                content={
                  <div className="assignees-popover">
                    {/* <h4>Assignees</h4> */}
                    <ul>
                      <li>
                        <Checkbox
                          checked={projectType.length === 0}
                          onChange={() => handleProjectType("")}
                        >
                          {" "}
                          All
                        </Checkbox>
                      </li>
                      {projectTypeList.map(item => (
                        <li>
                          <Checkbox
                            onChange={() => {
                              handleProjectType(item);
                            }}
                            checked={projectType.includes(item._id)}
                          >
                            {item?.project_type}
                          </Checkbox>
                        </li>
                      ))}
                    </ul>
                    <div className="popver-footer-btn">
                      <Button
                        type="primary"
                        className="square-primary-btn ant-btn-primary"
                        onClick={() => {
                          getProjectListing();
                          handleVisibleChange("type", false);
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() => {
                          handleVisibleChange("type", false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                }
              >
                <i className="fas fa-briefcase"></i>{" "}
                {projectType.length == 0 ? "All" : "Selected"}
              </Popover>
            </div>

            <div style={{ cursor: "pointer" }}>
              <h6>Assignees:</h6>
              <Popover
                trigger="click"
                visible={popOver.assignees}
                onVisibleChange={visible =>
                  handleVisibleChange("assignees", visible)
                }
                placement="bottomRight"
                content={
                  <div className="assignees-popover">
                    <ul>
                      <li>
                        <Checkbox
                          checked={assignees.length === 0}
                          onChange={() => handleAssignees("")}
                        >
                          {" "}
                          All
                        </Checkbox>
                      </li>
                    </ul>
                    <div className="search-filter">
                      <Input
                        placeholder="Search"
                        value={searchAssignees}
                        onChange={handleSearchTermAssignees}
                      />
                    </div>
                    <ul className="assigness-data">
                      {filteredAssigneesList.map(item => (
                        <li key={item._id}>
                          <Checkbox
                            onChange={() => {
                              handleAssignees(item);
                            }}
                            checked={assignees.includes(item._id)}
                          >
                            {item.full_name}
                          </Checkbox>
                        </li>
                      ))}
                    </ul>
                    <div className="popover-footer-btn">
                      <Button
                        type="primary"
                        className="square-primary-btn ant-btn-primary"
                        onClick={() => {
                          getProjectListing();
                          setPopOver({ ...popOver, assignees: false });
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() => {
                          setPopOver({ ...popOver, assignees: false });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                }
              >
                <i className="fi fi-rr-users"></i>{" "}
                {assignees.length == 0 ? "All" : "Selected"}
              </Popover>
            </div>
            <div style={{ cursor: "pointer" }}>
              <h6>Sort By:</h6>
              <Popover
                trigger="click"
                visible={popOver.sortBy}
                onVisibleChange={visible =>
                  handleVisibleChange("sortBy", visible)
                }
                placement="bottomRight"
                content={
                  <div className="right-popover-wrapper">
                    <ul>
                      <Radio.Group
                        onChange={e => {
                          handleSortFilter(e.target.value);
                        }}
                        value={sortOption}
                      >
                        <li>
                          <Radio value="createdAt"> Latest Updated</Radio>
                        </li>
                        <li>
                          <Radio value="title">Name</Radio>
                        </li>
                        <li>
                          <Radio value="project_type">Status</Radio>
                        </li>
                      </Radio.Group>
                    </ul>
                    <div className="popver-footer-btn">
                      <Button
                        type="primary"
                        className="square-primary-btn ant-btn-primary"
                        onClick={() => {
                          getProjectListing();
                          handleVisibleChange("sortBy", false);
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() => handleVisibleChange("sortBy", false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                }
              // open={openSortBy}
              // onOpenChange={handleSort}
              >
                <CheckSquareOutlined />{" "}
                {sortOption === "createdAt"
                  ? "Latest Updated"
                  : sortOption === "title"
                    ? "Name"
                    : "Status"}
              </Popover>
            </div>
          </div>

          <Modal
            title="Filter"
            width={1000}
            open={isFilterModalOpen}
            footer={false}
            // onOk={handleOkFilterModel}
            onCancel={handleCancelFilterModel}
          >
            <div className="filter-pop-wrapper">
              <Row>
                <Col span={24}>
                  <Form
                    form={formData}
                    {...formItemLayout}
                    onFinish={filterEmp}
                  >
                    <div className="inout-employee">
                      <Row>
                        <Col sm={24} lg={12}>
                          <div className="filter-employeelist">
                            <Form.Item
                              label="Project Status"
                              name="project_status"
                            >
                              <Select
                                size="large"
                                showSearch
                                // optionFilterProp="children"
                                filterOption={(input, option) =>
                                  option.children
                                    ?.toLowerCase()
                                    .indexOf(input?.toLowerCase()) >= 0
                                }
                                filterSort={(optionA, optionB) =>
                                  optionA.children
                                    ?.toLowerCase()
                                    .localeCompare(
                                      optionB.children?.toLowerCase()
                                    )
                                }
                                onDropdownVisibleChange={open => {
                                  if (open) {
                                    getStatus();
                                  }
                                }}
                              >
                                {projectStatusList.map((item, index) => (
                                  <>
                                    <Option
                                      key={index}
                                      value={item._id}
                                      style={{ textTransform: "capitalize" }}
                                    >
                                      {item.title}
                                    </Option>
                                  </>
                                ))}
                              </Select>
                            </Form.Item>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div>
                            <Form.Item label="Project Manager" name="manager">
                              <Select
                                size="large"
                                showSearch
                                filterOption={(input, option) =>
                                  option.children
                                    ?.toLowerCase()
                                    .indexOf(input?.toLowerCase()) >= 0
                                }
                                filterSort={(optionA, optionB) =>
                                  optionA.children
                                    ?.toLowerCase()
                                    .localeCompare(
                                      optionB.children?.toLowerCase()
                                    )
                                }
                                onDropdownVisibleChange={open => {
                                  if (open) {
                                    getManager();
                                  }
                                }}
                              >
                                {projectManagerList.map((item, index) => (
                                  <Option
                                    key={index}
                                    value={item?._id}
                                    style={{ textTransform: "capitalize" }}
                                  >
                                    {item.manager_name}
                                  </Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </div>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Technology" name="technology">
                            <Select
                              size="large"
                              showSearch
                              filterOption={(input, option) =>
                                option.children
                                  ?.toLowerCase()
                                  .indexOf(input?.toLowerCase()) >= 0
                              }
                              filterSort={(optionA, optionB) =>
                                optionA.children
                                  ?.toLowerCase()
                                  .localeCompare(optionB.children?.toLowerCase())
                              }
                              onChange={handleProjectTech}
                              value={projectTech}
                            >
                              {technologyList.map((item, index) => (
                                <>
                                  <Option
                                    key={index}
                                    value={item._id}
                                    style={{ textTransform: "capitalize" }}
                                  >
                                    {item?.project_tech}
                                  </Option>
                                </>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Project Type" name="project_type">
                            <Select
                              size="large"
                              showSearch
                              filterOption={(input, option) =>
                                option.children
                                  ?.toLowerCase()
                                  .indexOf(input?.toLowerCase()) >= 0
                              }
                              filterSort={(optionA, optionB) =>
                                optionA.children
                                  ?.toLowerCase()
                                  .localeCompare(optionB.children?.toLowerCase())
                              }
                            >
                              {projectTypeList.map((item, index) => (
                                <>
                                  <Option
                                    key={index}
                                    value={item._id}
                                    style={{ textTransform: "capitalize" }}
                                  >
                                    {item.project_type}
                                  </Option>
                                </>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Assignees" name="assignees">
                            <Select
                              size="large"
                              showSearch
                              optionFilterProp="children"
                              filterOption={(input, option) =>
                                option.children
                                  ?.toLowerCase()
                                  .indexOf(input?.toLowerCase()) >= 0
                              }
                              filterSort={(optionA, optionB) =>
                                optionA.children
                                  ?.toLowerCase()
                                  .localeCompare(optionB.children?.toLowerCase())
                              }
                              onDropdownVisibleChange={open => {
                                if (open) {
                                  getProjectassignees();
                                }
                              }}
                            >
                              {projectAssigneesList.map((item, index) => (
                                <Option
                                  key={index}
                                  value={item._id}
                                  style={{ textTransform: "capitalize" }}
                                >
                                  {item.full_name}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>
                      <div className="filter-btn-wrapper">
                        <Button className="ant-btn-primary" type="primary" htmlType="submit">
                          Apply
                        </Button>
                        <Button type="primary" onClick={onReset}>
                          Reset
                        </Button>
                        <Button
                          type="primary"
                          className="ant-delete"
                          onClick={handleCancelFilterModel}
                        >
                          Cancel
                        </Button>
                      </div>{" "}
                    </div>
                  </Form>
                </Col>
              </Row>
            </div>
          </Modal>
        </div>

        <div className="project-radio">
          <Radio.Group
            onChange={({ target: { value } }) => {
              setSelectionType(value);
            }}
            value={selectionType}
          />
        </div>
        <div className="block-table-content new-block-table">
          <Table
            columns={columns}
            dataSource={columnDetails}
            footer={getFooterDetails}
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "30"],
              ...pagination,
            }}
            onChange={handleTableChange}
            scroll={{
              x: "100%",
            }}
          />
        </div>
      </Card>

      <Modal
        footer={false}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        className="project-add-wrapper"
      >
        <div className="modal-header">
          <h1>{modalMode === "add" ? "Add Project" : "Edit Project"}</h1>
        </div>
        <div className="overview-modal-wrapper">
          <Form
            form={form}
            onFinish={values => {
              modalMode === "add"
                ? addProjectDetails(values)
                : editProjectdetails(data?._id, values);
            }}
          >
            <div className="topic-cancel-wrapper">
              <Form.Item label="Project label color">
                <Input
                  type="color"
                  label="color"
                  name="color"
                  onChange={e => setSelectedColor(e.target.value)}
                  value={selectedColor}
                />
              </Form.Item>
              <Form.Item
                name="title"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Please enter a valid title",
                  },
                ]}
              >
                <Input placeholder="01-2021-SO3089/TM/Elsner.com" />
              </Form.Item>
              <Row>
                <Col span={12}>
                  <Form.Item
                    name="technology"
                    rules={[
                      {
                        required: true,
                        message: "Please select a technology",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Technology"
                      size="large"
                      showSearch
                      filterOption={(input, option) =>
                        option.children
                          ?.toLowerCase()
                          .indexOf(input?.toLowerCase()) >= 0
                      }
                      filterSort={(optionA, optionB) =>
                        optionA.children
                          ?.toLowerCase()
                          .localeCompare(optionB.children?.toLowerCase())
                      }
                      onChange={handleProjectTech}
                      value={projectTech}
                    >
                      {technologyList.map((item, index) => (
                        <>
                          <Option
                            key={index}
                            value={item._id}
                            style={{ textTransform: "capitalize" }}
                          >
                            {item?.project_tech}
                          </Option>
                        </>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="project_type"
                    rules={[
                      {
                        required: true,
                        message: "Please select a project type",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Project Type"
                      size="large"
                      showSearch
                      filterOption={(input, option) =>
                        option.children
                          ?.toLowerCase()
                          .indexOf(input?.toLowerCase()) >= 0
                      }
                      filterSort={(optionA, optionB) =>
                        optionA.children
                          ?.toLowerCase()
                          .localeCompare(optionB.children?.toLowerCase())
                      }
                    >
                      {projectTypeList.map((item, index) => (
                        <>
                          <Option
                            key={index}
                            value={item._id}
                            style={{ textTransform: "capitalize" }}
                          >
                            {item?.project_type}
                          </Option>
                        </>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="descriptions">
                <TextArea placeholder="Description"></TextArea>
              </Form.Item>

              <Row>
                <Col span={12}>
                  <Form.Item
                    label="Assignees"
                    name="assignees"
                    className="subscriber-btn"
                  >
                    {!showSelectassignees && (
                      <Button
                        className="list-add-btn"
                        icon={<PlusOutlined />}
                        onClick={handleButtonassignees}
                      ></Button>
                    )}
                    {showSelectassignees && (
                      <Select
                        size="large"
                        showSearch
                        mode="multiple"
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          option.children
                            ?.toLowerCase()
                            .indexOf(input?.toLowerCase()) >= 0
                        }
                        filterSort={(optionA, optionB) =>
                          optionA.children
                            ?.toLowerCase()
                            .localeCompare(optionB.children?.toLowerCase())
                        }
                        onChange={handlerAssignes}
                        value={selectedsassignees}
                      >
                        {projectAssigneesList.map((item, index) => (
                          <Option
                            key={index}
                            value={item._id}
                            style={{ textTransform: "capitalize" }}
                          >
                            {item.full_name}
                          </Option>
                        ))}
                      </Select>
                    )}
                    <div className="clear-btn ant-delete">
                      <Button
                        className="bg-transperent"
                        onClick={handleClearAssignees}
                      >
                        Clear
                      </Button>
                    </div>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Project manager"
                    name="manager"
                    className="subscriber-btn"
                    rules={[
                      {
                        required: true,
                        message: "Please select a project manager",
                      },
                    ]}
                  >
                    {!showSelectproject && (
                      <Button
                        className="list-add-btn"
                        icon={<PlusOutlined />}
                        onClick={handleButtonproject}
                      ></Button>
                    )}
                    {showSelectproject && (
                      <Select
                        size="large"
                        showSearch
                        // optionFilterProp="children"
                        filterOption={(input, option) =>
                          option.children
                            ?.toLowerCase()
                            .indexOf(input?.toLowerCase()) >= 0
                        }
                        filterSort={(optionA, optionB) =>
                          optionA.children
                            ?.toLowerCase()
                            .localeCompare(optionB.children?.toLowerCase())
                        }
                        onChange={handleSelectProjectManager}
                      >
                        {projectManagerList.map((item, index) => (
                          <>
                            <Option
                              key={index}
                              value={item._id}
                              style={{ textTransform: "capitalize" }}
                            >
                              {item.manager_name}
                            </Option>
                          </>
                        ))}
                      </Select>
                    )}
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col span={12}>
                  <Form.Item
                    label="Project Estimated Hours"
                    name="estimatedHours"
                  >
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Status"
                    name="project_status"
                    rules={[
                      { required: true, message: "Please select a status" },
                    ]}
                  >
                    <Select
                      size="large"
                      showSearch
                      filterOption={(input, option) =>
                        option.children
                          ?.toLowerCase()
                          .indexOf(input?.toLowerCase()) >= 0
                      }
                      filterSort={(optionA, optionB) =>
                        optionA.children
                          ?.toLowerCase()
                          .localeCompare(optionB.children?.toLowerCase())
                      }
                    >
                      {projectStatusList.map((item, index) => (
                        <>
                          <Option
                            key={index}
                            value={item._id}
                            style={{ textTransform: "capitalize" }}
                          >
                            {item.title}
                          </Option>
                        </>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col span={12}>
                  <Form.Item
                    label="Start Date"
                    name="start_date"
                    rules={[
                      {
                        required: true,
                        message: "Please select a start date",
                      },
                    ]}
                  >
                    <DatePicker
                      placeholder="Start Date"
                      onChange={(date, dateString) => {
                        onChange(date, dateString, "start_date");
                        form.setFieldValue({ end_date: "" });
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="End Date"
                    name="end_date"
                    rules={[
                      {
                        required: true,
                        message: "Please select an end date",
                      },
                    ]}
                  >
                    <DatePicker
                      placeholder="End Date"
                      onChange={(date, dateString) =>
                        onChange(date, dateString, "end_date")
                      }
                      disabledDate={value => {
                        return value < form.getFieldValue("start_date");
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <div className="modal-footer-flex">
                <div className="flex-btn">
                  <Button  type="primary" htmlType="submit">
                    Save
                  </Button>
                  <Button className="ant-delete" onClick={handleCancel}>Cancel</Button>
                </div>
              </div>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
}

export default ProjectArchieved;
