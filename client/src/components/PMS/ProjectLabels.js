import React, { useEffect, useState, useCallback } from "react";
import {
  Button,
  Form,
  message,
  Table,
  Input,
  Modal,
  Popconfirm,
  Row,
  Col
} from "antd";
import {
  EditOutlined,
  SaveTwoTone,
  CloseCircleTwoTone,
  PlusOutlined,
  TagsOutlined,
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

  const SkeletonTable = () => (
    <div className="ps-skeleton-wrap">
      <div className="ps-skeleton-row ps-skeleton-header-row">
        <div className="ps-shimmer" style={{ width: "8%", height: 12 }} />
        <div className="ps-shimmer" style={{ width: "40%", height: 12 }} />
        <div className="ps-shimmer" style={{ width: "12%", height: 12, marginLeft: "auto" }} />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="ps-skeleton-row" key={i}>
          <div className="ps-shimmer" style={{ width: 32, height: 18, borderRadius: 4 }} />
          <div className="ps-shimmer" style={{ width: `${30 + Math.random() * 30}%` }} />
          <div className="ps-shimmer" style={{ width: "10%", marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="ps-page">
      <div className="ps-card">
        <div className="ps-header">
          <h2 className="ps-title">
            <span className="ps-title-icon"><TagsOutlined /></span>
            Project Labels
          </h2>
          <div className="ps-header-right">
            <Button className="ps-btn-primary" icon={<PlusOutlined />} onClick={showModal}>
              Add Label
            </Button>
          </div>
        </div>

        <div className="ps-search">
          <Search
            placeholder="Search labels..."
            onSearch={onSearch}
            onChange={(e) => onSearch(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
        </div>

        {isTableLoading ? (
          <SkeletonTable />
        ) : (
          <div className="ps-table-wrap">
            <Table
              columns={columns}
              dataSource={projectlabelListing}
              rowKey="_id"
              pagination={{
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "30"],
                showTotal: (total) => `Total ${total} records`,
                ...pagination,
              }}
              onChange={handleTableChange}
            />
          </div>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onCancel={handleModalClose}
        title={<><TagsOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />Add Task Label</>}
        className="ps-modal"
        width={480}
        footer={[
          <Button key="cancel" className="ps-modal-cancel" onClick={handleModalClose}>Cancel</Button>,
          <Button key="submit" className="ps-modal-save" onClick={() => form.submit()}>Save</Button>,
        ]}
      >
        <Form form={form} layout="vertical" onFinish={handleAddLabel}>
          <Row gutter={[16, 0]}>
            <Col xs={6}>
              <Form.Item label="Color">
                <Input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  style={{ width: "100%", height: 40, padding: 2, borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
            <Col xs={18}>
              <Form.Item
                name="title"
                label="Label Name"
                rules={[
                  { required: true, message: "Please enter a label name" },
                  { whitespace: true, message: "Label name cannot be empty" },
                ]}
              >
                <Input autoComplete="off" placeholder="e.g. Bug, Feature, Urgent" size="large" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

export default ProjectLabels;
