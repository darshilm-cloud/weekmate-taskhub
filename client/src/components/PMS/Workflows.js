import React, { useState, useRef, useEffect } from "react";
import {
  Input,
  Table,
  Button,
  Popconfirm,
  Form,
  message,
  Modal,
  Card,
} from "antd";
import { AiOutlineDelete } from "react-icons/ai";
import Search from "antd/lib/input/Search";
import Service from "../../service";
import { useDispatch } from "react-redux";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";
import {
  CloseCircleTwoTone,
  SaveTwoTone,
  EditOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import "./settings.css";

function Workflows() {
  const dispatch = useDispatch();
  const searchRef = useRef();
  const [addform] = Form.useForm();

  const [flag, setFlag] = useState(false);
  const [editid, setEditid] = useState();
  const [edtitext, setEdittext] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [searchText, setSearchText] = useState("");
  const [workflowList, setWorkflowList] = useState([]);
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortColumn, setSortColumn] = useState("project_workflow");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const columns = [
    {
      title: "Work flows",
      dataIndex: "project_workflow",
      key: "project_workflow",
      width: 700,
      render: (text, record, index) => {
        const position = record?.project_workflow?.trim();
        return record?._id == editid ? (
          <span
            onChange={(value) => {
              handlechange(value);
            }}
            style={{ textTransform: "capitalize" }}
          >
            <Input defaultValue={position} />
          </span>
        ) : (
          <Link to={`/workflows-tasks/${record?._id}`}>
            <span style={{ textTransform: "capitalize" }}>{position}</span>
          </Link>
        );
      },
    },

    {
      title: "Actions",
      dataIndex: "action",
      width: 200,
      render: (text, record, index) => (
        <div className="edit-delete">
          {flag == true && editid == record?._id ? (
            <>
              <Button type="link edit">
                <SaveTwoTone
                  twoToneColor="green"
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
              {(!Object.keys(record).includes("isDefault") ||
                record?.isDefault == false) && (
                <>
                  <Button type="link edit">
                    <EditOutlined
                      twoToneColor="green"
                      onClick={() => {
                        setEditid(record._id);
                        setFlag(true);
                      }}
                    />
                  </Button>
                  <Popconfirm
                    title="Do you really want to delete this Workflow?"
                    okText="Yes"
                    cancelText="No"
                    onConfirm={() => handleDeleteWorkflow(record._id)}
                  >
                    <Button type="link delete">
                      <AiOutlineDelete />
                    </Button>
                  </Popconfirm>
                </>
              )}
            </>
          )}
        </div>
      ),
    },
  ];
  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const handlechange = (e) => {
    let workflow = e.target.value;
    setEdittext({ ...edtitext, workflow: workflow });
  };

  // edit workflow
  const handleEdit = async (val) => {
    try {
      let name = edtitext?.workflow?.trim();
      const reqBody = {
        projectWorkFlowId: val,
        project_workflow: name?.charAt(0).toUpperCase() + name.slice(1),
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.updateWorkflow,
        body: reqBody,
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        getListWorkflow();
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

  const showModal = () => {
    setIsModalOpen(true);
  };

  // get workflow list
  const getListWorkflow = async () => {
    try {
      dispatch(showAuthLoader());

      const reqBody = {
        isDropdown: false,
        pageNo: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
      };
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getworkflow,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        setPagination({
          ...pagination,
          total: response.data.metadata.total,
        });
        setWorkflowList(response.data.data);
        setIsModalOpen(false);
      } else {
        setWorkflowList([]);
        setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleOk = async (value) => {
    setIsModalOpen(true);
  };

  // add workflow
  const addWorkflowDetails = async (values) => {
    try {
      let token = localStorage.getItem("accessToken");
      const reqBody = {
        project_workflow: values.project_workflow?.trim(),
        status: "active",
      };

      const headers = {
        token,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addworkflow,
        body: reqBody,
        headers: headers,
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        addform.resetFields();
        getListWorkflow();
        setIsModalOpen(false);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleCancel = () => {
    setIsModalOpen(false);
    addform.resetFields();
  };
  const handleTableChange = (page, filters, sorter) => {
    setPagination({ ...pagination, ...page });
    const { field, order } = sorter;
    if (order) {
      setSortOrder(order === "ascend" ? "asc" : "desc");
    }
    if (field) {
      setSortColumn(field ?? "project_workflow");
    }
  };

  const handleDeleteWorkflow = async (val) => {
    try {
      const reqBody = {
        projectWorkFlowId: val,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.deleteWorkflow,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        const isLastItemOnPage =
          workflowList.length === 1 && pagination.current > 1;

        if (isLastItemOnPage) {
          setPagination((prevPagination) => ({
            ...prevPagination,
            current: prevPagination.current - 1,
          }));
        }

        setIsModalOpen(false);
        getListWorkflow();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const getFooterDetails = () => {
    return (
      <label>
        Total Records Count is {pagination.total > 0 ? pagination.total : 0}
      </label>
    );
  };
  useEffect(() => {
    getListWorkflow();
  }, [
    searchText,
    pagination.current,
    pagination.pageSize,
    sortOrder,
    sortColumn,
  ]);
  return (
    <>
      <Card className="employee-card">
        <div className="workflow-container">
          <div className="profile-sub-head">
            <div className="heading-main">
              <h2>Workflow</h2>
            </div>
            <div className="head-box-inner">
              <Button
                className="addleave-btn"
                type="primary"
                onClick={showModal}
              >
                + Add
              </Button>
              <Search
                ref={searchRef}
                placeholder="Search..."
                onSearch={onSearch}
                style={{ width: 200 }}
                className="mr2"
              />
            </div>
          </div>

          <div className="block-table-content">
            <Table
              columns={columns}
              pagination={{
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "30"],
                ...pagination,
              }}
              footer={getFooterDetails}
              onChange={handleTableChange}
              dataSource={workflowList}
            />
          </div>

          <Modal
            open={isModalOpen}
            onOk={handleOk}
            onCancel={handleCancel}
            footer={false}
          >
            <div className="modal-header">
              <h1>Add Workflow</h1>
            </div>
            <div className="overview-modal-wrapper">
              <Form form={addform} onFinish={addWorkflowDetails}>
                <div className="topic-cancel-wrapper">
                  <Form.Item
                    name="project_workflow"
                    label="Add WorkFlow"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: "Please enter a valid title",
                      },
                    ]}
                  >
                    <Input autoComplete="off" />
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
        </div>
      </Card>
    </>
  );
}

export default Workflows;
