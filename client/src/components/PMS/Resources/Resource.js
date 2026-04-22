import React, { useEffect, useState, useRef } from "react";
import {
  Button,
  Form,
  message,
  Table,
  Modal,
  Input,
  Card,
} from "antd";
import Search from "antd/lib/input/Search";
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
      <div className="ps-skeleton-row" style={{ background: "#f8fafb", borderBottom: "1px solid #edf0f4" }}>
        <div className="ps-shimmer" style={{ width: "50%", height: 12 }} />
        <div className="ps-shimmer" style={{ width: "12%", height: 12, marginLeft: "auto" }} />
      </div>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div className="ps-skeleton-row" key={i}>
          <div className="ps-shimmer" style={{ width: `${35 + Math.random() * 35}%` }} />
          <div className="ps-shimmer" style={{ width: "10%", marginLeft: "auto" }} />
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
    <Card className="ps-page">
      <div className="heading-wrapper">
        <div className="heading-main">
          <h2>
            <span><TeamOutlined /></span>
            Resources
          </h2>
        </div>
        <div className="ps-header-right">
          <Button className="add-btn" type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Add Resource
          </Button>
        </div>
      </div>

      <Card className="main-content-wrapper">
        <div className="global-search">
          <Search
            ref={searchRef}
            placeholder="Search resources..."
            onSearch={onSearch}
            onChange={(e) => onSearch(e.target.value)}
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
              dataSource={ResourceList}
              rowKey="_id"
              footer={() => <span>Total Records: {pagination.total > 0 ? pagination.total : 0}</span>}
              onChange={page => setPagination({ ...pagination, ...page })}
              pagination={{ showSizeChanger: true, pageSizeOptions: ["10", "20", "25", "30"], ...pagination }}
            />
          </div>
        )}
      </Card>

      <Modal
        open={isModalOpen}
        onCancel={handleCancel}
        title={<><TeamOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />Add Resource</>}
        className="ps-modal"
        width={480}
        footer={[
          <Button key="cancel" className="delete-btn" onClick={handleCancel}>Cancel</Button>,
          <Button key="submit"  type="primary" className="add-btn" onClick={() => addprojectTech.submit()}>Save</Button>,
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
    </Card>
  );
}

export default Resource;
