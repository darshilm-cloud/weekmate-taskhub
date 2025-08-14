import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  Button,
  Card,
  Table,
  Popconfirm,
} from "antd";
import "../../components/AssignProject/AssignProject.css";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
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
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { message } from "antd";

const Complaints = () => {
  const companySlug = localStorage.getItem("companyDomain");
  const dispatch = useDispatch();

  const [complaintList, setComplaintList] = useState([]);
  const [selectedProject, setSelectedProject] = useState([]);
  const [technology, setTechnology] = useState([]);
  const [manager, setManager] = useState([]);
  const [accontManager, setAccountManager] = useState([]);
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });

  useEffect(() => {
    getComplaintList();
  }, [pagination.current, pagination.pageSize, selectedProject, technology, manager, accontManager, priority, status]);

  const onFilterChange = (skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setSelectedProject([]);
      setTechnology([]);
      setManager([]);
      setAccountManager([]);
      setPriority("");
      setStatus("");
      setPagination({ ...pagination, current: 1 });
    } else {
      if (skipParams.includes("skipProject")) {
        setSelectedProject([]);
      }
      if (skipParams.includes("skipDepartment")) {
        setTechnology([]);
      }
      if (skipParams.includes("skipManager")) {
        setManager([]);
      }
      if (skipParams.includes("skipAccountManager")) {
        setAccountManager([]);
      }
      if (skipParams.includes("skipPriority")) {
        setPriority("");
      }
      if (skipParams.includes("skipStatus")) {
        setStatus("");
      }
    }

    if (selectedFilters) {
      setSelectedProject(selectedFilters.project || []);
      setTechnology(selectedFilters.technology || []);
      setManager(selectedFilters.manager || []);
      setAccountManager(selectedFilters.accountManager || []);
      setPriority(selectedFilters.priority || "");
      setStatus(selectedFilters.status || "");
      setPagination({ ...pagination, current: 1 });
    }
  };

  const getComplaintList = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        project_id: selectedProject,
        technology: technology,
        manager_id: manager,
        acc_manager_id: accontManager,
      };
      if (priority !== "") {
        reqBody.priority = priority;
      }
      if (status !== "") {
        reqBody.status = status;
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getComplaintList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setComplaintList(response.data.data);
        setPagination({
          ...pagination,
          total: response.data.metadata.total,
        });
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const deleteComplaints = async (id) => {
    try {
      dispatch(showAuthLoader());
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteComplaint + params,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        message.success(response.data.message);
        getComplaintList();
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const userHasAccess = useMemo(() => getRoles(["Super Admin", "PC", "TL", "AM"]), []);

  const showTotal = useCallback((total) => `Total Records Count is ${total}`, []);

  const formatStatus = useCallback((status) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }, []);

  const columns = useMemo(() => [
    {
      title: "Project",
      render: (text) => (text?.project?.title ? text.project.title : "-"),
    },
    {
      title: "Created By",
      render: (text) => (text?.createdBy?.full_name ? text.createdBy.full_name : "-"),
    },
    {
      title: "Account Manager",
      render: (text) => (text?.acc_manager?.full_name ? text.acc_manager.full_name : "-"),
    },
    {
      title: "Project Manager",
      render: (text) => (text?.manager?.full_name ? text.manager.full_name : "-"),
    },
    {
      title: "Client",
      render: (text) => (text?.client_name ? text.client_name : "-"),
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
                  icon={<QuestionCircleOutlined style={{ color: "red" }} />}
                  title="Are you sure to delete this Complaint?"
                  onConfirm={() => deleteComplaints(text._id)}
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
  ], [userHasAccess, formatStatus, deleteComplaints]);

  const handleTableChange = (page) => {
    setPagination({ ...pagination, ...page });
  };

  return (
    <div className="ant-project-task all-project-main-wrapper">
      <Card>
      <div className="heading-wrapper">

        <div className="heading-main">
          <h2>Complaints</h2>
        </div>
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

        <div className="global-search">
          <div className="filter-btn-wrapper">
            <ComplaintFilterComponent onFilterChange={onFilterChange} />
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
  );
};

export default React.memo(Complaints);