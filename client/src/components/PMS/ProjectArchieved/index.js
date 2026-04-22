import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Input,
  Avatar,
  Radio,
  Table,
  message,
  Popconfirm,
  Tooltip,
} from "antd";
import { ProjectOutlined } from "@ant-design/icons";
import Service from "../../../service";
import moment from "moment";
import "../ProjectArchieved/style.css";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions";
import { useDispatch } from "react-redux";
import { getRoles } from "../../../util/hasPermission";
import { removeTitle } from "../../../util/nameFilter";
import MyAvatar from "../../Avatar/MyAvatar";
import { generateCacheKey } from "../../../util/generateCacheKey";
import ProjectArchivedFilterComponent from "./ProjectArchivedFilterComponent";

function ProjectArchieved() {
  const dispatch = useDispatch();
  const searchRef = useRef();

  const [pagination, setPagination] = useState({ current: 1, pageSize: 30 });
  const [searchText, setSearchText] = useState("");
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [sortOption, setSortOption] = useState("createdAt");
  const [selectionType, setSelectionType] = useState("checkbox");
  const [columnDetails, setColumnDetails] = useState([]);

  const [technologyList, setTechnologyList] = useState([]);
  const [projectTypeList, setProjectTypeList] = useState([]);
  const [projectStatusList, setProjectStatusList] = useState([]);
  const [projectAssigneesList, setProjectAssigneesList] = useState([]);
  const [projectManagerList, setProjectManagerList] = useState([]);
  const [filterStats, setFilterStats] = useState({
    status: [],
    manager: [],
    technology: [],
    project_type: [],
    assignees: [],
  });

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const resetSearchFilter = (e) => {
    const keyCode = e && e.keyCode ? e.keyCode : e;
    if ((keyCode === 8 || keyCode === 46) && searchRef.current.state?.value?.length <= 1 && seachEnabled) {
      searchRef.current.state.value = "";
      setSearchText("");
      setSearchEnabled(false);
    }
  };

  const getFooterDetails = () => {
    return `Total Records Count is ${pagination.total > 0 ? pagination.total : 0}`;
  };

  const projectArchieved = async (id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.projectArchieved}/${id}`,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        getProjectListing();
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
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
        return (
          <Link to={`project/app/${ProjectId}?tab=${record?.defaultTab?.name}`}>
            <div className="project_title_main_div">
              <span style={{ textTransform: "capitalize" }}>{Title}</span>
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
        const startDate = moment(record?.start_date).format("DD-MM-YYYY");
        const endDate = moment(record?.end_date).format("DD-MM-YYYY");
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
      render: (record) => {
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
                {record.assignees.map((data) => (
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
              cancelButtonProps={{ className: "delete-btn" }}
              onConfirm={() => projectArchieved(record?._id)}
            >
              <ProjectOutlined />
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  useEffect(() => {
    getTechnologyList();
    getProjectType();
    getStatus();
    getProjectassignees();
    getManager();
  }, []);

  useEffect(() => {
    getProjectListing();
  }, [searchText, pagination.current, pagination.pageSize, sortOption]);

  const getTechnologyList = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: 1,
        limit: 100,
        sortBy: "desc",
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectTech,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        setTechnologyList(response.data.data);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const getProjectType = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListing,
      });
      dispatch(hideAuthLoader());
      if (response.data?.data) {
        setProjectTypeList(response.data.data);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const getProjectassignees = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getEmployees,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        setProjectAssigneesList(response.data.data);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const getManager = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectManager,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        setProjectManagerList(response.data.data);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const getStatus = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = { isDropdown: true };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectStatus,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        setProjectStatusList(response.data.data);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const getProjectListing = async (skipFilters = [], filterStats = {}) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        sortBy: "desc",
        filterBy: "all",
        sort: sortOption,
        isArchived: true,
      };

      const shouldSkip = (filterKey) => skipFilters.includes("skipAll") || skipFilters.includes(filterKey);

      if (!shouldSkip("skipStatus") && filterStats?.status?.length > 0) {
        reqBody.project_status = filterStats.status;
      }
      if (!shouldSkip("skipManager") && filterStats?.manager?.length > 0) {
        reqBody.manager_id = filterStats.manager;
      }
      if (!shouldSkip("skipTechnology") && filterStats?.technology?.length > 0) {
        reqBody.technology = filterStats.technology;
      }
      if (!shouldSkip("skipProjectType") && filterStats?.project_type?.length > 0) {
        reqBody.project_type = filterStats.project_type;
      }
      if (!shouldSkip("skipAssignees") && filterStats?.assignees?.length > 0) {
        reqBody.assignee_id = filterStats.assignees;
      }
      if (searchText?.trim()) {
        reqBody.search = searchText;
        setSearchEnabled(true);
      }

      const Key = generateCacheKey("project", reqBody);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: { cachekey: Key },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        setColumnDetails(response.data.data);
        setPagination((prev) => ({ ...prev, total: response.data.metadata.total }));
      } else {
        setColumnDetails([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const handleTableChange = (page) => {
    setPagination({ ...pagination, ...page });
  };

  return (
    <Card className="ps-page">
      <div className="heading-wrapper">
        <div className="heading-main">
          <h2>
            <span><ProjectOutlined /></span>
            Archived Projects
          </h2>
        </div>
      </div>

      <Card className="main-content-wrapper">
        <div className="global-search">
          <Input.Search
            ref={searchRef}
            placeholder="Search..."
            style={{ width: 260 }}
            onSearch={onSearch}
            onChange={(e) => onSearch(e.target.value)}
            allowClear
          />
          <div className="filter-section">
            <ProjectArchivedFilterComponent
              getRoles={getRoles}
              onFilterChange={(skipFilters, stats) => {
                setFilterStats(stats);
                getProjectListing(skipFilters, stats);
              }}
            />
          </div>
        </div>

        <div className="block-table-content new-block-table">
          <Table
            columns={columns}
            dataSource={columnDetails}
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "25", "30"],
              showTotal: getFooterDetails,
              ...pagination,
            }}
            onChange={handleTableChange}
            scroll={{ x: "100%" }}
          />
        </div>
      </Card>
    </Card>
  );
}

export default ProjectArchieved;

// import React, { useEffect, useRef, useState } from "react";
// import {
//   Button,
//   Card,
//   Form,
//   Select,
//   Modal,
//   Input,
//   Avatar,
//   Radio,
//   Table,
//   message,
//   Popconfirm,
//   Row,
//   Col,
//   DatePicker,
//   Tooltip,
// } from "antd";
// import { PlusOutlined, ProjectOutlined } from "@ant-design/icons";
// import Service from "../../../service";
// import dayjs from "dayjs";
// import "../ProjectArchieved/style.css";
// import moment from "moment";
// import { Link } from "react-router-dom/cjs/react-router-dom.min";
// import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions";
// import { useDispatch } from "react-redux";
// import { getRoles } from "../../../util/hasPermission";
// import { removeTitle } from "../../../util/nameFilter";
// import MyAvatar from "../../Avatar/MyAvatar";
// import { generateCacheKey } from "../../../util/generateCacheKey";
// import ProjectArchivedFilterComponent from "./ProjectArchivedFilterComponent";

// function ProjectArchieved() {
//   const [form] = Form.useForm();
//   const { TextArea } = Input;
//   const { Option } = Select;
//   const dispatch = useDispatch();
//   const Search = Input.Search;
//   const searchRef = useRef();
//   const [formData] = Form.useForm();

//   const [pagination, setPagination] = useState({ current: 1, pageSize: 30 });
//   const [seachEnabled, setSearchEnabled] = useState(false);
//   const [searchText, setSearchText] = useState("");
//   const [sortColumn] = useState("_id");
//   const [sortOrder] = useState("des");
//   const [selectionType, setSelectionType] = useState("checkbox");
//   const [modalMode] = useState("add");
//   const [columnDetails, setColumnDetails] = useState([]);
//   const [filterData] = useState([]);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [data, setData] = useState([]);
//   const [showSelectassignees, setShowSelectassignees] = useState(false);
//   const [technologyList, setTechnologyList] = useState([]);
//   const [projectTech, setProjectTech] = useState([]);
//   const [projectTypeList, setProjectTypeList] = useState([]);
//   const [projectStatusList, setProjectStatusList] = useState([]);
//   const [projectAssigneesList, setProjectAssigneesList] = useState([]);
//   const [projectManagerList, setProjectManagerList] = useState([]);
//   const [showSelectproject, setShowSelectproject] = useState(false);
//   const [selectedManager, setSelectedManager] = useState([]);
//   const [selectedColor, setSelectedColor] = useState("#000000");
//   const [selectedsassignees, setSelectedsassignees] = useState([]);
//   const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
//   const [filterDataState, setFilterData] = useState(null);

//   //filters
//   const [status, setStatus] = useState([]);
//   const [manager, setManager] = useState([]);
//   const [technology, setTechnology] = useState([]);
//   const [projectType, setProjectType] = useState([]);
//   const [assignees, setAssignees] = useState([]);
//   const [sortOption, setSortOption] = useState("createdAt");

//   const handleSortFilter = (val) => {
//     setSortOption(val);
//   };

//   const formItemLayout = {
//     labelCol: {
//       xs: { span: 24 },
//       sm: { span: 8 },
//     },
//     wrapperCol: {
//       xs: { span: 24 },
//       sm: { span: 16 },
//     },
//   };

//   const filterEmp = async (values) => {
//     setFilterData(values);
//     setIsFilterModalOpen(false);
//     formData.resetFields();
//   };

//   const handleOk = () => {
//     setIsModalOpen(false);
//   };
//   const handleCancel = () => {
//     setIsModalOpen(false);
//     setShowSelectassignees(false);
//     setShowSelectproject(false);
//   };

//   const onSearch = (value) => {
//     setSearchText(value);
//     setPagination({ ...pagination, current: 1 });
//   };

//   const resetSearchFilter = (e) => {
//     const keyCode = e && e.keyCode ? e.keyCode : e;
//     switch (keyCode) {
//       case 8:
//         if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
//           searchRef.current.state.value = "";
//           setSearchText("");
//           setSearchEnabled(false);
//         }
//         break;
//       case 46:
//         if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
//           searchRef.current.state.value = "";
//           setSearchText("");
//           setSearchEnabled(false);
//         }
//         break;
//       default:
//         break;
//     }
//   };

//   const getFooterDetails = () => {
//     return (
//       <label>
//         Total Records Count is {pagination.total > 0 ? pagination.total : 0}
//       </label>
//     );
//   };

//   const projectArchieved = async (id) => {
//     try {
//       const response = await Service.makeAPICall({
//         methodName: Service.putMethod,
//         api_url: Service.projectArchieved + "/" + id,
//       });
//       if (response?.data && response?.data?.data && response?.data?.status) {
//         message.success(response.data.message);
//         getProjectListing();
//       } else {
//         message.error(response?.data?.message);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const columns = [
//     {
//       title: "Title",
//       dataIndex: "title",
//       key: "title",
//       width: "25%",
//       render: (text, record) => {
//         const Title = record?.title;
//         const ProjectId = record?._id;
//         const color = record?.color;
//         return (
//           <Link to={`project/app/${ProjectId}?tab=${record?.defaultTab?.name}`}>
//             <div className="project_title_main_div">
//               <span style={{ textTransform: "capitalize" }}>{Title}</span>
//             </div>
//           </Link>
//         );
//       },
//     },
//     {
//       title: "Date",
//       dataIndex: "date",
//       key: "date",
//       render: (_, record) => {
//         const startDate = moment(record?.start_date).format("DD-MM-YYYY");
//         const endDate = moment(record?.end_date).format("DD-MM-YYYY");
//         return (
//           <span style={{ textTransform: "capitalize" }}>
//             {startDate} - {endDate}
//           </span>
//         );
//       },
//     },
//     {
//       title: "Status",
//       dataIndex: "project_status",
//       key: "project_status",
//       render: (record) => {
//         const title = record?.title;
//         return <span>{title}</span>;
//       },
//     },
//     {
//       title: "Manager",
//       dataIndex: "manager",
//       key: "manager",
//       width: "12.5%",
//       render: (text, record) => {
//         const managerName = record?.manager?.full_name || "-";

//         return (
//           <div className="avtar-group">
//             <Tooltip title={removeTitle(managerName)}>
//               <MyAvatar
//                 src={record?.manager?.emp_img}
//                 key={record.manager?._id}
//                 alt={record?.manager?.full_name}
//                 userName={record?.manager?.full_name}
//               />
//             </Tooltip>
//           </div>
//         );
//       },
//     },

//     {
//       title: "Assignees",
//       dataIndex: "assignees",
//       key: "assignees",
//       width: "12.5%",
//       render: (text, record) => {
//         if (record?.assignees?.length) {
//           return (
//             <div className="avatar-group">
//               <Avatar.Group
//                 maxCount={2}
//                 maxPopoverTrigger="click"
//                 size="default"
//                 maxStyle={{
//                   color: "#f56a00",
//                   backgroundColor: "#fde3cf",
//                   cursor: "pointer",
//                 }}
//               >
//                 {record.assignees.map((data) => (
//                   <Tooltip title={removeTitle(data.name)} key={data._id}>
//                     <MyAvatar
//                       src={data.emp_img}
//                       key={data._id}
//                       alt={data.name}
//                       userName={data.name}
//                     />
//                   </Tooltip>
//                 ))}
//               </Avatar.Group>
//             </div>
//           );
//         }
//         return "-";
//       },
//     },
//     {
//       title: "Actions",
//       dataIndex: "actions",
//       key: "actions",
//       width: "12.5%",
//       render: (text, record) => {
//         return (
//           <div className="edit-delete">
//             <Popconfirm
//               title="Do you want to activate the archived project?"
//               okText="Yes"
//               cancelText="No"
//               onConfirm={() => projectArchieved(record?._id)}
//             >
//               <ProjectOutlined />
//             </Popconfirm>
//           </div>
//         );
//       },
//     },
//   ];

//   const onChange = (date, dateString) => {
//     console.log(date, dateString);
//   };

//   useEffect(() => {
//     setSelectedsassignees(data.assignees?.map((assignee) => assignee._id));
//     if (data?.assignees && data.assignees.length > 0) {
//       setShowSelectassignees(true);
//     } else {
//       setShowSelectassignees(false);
//     }
//     if (data?.manager) {
//       setShowSelectproject(true);
//     } else {
//       setShowSelectproject(false);
//     }
//     setSelectedColor(data.color);
//     form.setFieldsValue({
//       title: data.title?.trim(),
//       technology: data.technology?.project_tech,
//       project_type: data?.project_type?.project_type,
//       descriptions: data.descriptions,
//       assignees: data.assignees?.map((assignee) => assignee._id),
//       manager: data.manager?.full_name,
//       estimatedHours: data.estimatedHours,
//       project_status: data.project_status?.title,
//       start_date: data.start_date ? dayjs(data.start_date) : null,
//       end_date: data.end_date ? dayjs(data.end_date) : null,
//     });
//   }, [data]);

//   const handleButtonassignees = () => {
//     if (selectedsassignees?.length === 0) {
//       setShowSelectassignees(!showSelectassignees);
//     } else {
//       setShowSelectassignees(true);
//     }
//   };

//   const handleButtonproject = () => {
//     if (selectedManager) {
//       setShowSelectproject(true);
//     } else {
//       setShowSelectproject(!showSelectproject);
//     }
//   };

//   const handleClearAssignees = () => {
//     setSelectedsassignees([]);
//     setShowSelectassignees(false);
//   };

//   useEffect(() => {
//     getTechnologyList();
//     getProjectType();
//     getStatus();
//     getProjectassignees();
//     getManager();
//   }, []);

//   const handleProjectTech = (val) => {
//     setProjectTech(val);
//   };

//   const handlerAssignes = (val) => {
//     setSelectedsassignees(val);
//   };

//   const handleSelectProjectManager = (val) => {
//     setSelectedManager(val);
//   };

//   // add the project
//   const addProjectDetails = async (values) => {
//     try {
//       dispatch(showAuthLoader());
//       // const assignees = Array.from(selectedsassignees);
//       const assignees = [...(selectedsassignees || [])];

//       const reqBody = {
//         title: values?.title.trim(),
//         // ...values,
//         assignees: assignees,
//         color: selectedColor || "#000000",
//         start_date: values?.start_date,
//         end_date: values?.end_date,
//         estimatedHours: values?.estimatedHours || "0",
//         manager: values?.manager,
//         project_status: values?.project_status,
//         project_type: values?.project_type,
//         technology: values?.technology,
//       };

//       form.setFieldsValue({
//         assignees: assignees,
//       });
//       const response = await Service.makeAPICall({
//         methodName: Service.postMethod,
//         api_url: Service.addProjectdetails,
//         body: reqBody,
//       });
//       dispatch(hideAuthLoader());
//       if (response?.data && response?.data?.data && response?.data?.status) {
//         message.success(response.data.message);
//         form.resetFields();
//         getProjectListing();
//         setIsModalOpen(false);
//       } else {
//         message.error(response?.data?.message);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   // get tech list
//   const getTechnologyList = async () => {
//     try {
//       dispatch(showAuthLoader());
//       const reqBody = {
//         pageNo: pagination.current,
//         limit: pagination.pageSize,
//         search: searchText,
//         sortBy: "desc",
//         isDropdown: true,
//       };
//       const response = await Service.makeAPICall({
//         methodName: Service.postMethod,
//         api_url: Service.getprojectTech,
//         body: reqBody,
//       });
//       dispatch(hideAuthLoader());
//       if (response?.data && response?.data?.data) {
//         setTechnologyList(response?.data?.data);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   // get projecttype list
//   const getProjectType = async () => {
//     try {
//       dispatch(showAuthLoader());
//       const response = await Service.makeAPICall({
//         methodName: Service.postMethod,
//         api_url: Service.getProjectListing,
//       });
//       dispatch(hideAuthLoader());
//       if (response.data && response.data.data) {
//         setProjectTypeList(response.data.data);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   // get project assignees list
//   const getProjectassignees = async (values) => {
//     try {
//       dispatch(showAuthLoader());
//       const reqBody = {
//         ...values,
//       };
//       const response = await Service.makeAPICall({
//         methodName: Service.getMethod,
//         api_url: Service.getEmployees,
//         body: reqBody,
//       });
//       dispatch(hideAuthLoader());
//       if (response?.data && response?.data?.data) {
//         setProjectAssigneesList(response?.data?.data);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   // get manager list
//   const getManager = async (values) => {
//     try {
//       dispatch(showAuthLoader());
//       const reqBody = {
//         ...values,
//       };
//       const response = await Service.makeAPICall({
//         methodName: Service.getMethod,
//         api_url: Service.getProjectManager,
//         body: reqBody,
//       });
//       dispatch(hideAuthLoader());
//       if (response?.data && response?.data?.data) {
//         setProjectManagerList(response?.data?.data);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   // get status list
//   const getStatus = async () => {
//     dispatch(showAuthLoader());
//     try {
//       const reqBody = {
//         isDropdown: true,
//       };
//       const response = await Service.makeAPICall({
//         methodName: Service.postMethod,
//         api_url: Service.getProjectStatus,
//         body: reqBody,
//       });
//       dispatch(hideAuthLoader());
//       if (response?.data && response?.data?.data) {
//         setProjectStatusList(response?.data?.data);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   useEffect(() => {
//     getProjectListing();
//   }, [
//     filterDataState,
//     searchText,
//     pagination.current,
//     pagination.pageSize,
//     sortOrder,
//     sortColumn,
//   ]);

//   // get project list
//   const getProjectListing = async (mt) => {
//     try {
//       dispatch(showAuthLoader());
//       const defaultPayload = {
//         pageNo: pagination.current,
//         limit: pagination.pageSize,
//         search: searchText,
//         sortBy: "desc",
//         filterBy: "all",
//         color: "",
//         isArchived: true,
//         sort: sortOption,
//       };
//       const reqBody = {
//         ...defaultPayload,
//       };
//       if (searchText && searchText !== "") {
//         reqBody.search = searchText;
//         setSearchEnabled(true);
//       }
//       if (status && status.length > 0) {
//         reqBody.project_status = status;
//       }

//       if (manager && manager.length > 0) {
//         reqBody.manager_id = manager;
//       }

//       if (technology && technology.length > 0) {
//         reqBody.technology = technology;
//       }

//       if (projectType && projectType.length > 0) {
//         reqBody.project_type = projectType;
//       }

//       if (assignees && assignees.length > 0) {
//         reqBody.assignee_id = assignees;
//       }

//       let Key = generateCacheKey("project", reqBody);

//       const response = await Service.makeAPICall({
//         methodName: Service.postMethod,
//         api_url: Service.getProjectdetails,
//         body: reqBody,
//         options: {
//           cachekey: Key,
//         },
//       });
//       dispatch(hideAuthLoader());
//       if (response?.data && response?.data?.data?.length > 0) {
//         setColumnDetails(response.data.data);
//         if (filterData?.isActive == true) {
//           setPagination((prevPagination) => ({
//             ...prevPagination,
//             total: response.data.metadata.total,
//           }));
//         } else {
//           setPagination({
//             ...pagination,
//             total: response.data.metadata.total,
//           });
//         }
//       } else {
//         setColumnDetails([]);
//         setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const getManagerIdByName = (managerName) => {
//     const manager = projectManagerList.find(
//       (mgr) => mgr.manager_name === managerName
//     );
//     return manager;
//   };

//   // edit project
//   const editProjectdetails = async (id, values) => {
//     console.log(values, "640");
//     try {
//       dispatch(showAuthLoader());
//       const assignees = Array.from(selectedsassignees);
//       const managerId = getManagerIdByName(values?.manager);

//       const reqBody = {
//         ...values,
//         color: selectedColor,
//         assignees: assignees,
//         technology: values?.technology
//           ? values?.technology
//           : data?.technology?._id,
//         project_type: values?.project_type
//           ? values?.project_type
//           : data.project_type?._id,
//         project_status: values?.project_status
//           ? values?.project_status
//           : data.project_status?._id,
//         manager: managerId ? managerId?._id : values?.manager,
//       };
//       const params = `/${id}`;

//       const response = await Service.makeAPICall({
//         methodName: Service.putMethod,
//         api_url: Service.updateProjectdetails + params,
//         body: reqBody,
//       });
//       dispatch(hideAuthLoader());
//       if (response?.data && response?.data?.data && response?.data?.status) {
//         message.success(response.data.message);
//         setIsModalOpen(false);
//         setData(response.data.data);
//       } else {
//         message.error(response?.data.message);
//       }
//       getProjectListing();
//       //  else {
//       // }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const handleTableChange = (page) => {
//     setPagination({ ...pagination, ...page });
//   };

//   const handleCancelFilterModel = () => {
//     setIsFilterModalOpen(false);
//     formData.resetFields();
//   };

//   const onReset = () => {
//     formData.resetFields();
//     setFilterData(null);
//   };

//   const handleStatus = (val) => {
//     if (val === "") {
//       setStatus([]);
//     } else {
//       if (status.includes(val._id)) {
//         setStatus(status.filter((id) => id !== val._id));
//       } else {
//         setStatus([...status, val._id]);
//       }
//     }
//   };

//   const handleManager = (val) => {
//     if (val === "") {
//       setManager([]);
//     } else {
//       if (manager.includes(val._id)) {
//         setManager(manager.filter((id) => id !== val._id));
//       } else {
//         setManager([...manager, val._id]);
//       }
//     }
//   };

//   const handleTechnology = (val) => {
//     if (val === "") {
//       setTechnology([]);
//     } else {
//       if (technology.includes(val._id)) {
//         setTechnology(technology.filter((id) => id !== val._id));
//       } else {
//         setTechnology([...technology, val._id]);
//       }
//     }
//   };

//   const handleProjectType = (val) => {
//     if (val === "") {
//       setProjectType([]);
//     } else {
//       if (projectType.includes(val._id)) {
//         setProjectType(projectType.filter((id) => id !== val._id));
//       } else {
//         setProjectType([...projectType, val._id]);
//       }
//     }
//   };

//   const handleAssignees = (val) => {
//     if (val === "") {
//       setAssignees([]);
//     } else {
//       if (assignees.includes(val._id)) {
//         setAssignees(assignees.filter((id) => id !== val._id));
//       } else {
//         setAssignees([...assignees, val._id]);
//       }
//     }
//   };

//   const [searchAssignees, setsearchAssignees] = useState("");
//   const [searchManager, setsearchManager] = useState("");
//   const [searchTechnology, setsearchTechnology] = useState("");

//   // Function to handle search term change
//   const handleSearchTermAssignees = (e) => {
//     setsearchAssignees(e.target.value);
//   };

//   const handleSearchManager = (e) => {
//     setsearchManager(e.target.value);
//   };

//   const handleSearchTechnology = (e) => {
//     setsearchTechnology(e.target.value);
//   };

//   // Function to filter technology list based on search term
//   const filteredTechnologyList = technologyList.filter((item) =>
//     item?.project_tech?.toLowerCase().includes(searchTechnology?.toLowerCase())
//   );

//   const filteredManagerList = projectManagerList.filter((item) =>
//     item.manager_name?.toLowerCase().includes(searchManager?.toLowerCase())
//   );

//   const filteredAssigneesList = projectAssigneesList.filter((item) =>
//     item.full_name?.toLowerCase().includes(searchAssignees?.toLowerCase())
//   );

//   return (
//     <div className="ant-project-task archived-main-wrapper ">
//       <Card>
//         <div className="heading-wrapper">
//           <div className="heading-main">
//             <h2>Archived Projects</h2>
//           </div>
//         </div>

//         <div className="global-search">
//           <Search
//             ref={searchRef}
//             placeholder="Search..."
//             style={{ width: 200 }}
//             onSearch={onSearch}
//             onKeyUp={resetSearchFilter}
//           />
//           <div className="filter-section">
//             <ProjectArchivedFilterComponent
//               // Filter state props
//               status={status}
//               manager={manager}
//               technology={technology}
//               projectType={projectType}
//               assignees={assignees}
//               sortOption={sortOption}
//               // Handler functions
//               handleStatus={handleStatus}
//               handleManager={handleManager}
//               handleTechnology={handleTechnology}
//               handleProjectType={handleProjectType}
//               handleAssignees={handleAssignees}
//               handleSortFilter={handleSortFilter}
//               // Data props
//               projectStatusList={projectStatusList}
//               projectManagerList={projectManagerList}
//               technologyList={technologyList}
//               projectTypeList={projectTypeList}
//               projectAssigneesList={projectAssigneesList}
//               // Search states
//               searchManager={searchManager}
//               searchTechnology={searchTechnology}
//               searchAssignees={searchAssignees}
//               handleSearchManager={handleSearchManager}
//               handleSearchTechnology={handleSearchTechnology}
//               handleSearchTermAssignees={handleSearchTermAssignees}
//               // Filtered data
//               filteredManagerList={filteredManagerList}
//               filteredTechnologyList={filteredTechnologyList}
//               filteredAssigneesList={filteredAssigneesList}
//               // Common props
//               getProjectListing={getProjectListing}
//               getRoles={getRoles}
//             />
//           </div>
//         </div>

//         <Modal
//           title="Filter"
//           width={1000}
//           open={isFilterModalOpen}
//           footer={false}
//           // onOk={handleOkFilterModel}
//           onCancel={handleCancelFilterModel}
//         >
//           <div className="filter-pop-wrapper">
//             <Row>
//               <Col span={24}>
//                 <Form form={formData} {...formItemLayout} onFinish={filterEmp}>
//                   <div className="inout-employee">
//                     <Row>
//                       <Col sm={24} lg={12}>
//                         <div className="filter-employeelist">
//                           <Form.Item
//                             label="Project Status"
//                             name="project_status"
//                           >
//                             <Select
//                               size="large"
//                               showSearch
//                               // optionFilterProp="children"
//                               filterOption={(input, option) =>
//                                 option.children
//                                   ?.toLowerCase()
//                                   .indexOf(input?.toLowerCase()) >= 0
//                               }
//                               filterSort={(optionA, optionB) =>
//                                 optionA.children
//                                   ?.toLowerCase()
//                                   .localeCompare(
//                                     optionB.children?.toLowerCase()
//                                   )
//                               }
//                               onDropdownVisibleChange={(open) => {
//                                 if (open) {
//                                   getStatus();
//                                 }
//                               }}
//                             >
//                               {projectStatusList.map((item, index) => (
//                                 <>
//                                   <Option
//                                     key={index}
//                                     value={item._id}
//                                     style={{ textTransform: "capitalize" }}
//                                   >
//                                     {item.title}
//                                   </Option>
//                                 </>
//                               ))}
//                             </Select>
//                           </Form.Item>
//                         </div>
//                       </Col>
//                       <Col span={12}>
//                         <div>
//                           <Form.Item label="Project Manager" name="manager">
//                             <Select
//                               size="large"
//                               showSearch
//                               filterOption={(input, option) =>
//                                 option.children
//                                   ?.toLowerCase()
//                                   .indexOf(input?.toLowerCase()) >= 0
//                               }
//                               filterSort={(optionA, optionB) =>
//                                 optionA.children
//                                   ?.toLowerCase()
//                                   .localeCompare(
//                                     optionB.children?.toLowerCase()
//                                   )
//                               }
//                               onDropdownVisibleChange={(open) => {
//                                 if (open) {
//                                   getManager();
//                                 }
//                               }}
//                             >
//                               {projectManagerList.map((item, index) => (
//                                 <Option
//                                   key={index}
//                                   value={item?._id}
//                                   style={{ textTransform: "capitalize" }}
//                                 >
//                                   {item.manager_name}
//                                 </Option>
//                               ))}
//                             </Select>
//                           </Form.Item>
//                         </div>
//                       </Col>
//                       <Col span={12}>
//                         <Form.Item label="Technology" name="technology">
//                           <Select
//                             size="large"
//                             showSearch
//                             filterOption={(input, option) =>
//                               option.children
//                                 ?.toLowerCase()
//                                 .indexOf(input?.toLowerCase()) >= 0
//                             }
//                             filterSort={(optionA, optionB) =>
//                               optionA.children
//                                 ?.toLowerCase()
//                                 .localeCompare(optionB.children?.toLowerCase())
//                             }
//                             onChange={handleProjectTech}
//                             value={projectTech}
//                           >
//                             {technologyList.map((item, index) => (
//                               <>
//                                 <Option
//                                   key={index}
//                                   value={item._id}
//                                   style={{ textTransform: "capitalize" }}
//                                 >
//                                   {item?.project_tech}
//                                 </Option>
//                               </>
//                             ))}
//                           </Select>
//                         </Form.Item>
//                       </Col>
//                       <Col span={12}>
//                         <Form.Item label="Category" name="project_type">
//                           <Select
//                             size="large"
//                             showSearch
//                             filterOption={(input, option) =>
//                               option.children
//                                 ?.toLowerCase()
//                                 .indexOf(input?.toLowerCase()) >= 0
//                             }
//                             filterSort={(optionA, optionB) =>
//                               optionA.children
//                                 ?.toLowerCase()
//                                 .localeCompare(optionB.children?.toLowerCase())
//                             }
//                           >
//                             {projectTypeList.map((item, index) => (
//                               <>
//                                 <Option
//                                   key={index}
//                                   value={item._id}
//                                   style={{ textTransform: "capitalize" }}
//                                 >
//                                   {item.project_type}
//                                 </Option>
//                               </>
//                             ))}
//                           </Select>
//                         </Form.Item>
//                       </Col>
//                       <Col span={12}>
//                         <Form.Item label="Assignees" name="assignees">
//                           <Select
//                             size="large"
//                             showSearch
//                             optionFilterProp="children"
//                             filterOption={(input, option) =>
//                               option.children
//                                 ?.toLowerCase()
//                                 .indexOf(input?.toLowerCase()) >= 0
//                             }
//                             filterSort={(optionA, optionB) =>
//                               optionA.children
//                                 ?.toLowerCase()
//                                 .localeCompare(optionB.children?.toLowerCase())
//                             }
//                             onDropdownVisibleChange={(open) => {
//                               if (open) {
//                                 getProjectassignees();
//                               }
//                             }}
//                           >
//                             {projectAssigneesList.map((item, index) => (
//                               <Option
//                                 key={index}
//                                 value={item._id}
//                                 style={{ textTransform: "capitalize" }}
//                               >
//                                 {item.full_name}
//                               </Option>
//                             ))}
//                           </Select>
//                         </Form.Item>
//                       </Col>
//                     </Row>
//                     <div className="filter-btn-wrapper">
//                       <Button
//                         className="ant-btn-primary"
//                         type="primary"
//                         htmlType="submit"
//                       >
//                         Apply
//                       </Button>
//                       <Button type="primary" onClick={onReset}>
//                         Reset
//                       </Button>
//                       <Button
//                         type="primary"
//                         className="ant-delete"
//                         onClick={handleCancelFilterModel}
//                       >
//                         Cancel
//                       </Button>
//                     </div>{" "}
//                   </div>
//                 </Form>
//               </Col>
//             </Row>
//           </div>
//         </Modal>

//         <div className="project-radio">
//           <Radio.Group
//             onChange={({ target: { value } }) => {
//               setSelectionType(value);
//             }}
//             value={selectionType}
//           />
//         </div>
//         <div className="block-table-content new-block-table">
//           <Table
//             columns={columns}
//             dataSource={columnDetails}
//             footer={getFooterDetails}
//             pagination={{
//               showSizeChanger: true,
//               pageSizeOptions: ["10", "20", "25", "30"],
//               ...pagination,
//             }}
//             onChange={handleTableChange}
//             scroll={{
//               x: "100%",
//             }}
//           />
//         </div>
//       </Card>

//       <Modal
//         open={isModalOpen}
//         onOk={handleOk}
//         onCancel={handleCancel}
//         className="project-add-wrapper"
//         title={modalMode === "add" ? "Add Project" : "Edit Project"}
//         destroyOnClose
//         width={800}
//         footer={[
//           <Button
//             key="cancel"
//             onClick={handleCancel}
//             size="large"
//             className="square-outline-btn ant-delete"
//           >
//             Cancel
//           </Button>,
//           <Button
//             key="submit"
//             type="primary"
//             size="large"
//             className="square-primary-btn"
//             onClick={() => form.submit()}
//           >
//             Save
//           </Button>,
//         ]}
//       >
//         <div className="overview-modal-wrapper">
//           <Form
//             form={form}
//             onFinish={(values) => {
//               modalMode === "add"
//                 ? addProjectDetails(values)
//                 : editProjectdetails(data?._id, values);
//             }}
//           >
//             <div className="topic-cancel-wrapper">
//               <Form.Item label="Project label color">
//                 <Input
//                   type="color"
//                   label="color"
//                   name="color"
//                   onChange={(e) => setSelectedColor(e.target.value)}
//                   value={selectedColor}
//                 />
//               </Form.Item>
//               <Form.Item
//                 name="title"
//                 rules={[
//                   {
//                     required: true,
//                     whitespace: true,
//                     message: "Please enter a valid title",
//                   },
//                 ]}
//               >
//                 <Input placeholder="01-2021-SO3089/TM/Elsner.com" />
//               </Form.Item>
//               <Row>
//                 <Col span={12}>
//                   <Form.Item
//                     name="technology"
//                     rules={[
//                       {
//                         required: true,
//                         message: "Please select a technology",
//                       },
//                     ]}
//                   >
//                     <Select
//                       placeholder="Technology"
//                       size="large"
//                       showSearch
//                       filterOption={(input, option) =>
//                         option.children
//                           ?.toLowerCase()
//                           .indexOf(input?.toLowerCase()) >= 0
//                       }
//                       filterSort={(optionA, optionB) =>
//                         optionA.children
//                           ?.toLowerCase()
//                           .localeCompare(optionB.children?.toLowerCase())
//                       }
//                       onChange={handleProjectTech}
//                       value={projectTech}
//                     >
//                       {technologyList.map((item, index) => (
//                         <>
//                           <Option
//                             key={index}
//                             value={item._id}
//                             style={{ textTransform: "capitalize" }}
//                           >
//                             {item?.project_tech}
//                           </Option>
//                         </>
//                       ))}
//                     </Select>
//                   </Form.Item>
//                 </Col>
//                 <Col span={12}>
//                   <Form.Item
//                     name="project_type"
//                     rules={[
//                       {
//                         required: true,
//                         message: "Please select a category",
//                       },
//                     ]}
//                   >
//                     <Select
//                       placeholder="Category"
//                       size="large"
//                       showSearch
//                       filterOption={(input, option) =>
//                         option.children
//                           ?.toLowerCase()
//                           .indexOf(input?.toLowerCase()) >= 0
//                       }
//                       filterSort={(optionA, optionB) =>
//                         optionA.children
//                           ?.toLowerCase()
//                           .localeCompare(optionB.children?.toLowerCase())
//                       }
//                     >
//                       {projectTypeList.map((item, index) => (
//                         <>
//                           <Option
//                             key={index}
//                             value={item._id}
//                             style={{ textTransform: "capitalize" }}
//                           >
//                             {item?.project_type}
//                           </Option>
//                         </>
//                       ))}
//                     </Select>
//                   </Form.Item>
//                 </Col>
//               </Row>

//               <Form.Item name="descriptions">
//                 <TextArea placeholder="Description"></TextArea>
//               </Form.Item>

//               <Row>
//                 <Col span={12}>
//                   <Form.Item
//                     label="Assignees"
//                     name="assignees"
//                     className="subscriber-btn"
//                   >
//                     {!showSelectassignees && (
//                       <Button
//                         className="list-add-btn"
//                         icon={<PlusOutlined />}
//                         onClick={handleButtonassignees}
//                       ></Button>
//                     )}
//                     {showSelectassignees && (
//                       <Select
//                         size="large"
//                         showSearch
//                         mode="multiple"
//                         optionFilterProp="children"
//                         filterOption={(input, option) =>
//                           option.children
//                             ?.toLowerCase()
//                             .indexOf(input?.toLowerCase()) >= 0
//                         }
//                         filterSort={(optionA, optionB) =>
//                           optionA.children
//                             ?.toLowerCase()
//                             .localeCompare(optionB.children?.toLowerCase())
//                         }
//                         onChange={handlerAssignes}
//                         value={selectedsassignees}
//                       >
//                         {projectAssigneesList.map((item, index) => (
//                           <Option
//                             key={index}
//                             value={item._id}
//                             style={{ textTransform: "capitalize" }}
//                           >
//                             {item.full_name}
//                           </Option>
//                         ))}
//                       </Select>
//                     )}
//                     <div className="clear-btn ant-delete">
//                       <Button
//                         className="bg-transperent"
//                         onClick={handleClearAssignees}
//                       >
//                         Clear
//                       </Button>
//                     </div>
//                   </Form.Item>
//                 </Col>
//                 <Col span={12}>
//                   <Form.Item
//                     label="Project manager"
//                     name="manager"
//                     className="subscriber-btn"
//                     rules={[
//                       {
//                         required: true,
//                         message: "Please select a project manager",
//                       },
//                     ]}
//                   >
//                     {!showSelectproject && (
//                       <Button
//                         className="list-add-btn"
//                         icon={<PlusOutlined />}
//                         onClick={handleButtonproject}
//                       ></Button>
//                     )}
//                     {showSelectproject && (
//                       <Select
//                         size="large"
//                         showSearch
//                         // optionFilterProp="children"
//                         filterOption={(input, option) =>
//                           option.children
//                             ?.toLowerCase()
//                             .indexOf(input?.toLowerCase()) >= 0
//                         }
//                         filterSort={(optionA, optionB) =>
//                           optionA.children
//                             ?.toLowerCase()
//                             .localeCompare(optionB.children?.toLowerCase())
//                         }
//                         onChange={handleSelectProjectManager}
//                       >
//                         {projectManagerList.map((item, index) => (
//                           <>
//                             <Option
//                               key={index}
//                               value={item._id}
//                               style={{ textTransform: "capitalize" }}
//                             >
//                               {item.manager_name}
//                             </Option>
//                           </>
//                         ))}
//                       </Select>
//                     )}
//                   </Form.Item>
//                 </Col>
//               </Row>
//               <Row>
//                 <Col span={12}>
//                   <Form.Item
//                     label="Project Estimated Hours"
//                     name="estimatedHours"
//                   >
//                     <Input type="number" />
//                   </Form.Item>
//                 </Col>
//                 <Col span={12}>
//                   <Form.Item
//                     label="Status"
//                     name="project_status"
//                     rules={[
//                       { required: true, message: "Please select a status" },
//                     ]}
//                   >
//                     <Select
//                       size="large"
//                       showSearch
//                       filterOption={(input, option) =>
//                         option.children
//                           ?.toLowerCase()
//                           .indexOf(input?.toLowerCase()) >= 0
//                       }
//                       filterSort={(optionA, optionB) =>
//                         optionA.children
//                           ?.toLowerCase()
//                           .localeCompare(optionB.children?.toLowerCase())
//                       }
//                     >
//                       {projectStatusList.map((item, index) => (
//                         <>
//                           <Option
//                             key={index}
//                             value={item._id}
//                             style={{ textTransform: "capitalize" }}
//                           >
//                             {item.title}
//                           </Option>
//                         </>
//                       ))}
//                     </Select>
//                   </Form.Item>
//                 </Col>
//               </Row>
//               <Row>
//                 <Col span={12}>
//                   <Form.Item
//                     label="Start Date"
//                     name="start_date"
//                     rules={[
//                       {
//                         required: true,
//                         message: "Please select a start date",
//                       },
//                     ]}
//                   >
//                     <DatePicker
//                       placeholder="Start Date"
//                       onChange={(date, dateString) => {
//                         onChange(date, dateString, "start_date");
//                         form.setFieldValue({ end_date: "" });
//                       }}
//                     />
//                   </Form.Item>
//                 </Col>
//                 <Col span={12}>
//                   <Form.Item
//                     label="End Date"
//                     name="end_date"
//                     rules={[
//                       {
//                         required: true,
//                         message: "Please select an end date",
//                       },
//                     ]}
//                   >
//                     <DatePicker
//                       placeholder="End Date"
//                       onChange={(date, dateString) =>
//                         onChange(date, dateString, "end_date")
//                       }
//                       disabledDate={(value) => {
//                         return value < form.getFieldValue("start_date");
//                       }}
//                     />
//                   </Form.Item>
//                 </Col>
//               </Row>
//               <div className="modal-footer-flex">
//                 <div className="flex-btn"></div>
//               </div>
//             </div>
//           </Form>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// export default ProjectArchieved;
