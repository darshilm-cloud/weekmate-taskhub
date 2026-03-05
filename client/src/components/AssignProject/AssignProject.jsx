import React, { useEffect, useRef, useState } from "react";
import { Input, Table, Popconfirm, message, Button, Card } from "antd";
import { DeleteTwoTone, EditTwoTone, PlusOutlined } from "@ant-design/icons";
import { Link, useParams, useHistory } from "react-router-dom/cjs/react-router-dom.min";
import moment from "moment";
import Service from "../../service";
import { hasPermission } from "../../util/hasPermission";
import { generateCacheKey } from "../../util/generateCacheKey";
import MyAvatar from "../Avatar/MyAvatar";
import MyAvatarGroup from "../AvatarGroup/MyAvatarGroup";
import AssignProjectFilter from "./AssignProjectFilter";
import SortByComponent from "./SortByComponent";
import ProjectFormModal from "./ProjectFormModal";
import "./AssignProject.css";

const AssignProject = () => {
  const { editProjectId } = useParams();
  const companySlug = localStorage.getItem("companyDomain");
  
  const history = useHistory();
  const searchRef = useRef();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedProject, setSelectedProject] = useState(null);
  const [isloadingProject, setIsloadingProject] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 30,
  });
  const [searchText, setSearchText] = useState("");
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [sortOption, setSortOption] = useState("createdAt");
  const [columnDetails, setColumnDetails] = useState([]);
  
  // Add filter state to persist filters
  const [currentFilters, setCurrentFilters] = useState({});
  const [currentSkipFilters, setCurrentSkipFilters] = useState([]);

  useEffect(() => {
    if(editProjectId){
      getProjectByID()
    }
  }, [editProjectId])
  

  // Update useEffect to include filter dependencies
  useEffect(() => {
    getProjectListing(currentSkipFilters, currentFilters);
  }, [searchText, pagination.current, pagination.pageSize, sortOption, currentFilters, currentSkipFilters]);

  const getProjectListing = async (skipFilters = currentSkipFilters, filterStats = currentFilters) => {
    try {
      setIsloadingProject(true);
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        sortBy: "desc",
        filterBy: "all",
        sort: sortOption,
      };

      const shouldSkip = (filterKey) =>
        skipFilters.includes("skipAll") || skipFilters.includes(filterKey);

      if (!shouldSkip("skipManager") && filterStats?.manager?.length > 0) {
        reqBody.manager_id = filterStats.manager;
      }
      if (!shouldSkip("skipAccountManager") && filterStats?.account_manager?.length > 0) {
        reqBody.acc_manager_id = filterStats.account_manager;
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

      if (response?.data?.data?.length > 0) {
        setColumnDetails(response.data.data);
        setPagination((prev) => ({ ...prev, total: response.data.metadata.total }));
      } else {
        setColumnDetails([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
      }
      setIsloadingProject(false);
    } catch (error) {
      setIsloadingProject(false);
      console.error(error);
    }
  };

  const getProjectByID = async () => {
    try {
      const reqBody = {
        _id: editProjectId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody
      });
      if (response?.data?.status) {
        setSelectedProject(response.data.data);
        setModalMode("Edit");
        setIsModalOpen(true);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteProject = async (id) => {
    try {
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteProjectdetails + params,
      });
      if (response.data?.data && response?.data?.status) {
        message.success(response.data.message);
        const isLastItemOnPage = columnDetails.length === 1 && pagination.current > 1;
        if (isLastItemOnPage) {
          setPagination((prev) => ({ ...prev, current: prev.current - 1 }));
        }
        getProjectListing();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

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

  const showTotal = (total) => `Total Records Count is ${total}`;

  const handleSortFilter = (val) => {
    setSortOption(val);
  };

  const handleTableChange = (page) => {
    setPagination({ ...pagination, ...page });
  };

  // New handler for filter changes that persists the filters
  const handleFilterChange = (skipFilters = [], filterStats = {}) => {
    setCurrentFilters(filterStats);
    setCurrentSkipFilters(skipFilters);
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page when filters change
  };

  const showModal = (project = null) => {
    setSelectedProject(project);
    setIsModalOpen(true);
    setModalMode(project ? "Edit" : "add");
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
    if (editProjectId) {
      history.push(`/${companySlug}/project/app/${editProjectId}`);
    }
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text, record) => {
        const formattedTitle = record?.title?.replace(/(?:^|\s)([a-z])/g, (match, group1) => match.charAt(0) + group1.toUpperCase());
        return (
          <Link to={`/${companySlug}/project/app/${record._id}?tab=${record?.defaultTab?.name}`}
          >
            <div className="project_title_main_div">
              <span>{formattedTitle}</span>
            </div>
          </Link>
        );
      },
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 200,
      render: (_, record) => {
        const startDate = moment(record?.start_date).isValid() ? moment(record.start_date).format("DD MMM YY") : "";
        const endDate = moment(record?.end_date).isValid() ? moment(record.end_date).format("DD MMM YY") : "";
        return (
          <span style={{ textTransform: "capitalize" }}>
            {startDate} - {endDate}
          </span>
        );
      },
    },
    {
      title: "AM",
      dataIndex: "acc_manager",
      key: "acc_manager",
      width: 100,
      render: (text, record) => (
        <div className="avtar-group">
          {record?.acc_manager ? (
            <MyAvatar
              userName={record.acc_manager.full_name || "-"}
              src={record.acc_manager.emp_img}
              key={record.acc_manager._id}
              alt={record.acc_manager.full_name}
            />
          ) : (
            " - "
          )}
        </div>
      ),
    },
    {
      title: "PM",
      dataIndex: "manager",
      key: "manager",
      width: 100,
      render: (text, record) => (
        <div className="avtar-group">
          {record?.manager ? (
            <MyAvatar
              userName={record.manager.full_name || "-"}
              src={record.manager.emp_img}
              key={record.manager._id}
              alt={record.manager.full_name}
            />
          ) : (
            " - "
          )}
        </div>
      ),
    },
    {
      title: "Assignees",
      dataIndex: "assignees",
      key: "assignees",
      width: 150,
      render: (text, record) => (
        <div className="avtar-group">
          <MyAvatarGroup record={record.assignees} maxPopoverTrigger={"click"} />
        </div>
      ),
    },
    // {
    //   title: "Progress",
    //   dataIndex: "completionPercentage",
    //   key: "progress",
    //   width: 100,
    //   render: (text, record) => {
    //     const percentage = record?.completionPercentage || 0;
    //     let color;
    //     if (percentage >= 70) {
    //       color = "green"; // High progress
    //     } else if (percentage >= 30) {
    //       color = "orange"; // Medium progress
    //     } else {
    //       color = "red"; // Low progress
    //     }
  
    //     return (
    //       <span style={{ color: color }}>
    //         {percentage}% 
    //       </span>
    //     );
    //   },
    // },
  ];

  if (hasPermission(["project_edit"])) {
    columns.push({
      title: "Action",
      dataIndex: "actions",
      key: "actions",
      width: 100,
      render: (text, record) => {
        return (
          <div className="edit-delete" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {hasPermission(["project_edit"]) && (
              <div
                onClick={() => showModal(record)}
                style={{ cursor: "pointer" }}
                title="Edit"
              >
                <EditTwoTone twoToneColor="green" />
              </div>
            )}
            {hasPermission(["project_delete"]) && (
              <Popconfirm
                title="Do you want to delete?"
                okText="Yes"
                cancelText="No"
                onConfirm={() => deleteProject(record._id)}
              >
                <div style={{ cursor: "pointer" }} title="Delete">
                  <DeleteTwoTone twoToneColor="red" />
                </div>
              </Popconfirm>
            )}
          </div>
        );
      },
    });
  }

  return (
    <div className="ant-project-task all-project-main-wrapper">
      <Card>
        <div className="heading-wrapper">
          <div className="heading-main">
            <h2>All Projects</h2>
          </div>
          {hasPermission(["project_add"]) && (
            <Button
              icon={<PlusOutlined />}
              type="primary"
              className="square-primary-btn"
              onClick={() => showModal()}
            >
              Add Project
            </Button>
          )}
        </div>
        <div className="global-search">
          <Input.Search
            ref={searchRef}
            placeholder="Search..."
            onSearch={onSearch}
            onKeyUp={resetSearchFilter}
          />
          <div className="filter-btn-wrapper">
            <AssignProjectFilter
              getRoles={() => hasPermission}
              onFilterChange={handleFilterChange} // Updated to use new handler
            />
            <SortByComponent
              sortOption={sortOption}
              handleSortFilter={handleSortFilter}
              getProjectListing={getProjectListing}
            />
          </div>
        </div>
        <div className="block-table-content new-block-table">
          <Table
            columns={columns}
            dataSource={columnDetails}
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "30"],
              showTotal,
              ...pagination,
            }}
            onChange={handleTableChange}
            loading={isloadingProject}
          />
        </div>
        {isModalOpen && (
          <ProjectFormModal
            isModalOpen={isModalOpen}
            modalMode={modalMode}
            selectedProject={selectedProject}
            handleCancel={handleCancel}
            setIsModalOpen={setIsModalOpen}
            triggerRefreshList={() => getProjectListing()}
          />
        )}
      </Card>
    </div>
  );
};

export default AssignProject;