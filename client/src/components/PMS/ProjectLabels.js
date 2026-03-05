import React, { useEffect, useState, useCallback } from "react";
import {
  Button,
  Card,
  Form,
  message,
  Table,
  Input,
  Modal,
  Popconfirm,
  Spin,
  Row,
  Col
} from "antd";
import {
  EditOutlined,
  SaveTwoTone,
  CloseCircleTwoTone
} from "@ant-design/icons";
import { AiOutlineDelete } from "react-icons/ai";
import { useDispatch } from "react-redux";
import Service from "../../service";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";
import "./settings.css";

const { Search } = Input;

function ProjectLabels() {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  // State management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectlabelListing, setLabelListing] = useState([]);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [editingId, setEditingId] = useState(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [isTableLoading, setIsTableLoading] = useState(false); // Add loading state

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingLabel("");
    setSelectedColor("#000000");
  }, []);

  // Search handler
  const onSearch = useCallback((value) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  // API call with error handling
  const makeAPICall = useCallback(
    async (config, successCallback, errorCallback, showTableLoader = false) => {
      try {
        if (showTableLoader) {
          setIsTableLoading(true);
        } else {
          dispatch(showAuthLoader());
        }

        const response = await Service.makeAPICall(config);

        if (showTableLoader) {
          setIsTableLoading(false);
        } else {
          dispatch(hideAuthLoader());
        }

        if (response?.data?.status) {
          if (!config.diableSuccessToast) {
            message.success(response.data.message);
          }
          successCallback?.(response.data);
        } else {
          message.error(response.data?.message || "Operation failed");
          errorCallback?.(response.data);
        }
      } catch (error) {
        if (showTableLoader) {
          setIsTableLoading(false);
        } else {
          dispatch(hideAuthLoader());
        }
        console.error("API Error:", error);
        message.error("An error occurred. Please try again.");
        errorCallback?.(error);
      }
    },
    [dispatch]
  );

  // Delete label with optimistic update
  const handleDeleteLabel = useCallback(
    async (id) => {
      // Store original state for rollback
      const originalListing = [...projectlabelListing];
      const originalPagination = { ...pagination };

      // Optimistic update - remove item immediately
      const updatedListing = projectlabelListing.filter(
        (item) => item._id !== id
      );
      setLabelListing(updatedListing);

      // Update pagination if needed
      let newPagination = { ...pagination };
      if (updatedListing.length === 0 && pagination.current > 1) {
        newPagination.current = pagination.current - 1;
        setPagination(newPagination);
      }

      // Update total count
      newPagination.total = Math.max(0, pagination.total - 1);
      setPagination(newPagination);

      const config = {
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteProjectLabels}/${id}`,
      };

      await makeAPICall(
        config,
        () => {
          // Success - close modal and optionally refresh data
          setIsModalOpen(false);
          // Optionally fetch fresh data to ensure consistency
          // fetchLabels();
        },
        () => {
          // Error - rollback optimistic update
          setLabelListing(originalListing);
          setPagination(originalPagination);
        }
      );
    },
    [makeAPICall, projectlabelListing, pagination]
  );

  // Edit label with optimistic update
  const handleEditLabel = useCallback(
    async (id) => {
      if (!editingLabel.trim()) {
        message.warning("Please enter a valid label name");
        return;
      }

      // Store original state for rollback
      const originalListing = [...projectlabelListing];

      // Optimistic update - update item immediately
      const updatedListing = projectlabelListing.map((item) =>
        item._id === id
          ? { ...item, title: editingLabel.trim(), color: selectedColor }
          : item
      );
      setLabelListing(updatedListing);

      // Clear editing state immediately for smooth UX
      const originalEditingId = editingId;
      const originalEditingLabel = editingLabel;
      const originalSelectedColor = selectedColor;
      cancelEdit();

      const config = {
        methodName: Service.putMethod,
        api_url: `${Service.updateProjectLabels}/${id}`,
        body: {
          title: editingLabel.trim(),
          color: selectedColor,
        },
      };

      await makeAPICall(
        config,
        () => {
          // Success - optionally fetch fresh data to ensure consistency
          // fetchLabels();
        },
        () => {
          // Error - rollback optimistic update
          setLabelListing(originalListing);
          setEditingId(originalEditingId);
          setEditingLabel(originalEditingLabel);
          setSelectedColor(originalSelectedColor);
        }
      );
    },
    [
      editingLabel,
      selectedColor,
      makeAPICall,
      projectlabelListing,
      editingId,
      cancelEdit,
    ]
  );

  // Start editing
  const startEdit = useCallback((record) => {
    setEditingId(record._id);
    setEditingLabel(record.title);
    setSelectedColor(record.color);
  }, []);

  // Table columns
  const columns = [
    {
      title: "Color",
      dataIndex: "color",
      key: "color",
      width: 80,
      render: (color, record) =>
        record._id === editingId ? (
          <Input
            type="color"
            value={ selectedColor }
            onChange={ (e) => setSelectedColor(e.target.value) }
          />
        ) : (
          <div
            style={ {
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            } }
          >
            <div
              style={ {
                backgroundColor: color || "#000000",
                width: "80%",
                height: "18px",
                border: "1px solid #d9d9d9",
                borderRadius: "2px",
              } }
            />
          </div>
        ),
    },
    {
      title: "Labels",
      dataIndex: "title",
      key: "title",
      render: (title, record) =>
        record._id === editingId ? (
          <Input
            value={ editingLabel }
            onChange={ (e) => setEditingLabel(e.target.value) }
            style={ { width: 200 } }
            onPressEnter={ () => handleEditLabel(record._id) }
          />
        ) : (
          <span style={ { textTransform: "capitalize" } }>{ title }</span>
        ),
    },
    {
      title: "Actions",
      dataIndex: "action",
      width: 150,
      render: (_, record) => (
        <div style={ { display: "flex", gap: "8px" } }>
          { editingId === record._id ? (
            <>
              <Button
                type="link"
                onClick={ () => handleEditLabel(record._id) }
                icon={ <SaveTwoTone style={ { fontSize: "18px" } } /> }
              />
              <Button
                type="link"
                onClick={ cancelEdit }
                icon={ <CloseCircleTwoTone style={ { fontSize: "18px" } } /> }
              />
            </>
          ) : (
            <>
              <Button
                type="link"
                onClick={ () => startEdit(record) }
                icon={
                  <EditOutlined style={ { color: "green", fontSize: "18px" } } />
                }
              />
              <Popconfirm
                title="Do you really want to delete this Label?"
                okText="Yes"
                cancelText="No"
                onConfirm={ () => handleDeleteLabel(record._id) }
              >
                <Button
                  type="link"
                  icon={
                    <AiOutlineDelete
                      style={ { color: "red", fontSize: "18px" } }
                    />
                  }
                />
              </Popconfirm>
            </>
          ) }
        </div>
      ),
    },
  ];

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    const config = {
      methodName: Service.postMethod,
      api_url: Service.getProjectLabels,
      body: {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        sort: "_id",
        sortBy: "asc",
        isDropdown: false,
        ...(searchText && { search: searchText }),
      },
      diableSuccessToast: true,
    };

    await makeAPICall(
      config,
      (data) => {
        if (data.data?.length > 0) {
          setLabelListing(data.data);
          setPagination((prev) => ({
            ...prev,
            total: data.metadata?.total || 0,
          }));
        } else {
          setLabelListing([]);
          setPagination((prev) => ({ ...prev, total: 0 }));
        }
      },
      () => {
        // Error callback
        setLabelListing([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
      },
      true // Show table loader for this API call
    );
  }, [makeAPICall, pagination.current, pagination.pageSize, searchText]);

  // Add new label with optimistic update
  const handleAddLabel = useCallback(
    async (values) => {
      if (!values.title?.trim()) {
        message.warning("Please enter a valid label name");
        return;
      }

      // Generate temporary ID for optimistic update
      const tempId = `temp_${Date.now()}`;
      const newLabel = {
        _id: tempId,
        title: values.title.trim(),
        color: selectedColor || "#000000",
      };

      // Store original state for rollback
      const originalListing = [...projectlabelListing];
      const originalPagination = { ...pagination };

      // Optimistic update - add item immediately
      const updatedListing = [newLabel, ...projectlabelListing];
      setLabelListing(updatedListing);

      // Update pagination total
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }));

      // Close modal immediately for smooth UX
      handleModalClose();

      const config = {
        methodName: Service.postMethod,
        api_url: Service.addProjectLabels,
        body: {
          title: values.title.trim(),
          color: selectedColor || "#000000",
        },
      };

      await makeAPICall(
        config,
        (data) => {
          // Success - replace temp item with real data
          const realLabel = data.data || { ...newLabel, _id: data.id };
          setLabelListing((prev) =>
            prev.map((item) => (item._id === tempId ? realLabel : item))
          );
          // Optionally fetch fresh data to ensure consistency
          // fetchLabels();
        },
        () => {
          // Error - rollback optimistic update
          setLabelListing(originalListing);
          setPagination(originalPagination);
          setIsModalOpen(true); // Reopen modal on error
        }
      );
    },
    [selectedColor, makeAPICall, projectlabelListing, pagination]
  );

  // Modal handlers
  const showModal = useCallback(() => {
    cancelEdit();
    setIsModalOpen(true);
  }, [cancelEdit]);

  const handleModalClose = useCallback(() => {
    form.resetFields();
    setIsModalOpen(false);
    setSelectedColor("#000000");
  }, [form]);

  // Table change handler
  const handleTableChange = useCallback((paginationInfo) => {
    setPagination((prev) => ({ ...prev, ...paginationInfo }));
  }, []);

  // Effects
  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  return (
    <Card className="employee-card">
      <div className="project-labels-container">
        <div className="heading-wrapper">
          <h2>Project Labels</h2>
          <Button className="addleave-btn" onClick={ showModal } type="primary">
            + Add
          </Button>
        </div>

        <div className="global-search">
          <Search
            placeholder="Search..."
            onSearch={ onSearch }
            style={ { width: 200 } }
            allowClear
          />
        </div>

        <Modal
          open={ isModalOpen }
          onCancel={ handleModalClose }
          title="Add Task Labels"
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
              onFinish={ handleAddLabel }
            >
              <Row gutter={ [0, 0] }>
                <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                  <Form.Item
                    label="Color"
                    rules={ [{ required: true, message: "Please select a color" }] }
                  >
                    <Input
                      type="color"
                      value={ selectedColor }
                      onChange={ (e) => setSelectedColor(e.target.value) }
                      style={ { width: 100, height: 40 } }
                    />
                  </Form.Item>
                </Col>
                <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                  <Form.Item
                    name="title"
                    label="Task Label"
                    rules={ [
                      { required: true, message: "Please enter a task label" },
                      { whitespace: true, message: "Task label cannot be empty" },
                    ] }
                  >
                    <Input
                      autoComplete="off"
                      placeholder="Enter label name"
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
            dataSource={ projectlabelListing }
            rowKey="_id"
            pagination={ {
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "30"],
              showTotal: (total) => `Total ${total} records`,
              ...pagination,
            } }
            onChange={ handleTableChange }
            loading={ {
              spinning: isTableLoading,
              indicator: <Spin size="large" />
            } }
          />
        </div>
      </div>
    </Card>
  );
}

export default ProjectLabels;
