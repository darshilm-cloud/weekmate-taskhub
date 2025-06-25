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
} from "@ant-design/icons";
import Service from "../../service";
import { AiOutlineDelete } from "react-icons/ai";
import { useDispatch } from "react-redux";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";
import "./settings.css";

function ProjectLabels() {
  const searchRef = useRef();
  const [projectLabel] = Form.useForm();
  const Search = Input.Search;
  const dispatch = useDispatch();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [Labels, setProjectLabel] = useState("");
  const [projectlabelListing, setLabelListing] = useState([]);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [editid, setEditid] = useState();
  const [flag, setFlag] = useState(false);
  const [edtitext, setEdittext] = useState({ label: "" });

  const onSearch = value => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  // delete the labels
  const handleDeleteLabel = async val => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteProjectLabels + "/" + val,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        const isLastItemOnPage =
          projectlabelListing.length === 1 && pagination.current > 1;

        // If the last item on the page is deleted, decrement the page number
        if (isLastItemOnPage) {
          setPagination(prevPagination => ({
            ...prevPagination,
            current: prevPagination.current - 1,
          }));
        }
        getListingLabels();
        setIsModalOpen(false);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // edit the labels
  const handleEdit = async val => {
    try {
      const name = edtitext?.label?.trim();
      const reqBody = {
        title: name ? name : edtitext,
        color: selectedColor,
      };
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateProjectLabels + "/" + val,
        body: reqBody,
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setProjectLabel(response.data.data.title);
        getListingLabels();
        setIsModalOpen(false);
        setEdittext({});
        setSelectedColor("");
      } else {
        setEdittext({});
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handlechange = e => {
    setEdittext(e.target.value);
  };

  const columns = [
    {
      title: "Color",
      dataIndex: "color",
      key: "color",
      width: 0,
      render: (_, record) => {
        const color = record.color;
        return record?._id === editid ? (
          <>
            <Input
              type="color"
              label="color"
              name="color"
              onChange={e => setSelectedColor(e.target.value)}
              value={selectedColor}
            />
          </>
        ) : (
          <>
            <span
              style={{
                display: "inline-block",
                backgroundColor: selectedColor[color] || color,
                height: "20px",
                width: "30px",
                verticalAlign: "middle",
                borderRadius: "4px",
              }}
            ></span>
          </>
        );
      },
    },

    {
      title: "Labels",
      dataIndex: "title",
      key: "title",
      width: 500,
      render: (text, record) => {
        const position = record?.title;
        const color = record.color;
        return record?._id === editid ? (
          <>
            <Input
              defaultValue={position}
              onChange={e => handlechange(e)}
              style={{
                display: "inline-block",
                marginRight: "25px",
                verticalAlign: "middle",
                width: "200",
              }}
            />
          </>
        ) : (
          <>
            <span style={{ textTransform: "capitalize" }}>{position}</span>
          </>
        );
      },
    },

    {
      title: "Actions",
      dataIndex: "action",
      width: 150,
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
                    setEdittext(record?.title);
                  }}
                />
              </Button>
              <Button
                type="link delete"
                title="View"
                onClick={() => {
                  setEditid("");
                  setSelectedColor("");
                }}
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
                    setSelectedColor(record?.color);
                    setEdittext(record?.title);
                  }}
                />
              </Button>
              <Popconfirm
                title="Do you really want to delete this Label?"
                okText="Yes"
                cancelText="No"
                onConfirm={() => handleDeleteLabel(record?._id)}
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

  useEffect(() => {
    getListingLabels();
  }, [searchText, pagination.current, pagination.pageSize]);

  const handleTableChange = page => {
    setPagination({ ...pagination, ...page });
  };

  // listing of the labels
  const getListingLabels = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        sort: "_id",
        sortBy: "asce",
        isDropdown: false,
      };
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectLabels,
        body: reqBody,
      });
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
      }
      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        setPagination({
          ...pagination,
          total: response.data.metadata.total,
        });
        setLabelListing(response.data.data);
        setIsModalOpen(false);
      } else {
        setLabelListing([]);
        setPagination(prevPagination => ({ ...prevPagination, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  // add the labels
  const handleOk = async () => {
    try {
      const reqBody = {
        title: Labels.trim(),
        color: selectedColor || "#000000",
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectLabels,
        body: reqBody,
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        getListingLabels();
        setIsModalOpen(false);
        projectLabel.setFieldsValue({ title: "" });
        setSelectedColor("");
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleCancel = () => {
    projectLabel.resetFields();
    setIsModalOpen(false);
    setSelectedColor("");
  };

  const showModal = () => {
    setEditid("");
    setEdittext({});
    setSelectedColor("");
    setIsModalOpen(true);
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
        <div className="project-labels-container">
          <div className="profile-sub-head">
            <div className="heading-main">
              <h2>Project Labels</h2>
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
                onSearch={onSearch}
                style={{ width: 200 }}
              />
            </div>
          </div>
          <Modal
            open={isModalOpen}
            onOk={handleOk}
            footer={false}
            onCancel={handleCancel}
          >
            <div className="modal-header">
              <h1>Add Task Labels</h1>
            </div>
            <div className="overview-modal-wrapper">
              <Form form={projectLabel} onFinish={handleOk}>
                <div className="topic-cancel-wrapper">
                  <Form.Item
                    label="Task Labels"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: "Please enter a color",
                      },
                    ]}
                  >
                    <Input
                      type="color"
                      label="color"
                      name="color"
                      onChange={e => setSelectedColor(e.target.value)}
                      value={selectedColor}
                    />
                  </Form.Item>
                  <Form.Item
                    name="title"
                    rules={[
                      {
                        whitespace: true,
                        required: true,
                        message: "Please enter a Task Labels",
                      },
                    ]}
                  >
                    <Input
                      autoComplete="off"
                      onChange={e => setProjectLabel(e.target.value)}
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
              dataSource={projectlabelListing}
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

export default ProjectLabels;
