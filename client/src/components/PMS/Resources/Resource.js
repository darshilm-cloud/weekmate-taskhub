import React, { useEffect, useState, useRef } from "react";
import {
  Button,
  Form,
  message,
  Table,
  Modal,
  Input,
} from "antd";
import GlobalSearchInput from "../../common/GlobalSearchInput";
import {
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Service from "../../../service";
import "../settings.css";

const SKELETON_ROWS = 6;

function SkeletonTable() {
  return (
    <div className="ps-skeleton-wrap">
      <div className="ps-skeleton-row ps-skeleton-header-row">
        <div className="ps-shimmer" style={{ width: "50%", height: 12 }} />
      </div>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div className="ps-skeleton-row" key={i}>
          <div className="ps-shimmer" style={{ width: `${35 + Math.random() * 35}%` }} />
        </div>
      ))}
    </div>
  );
}

function Resource() {
  const searchRef = useRef();
  const [addprojectTech] = Form.useForm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resourceN, setResource] = useState("");
  const [searchText, setSearchText] = useState("");
  const [ResourceList, setResourcelist] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 10 });

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  useEffect(() => {
    getResourceList();
  }, [searchText, pagination.current, pagination.pageSize]);

  const getResourceList = async () => {
    try {
      setIsLoading(true);
      const reqBody = { limit: pagination.pageSize, pageNo: pagination.current, search: searchText };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getResource,
        body: reqBody,
      });
      if (response?.data?.data?.length > 0) {
        setPagination(p => ({ ...p, total: response.data.metadata.total }));
        setResourcelist(response.data.data);
      } else {
        setResourcelist([]);
        setPagination(p => ({ ...p, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOk = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addResource,
        body: { resource_name: resourceN.trim() },
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        addprojectTech.resetFields();
        getResourceList();
        setIsModalOpen(false);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleCancel = () => {
    addprojectTech.resetFields();
    setIsModalOpen(false);
  };

  const columns = [
    {
      title: "Resource Name",
      dataIndex: "resource_name",
      key: "resource_name",
      render: (text, record) => (
        <span style={{ textTransform: "capitalize" }}>
          {record?.resource_name?.trim().replaceAll("_", " ")}
        </span>
      ),
    },
  ];

  return (
    <div className="ps-page">
      <div className="ps-card">
        <div className="ps-header">
          <h2 className="ps-title">
            <span className="ps-title-icon"><TeamOutlined /></span>
            Resources
          </h2>
          <div className="ps-header-right">
            <Button className="add-btn"  type="primary"  typeof="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
              Add Resource
            </Button>
          </div>
        </div>

        <div className="ps-search">
          <GlobalSearchInput
            ref={searchRef}
            placeholder="Search resources..."
            value={searchText}
            onChange={setSearchText}
            onSearch={onSearch}
            className="ps-search-input"
            style={{ width: 260 }}
          />
        </div>

        {isLoading ? (
          <SkeletonTable />
        ) : (
          <div className="ps-table-wrap">
            <Table
              columns={columns}
              dataSource={ResourceList}
              rowKey="_id"
              footer={() => <span>Total Records: {pagination.total > 0 ? pagination.total : 0}</span>}
              onChange={page => setPagination({ ...pagination, ...page })}
              pagination={{ showSizeChanger: true, pageSizeOptions: ["10", "20", "25", "30"], ...pagination }}
            />
          </div>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onCancel={handleCancel}
        title={<><TeamOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />Add Resource</>}
        className="ps-modal"
        width={480}
        footer={[
          <Button key="cancel" className="ps-modal-cancel" onClick={handleCancel}>Cancel</Button>,
          <Button key="submit" className="add-btn" onClick={() => addprojectTech.submit()}>Save</Button>,
        ]}
      >
        <Form form={addprojectTech} layout="vertical" onFinish={handleOk}>
          <Form.Item
            name="project_tech"
            label="Resource Name"
            rules={[{ required: true, whitespace: true, message: "Please enter a valid resource name" }]}
          >
            <Input autoComplete="off" onChange={(e) => setResource(e.target.value)} size="large" placeholder="e.g. Design, Backend, QA" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Resource;
