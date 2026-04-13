import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Form,
  message,
  Table,
  Modal,
  Popconfirm,
  Row,
  Col,
  Input,
} from "antd";
import {
  EditOutlined,
  SaveTwoTone,
  CloseCircleTwoTone,
  PlusOutlined,
  NodeIndexOutlined,
} from "@ant-design/icons";
import { AiOutlineDelete } from "react-icons/ai";
import SkeletonTable from "../common/SkeletonTable";
import GlobalSearchInput from "../common/GlobalSearchInput";
import Service from "../../service";
import "./ProjectStatus.css";


function ProjectStatus() {
  const [addProjectStatus] = Form.useForm();
  const searchRef = useRef();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectstatus, setProjectStatus] = useState("");
  const [projectList, setProjectList] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [editid, setEditid] = useState();
  const [flag, setFlag] = useState(false);
  const [edtitext, setEdittext] = useState({});

  const handlechange = e => {
    setEdittext({ ...edtitext, status: e.target.value });
  };

  const onSearch = value => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  useEffect(() => {
    getListProjectStatus();
  }, [searchText, pagination.current, pagination.pageSize]);

  const getListProjectStatus = async () => {
    try {
      setIsLoading(true);
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        sort: "_id",
        sortBy: "desc",
        isDropdown: false,
      };
      if (searchText) reqBody.search = searchText;

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectStatus,
        body: reqBody,
      });

      if (response?.data?.data?.length > 0) {
        setPagination({ ...pagination, total: response.data.metadata.total });
        setProjectList(response.data.data);
        setIsModalOpen(false);
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
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectStatus,
        body: { title: projectstatus.trim() },
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        addProjectStatus.resetFields();
        getListProjectStatus();
        setIsModalOpen(false);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleEdit = async val => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.editProjectStatus + "/" + val,
        body: { title: edtitext?.status?.trim() },
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        getListProjectStatus();
        setEdittext({});
      } else {
        setEdittext({});
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteProjectTech = async val => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteProjectStatus + "/" + val,
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        if (projectList.length === 1 && pagination.current > 1) {
          setPagination(p => ({ ...p, current: p.current - 1 }));
        }
        getListProjectStatus();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleCancel = () => {
    addProjectStatus.resetFields();
    setIsModalOpen(false);
  };

  const columns = [
    {
      title: "Status",
      dataIndex: "title",
      key: "title",
      render: (text, record) => {
        const position = record?.title.trim();
        return record?._id === editid ? (
          <span onChange={handlechange}>
            <Input defaultValue={position} />
          </span>
        ) : (
          <span style={{ textTransform: "capitalize" }}>{position}</span>
        );
      },
    },
    {
      title: "Actions",
      dataIndex: "action",
      width: 120,
      render: (text, record) => (
        <div style={{ display: "flex", gap: 4 }}>
          {flag && editid === record?._id ? (
            <>
              <Button type="link" className="btn-secondary">
                <SaveTwoTone onClick={() => { handleEdit(record?._id); setFlag(false); setEditid(""); }} />
              </Button>
              <Button type="link" className="btn-secondary" onClick={() => setEditid("")}>
                <CloseCircleTwoTone />
              </Button>
            </>
          ) : (
            <>
              <Button disabled={record.isDefault} type="link" className="btn-secondary">
                <EditOutlined onClick={() => { setEditid(record?._id); setFlag(true); }} />
              </Button>
              <Popconfirm title="Delete this status?" okText="Yes" cancelText="No" onConfirm={() => handleDeleteProjectTech(record?._id)}>
                <Button disabled={record.isDefault} type="link" className="ant-delete">
                  <AiOutlineDelete />
                </Button>
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="ps-page">
      <div className="ps-card">
        {/* Header */}
        <div className="ps-header">
          <h2 className="ps-title">
            <span className="ps-title-icon"><NodeIndexOutlined /></span>
            Project Status
          </h2>
          <div className="ps-header-right">
            <Button className="btn-primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
              Add Status
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="ps-search">
          <GlobalSearchInput
            ref={searchRef}
            placeholder="Search status..."
            value={searchText}
            onChange={setSearchText}
            onSearch={onSearch}
            className="ps-search-input"
            style={{ width: 260 }}
          />
        </div>

        {/* Table / Skeleton */}
        {isLoading ? (
          <SkeletonTable cols={2} />
        ) : (
          <div className="ps-table-wrap">
            <Table
              columns={columns}
              dataSource={projectList}
              rowKey="_id"
              footer={() => <span>Total Records: {pagination.total > 0 ? pagination.total : 0}</span>}
              pagination={{ showSizeChanger: true, pageSizeOptions: ["10", "20", "30"], ...pagination }}
              onChange={page => setPagination({ ...pagination, ...page })}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={isModalOpen}
        onCancel={handleCancel}
        title={<><NodeIndexOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />Add Project Status</>}
        className="ps-modal"
        width={480}
        footer={[
          <Button key="cancel" className="ps-modal-cancel" onClick={handleCancel}>Cancel</Button>,
          <Button key="submit" className="ps-modal-save" onClick={() => addProjectStatus.submit()}>Save</Button>,
        ]}
      >
        <Form form={addProjectStatus} layout="vertical" onFinish={handleOk}>
          <Form.Item
            name="title"
            label="Status Name"
            rules={[{ required: true, whitespace: true, message: "Please enter a valid status" }]}
          >
            <Input autoComplete="off" onChange={e => setProjectStatus(e.target.value)} size="large" placeholder="e.g. In Progress" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ProjectStatus;
