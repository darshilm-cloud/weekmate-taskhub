import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Button,
  Card,
  Form,
  message,
  Table,
  Input,
  Modal,
  Popconfirm,
  Col,
  Row,
} from "antd";
import {
  EditOutlined,
  SaveTwoTone,
  CloseCircleTwoTone,
} from "@ant-design/icons";
import { AiOutlineDelete } from "react-icons/ai";
import { useDispatch } from "react-redux";
import Service from "../../service";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";
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

  // API calls
  const getProjectTechList = useCallback(async () => {
    try {
      dispatch(showAuthLoader());

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
            defaultValue={ record.project_tech }
            onChange={ handleEditTextChange }
            onPressEnter={ () => updateProjectTechnology(record._id) }
          />
        ) : (
          <span style={ { textTransform: "capitalize" } }>
            { record.project_tech }
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
            { isCurrentlyEditing ? (
              <>
                <Button type="link" className="edit">
                  <SaveTwoTone
                    style={ { fontSize: "18px" } }
                    onClick={ () => updateProjectTechnology(record._id) }
                  />
                </Button>
                <Button type="link" className="delete" onClick={ handleCancelEdit }>
                  <CloseCircleTwoTone style={ { fontSize: "18px" } } />
                </Button>
              </>
            ) : (
              <>
                <Button type="link" className="edit">
                  <EditOutlined
                    style={ { fontSize: "18px" } }
                    onClick={ () => handleStartEdit(record) }
                  />
                </Button>
                <Popconfirm
                  title="Do you really want to delete this Department?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={ () => deleteProjectTechnology(record._id) }
                >
                  <Button type="link" className="delete">
                    <AiOutlineDelete style={ { fontSize: "18px" } } />
                  </Button>
                </Popconfirm>
              </>
            ) }
          </div>
        );
      },
    },
  ];

  const tableFooter = useCallback(() => (
    <label>
      Total Records Count is { pagination.total }
    </label>
  ), [pagination.total]);

  return (
    <Card className="employee-card">
      <div className="project-technology-container">

        <div className="heading-wrapper">
          <h2>Project Departments</h2>
          <Button
            className="addleave-btn"
            type="primary"
            onClick={ () => setIsModalOpen(true) }
          >
            + Add
          </Button>
        </div>
        <div className="global-search">
          <Input.Search
            ref={ searchRef }
            placeholder="Search..."
            onSearch={ handleSearch }
            onKeyUp={ resetSearchFilter }
            style={ { width: 200 } }
          />
        </div>
      </div>

      <Modal
        open={ isModalOpen }
        onCancel={ handleModalClose }
        title="Add Departments"
        className="project-add-wrapper edit-details-task-model"
        width={ 600 }
        footer={ [
          <Button
            key="cancel"
            onClick={ handleModalClose }
            size="large"
            className="square-outline-btn ant-delete"
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            className="square-primary-btn"
            onClick={ () => form.submit() }
          >
            Save
          </Button>,
        ] }
      >
        <div className="overview-modal-wrapper task-overview-modal-wrapper">
          <Form
            form={ form }
            layout="vertical"
            onFinish={ addProjectTechnology }
          >
            <Row gutter={ [0, 0] }>
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                <Form.Item
                  name="project_tech"
                  label="Project Departments"
                  rules={ [
                    {
                      required: true,
                      whitespace: true,
                      message: "Please enter a valid title",
                    },
                  ] }
                >
                  <Input
                    autoComplete="off"
                    onChange={ (e) => setProjectTech(e.target.value) }
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>

      <div className="block-table-content">
        <Table
          columns={ columns }
          dataSource={ projectList }
          rowKey="_id"
          footer={ tableFooter }
          pagination={ {
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "30"],
            ...pagination,
          } }
          onChange={ handleTableChange }
        />
      </div>

    </Card>
  );
};

export default ProjectTechnologies;