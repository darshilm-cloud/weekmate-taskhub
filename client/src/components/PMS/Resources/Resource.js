import React, { useEffect, useState, useRef } from "react";
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
} from "@ant-design/icons";
import Service from "../../../service";
import { AiOutlineDelete } from "react-icons/ai";
import { useDispatch } from "react-redux";
import { showAuthLoader, hideAuthLoader } from "../../../appRedux/actions";
import "../settings.css";

function Resource() {
  const Search = Input.Search;
  const searchRef = useRef();
  const [addprojectTech] = Form.useForm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resourceN, setResource] = useState("");
  const [searchText, setSearchText] = useState("");
  const [ResourceList, setResourcelist] = useState([]);
  const dispatch = useDispatch();
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    pageSize: 10,
  });
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [editid, setEditid] = useState();
  const [flag, setFlag] = useState(false);
  const [edittext, setEdittext] = useState({});

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const handlechange = (e) => {
    const resource = e.target.value;
    setEdittext({ ...edittext, resource: resource });
  };

  useEffect(() => {
    getResourceList();
  }, [searchText, pagination.current, pagination.pageSize]);

  // get resource list
  const getResourceList = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        limit: pagination.pageSize,
        pageNo: pagination.current,
        search: searchText,
      };
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
        setSearchEnabled(true);
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getResource,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        setPagination((prevPagination) => ({
          ...prevPagination,
          total: response.data.metadata.total,
        }));

        setResourcelist(response.data.data);
        setIsModalOpen(false);
      } else {
        setResourcelist([]);
        setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  // add resource
  const handleOk = async () => {
    try {
      const reqBody = {
        resource_name: resourceN.trim(),
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addResource,
        body: reqBody,
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

  // edit resource
  const handleEdit = async (val) => {
    try {
      const name = edittext?.resource.trim().toLowerCase();
      const reqBody = {
        resourceId: val,
        resource_name: name?.charAt(0).toUpperCase() + name.slice(1),
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.editResource,
        body: reqBody,
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setResource(response.data.data.resource_name);
        getResourceList();
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

  const resetSearchFilter = (e) => {
    const keyCode = e && e.keyCode ? e.keyCode : e;
    switch (keyCode) {
      case 8:
        if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
          searchRef.current.state.value = "";
          setSearchText("");
          setSearchEnabled(false);
        }
        break;
      case 46:
        if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
          searchRef.current.state.value = "";
          setSearchText("");
          setSearchEnabled(false);
        }
        break;
      default:
        break;
    }
  };

  // delete resource
  const handleResourceDelete = async (val) => {
    try {
      const reqBody = {
        resourceId: val,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.deleteResource,
        body: reqBody,
      });
      if (response.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setIsModalOpen(false);
        const isLastItemOnPage =
          ResourceList.length === 1 && pagination.current > 1;

        if (isLastItemOnPage) {
          setPagination((prevPagination) => ({
            ...prevPagination,
            current: prevPagination.current - 1,
          }));
        }
        getResourceList();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const columns = [
    {
      title: "Resources",
      dataIndex: "resource_name",
      key: "resource_name",
      width: 700,
      render: (text, record) => {
        const position = record?.resource_name.trim().replaceAll("_", " ");

        return record?._id == editid ? (
          <span
            onChange={(value) => {
              handlechange(value);
            }}
            style={{ textTransform: "capitalize" }}
          >
            <Input
              defaultValue={position}
              style={{ textTransform: "capitalize" }}
            />
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
        <div className="edit-delete">
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
                  style={{ fontSize: "18px" }}
                  onClick={() => {
                    setEditid(record?._id);
                    setFlag(true);
                  }}
                />
              </Button>
              <Popconfirm
                title="Do you really want to delete this Resource?"
                okText="Yes"
                cancelText="No"
                onConfirm={() => handleResourceDelete(record?._id)}
              >
                <Button type="link delete">
                  <AiOutlineDelete style={{ fontSize: "18px" }} />
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

  const handleTableChange = (page) => {
    setPagination({ ...pagination, ...page });
  };
  const handleCancel = () => {
    addprojectTech.resetFields();
    setIsModalOpen(false);
  };

  const getFooterDetails = () => {
    return (
      <label>
        Total Records Count is {pagination.total > 0 ? pagination.total : 0}
      </label>
    );
  };
  return (
    <>
      <Card className="employee-card">
        <div className="resources-container">
          <div className="profile-sub-head">
            <div className="heading-main">
              <h2>Resources</h2>
            </div>
            <div className="head-box-inner">
              <Button
                className="addleave-btn"
                onClick={showModal}
                size="default"
                type="primary"
              >
                + Add
              </Button>
              <Search
                ref={searchRef}
                placeholder="Search..."
                style={{ width: 200 }}
                onSearch={onSearch}
                onKeyUp={resetSearchFilter}
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
              <h1>Add Resources</h1>
            </div>
            <div className="overview-modal-wrapper">
              <Form form={addprojectTech} onFinish={handleOk}>
                <div className="topic-cancel-wrapper">
                  <Form.Item
                    name="project_tech"
                    label="Add Resource"
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
                      onChange={(e) => setResource(e.target.value)}
                    />
                  </Form.Item>
                  <div className="modal-footer-flex">
                    <div className="flex-btn">
                      <Button type="primary" htmlType="submit">
                        Save
                      </Button>
                      <Button onClick={handleCancel} className="ant-delete">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </Form>
            </div>
          </Modal>

          <div className="block-table-content">
            <Table
              columns={columns}
              dataSource={ResourceList}
              footer={getFooterDetails}
              onChange={handleTableChange}
              pagination={{
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "30"],
                ...pagination,
              }}
            />
          </div>
        </div>
      </Card>
    </>
  );
}

export default Resource;
