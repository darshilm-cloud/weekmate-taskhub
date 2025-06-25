import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Form,
  message,
  Table,
  Input,
  Modal,
  Popconfirm,
} from "antd";
import {
  EditOutlined,
  SaveTwoTone,
  CloseCircleTwoTone,
  PlusOutlined,
} from "@ant-design/icons";
import Service from "../../service";
import { AiOutlineDelete } from "react-icons/ai";
import { useDispatch } from "react-redux";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";
import "./settings.css";

function ProjectStatus() {
  
  const [addProjectStatus] = Form.useForm();
  const dispatch = useDispatch();
  const searchRef = useRef();
  const Search = Input.Search;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectstatus, setProjectStatus] = useState("");
  const [projectList, setProjectList] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [editid, setEditid] = useState();
  const [flag, setFlag] = useState(false);
  const [edtitext, setEdittext] = useState({});

  const handlechange = e => {
    const status = e.target.value;
    setEdittext({ ...edtitext, status: status });
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
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        sort: "_id",
        sortBy: "desc",
        isDropdown: false,
      };
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectStatus,
        body: reqBody,
      });

      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        setPagination({
          ...pagination,
          total: response.data.metadata.total,
        });
        setProjectList(response.data.data);
        setIsModalOpen(false);
      } else {
        setProjectList([]);
        setPagination(prevPagination => ({ ...prevPagination, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleOk = async () => {
    try {
      const reqBody = {
        title: projectstatus.trim(),
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectStatus,
        body: reqBody,
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
      const name = edtitext?.status.trim();

      const reqBody = {
        title: name,
      };
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.editProjectStatus + "/" + val,
        body: reqBody,
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setProjectStatus(response.data.data.project_type);
        getListProjectStatus();
        setIsModalOpen(false);
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
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        const isLastItemOnPage =
          projectList.length === 1 && pagination.current > 1;

        if (isLastItemOnPage) {
          setPagination(prevPagination => ({
            ...prevPagination,
            current: prevPagination.current - 1,
          }));
        }
        getListProjectStatus();
        setIsModalOpen(false);
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

  const getFooterDetails = () => {
    return (
      <label>
        Total Records Count is {pagination.total > 0 ? pagination.total : 0}
      </label>
    );
  };

  const handleTableChange = page => {
    setPagination({ ...pagination, ...page });
  };

  const columns = [
    {
      title: "Status",
      dataIndex: "title",
      key: "title",
      width: 700,
      render: (text, record) => {
        const position = record?.title.trim();
        return record?._id == editid ? (
          <span
            onChange={value => {
              handlechange(value);
            }}
          >
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
      width: 200,
      render: (text, record) => (
        <div
          style={{
            display: "flex",
            flexwrap: "wrap",
          }}
        >
          {flag == true && editid == record?._id ? (
            <>
              <Button type="link edit">
                <SaveTwoTone
                  style={{ fontSize: "18px" }}
                  onClick={() => {
                    handleEdit(record?._id);
                    setFlag(false);
                    setEditid("");
                  }}
                />
              </Button>
              <Button
                type="link delete"
                title="View"
                onClick={() => setEditid("")}
              >
                <CloseCircleTwoTone style={{ fontSize: "18px" }} />
              </Button>
            </>
          ) : (
            <>
              <Button type="link edit">
                <EditOutlined
                  style={{ color: "green", fontSize: "18px" }}
                  onClick={() => {
                    setEditid(record?._id);
                    setFlag(true);
                  }}
                />
              </Button>
              <Popconfirm
                title="Do you really want to delete this Status?"
                okText="Yes"
                cancelText="No"
                onConfirm={() => handleDeleteProjectTech(record?._id)}
              >
                <Button type="link delete">
                  <AiOutlineDelete style={{ color: "red", fontSize: "18px" }} />
                </Button>
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ];

  const showModal = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className="employee-card">
        <div className="project-status-container">
          <div className="profile-sub-head">
            <div className="heading-main">
              <h2>Project Status</h2>
            </div>
            <div className="head-box-inner">
              <Button
                type="primary"
                className="addleave-btn"
                onClick={showModal}
                size="default"
                icon={<PlusOutlined/>}
              >
                Add
              </Button>
              <Search
                ref={searchRef}
                placeholder="Search..."
                onSearch={onSearch}
                style={{ width: 200 }}
              />
            </div>
          </div>
          <Modal
            open={isModalOpen}
            onOk={handleOk}
            onCancel={handleCancel}
            footer={false}
          >
            <div className="modal-header">
              <h1>Add Project Status</h1>
            </div>
            <div className="overview-modal-wrapper">
              <Form form={addProjectStatus} onFinish={handleOk}>
                <div className="topic-cancel-wrapper">
                  <Form.Item
                    name="title"
                    label="Project Status"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: "Please enter a valid title",
                      },
                    ]}
                  >
                    <Input
                      autoComplete="off"
                      onChange={e => setProjectStatus(e.target.value)}
                    />
                  </Form.Item>
                  <div className="modal-footer-flex">
                    <div className="flex-btn">
                      <Button type="primary" htmlType="submit">
                        Save
                      </Button>
                      <Button onClick={handleCancel} className="ant-delete">Cancel</Button>
                    </div>
                  </div>
                </div>
              </Form>
            </div>
          </Modal>

          <div className="block-table-content">
            <Table
              columns={columns}
              dataSource={projectList}
              footer={getFooterDetails}
              pagination={{
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "30"],
                ...pagination,
              }}
              onChange={handleTableChange}
            />
          </div>
        </div>
      </Card>
    </>
  );
}

export default ProjectStatus;
