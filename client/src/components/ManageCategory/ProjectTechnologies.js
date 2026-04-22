import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Button,
  Form,
  message,
  Table,
  Input,
  Modal,
  Popconfirm,
  Col,
  Row,
  Card,
} from "antd";
import {
  EditOutlined,
  SaveTwoTone,
  CloseCircleTwoTone,
  PlusOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import { AiOutlineDelete } from "react-icons/ai";
import { useDispatch } from "react-redux";
import Search from "antd/lib/input/Search";
import Service from "../../service";
import { hideAuthLoader } from "../../appRedux/actions/Auth";
import "../PMS/settings.css";

const ProjectTechnologies = () => {
  // State management
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectTech, setProjectTech] = useState("");
  const [searchText, setSearchText] = useState("");
  const [projectList, setProjectList] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const dispatch = useDispatch();
  const searchRef = useRef();

  // Memoized handlers for better performance
  const handleSearch = useCallback((value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleEditTextChange = useCallback((e) => {
    setEditText(e.target.value);
  }, []);

  const resetSearchFilter = useCallback((e) => {
    const keyCode = e?.keyCode || e;
    if (keyCode === 8 || keyCode === 46) {
      if (searchRef.current?.input?.value?.length <= 1 && searchEnabled) {
        setSearchText("");
        setSearchEnabled(false);
      }
    }
  }, [searchEnabled]);

  const [isLoading, setIsLoading] = useState(false);

  // API calls
  const getProjectTechList = useCallback(async () => {
    try {
      setIsLoading(true);

      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        sort: "project_tech",
        sortBy: "asc",
        isDropdown: false,
      };

      if (searchText) {
        setSearchEnabled(true);
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectTech,
        body: reqBody,
      });

      if (response?.data?.data?.length > 0) {
        setProjectList(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.metadata.total,
        }));
      } else {
        setProjectList([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error("Error fetching project technologies:", error);
      message.error("Failed to fetch project technologies");
    } finally {
      dispatch(hideAuthLoader());
      setIsLoading(false);
    }
  }, [dispatch, pagination.current, pagination.pageSize, searchText]);

  const addProjectTechnology = useCallback(async () => {
    try {
      if (!projectTech.trim()) {
        message.error("Please enter a valid technology name");
        return;
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addprojectTech,
        body: { project_tech: projectTech.trim() },
      });

      if (response?.data?.status) {
        message.success(response.data.message);
        form.resetFields();
        setProjectTech("");
        setIsModalOpen(false);
        getProjectTechList();
      } else {
        message.error(response?.data?.message || "Failed to add technology");
      }
    } catch (error) {
      console.error("Error adding project technology:", error);
      message.error("Failed to add technology");
    }
  }, [projectTech, form, getProjectTechList]);

  const updateProjectTechnology = useCallback(async (id) => {
    try {
      if (!editText.trim()) {
        message.error("Please enter a valid technology name");
        return;
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.updateProjectTech,
        body: {
          projectTechId: id,
          project_tech: editText.trim(),
        },
      });

      if (response?.data?.status) {
        message.success(response.data.message);
        setIsEditing(false);
        setEditingId(null);
        setEditText("");
        getProjectTechList();
      } else {
        message.error(response?.data?.message || "Failed to update technology");
      }
    } catch (error) {
      console.error("Error updating project technology:", error);
      message.error("Failed to update technology");
    }
  }, [editText, getProjectTechList]);

  const deleteProjectTechnology = useCallback(async (id) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.deleteProjectTech,
        body: { projectTechId: id },
      });

      if (response?.data?.status) {
        message.success(response.data.message);

        // Handle pagination when deleting last item on page
        if (projectList.length === 1 && pagination.current > 1) {
          setPagination(prev => ({
            ...prev,
            current: prev.current - 1,
          }));
        }

        getProjectTechList();
      } else {
        message.error(response?.data?.message || "Failed to delete technology");
      }
    } catch (error) {
      console.error("Error deleting project technology:", error);
      message.error("Failed to delete technology");
    }
  }, [projectList.length, pagination.current, getProjectTechList]);

  // Event handlers
  const handleModalClose = useCallback(() => {
    form.resetFields();
    setProjectTech("");
    setIsModalOpen(false);
  }, [form]);

  const handleStartEdit = useCallback((record) => {
    setEditingId(record._id);
    setEditText(record.project_tech);
    setIsEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingId(null);
    setEditText("");
  }, []);

  const handleTableChange = useCallback((newPagination) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  }, []);

  // Effects
  useEffect(() => {
    getProjectTechList();
  }, [getProjectTechList]);

  // Table configuration
  const columns = [
    {
      title: "Departments",
      dataIndex: "project_tech",
      key: "technologies",
      width: 700,
      render: (text, record) => {
        const isCurrentlyEditing = isEditing && editingId === record._id;

        return isCurrentlyEditing ? (
          <Input
            defaultValue={record.project_tech}
            onChange={handleEditTextChange}
            onPressEnter={() => updateProjectTechnology(record._id)}
          />
        ) : (
          <span style={{ textTransform: "capitalize" }}>
            {record.project_tech}
          </span>
        );
      },
    },
    {
      title: "Actions",
      dataIndex: "action",
      width: 200,
      render: (_, record) => {
        const isCurrentlyEditing = isEditing && editingId === record._id;

        return (
          <div className="edit-delete">
            {isCurrentlyEditing ? (
              <>
                <Button type="link" className="edit">
                  <SaveTwoTone
                    style={{ fontSize: "18px" }}
                    onClick={() => updateProjectTechnology(record._id)}
                  />
                </Button>
                <Button type="link" className="delete" onClick={handleCancelEdit}>
                  <CloseCircleTwoTone style={{ fontSize: "18px" }} />
                </Button>
              </>
            ) : (
              <>
                <Button type="link" className="edit">
                  <EditOutlined
                    style={{ fontSize: "18px" }}
                    onClick={() => handleStartEdit(record)}
                  />
                </Button>
                <Popconfirm
                  title="Do you really want to delete this Department?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() => deleteProjectTechnology(record._id)}
                >
                  <Button type="link" className="delete">
                    <AiOutlineDelete style={{ fontSize: "18px" }} />
                  </Button>
                </Popconfirm>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const SkeletonTable = () => (
    <div className="ps-skeleton-wrap">
      <div className="ps-skeleton-row" style={{ background: "#f8fafb", borderBottom: "1px solid #edf0f4" }}>
        <div className="ps-shimmer" style={{ width: "50%", height: 12 }} />
        <div className="ps-shimmer" style={{ width: "12%", height: 12, marginLeft: "auto" }} />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="ps-skeleton-row" key={i}>
          <div className="ps-shimmer" style={{ width: `${35 + Math.random() * 30}%` }} />
          <div className="ps-shimmer" style={{ width: "10%", marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );

  return (
    <Card className="ps-page">
      <div className="heading-wrapper">
        <div className="heading-main">
          <h2>
            <span><ApartmentOutlined /></span>
            Departments
          </h2>
        </div>
        <div className="ps-header-right">
          <Button className="add-btn" type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Add Department
          </Button>
        </div>
      </div>

      <Card className="main-content-wrapper">
        <div className="global-search">
          <Search
            ref={searchRef}
            placeholder="Search departments..."
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
        </div>

        {isLoading ? (
          <SkeletonTable />
        ) : (
          <div className="block-table-content">
            <Table
              columns={columns}
              dataSource={projectList}
              rowKey="_id"
              footer={() => <span>Total Records: {pagination.total}</span>}
              pagination={{ showSizeChanger: true, pageSizeOptions: ["10", "20", "25", "30"], ...pagination }}
              onChange={handleTableChange}
            />
          </div>
        )}
      </Card>

      <Modal
        open={isModalOpen}
        onCancel={handleModalClose}
        title={
          <>
            <ApartmentOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />
            Add Department
          </>
        }
        className="ps-modal"
        width="100%"
        style={{ maxWidth: 480 }}
        footer={[
          <Button
            key="cancel"
            className="delete-btn"
            onClick={handleModalClose}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            className="add-btn"
            type="primary"
            onClick={() => form.submit()}
          >
            Save
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={addProjectTechnology}
        >
          <Row gutter={[24, 0]}>

            <Col xs={24}>
              <Form.Item
                name="project_tech"
                label="Department Name"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Please enter a valid department name",
                  },
                ]}
              >
                <Input
                  autoComplete="off"
                  onChange={(e) => setProjectTech(e.target.value)}
                  size="large"
                  placeholder="e.g. Engineering, Marketing"
                />
              </Form.Item>
            </Col>

          </Row>
        </Form>
      </Modal>
    </Card>
  );
};

export default ProjectTechnologies;