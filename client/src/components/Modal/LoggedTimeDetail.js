import React, { useEffect, useState } from "react";
import {
  Table,
  Modal,
  Popconfirm,
  Form,
  DatePicker,
  message,
  Avatar,
  Input,
  Button,
  Select,
} from "antd";
import MyAvatar from "../Avatar/MyAvatar";
import { removeTitle } from "../../util/nameFilter";
import moment from "moment";
import {
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import { useDispatch } from "react-redux";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import dayjs from "dayjs";
import { getRoles } from "../../util/hasPermission";

const LoggedTimeDetail = ({
  onCancel,
  isVisibleTime,
  setVisibleTime,
  columnDetails,
  expandedRowKey,
  setExpandedRowKey,
  deleteTime,
  getTimeLogged,
  taskId,
  getTaskByIdDetails,
  getBoardTasks,
  selectedTask,
  taskDetails,
}) => {
  const dispatch = useDispatch();
  const [form2] = Form.useForm();

  const [modalVisible, setModalVisible] = useState(false);
  const [addInputTaskData, setAddInputTaskData] = useState({});
  const [recordIndex, setRecordIndex] = useState("");
  const [editModalDescription, seteditModalDescription] = useState("");

  const dayAndMonth = columnDetails[recordIndex]?.logged_date
    ? moment(columnDetails[recordIndex]?.logged_date, "DD-MM-YYYY").format(
        "DD-MM-YYYY"
      )
    : "";

        const isDisabledTrackManually = getRoles(["TL"]) && getRoles(["Admin"]) && getRoles(["Client"]) 
    

  const columns = [
    {
      title: "Logged By",
      dataIndex: "loggedBy",
      key: "loggedBy",
      render: (text, record) => {
        return (
          <div className="logged-by-wrapper">
            <MyAvatar
              userName={record?.loggedBy || "-"}
              src={record?.loggedBy_img}
              alt={record?.loggedBy}
            />
            <span style={{ textTransform: "capitalize" }}>
              {" "}
              {removeTitle(record?.loggedBy)}
            </span>
          </div>
        );
      },
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (text, record) => {
        const parsedDate = moment(record.logged_date, "DD-MM-YYYY");
        const formattedDate = parsedDate.format("DD-MM-YYYY");
        return (
          <div>
            <span style={{ textTransform: "capitalize" }}>{formattedDate}</span>
          </div>
        );
      },
    },
    {
      title: "Logged Hours",
      dataIndex: "logged_hours",
      key: "logged_hours",
      render: (text, record) => {
        return (
          <div>
 <span style={{ textTransform: "capitalize" }}>
              {record?.logged_hours}h {record?.logged_minutes}m {record?.logged_seconds ?record?.logged_seconds : 0}s
            </span>
          </div>
        );
      },
    },
    {
      title: "Actions",
      dataIndex: "descriptions",
      render: (text, record, index) => (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: "20px",
            }}
          >
           { isDisabledTrackManually &&(
            <EditOutlined
              style={{ color: "green" }}
              onClick={() => {
                getTimeLogged(taskId);
                setRecordIndex(index);
                setModalVisible(true);
                setVisibleTime(false);
              }}
            />
          )}

            <Popconfirm
              icon={
                <QuestionCircleOutlined
                  style={{
                    color: "red",
                  }}
                />
              }
              title="Are you sure to delete this Logged Hours?"
              onConfirm={() => {
                deleteTime(record._id);
              }}
              okText="Yes"
              cancelText="No"
            >
              <DeleteOutlined style={{ color: "red" }} />
            </Popconfirm>
          </div>
        </>
      ),
    },
  ];

  const handleModalClose = () => {
    setModalVisible(false);
    form2.resetFields();
  };

  const generateAvatarFromName1 = (name) => {
    const initials = name
      ?.trim()
      ?.split(/\s+/)
      ?.filter((part) => part !== "")
      ?.map((part) => part.charAt(0))
      ?.join("")
      ?.toUpperCase();

    const avatarStyle = {
      backgroundColor: "#7C4DFF",
      color: "#FFFFFF",
      fontSize: "10px",
    };
    return (
      <div
        style={{
          ...avatarStyle,
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {initials}
      </div>
    );
  };

  const handleSubmit2 = async (values, e) => {
    try {
      const reqBody = {
        descriptions: editModalDescription,
        logged_hours:
          values?.Hours && values?.Hours != "" ? values?.Hours : "00",
        logged_minutes:
          values?.Minutes && values?.Minutes != "" ? values?.Minutes : "00",
        // logged_date: dayjs(values?.dateUpdate, "DD-MM-YYYY").add(1, "days"),
        logged_date: dayjs(values?.dateUpdate).format("DD-MM-YYYY"),
      };

      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url:
          Service.updateTimesheet + "/" + columnDetails[recordIndex]?._id,
        body: reqBody,
      });

      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        getTaskByIdDetails(taskId);
        getBoardTasks(selectedTask?._id);
        handleModalClose();
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  const handleTaskInput = (name, value) => {
    setAddInputTaskData({ [name]: value });
  };

  const handleChangeData = (event, editor) => {
    const data = editor.getData();
    seteditModalDescription(data);
  };

  const handlePasteData = (event, editor) => {
    const pastedData = (event.clipboardData || window.clipboardData).getData(
      "text"
    );
    const newData = pastedData?.replace(
      /(https?:\/\/[^\s]+)(?=\s|$)/g,
      '<a href="$1" target="_blank">$1</a>'
    );
    editor.setData(newData);
  };

  useEffect(() => {
    form2.setFieldsValue({
      dateUpdate: dayjs(columnDetails[recordIndex]?.logged_date, "DD-MM-YYYY"),
      Hours: columnDetails[recordIndex]?.logged_hours || "",
      Minutes: columnDetails[recordIndex]?.logged_minutes || "",
      descriptions: columnDetails[recordIndex]?.descriptions || "",
    });
    seteditModalDescription(columnDetails[recordIndex]?.descriptions || "");
  }, [columnDetails[recordIndex]]);

  return (
    <>
      {modalVisible && columnDetails && columnDetails.length > 0 && (
        <Modal
          title={null}
          key="unique"
          destroyOnClose
          open={modalVisible}
          onCancel={handleModalClose}
          footer={null}
          width={600}
          onClose={handleModalClose}
          className="log-time-modal my-logtime-modal"
        >
          <div className="modal-header">
            <h1>Edit Logged Time Details ({dayAndMonth})</h1>
          </div>
          <Form
            name="edit_form"
            initialValues={{
              Hours: columnDetails[recordIndex]?.logged_hours || "",
              Minutes: columnDetails[recordIndex]?.logged_minutes || "",
              descriptions: columnDetails[recordIndex]?.descriptions || "",
            }}
            form={form2}
            onFinish={handleSubmit2}
          >
            <div className="overview-modal-wrapper">
              <div className="d-flex log-time-details align-center">
                <div className="d-flex align-center logtime-left-wrapper">
                  <div className="loggtime-main-wrapper">
                    <span className="loggtime-avatar">
                      <Avatar
                        key={columnDetails[recordIndex]._id}
                        src={
                          columnDetails[recordIndex]?.loggedBy_img &&
                          columnDetails[recordIndex]?.loggedBy_img !== ""
                            ? `${Service.HRMS_Base_URL}/uploads/emp_images/${columnDetails[recordIndex]?.loggedBy_img}`
                            : generateAvatarFromName1(
                                columnDetails[recordIndex]?.loggedBy
                              )
                        }
                      />
                    </span>
                    <div className="logged-by-wrapper">
                      <p>Logged by</p>
                      <h4>
                        {removeTitle(columnDetails[recordIndex]?.loggedBy)}
                      </h4>
                    </div>
                  </div>
                  <div className="logtime-right-wrapper">
                    <div
                      className="hours-time-wrapper"
                      style={{ display: "flex", flexWrap: "wrap" }}
                    >
                      <p className="my-logged-time-edit">Time Logged:</p>

                      <Form.Item
                        colon={false}
                        className="hours"
                        name="Hours"
                        rules={[
                          {
                            validator: (_, value) => {
                              if (
                                !value ||
                                (Number(value) >= 0 && Number(value) <= 24)
                              ) {
                                return Promise.resolve();
                              }
                              return Promise.reject(
                                new Error(
                                  "Please enter a valid number between 0 and 24."
                                )
                              );
                            },
                          },
                        ]}
                      >
                        <Input
                          type="text"
                          placeholder="Hours"
                          onChange={(e) => {
                            const { value } = e.target;
                            if (
                              /^\d*$/.test(value) &&
                              (value === "" ||
                                (Number(value) >= 0 && Number(value) <= 24))
                            ) {
                              e.target.value = value;
                            } else {
                              e.preventDefault();
                            }
                          }}
                        />
                      </Form.Item>

                      <Form.Item
                        colon={false}
                        className="minutes"
                        name="Minutes"
                        rules={[
                          {
                            validator: (_, value) => {
                              if (
                                !value ||
                                (Number(value) >= 0 && Number(value) <= 59)
                              ) {
                                return Promise.resolve();
                              }
                              return Promise.reject(
                                new Error(
                                  "Please enter a valid number between 0 and 59."
                                )
                              );
                            },
                          },
                        ]}
                      >
                        <Input
                          type="text"
                          value={columnDetails[recordIndex]?.logged_minutes}
                          placeholder="Minutes"
                          onChange={(e) => {
                            const { value } = e.target;
                            if (
                              /^\d*$/.test(value) &&
                              (value === "" ||
                                (Number(value) >= 0 && Number(value) <= 59))
                            ) {
                              e.target.value = value;
                            } else {
                              e.preventDefault();
                            }
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="Logged Date"
                        name="dateUpdate"
                        className="date-time-picker"
                      >
                        <DatePicker
                          placeholder="When"
                          value={
                            form2?.dateUpdate
                              ? dayjs(form2?.dateUpdate, "DD-MM-YYYY")
                              : dayjs("01-01-2001", "DD-MM-YYYY")
                          }
                          onChange={(date, dateString) =>
                            handleTaskInput(
                              "start_date",
                              dayjs(dateString, "DD-MM-YYYY")
                            )
                          }
                          disabledDate={(current) => {
                            return current && current > dayjs().endOf("day");
                          }}
                          format="DD-MM-YYYY"
                        >
                          <i className="fi fi-rr-calendar-day"></i>
                        </DatePicker>
                      </Form.Item>
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-flex align-start">
                <div className="description-loggedtime-details">
                  <Form.Item name="descriptions">
                    <CKEditor
                      editor={Custombuild}
                      data={editModalDescription}
                      onChange={handleChangeData}
                      onPaste={handlePasteData}
                      config={{
                        toolbar: [
                          "heading",
                          "|",
                          "bold",
                          "italic",
                          "underline",
                          "|",
                          "fontColor",
                          "fontBackgroundColor",
                          "|",
                          "link",
                          "|",
                          "numberedList",
                          "bulletedList",
                          "|",
                          "alignment:left",
                          "alignment:center",
                          "alignment:right",
                          "|",
                          "fontSize",
                          "|",
                          "print",
                        ],
                        fontSize: {
                          options: [
                            "default",
                            1,
                            2,
                            3,
                            4,
                            5,
                            6,
                            7,
                            8,
                            9,
                            10,
                            11,
                            12,
                            13,
                            14,
                            15,
                            16,
                            17,
                            18,
                            19,
                            20,
                            21,
                            22,
                            23,
                            24,
                            25,
                            26,
                            27,
                            28,
                            29,
                            30,
                            31,
                            32,
                          ],
                        },

                        print: {},
                        styles: {
                          height: "10px",
                        },
                      }}
                    />
                  </Form.Item>
                </div>
              </div>
              <div className="d-flex project-bg align-center">
                <h5>Project</h5>
                <span className="bg-label project-bg-label">
                  {columnDetails[recordIndex]?.projectDetails?.title}
                </span>
              </div>
              <div className="d-flex align-center">
                <h5>Timesheet</h5>
                <p>
                  {columnDetails[recordIndex]?.timesheet?.title}'s Timesheet
                </p>
              </div>
              <div className="d-flex align-center">
                <h5>TaskList</h5>
                <p>{columnDetails[recordIndex]?.main_taskList}</p>
              </div>
              <div className="d-flex align-center">
                <h5>Task</h5>
                <p>{columnDetails[recordIndex]?.task}</p>
              </div>

              <div>
                <Button
                  style={{ width: 250 }}
                  htmlType="submit"
                  type="primary"
                  className="square-primary-btn"
                >
                  Update Logged Time Details
                </Button>
              </div>
            </div>
          </Form>
        </Modal>
      )}

      <Modal
        className="task-logged-details-wrapper"
        open={isVisibleTime}
        footer={null}
        width={600}
        onCancel={onCancel}
        zIndex={2000}
      >
        <div className="modal-header ">
          <h1>Logged Time detail</h1>
        </div>

        <div
          className="filter-section"
          style={{ margin: "12px 0" , padding: "0 16px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ minWidth: "fit-content", fontWeight: 500 }}>
              Filter by Employee:
            </label>
            <Select
              placeholder="Select an employee"
              style={{ minWidth: 200, flex: 1 }}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={(value) => {
                getTimeLogged(taskId,value)
              }}
              options={[
                { value: '', label: 'All' },
                ...(taskDetails?.assignees || []).map((emp) => ({
                  value: emp._id, 
                  label: emp.name,
                })),
              ]}
            />
          </div>
        </div>

        <div className="modal-body loggedtimedetails-wrapper">
          <Table
            columns={columns}
            dataSource={columnDetails}
            pagination={false}
            expandable={{
              expandedRowRender: (record) => (
                <div className="loggedtimedetails" style={{ margin: 0 }}>
                  {record?.descriptions ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: record?.descriptions,
                      }}
                    ></div>
                  ) : (
                    <div style={{ color: "grey" }}>No description added</div>
                  )}
                </div>
              ),
              onExpand: (expanded, record) => {
                setExpandedRowKey(expanded ? record.key : null);
              },
              expandedRowKeys: expandedRowKey ? [expandedRowKey] : [],
            }}
          />
        </div>
      </Modal>
    </>
  );
};

export default LoggedTimeDetail;
