import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Table,
  Modal,
  Form,
  message,
  Popconfirm,
  Col,
  Row,
  Input,
  Card,
} from "antd";
import Search from "antd/lib/input/Search";
import {
  CloseCircleTwoTone,
  SaveTwoTone,
  EditOutlined,
  PlusOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { AiOutlineDelete } from "react-icons/ai";
import Service from "../../service";
import "./settings.css";

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
          <div className="ps-shimmer" style={{ width: `${35 + Math.random() * 25}%` }} />
          <div className="ps-shimmer" style={{ width: "12%", marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}

function ManageProjectType() {
  const [addprojectform] = Form.useForm();
  const searchRef = useRef();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectname, setprojectname] = useState("");
  const [editid, setEditid] = useState();
  const [flag, setFlag] = useState(false);
  const [edtitext, setEdittext] = useState({});
  const [searchText, setSearchText] = useState("");
  const [projectList, setProjectList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const columns = [
    {
      title: "Categories",
      dataIndex: "project_type",
      key: "project_type",
      render: (text, record) => {
        const position = record?.project_type;
        return record?._id === editid ? (
          <span onChange={(value) => handlechange(value)} style={{ textTransform: "capitalize" }}>
            <Input defaultValue={position} />
          </span>
        ) : (
          <span style={{ textTransform: "capitalize" }}>{position}</span>
        );
      },
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      width: 200,
      render: (text, record) => (
        <span style={{ textTransform: "capitalize", color: "#6b7a8d", fontSize: 12 }}>{record?.slug}</span>
      ),
    },
    {
      title: "Actions",
      dataIndex: "action",
      width: 110,
      render: (text, record) => (
        <div style={{ display: "flex", gap: 4 }}>
          {flag && editid === record?._id ? (
            <>
              <Button type="link pe-action-btn edit">
                <SaveTwoTone style={{ fontSize: 18 }} onClick={() => { handleEditProjectName(record?._id); setFlag(false); setEditid(""); }} />
              </Button>
              <Button type="link pe-action-btn delete" onClick={() => setEditid("")}>
                <CloseCircleTwoTone style={{ fontSize: 18 }} />
              </Button>
            </>
          ) : (
            <>
              <Button type="link pe-action-btn edit">
                <EditOutlined style={{ fontSize: 17 }} onClick={() => { setEditid(record._id); setFlag(true); }} />
              </Button>
              <Popconfirm title="Do you really want to delete this category?" okText="Yes" cancelText="No" onConfirm={() => handleDeleteProjectName(record._id)}>
                <Button type="link pe-action-btn delete">
                  <AiOutlineDelete style={{ fontSize: 17 }} />
                </Button>
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ];

  const handlechange = (e) => {
    setEdittext({ ...edtitext, type: e.target.value });
  };

  const handleEditProjectName = async (val) => {
    try {
      const name = edtitext?.type?.trim().toLowerCase();
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.updateProjectName,
        body: { projectTypeId: val, project_type: name?.charAt(0).toUpperCase() + name.slice(1) },
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        getListProjectName();
        setEdittext({});
      } else {
        setEdittext({});
        message.error(response.data.message);
      }
    } catch (error) { console.log(error); }
  };

  const handleDeleteProjectName = async (val) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.deleteProjectName,
        body: { projectTypeId: val },
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        if (projectList.length === 1 && pagination.current > 1) {
          setPagination(p => ({ ...p, current: p.current - 1 }));
        }
        getListProjectName();
      } else {
        message.error(response.data.message);
      }
    } catch (error) { console.log(error); }
  };

  useEffect(() => {
    getListProjectName();
  }, [searchText, pagination.current, pagination.pageSize]);

  const getListProjectName = async () => {
    try {
      setIsLoading(true);
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        sortBy: "asce",
        sort: "_id",
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListing,
        body: reqBody,
      });
      if (response?.data?.data?.length > 0) {
        setPagination(p => ({ ...p, total: response.data.metadata.total }));
        setProjectList(response.data.data);
      } else {
        setProjectList([]);
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
      setIsSubmitting(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectType,
        body: { project_type: projectname.trim() },
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        addprojectform.resetFields();
        getListProjectName();
        setIsModalOpen(false);
      } else {
        message.error(response.data.message);
      }
      setIsSubmitting(false);
    } catch (error) {
      console.log(error);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    addprojectform.resetFields();
    setIsModalOpen(false);
  };

  return (
    <Card className="ps-page">
      <div className="heading-wrapper">
        <div className="heading-main">
          <h2>
            <span><AppstoreOutlined /></span>
            Categories
          </h2>
        </div>
        <div className="ps-header-right">
          <Button className="add-btn" type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Add Type
          </Button>
        </div>
      </div>

      <Card className="main-content-wrapper">
        <div className="global-search">
          <Search
            ref={searchRef}
            placeholder="Search project types..."
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
              dataSource={projectList}
              rowKey="_id"
              footer={() => <span>Total Records: {pagination.total > 0 ? pagination.total : 0}</span>}
              pagination={{ showSizeChanger: true, pageSizeOptions: ["10", "20", "25", "30"], ...pagination }}
              onChange={page => setPagination({ ...pagination, ...page })}
            />
          </div>
        )}
      </Card>

    <Modal
  open={isModalOpen}
  onCancel={handleCancel}
  title={
    <>
      <AppstoreOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />
      Add Category
    </>
  }
  className="ps-modal"
  width="100%"
  style={{ maxWidth: 480 }}
  footer={[
    <Button
      key="cancel"
      className="delete-btn"
      onClick={handleCancel}
    >
      Cancel
    </Button>,
    <Button
      key="submit"
      className="add-btn"
      type="primary"
      onClick={() => addprojectform.submit()}
      loading={isSubmitting}
    >
      Save
    </Button>,
  ]}
>
  <Form
    form={addprojectform}
    layout="vertical"
    onFinish={handleOk}
  >
    <Row gutter={[16, 16]}>
      
      <Col xs={24}>
        <Form.Item
          name="project_type"
          label="Category Name"
          rules={[
            {
              required: true,
              whitespace: true,
              message: "Please enter a valid category",
            },
          ]}
        >
          <Input
            autoComplete="off"
            onChange={(e) => setprojectname(e.target.value)}
            size="large"
            placeholder="e.g. Internal, Client Work"
          />
        </Form.Item>
      </Col>

    </Row>
  </Form>
</Modal>
    </Card>
  );
}

export default ManageProjectType;
