import React, { useEffect, useState } from "react";
import {
  Button,
  Input,
  Form,
  Card,
  message,
  Table,
  Popconfirm,
  Modal,
} from "antd";
import {
  CloseCircleTwoTone,
  SaveTwoTone,
  EditOutlined,
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";

import { useDispatch } from "react-redux";
import { AiOutlineDelete } from "react-icons/ai";
import "./workflowstyle.css";
import { Link } from "react-router-dom/cjs/react-router-dom.min";

function WorkflowTasksUpdate() {
  const companySlug = localStorage.getItem("companyDomain");

  const [addform] = Form.useForm();
  const [workflowName, setWorkflowName] = useState("");
  const [editid, setEditid] = useState("");
  const [edtitext, setEdittext] = useState({});
  let [flag, setFlag] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [WorkflowStatusList, setWorkflowStatusList] = useState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dispatch = useDispatch();

  const { id } = useParams();

  const showModal = () => {
    setEditid("");
    setEdittext({});
    setSelectedColor("");
    setIsModalOpen(true);
  };

  useEffect(() => {
    getListWorkflowStatus();
  }, []);

  const handleCancel = () => {
    addform.resetFields();
    setIsModalOpen(false);
  };
  // add workflow status
  const handleOk = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const reqBody = {
        workflow_id: id,
        title: workflowName,
        color: selectedColor || "#000000",
      };

      const headers = {
        token,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addworkflowStatus,
        body: reqBody,
        headers: headers,
      });
      if (response?.data?.data && response?.data?.status) {
        getListWorkflowStatus();
        setIsModalOpen(false);
        setSelectedColor("");
        addform.resetFields();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get workflow status list
  const getListWorkflowStatus = async () => {
    try {
      dispatch(showAuthLoader());
      const token = localStorage.getItem("accessToken");

      const reqBody = {};
      const headers = {
        token,
      };

      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getworkflowStatus + "/" + id,
        headers: headers,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setWorkflowStatusList(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // delete workflow status
  const handleDeleteWorkflowStatus = async (id) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteworkflowStatus + "/" + id,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        getListWorkflowStatus();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleEdit = async (val) => {
    try {
      const currentRecord = WorkflowStatusList.find((item) => item._id === val);
      const updatedTitle = edtitext.title.trim() || currentRecord.title;

      const reqBody = {
        workflow_id: id,
        title: updatedTitle,
        color: selectedColor,
      };

      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateworkflowStatus + "/" + val,
        body: reqBody,
      });

      if (response?.data && response?.data?.status) {
        message.success(response.data.message);
        getListWorkflowStatus();
        setEditid("");
        setFlag(false);
        setEdittext({});
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      setEdittext({});
    }
  };

  const handleColorChange = (e) => {
    setSelectedColor(e.target.value);
  };

  const handlechange = (e) => {
    setEdittext({ ...edtitext, title: e.target.value });
  };

  const columns = [
    {
      title: "Color",
      key: "color",
      width: 0,
      render: (text, record) => {
        return record._id === editid ? (
          <Input
            type="color"
            name="color"
            onChange={handleColorChange}
            value={selectedColor}
          />
        ) : (
          <span
            style={{
              display: "inline-block",
              backgroundColor: selectedColor[record?.color] || record?.color,
              height: "20px",
              width: "20px",
              borderRadius: "10px",
            }}
          ></span>
        );
      },
    },
    {
      title: "Workflow stages",
      dataIndex: "title",
      key: "title",
      width: 700,
      render: (text, record, index) => {
        const position = record?.title;
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
          <span style={{ textTransform: "capitalize" }}>{position}</span>
        );
      },
    },

    {
      title: "Actions",
      key: "action",
      width: 200,
      render: (text, record) => {
        if (record.isDefault == true) {
          return null;
        }
        return (
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {flag === true && editid === record._id ? (
              <>
                <Button
                  type="link"
                  onClick={() => {
                    handleEdit(record._id);
                    setFlag(false);
                    setEditid("");
                  }}
                >
                  <SaveTwoTone style={{ fontSize: "18px" }} />
                </Button>
                <Button
                  type="link"
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
                <Button
                  type="link edit"
                  onClick={() => {
                    setEditid(record._id);
                    setFlag(true);
                    setEdittext({ title: record.title });
                    setSelectedColor(record?.color);
                  }}
                >
                  <EditOutlined style={{ fontSize: "18px", color: "green" }} />
                </Button>
                <Popconfirm
                  title="Are you sure you want to delete this workflow stage?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() => handleDeleteWorkflowStatus(record._id)}
                >
                  <Button type="link delete">
                    <AiOutlineDelete
                      style={{ fontSize: "18px", color: "red" }}
                    />
                  </Button>
                </Popconfirm>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Card className="employee-card">
        <div className=" workflowtask-wrapper">
          <div className="project-type-container">
            <div className="heading-main">
              <h2>Workflow Stages</h2>
            </div>

            <div className="profile-sub-head">
              <div className="head-box-inner">
                <Link to={`/${companySlug}/workflows`}>
                  <i
                    class="fi fi-rr-arrow-small-left"
                    style={{ fontSize: "30px", color: "#000" }}
                  ></i>
                </Link>
                <Button type="primary" onClick={showModal}>
                  Add
                </Button>
              </div>
            </div>

            <Modal
              open={isModalOpen}
              onOk={handleOk}
              onCancel={handleCancel}
              footer={false}
            >
              <div className="modal-header">
                <h1>Add Project Workflow Stage</h1>
              </div>
              <div className="overview-modal-wrapper">
                <Form form={addform} onFinish={handleOk}>
                  <div className="topic-cancel-wrapper">
                    <Form.Item
                      label="Color:"
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: "Please select a color",
                        },
                      ]}
                    >
                      <Input
                        type="color"
                        label="color"
                        name="color"
                        onChange={(e) => setSelectedColor(e.target.value)}
                        value={selectedColor}
                      />
                    </Form.Item>
                    <Form.Item
                      name="title"
                      label="title"
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
                        onChange={(e) => setWorkflowName(e.target.value)}
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
          </div>
          <div className="block-table-content">
            <Table
              columns={columns}
              dataSource={WorkflowStatusList}
              pagination={false}
              footer={null}
            />
          </div>
        </div>
      </Card>
    </>
  );
}

export default WorkflowTasksUpdate;
