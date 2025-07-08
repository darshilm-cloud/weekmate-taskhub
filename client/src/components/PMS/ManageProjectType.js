import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Card,
  Table,
  Input,
  Modal,
  Form,
  message,
  Popconfirm,
} from "antd";
import {
  CloseCircleTwoTone,
  SaveTwoTone,
  EditOutlined,
} from "@ant-design/icons";
import { AiOutlineDelete } from "react-icons/ai";
import Service from "../../service";
import { useDispatch } from "react-redux";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";
import "./settings.css";

function ManageProjectType() {
  const dispatch = useDispatch();
  const Search = Input.Search;
  const [addprojectform] = Form.useForm();
  const searchRef = useRef();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectname, setprojectname] = useState("");
  const [editid, setEditid] = useState();
  const [flag, setFlag] = useState(false);
  const [edtitext, setEdittext] = useState({});
  const [searchText, setSearchText] = useState("");
  const [projectList, setProjectList] = useState([]);
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const columns = [
    {
      title: "Project Types",
      dataIndex: "project_type",
      key: "project_type",
      width: 700,
      render: (text, record) => {
        const position = record?.project_type;
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
                    handleEditProjectName(record?._id);
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
                    // handleEdit(record?._id);
                    setEditid(record._id);
                    setFlag(true);
                  }}
                />
              </Button>
              <Popconfirm
                title="Do you really want to delete this project Type?"
                okText="Yes"
                cancelText="No"
                onConfirm={() => handleDeleteProjectName(record._id)}
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
  const handlechange = (e) => {
    const type = e.target.value;
    setEdittext({ ...edtitext, type: type });
  };

  const showModal = () => {
    setIsModalOpen(true);
  };

  // edit projecttype
  const handleEditProjectName = async (val) => {
    try {
      const name = edtitext?.type.trim().toLowerCase();
      const reqBody = {
        projectTypeId: val,
        project_type: name?.charAt(0).toUpperCase() + name.slice(1),
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.updateProjectName,
        body: reqBody,
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setprojectname(response.data.data.project_type);
        getListProjectName();
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

  // delete projecttype
  const handleDeleteProjectName = async (val) => {
    try {
      const reqBody = {
        projectTypeId: val,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.deleteProjectName,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        const isLastItemOnPage =
          projectList.length === 1 && pagination.current > 1;

        // If the last item on the page is deleted, decrement the page number
        if (isLastItemOnPage) {
          setPagination((prevPagination) => ({
            ...prevPagination,
            current: prevPagination.current - 1,
          }));
        }
        getListProjectName();
        setIsModalOpen(false);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getListProjectName();
  }, [searchText, pagination.current, pagination.pageSize]);

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

  // get projecttype
  const getListProjectName = async () => {
    try {
      dispatch(showAuthLoader());

      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        sortBy: "asce",
        sort: "_id",
      };
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
        setSearchEnabled(true);
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListing,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        setPagination((prevPagination) => ({
          ...prevPagination,
          total: response.data.metadata.total,
        }));

        setProjectList(response.data.data);
        setIsModalOpen(false);
      } else {
        setProjectList([]);
        setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  // add projecttype
  const handleOk = async () => {
    try {
      const reqBody = {
        project_type: projectname.trim(),
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectType,
        body: reqBody,
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        addprojectform.resetFields();
        getListProjectName();
        setIsModalOpen(false);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleTableChange = (page) => {
    setPagination({ ...pagination, ...page });
  };
  const getFooterDetails = () => {
    return (
      <label>
        Total Records Count is {pagination.total > 0 ? pagination.total : 0}
      </label>
    );
  };
  const handleCancel = () => {
    addprojectform.resetFields();
    setIsModalOpen(false);
  };

  return (
    <>
      <Card className="employee-card">
        <div className="project-type-container">
         
            <div className="heading-wrapper">
              <h2>Project Type</h2>
          
              <Button onClick={showModal} type="primary">
                + Add
              </Button>
            </div>
            <div className="global-search">
              <Search
                ref={searchRef}
                placeholder="Search..."
                onSearch={onSearch}
                onKeyUp={resetSearchFilter}
                style={{ width: 200 }}
              />
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
              dataSource={projectList}
            />
          </div>

          <Modal
            open={isModalOpen}
            onOk={handleOk}
            onCancel={handleCancel}
            footer={false}
          >
            <div className="modal-header">
              <h1>Add Project Type</h1>
            </div>
            <div className="overview-modal-wrapper">
              <Form form={addprojectform} onFinish={handleOk}>
                <div className="topic-cancel-wrapper">
                  <Form.Item
                    name="project_type"
                    label="Project type"
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
                      onChange={(e) => setprojectname(e.target.value)}
                    />
                  </Form.Item>
                  <div className="modal-footer-flex">
                    <div className="flex-btn">
                      <Button type="primary" htmlType="submit">
                        Save
                      </Button>
                      <Button className="ant-delete" onClick={handleCancel}>
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

export default ManageProjectType;
