/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import {
  message,
  Card,
  Popconfirm,
  Input,
  Avatar,
  Dropdown,
  Modal,
  Form,
  Button,
  ConfigProvider,
  Menu,
  DatePicker,
} from "antd";
import Service from "../../service";
import { useDispatch } from "react-redux";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions";
import moment from "moment";
import { DeleteOutlined, EditOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "./logtimeWidget.css";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import { removeTitle } from "../../util/nameFilter";
import MyAvatar from "../../components/Avatar/MyAvatar";
import useEffectAfterMount from "../../util/useEffectAfterMount";
import ReactHTMLTableToExcel from "react-html-table-to-excel";
import MyLoggedTimeFilterComponent from "./MyLoggedTimeFilterComponent";

const MylogtimeWidget = () => {
  const dispatch = useDispatch();
  const csvRef = document.getElementById("test-table-xls-button");
  const now = moment();
  const [form2] = Form.useForm();
  const firstDayOfMonth = now.startOf("month").format("YYYY-MM-DD");
  const today = moment().format("YYYY-MM-DD");

  const [loggedtime, setloggedTime] = useState([]);
  const [loggedtimebyDate, setloggedTimebyDate] = useState([]);
  const [addInputEndDate, setaddInputEndDate] = useState({ end_date: today });
  const [addInputStartDate, setaddInputStartDate] = useState({
    start_date: firstDayOfMonth,
  });
  const [editModalDescription, seteditModalDescription] = useState("");
  const [onEditClick, setOnEditClick] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [selectedRow, setSelectedRow] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [radioOrderbyValue, setRadioOrderbyValue] = useState("desc");
  const [radioValue, setRadioValue] = useState("Custom");
  const [selectedProject, setSelectedProject] = useState("all");
  const [groupBy, setGroupBy] = useState("date");
  const [groupedTable, setgroupedable] = useState("date");
  const [html, setHtml] = useState([]);

  const dayAndMonth = modalData?.logged_date
    ? moment(modalData?.logged_date, "DD-MM-YYYY").format("D MMMM YYYY")
    : "";

  const deleteTime = async (id) => {
    dispatch(showAuthLoader());
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteTime}/${id}`,
      });
      if (response?.data && response?.data?.status) {
        dispatch(hideAuthLoader());
        message.success(response.data.message);
        getTimeLoggedbyDate();
        setModalData([]);
        getTimeLogged();
        setModalVisible(false);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const ModalMenu = (
    <Menu>
      {!onEditClick && (
        <Menu.Item onClick={() => setOnEditClick(true)}>
          <EditOutlined style={{ color: "green" }} /> <span>Edit</span>
        </Menu.Item>
      )}
      <Menu.Item style={{ cursor: "pointer" }} className="ant-delete">
        <Popconfirm
          title="Do you want to delete?"
          okText="Yes"
          cancelText="No"
          onConfirm={() => deleteTime(modalData._id)}
        >
          <DeleteOutlined style={{ color: "red" }} /> <span>Delete</span>
        </Popconfirm>
      </Menu.Item>
    </Menu>
  );

  const handleChangeData = (_, editor) => {
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

  const handleRowClick = (record) => {
    setModalData(record);
    seteditModalDescription(record?.descriptions ? record?.descriptions : "");
    form2.setFieldsValue({
      Hours: record?.logged_hours || "",
      Minutes: record?.logged_minutes || "",
      descriptions: record?.descriptions || "",
    });
    setOnEditClick(false);
    setSelectedRow(record);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setSelectedRow(null);
    setModalVisible(false);
    setModalData(null);
    form2.resetFields();
    seteditModalDescription("");
  };

  const handleSubmit2 = async (values) => {
    try {
      const reqBody = {
        descriptions: editModalDescription,
        logged_hours:
          values?.Hours && values?.Hours !== "" ? values?.Hours : "00",
        logged_minutes:
          values?.Minutes && values?.Minutes !== "" ? values?.Minutes : "00",
        logged_status: values?.status,
        logged_date: dayjs(values?.dateUpdate).format("DD-MM-YYYY"),
      };

      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateTimesheet + "/" + modalData?._id,
        body: reqBody,
      });

      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        handleModalClose();
        setOnEditClick(false);
        getTimeLogged();
        getTimeLoggedbyDate();
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  const onFilterChange = (skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setRadioValue("Custom");
      setaddInputStartDate({ start_date: firstDayOfMonth });
      setaddInputEndDate({ end_date: today });
      setGroupBy("date");
      setgroupedable("date");
      setSelectedProject("all");
      setRadioOrderbyValue("desc");
    } else {
      if (skipParams.includes("skipDateRange")) {
        setRadioValue("Custom");
        setaddInputStartDate({ start_date: firstDayOfMonth });
        setaddInputEndDate({ end_date: today });
      }
      if (skipParams.includes("skipGroupBy")) {
        setGroupBy("date");
        setgroupedable("date");
      }
      if (skipParams.includes("skipProject")) {
        setSelectedProject("all");
      }
      if (skipParams.includes("skipOrderBy")) {
        setRadioOrderbyValue("desc");
      }
    }

    if (selectedFilters) {
      setRadioValue(selectedFilters.dateRange[0] || "Custom");
      if (
        selectedFilters.dateRange[0] === "Custom" &&
        selectedFilters.customDates
      ) {
        setaddInputStartDate({
          start_date: selectedFilters.customDates.start_date,
        });
        setaddInputEndDate({ end_date: selectedFilters.customDates.end_date });
      }
      setGroupBy(selectedFilters.groupBy[0] || "date");
      setgroupedable(selectedFilters.groupBy[0] || "date");
      setSelectedProject(selectedFilters.project[0] || "all");
      setRadioOrderbyValue(selectedFilters.orderBy[0] || "desc");
    }
  };

  const getTimeLogged = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        orderBy: radioOrderbyValue || "asc",
        isExport: false,
      };
      if (selectedProject !== "all") {
        reqBody.project_id = [selectedProject];
      }
      if (radioValue && radioValue !== "" && radioValue !== "Custom") {
        reqBody.dateRange = radioValue;
      }
      if (radioValue === "Custom") {
        reqBody.dateRange = radioValue;
        reqBody.start_date = addInputStartDate?.start_date;
        reqBody.end_date = addInputEndDate?.end_date;
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myloggedtime,
        body: reqBody,
      });
      if (response?.data?.data) {
        dispatch(hideAuthLoader());
        setloggedTime(response.data.data.projects || []);
        setModalData([]);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      dispatch(hideAuthLoader());
    }
  };

  const getTimeLoggedbyDate = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        orderBy: radioOrderbyValue || "asc",
        isExport: false,
      };
      if (selectedProject !== "all") {
        reqBody.project_id = [selectedProject];
      }
      if (radioValue && radioValue !== "" && radioValue !== "Custom") {
        reqBody.dateRange = radioValue;
      }
      if (radioValue === "Custom") {
        reqBody.dateRange = radioValue;
        reqBody.start_date = addInputStartDate?.start_date;
        reqBody.end_date = addInputEndDate?.end_date;
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myloggedtimebyDate,
        body: reqBody,
      });
      if (response?.data?.data) {
        dispatch(hideAuthLoader());
        setloggedTimebyDate(response.data.data);
        setModalData([]);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      dispatch(hideAuthLoader());
    }
  };

  const exportCsv = async () => {
    if (groupedTable === "date") {
      try {
        const reqBody = {
          isExport: true,
        };
        if (radioOrderbyValue && radioOrderbyValue !== "") {
          reqBody.orderBy = radioOrderbyValue;
        }
        if (selectedProject !== "all") {
          reqBody.project_id = [selectedProject];
        }
        if (radioValue && radioValue !== "" && radioValue !== "Custom") {
          reqBody.dateRange = radioValue;
        }
        if (radioValue === "Custom") {
          reqBody.dateRange = radioValue;
          reqBody.start_date = addInputStartDate?.start_date;
          reqBody.end_date = addInputEndDate?.end_date;
        }
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.myLoggedTimeCSV,
          body: reqBody,
        });
        if (response?.data && response?.data?.statusCode === 200) {
          setHtml(response.data.data.html);
        } else {
          message.error(response.data.message);
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      try {
        const reqBody = {
          orderBy: radioOrderbyValue || "asc",
          isExport: true,
        };
        if (selectedProject !== "all") {
          reqBody.project_id = [selectedProject];
        }
        if (radioValue && radioValue !== "" && radioValue !== "Custom") {
          reqBody.dateRange = radioValue;
        }
        if (radioValue === "Custom") {
          reqBody.dateRange = radioValue;
          reqBody.start_date = addInputStartDate?.start_date;
          reqBody.end_date = addInputEndDate?.end_date;
        }
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.myLoggedPojectsTimeCSV,
          body: reqBody,
        });
        if (response?.data && response?.data?.statusCode === 200) {
          setHtml(response.data.data.html);
        } else {
          message.error(response.data.message);
        }
      } catch (error) {
        console.log(error);
      }
    }
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

  const formatDate = (date) =>
    moment(date).isValid() ? moment(date).format("DD MMM YY") : "";

  useEffectAfterMount(() => {
    if (loggedtime.length > 0 || loggedtimebyDate.length > 0) exportCsv();
  }, [loggedtime, loggedtimebyDate]);

  useEffect(() => {
    form2.setFieldsValue({
      dateUpdate: dayjs(modalData?.logged_date, "DD-MM-YYYY"),
    });
  }, [modalData?.logged_date]);

  useEffect(() => {
    getTimeLogged();
    getTimeLoggedbyDate();
  }, [
    radioValue,
    addInputStartDate,
    addInputEndDate,
    groupBy,
    selectedProject,
    radioOrderbyValue,
  ]);

  return (
    <div className="ant-project-task time-logged-main-wrapper">
      <Card>
        <div className="heading-wrapper">
          <h2>My Logged Time Details</h2>
        </div>
          <div className="global-search">
            <div className="filter-btn-wrapper">
              <MyLoggedTimeFilterComponent onFilterChange={onFilterChange} />

              <Button
                className="export-btn"
                id="exportButton"
                onClick={() => {
                  csvRef?.click();
                }}
              >
                Export CSV
              </Button>
            </div>
            {/* <div style={{ cursor: "pointer" }}>
              <ConfigProvider>

                <h6>Export CSV:</h6>
                <i
                  onClick={() => {
                    csvRef?.click();
                  }}
                  style={{
                    color: "#358CC0",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                  className="fi fi-rr-file-download"
                ></i> 
              </ConfigProvider>
            </div> */}
          </div>

        <div hidden>
          <ReactHTMLTableToExcel
            id="test-table-xls-button"
            className="ant-btn-primary"
            table="table-to-xls"
            filename={
              groupedTable === "date"
                ? "MyLoggedTime"
                : "MyLoggedTimeProjectWise"
            }
            sheet="tablexls"
            buttonText="Export XLS"
          />
          <div dangerouslySetInnerHTML={{ __html: html }}></div>
        </div>
        {loggedtime.length > 0 ? (
          <div className="block-table-content new-block-table">
            <table className="custom-table">
              <thead>
                <tr>
                  <th className=" time-logged-createdby">Created By</th>
                  <th className=" time-logged-date">Date</th>
                  <th className=" time-logged-task">Task</th>
                  <th className=" time-logged-description">Description</th>
                  <th className=" time-logged-bug">Bug</th>
                  <th className=" time-logged-time">Time</th>
                  <th className=" time-logged-action">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupBy === "project" &&
                  loggedtime.map((project) => (
                    <React.Fragment key={project.project._id}>
                      <tr>
                        <td colSpan="8" className="project-title">
                          <h3>{project.project.title}</h3>
                        </td>
                      </tr>
                      {project.logged_data.map((log) =>
                        log.data.map((entry) => (
                          <tr className="clickable-roww" key={entry._id}>
                            <td onClick={() => handleRowClick(entry)}>
                              <Avatar
                                src={
                                  entry?.createdBy?.emp_img
                                    ? `${Service.HRMS_Base_URL}/Uploads/emp_images/${entry?.createdBy?.emp_img}`
                                    : generateAvatarFromName1(
                                        entry?.createdBy?.full_name || "N/A"
                                      )
                                }
                              />
                              {removeTitle(
                                entry?.createdBy?.full_name || "N/A"
                              )}
                            </td>
                            <td
                              className="text-align-center"
                              onClick={() => handleRowClick(entry)}
                            >
                              {moment(entry?.logged_date, "DD-MM-YYYY").format(
                                "D MMM YYYY"
                              )}
                            </td>
                            <td onClick={() => handleRowClick(entry)}>
                              <span className="logtime-task">Task</span>
                              <span> {entry?.task || "-"}</span>
                              <br />
                              <span>
                                <i>Tasklist-</i>
                                {entry?.main_taskList || "-"}
                              </span>
                            </td>
                            <td
                              dangerouslySetInnerHTML={{
                                __html: entry?.descriptions || "-",
                              }}
                              onClick={() => handleRowClick(entry)}
                            ></td>
                            <td onClick={() => handleRowClick(entry)}>
                              {entry?.bug || "-"}
                            </td>
                            <td
                              className="text-align-center"
                              onClick={() => handleRowClick(entry)}
                            >
                              {entry?.time || "N/A"}
                            </td>
                            <td className="text-align-center">
                              <div className="edit-delete-btn-wrapper">
                                <EditOutlined
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOnEditClick(true);
                                    setModalData(entry);
                                    setModalVisible(true);
                                    seteditModalDescription(entry.descriptions);
                                  }}
                                  style={{ color: "green" }}
                                />
                                <Popconfirm
                                  title="Do you want to delete?"
                                  okText="Yes"
                                  cancelText="No"
                                  onConfirm={(e) => {
                                    e.stopPropagation();
                                    deleteTime(entry._id);
                                  }}
                                >
                                  <DeleteOutlined style={{ color: "red" }} />
                                </Popconfirm>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                      <tr>
                        <td className="border-none"></td>
                        <td className="border-none"></td>
                        <td className="border-none"> </td>
                        <td className="border-none"></td>
                        <td className="border-none"></td>
                        <td className="right-border-none border-none">
                          <h6>
                            {project?.total_hours +
                              "h" +
                              " " +
                              project?.total_minutes +
                              "m"}
                          </h6>
                        </td>
                        <td className="border-none"></td>
                      </tr>
                    </React.Fragment>
                  ))}
                {groupBy === "date" &&
                  Object.entries(loggedtimebyDate)?.map(
                    ([date, entries], value) => (
                      <React.Fragment key={date}>
                        <tr>
                          <td colSpan="8" className="date-title">
                            <h3>{formatDate(new Date(date), "YYYY-MM-DD")}</h3>
                          </td>
                        </tr>
                        {entries.items?.map((entry) => (
                          <tr className="clickable-roww" key={entry._id}>
                            <td onClick={() => handleRowClick(entry)}>
                              <MyAvatar
                                src={entry?.createdBy?.emp_img}
                                alt={entry?.createdBy?.full_name}
                                key={entry._id}
                                userName={entry?.createdBy?.full_name}
                              />
                              {removeTitle(
                                entry?.createdBy?.full_name || "N/A"
                              )}
                            </td>
                            <td
                              className="text-align-center"
                              onClick={() => handleRowClick(entry)}
                            >
                              {moment(entry?.logged_date, "DD-MM-YYYY").format(
                                "D MMM YYYY"
                              )}
                            </td>
                            <td onClick={() => handleRowClick(entry)}>
                              <span className="logtime-task">Task</span>
                              <span> {entry?.task || "-"}</span>
                              <br />
                              <span>
                                <i>Tasklist-</i>
                                {entry?.main_taskList || "-"}
                              </span>
                            </td>
                            <td
                              dangerouslySetInnerHTML={{
                                __html: entry?.descriptions || "-",
                              }}
                              onClick={() => handleRowClick(entry)}
                            ></td>
                            <td onClick={() => handleRowClick(entry)}>
                              {entry?.bug || "-"}
                            </td>
                            <td
                              className="text-align-center"
                              onClick={() => handleRowClick(entry)}
                            >
                              {entry?.time || "N/A"}
                            </td>
                            <td className="text-align-center">
                              <div className="edit-delete-btn-wrapper">
                                <EditOutlined
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOnEditClick(true);
                                    setModalData(entry);
                                    form2.setFieldsValue({
                                      Hours: entry?.logged_hours || "",
                                      Minutes: entry?.logged_minutes || "",
                                    });
                                    setModalVisible(true);
                                    seteditModalDescription(entry.descriptions);
                                  }}
                                  style={{ color: "green" }}
                                />
                                <Popconfirm
                                  title="Do you want to delete?"
                                  okText="Yes"
                                  cancelText="No"
                                  onConfirm={(e) => {
                                    e.stopPropagation();
                                    deleteTime(entry._id);
                                  }}
                                >
                                  <DeleteOutlined style={{ color: "red" }} />
                                </Popconfirm>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {entries?.totalTime ? (
                          <tr>
                            <td className="border-none"></td>
                            <td className="border-none"></td>
                            <td className="border-none"> </td>
                            <td className="border-none"></td>
                            <td className="border-none"></td>
                            <td className="border-none">
                              <h6>
                                {entries?.totalTime?.hours +
                                  "h" +
                                  " " +
                                  entries?.totalTime?.minutes +
                                  "m"}
                              </h6>
                            </td>
                            <td className="border-none"></td>
                          </tr>
                        ) : (
                          <></>
                        )}
                      </React.Fragment>
                    )
                  )}
                <tr>
                  <td className="border-none"></td>
                  <td className="border-none"></td>
                  <td className="border-none"> </td>
                  <td className="border-none"></td>
                  <td className="border-none"></td>
                  <td className="grand-total border-none">
                    <p>Grand Total Time</p>
                    <span>
                      {loggedtimebyDate?.grandTotal?.hours + "h"}{" "}
                      {loggedtimebyDate?.grandTotal?.minutes + "m"}
                    </span>
                  </td>
                  <td className="border-none"></td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data-found-my-log-time">
            <p>No data</p>
          </div>
        )}
      </Card>
      {modalVisible && modalData && (
        <Modal
          title={null}
          key="unique"
          open={modalVisible}
          onCancel={handleModalClose}
          footer={null}
          width={600}
          className="log-time-modal my-logtime-modal"
        >
          <div className="modal-header">
            {!onEditClick ? (
              <h1>Logged Time Details ({dayAndMonth})</h1>
            ) : (
              <h1>Edit Logged Time Details ({dayAndMonth})</h1>
            )}
            <Dropdown trigger={["click"]} overlay={ModalMenu}>
              <MoreOutlined />
            </Dropdown>
          </div>
          <Form
            name="edit_form"
            initialValues={{
              Hours: modalData?.logged_hours || "",
              Minutes: modalData?.logged_minutes || "",
              descriptions: modalData?.descriptions || "",
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
                        key={modalData._id}
                        src={
                          modalData?.createdBy?.emp_img &&
                          modalData?.createdBy.emp_img !== ""
                            ? `${Service.HRMS_Base_URL}/Uploads/emp_images/${modalData?.createdBy?.emp_img}`
                            : generateAvatarFromName1(
                                modalData?.createdBy?.full_name
                              )
                        }
                      />
                    </span>
                    <div className="logged-by-wrapper">
                      <p>Logged by</p>
                      <h4>{removeTitle(modalData?.createdBy?.full_name)}</h4>
                    </div>
                  </div>
                  <div className="logtime-right-wrapper">
                    {!onEditClick ? (
                      <h4>
                        {modalData?.logged_hours}h {modalData?.logged_minutes}m
                      </h4>
                    ) : (
                      <div
                        className="hours-time-wrapper"
                        style={{ display: "flex", flexWrap: "wrap" }}
                      >
                        <p className="my-logged-time-edit">Time Logged:</p>
                        <Form.Item
                          colon={false}
                          className="hours"
                          value={modalData?.logged_hours}
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
                            value={modalData?.logged_minutes}
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
                              form2.setFieldsValue({
                                dateUpdate: dayjs(dateString, "YYYY-MM-DD"),
                              })
                            }
                            disabledDate={(current) => {
                              if (!current) return false;

                              const today = dayjs().endOf("day");
                              const twoDaysAgo = dayjs()
                                .subtract(2, "days")
                                .startOf("day");

                              // Disable if date is before 2 days ago OR after today
    if (current < twoDaysAgo || current > today) {
      return true;
    }
    
    // Disable weekends (Saturday: 6, Sunday: 0)
    const dayOfWeek = current.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }
    
    return false;
                              
                            }}
                            format="DD-MM-YYYY"
                          >
                            <i className="fi fi-rr-calendar-day"></i>
                          </DatePicker>
                        </Form.Item>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="d-flex align-start">
                {!onEditClick ? (
                  <p
                    className="logged-time-text-wrapper "
                    dangerouslySetInnerHTML={{
                      __html: modalData?.descriptions?.replace(/\n/g, "<br>"),
                    }}
                  ></p>
                ) : (
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
                )}
              </div>
              <div className="d-flex project-bg align-center">
                <h5>Project</h5>
                <span className="bg-label project-bg-label">
                  {modalData?.projectDetails?.title}
                </span>
              </div>
              <div className="d-flex align-center">
                <h5>Timesheet</h5>
                <p>{modalData?.timesheet?.title}'s Timesheet</p>
              </div>
              <div className="d-flex align-center">
                <h5>TaskList</h5>
                <p>{modalData?.main_taskList}</p>
              </div>
              <div className="d-flex align-center">
                <h5>Task</h5>
                <p>{modalData?.task}</p>
              </div>
              {onEditClick && (
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
              )}
              {selectedRow && (
                <div>
                  <p>{selectedRow.logged_by}</p>
                  <p>{selectedRow.time_logged}</p>
                  <p>{selectedRow.Date}</p>
                  <p
                    dangerouslySetInnerHTML={{
                      __html: selectedRow.Description?.replace(/\n/g, "<br>"),
                    }}
                  ></p>
                </div>
              )}
            </div>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default MylogtimeWidget;

// import React, { useEffect, useState } from "react";
// import {
//   message,
//   Card,
//   Popconfirm,
//   Input,
//   Avatar,
//   Dropdown,
//   Popover,
//   Modal,
//   Form,
//   Checkbox,
//   Button,
//   ConfigProvider,
//   DatePicker,
//   Menu,
// } from "antd";
// import Service from "../../service";
// import { useDispatch } from "react-redux";
// import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions";
// import moment from "moment";
// import {
//   CalendarTwoTone,
//   DeleteOutlined,
//   EditOutlined,
//   MoreOutlined,
// } from "@ant-design/icons";
// import { AiOutlineSwap } from "react-icons/ai";
// import dayjs from "dayjs";
// import "./logtimeWidget.css";
// import { CKEditor } from "@ckeditor/ckeditor5-react";
// import Custombuild from "ckeditor5-custom-build/build/ckeditor";
// import { removeTitle } from "../../util/nameFilter";
// import MyAvatar from "../../components/Avatar/MyAvatar";
// import useEffectAfterMount from "../../util/useEffectAfterMount";
// import ReactHTMLTableToExcel from "react-html-table-to-excel";

// const MylogtimeWidget = () => {
//   const dispatch = useDispatch();
//   const csvRef = document.getElementById("test-table-xls-button");
//   const now = moment();
//   const [form2] = Form.useForm();
//   const firstDayOfMonth = now.startOf("month").format("YYYY-MM-DD");
//   const today = moment().format("YYYY-MM-DD");

//   const [loggedtime, setloggedTime] = useState([]);
//   const [loggedtimebyDate, setloggedTimebyDate] = useState([]);
//   const [addInputEndDate, setaddInputEndDate] = useState({ end_date: today });
//   const [addInputStartDate, setaddInputStartDate] = useState({
//     start_date: firstDayOfMonth,
//   });
//   const [editModalDescription, seteditModalDescription] = useState("");
//   const [onEditClick, setOnEditClick] = useState(false);
//   const [isPopoverVisibleGroup, setIsPopoverVisibleGroup] = useState(false);
//   const [modalData, setModalData] = useState([]);
//   const [selectedRow, setSelectedRow] = useState([]);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [isPopoverVisibleOrder, setIsPopoverVisibleOrder] = useState(false);
//   const [isPopoverVisibleData, setIsPopoverVisibleData] = useState(false);
//   const [radioOrderbyValue, setRadioOrderbyValue] = useState("desc");
//   const [dataCustom, setDataCustom] = useState(true);
//   const [radioValue, setRadioValue] = useState("Custom");
//   const [isPopoverVisibleProject, setIsPopoverVisibleProject] = useState(false);
//   const [selectedProject, setSelectedProject] = useState("all");
//   const [groupBy, setGroupBy] = useState("date");
//   const [groupedTable, setgroupedable] = useState("date");
//   //
//   const [addInputTaskData, setAddInputTaskData] = useState({});
//   const [html, setHtml] = useState([]);

//   //
//   const handleGroupByChange = (e) => {
//     setgroupedable(e.target.value);
//   };

//   const dayAndMonth = modalData?.logged_date
//     ? moment(modalData?.logged_date, "DD-MM-YYYY").format("D MMMM YYYY")
//     : "";

//   const deleteTime = async (id) => {
//     dispatch(showAuthLoader());
//     try {
//       const response = await Service.makeAPICall({
//         methodName: Service.deleteMethod,
//         api_url: `${Service.deleteTime}/${id}`,
//       });
//       if (response?.data && response?.data?.status) {
//         dispatch(hideAuthLoader());
//         message.success(response.data.message);
//         getTimeLoggedbyDate();
//         setModalData([]);
//         getTimeLogged();
//         setModalVisible(false);
//       } else {
//         message.error(response.data.message);
//       }
//     } catch (error) {
//       dispatch(hideAuthLoader());
//       console.log(error);
//     }
//   };

//   const ModalMenu = (
//     <Menu>
//       {!onEditClick && (
//         <Menu.Item onClick={() => setOnEditClick(true)}>
//           <EditOutlined style={{ color: "green" }} /> <span>Edit</span>
//         </Menu.Item>
//       )}

//       <Menu.Item style={{ cursor: "pointer" }} className="ant-delete">
//         <Popconfirm
//           title="Do you want to delete?"
//           okText="Yes"
//           cancelText="No"
//           onConfirm={() => {
//             deleteTime(modalData._id);
//           }}
//         >
//           <DeleteOutlined style={{ color: "red" }} /> <span>Delete</span>
//         </Popconfirm>
//       </Menu.Item>
//     </Menu>
//   );

//   // const groupedData = groupBy === "date" ? groupByDate(loggedtime) : {};
//   const handleChangeData = (_, editor) => {
//     const data = editor.getData();
//     seteditModalDescription(data);
//   };

//   const handlePasteData = (event, editor) => {
//     const pastedData = (event.clipboardData || window.clipboardData).getData(
//       "text"
//     );
//     const newData = pastedData?.replace(
//       /(https?:\/\/[^\s]+)(?=\s|$)/g,
//       '<a href="$1" target="_blank">$1</a>'
//     );
//     editor.setData(newData);
//   };

//   const onProjectChange = (e) => {
//     setSelectedProject(e.target.value);
//   };
//   const handleTaskStartDate = (name, value) => {
//     setaddInputStartDate({ [name]: value });
//   };

//   const handleTaskEndDate = (name, value) => {
//     setaddInputEndDate({ [name]: value });
//   };

//   const onChange = (e) => {
//     setRadioValue(e.target.value);
//   };

//   useEffect(() => {
//     getTimeLogged();
//     getTimeLoggedbyDate();
//   }, []);

//   const handleSubmit2 = async (values, e) => {
//     try {
//       console.log(
//         addInputTaskData?.start_date,
//         "addInputTaskData?.start_date,",
//         values?.dateUpdate
//       );

//       const reqBody = {
//         descriptions: editModalDescription,
//         logged_hours:
//           values?.Hours && values?.Hours != "" ? values?.Hours : "00",
//         logged_minutes:
//           values?.Minutes && values?.Minutes != "" ? values?.Minutes : "00",
//         logged_status: values?.status,
//         logged_date: dayjs(values?.dateUpdate).format("DD-MM-YYYY"),
//       };

//       dispatch(showAuthLoader());
//       const response = await Service.makeAPICall({
//         methodName: Service.putMethod,
//         api_url: Service.updateTimesheet + "/" + modalData?._id,
//         body: reqBody,
//       });

//       if (response?.data?.data && response?.data?.status) {
//         message.success(response.data.message);
//         handleModalClose();
//         setOnEditClick(false);
//         getTimeLogged();
//         getTimeLoggedbyDate();
//       } else {
//         message.error(response.data.message);
//       }
//       dispatch(hideAuthLoader());
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const handleRowClick = (record) => {
//     setModalData(record);
//     seteditModalDescription(record?.descriptions ? record?.descriptions : "");

//     form2.setFieldsValue({
//       Hours: record?.logged_hours || "",
//       Minutes: record?.logged_minutes || "",
//       descriptions: record?.descriptions || "",
//     });

//     setOnEditClick(false);
//     setSelectedRow(record);
//     setModalVisible(true);
//   };

//   const onChange3 = (e) => {
//     setRadioOrderbyValue(e.target.value);
//   };

//   const handleModalClose = () => {
//     setSelectedRow(null);
//     setModalVisible(false);
//     setModalData(null);
//     form2.resetFields();
//     seteditModalDescription("");
//   };

//   const getTimeLogged = async () => {
//     try {
//       dispatch(showAuthLoader());
//       const reqBody = {
//         orderBy: "asc",
//         isExport: false,
//       };
//       if (radioOrderbyValue && radioOrderbyValue !== "") {
//         reqBody.orderBy = radioOrderbyValue ? radioOrderbyValue : "asc";
//       }
//       if (selectedProject !== "all" && selectedProject != []) {
//         reqBody.project_id = [selectedProject];
//       }

//       if (radioValue && radioValue !== "" && radioValue !== "Custom") {
//         reqBody.dateRange = radioValue;
//       }
//       if (radioValue == "Custom") {
//         reqBody.dateRange = radioValue;
//         reqBody.start_date = addInputStartDate?.start_date;
//         reqBody.end_date = addInputEndDate?.end_date;
//       }
//       const response = await Service.makeAPICall({
//         methodName: Service.postMethod,
//         api_url: Service.myloggedtime,
//         body: reqBody,
//       });
//       if (response?.data?.data && response?.data?.status) {
//         dispatch(hideAuthLoader());
//         setloggedTime(response.data.data.projects);
//         setModalData([]);
//       } else {
//         message.error(response.data.message);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const getTimeLoggedbyDate = async () => {
//     try {
//       dispatch(showAuthLoader());
//       const reqBody = {
//         orderBy: "asc",
//         isExport: false,
//       };
//       if (radioOrderbyValue && radioOrderbyValue !== "") {
//         reqBody.orderBy = radioOrderbyValue ? radioOrderbyValue : "asc";
//       }
//       if (selectedProject !== "all" && selectedProject != []) {
//         reqBody.project_id = [selectedProject];
//       }

//       if (radioValue && radioValue !== "" && radioValue !== "Custom") {
//         reqBody.dateRange = radioValue;
//       }
//       if (radioValue == "Custom") {
//         reqBody.dateRange = radioValue;
//         reqBody.start_date = addInputStartDate?.start_date;
//         reqBody.end_date = addInputEndDate?.end_date;
//       }
//       const response = await Service.makeAPICall({
//         methodName: Service.postMethod,
//         api_url: Service.myloggedtimebyDate,
//         body: reqBody,
//       });
//       if (response?.data?.data && response?.data?.status) {
//         dispatch(hideAuthLoader());
//         setloggedTimebyDate(response.data.data);
//         setModalData([]);
//       } else {
//         message.error(response.data.message);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const generateAvatarFromName1 = (name) => {
//     const initials = name
//       ?.trim()
//       ?.split(/\s+/)
//       ?.filter((part) => part !== "")
//       ?.map((part) => part.charAt(0))
//       ?.join("")
//       ?.toUpperCase();

//     const avatarStyle = {
//       backgroundColor: "#7C4DFF",
//       color: "#FFFFFF",
//       fontSize: "10px",
//     };
//     return (
//       <div
//         style={{
//           ...avatarStyle,
//           width: "24px",
//           height: "24px",
//           borderRadius: "50%",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//         }}
//       >
//         {initials}
//       </div>
//     );
//   };

//   const formatDate = (date) =>
//     moment(date).isValid() ? moment(date).format("DD MMM YY") : "";

//   const content5 = (
//     <div className="right-popover-wrapper">
//       <h4>Order by</h4>
//       <Checkbox
//         onChange={onChange3}
//         checked={radioOrderbyValue == "asc"}
//         value="asc"
//       >
//         Asc
//       </Checkbox>
//       <Checkbox
//         onChange={onChange3}
//         checked={radioOrderbyValue == "desc"}
//         value="desc"
//       >
//         Desc
//       </Checkbox>

//       <div className="popver-footer-btn">
//         <Button
//           onClick={() => {
//             getTimeLogged();
//             getTimeLoggedbyDate();
//             setIsPopoverVisibleOrder(false);
//           }}
//           type="primary"
//           className="square-primary-btn ant-btn-primary"
//         >
//           Apply
//         </Button>
//         <Button
//           type="outlined"
//           onClick={() => setIsPopoverVisibleOrder(false)}
//           className="square-outline-btn ant-delete"
//         >
//           Cancel
//         </Button>
//       </div>
//     </div>
//   );

//   const applyGroupBy = () => {
//     setGroupBy(groupedTable);
//     if (groupBy === "date") {
//       getTimeLogged();
//     } else {
//       getTimeLoggedbyDate();
//     }
//     setIsPopoverVisibleGroup(false);
//   };

//   const contentGroupBy = (
//     <div className="right-popover-wrapper">
//       <h4>Group by</h4>

//       <Checkbox
//         onChange={handleGroupByChange}
//         checked={groupedTable == "project"}
//         value="project"
//       >
//         Projects
//       </Checkbox>
//       <Checkbox
//         onChange={handleGroupByChange}
//         checked={groupedTable == "date"}
//         value="date"
//       >
//         Date
//       </Checkbox>
//       <div className="popver-footer-btn">
//         <Button
//           onClick={applyGroupBy}
//           type="primary"
//           className="square-primary-btn ant-btn-primary"
//         >
//           Apply
//         </Button>
//         <Button
//           type="outlined"
//           onClick={() => {
//             getTimeLogged();
//             getTimeLoggedbyDate();
//             setIsPopoverVisibleGroup(false);
//           }}
//           className="square-outline-btn ant-delete"
//         >
//           Cancel
//         </Button>
//       </div>
//     </div>
//   );

//   const content1 = (
//     <div className="logtime-pop-wrapper">
//       <h4>Date Range</h4>
//       <div>
//         <div>
//           <Checkbox
//             onClick={() => setDataCustom(false)}
//             onChange={onChange}
//             checked={radioValue == "all"}
//             value="all"
//           >
//             All
//           </Checkbox>
//         </div>
//         <div>
//           <Checkbox
//             onClick={() => setDataCustom(false)}
//             onChange={onChange}
//             checked={radioValue == "last_week"}
//             value="last_week"
//           >
//             Last Week
//           </Checkbox>
//         </div>
//         <div>
//           <Checkbox
//             onClick={() => setDataCustom(false)}
//             onChange={onChange}
//             checked={radioValue == "last_2_week"}
//             value="last_2_week"
//           >
//             Last 2 Week
//           </Checkbox>
//         </div>
//         <div>
//           <Checkbox
//             onClick={() => setDataCustom(false)}
//             onChange={onChange}
//             checked={radioValue == "last_month"}
//             value="last_month"
//           >
//             Last Month
//           </Checkbox>
//         </div>
//         <div>
//           <Checkbox
//             onClick={() => setDataCustom(true)}
//             onChange={onChange}
//             checked={radioValue == "Custom"}
//             value="Custom"
//           >
//             Custom
//           </Checkbox>
//         </div>
//         {dataCustom && (
//           <div
//             className="logtime-date-wrapper"
//             style={{
//               display: "flex",
//               marginTop: "10px",
//               gap: "15px",
//               flexWrap: "wrap",
//               flexDirection: "column",
//             }}
//           >
//             <div className="logtime-date">
//               <label>Start</label>

//               <DatePicker
//                 value={
//                   addInputStartDate?.start_date &&
//                   dayjs(addInputStartDate?.start_date, "YYYY-MM-DD")
//                 }
//                 onChange={(date, dateString) =>
//                   handleTaskStartDate("start_date", dateString)
//                 }
//               >
//                 <CalendarTwoTone />
//               </DatePicker>
//             </div>
//             <div className="logtime-date">
//               <label>End</label>

//               <DatePicker
//                 value={
//                   addInputEndDate?.end_date &&
//                   dayjs(addInputEndDate?.end_date, "YYYY-MM-DD")
//                 }
//                 onChange={(date, dateString) =>
//                   handleTaskEndDate("end_date", dateString)
//                 }
//               >
//                 <CalendarTwoTone />
//               </DatePicker>
//             </div>
//           </div>
//         )}
//       </div>
//       {/* </Radio.Group> */}
//       <div className="popver-footer-btn">
//         <Button
//           onClick={() => {
//             getTimeLogged();
//             getTimeLoggedbyDate();
//             setIsPopoverVisibleData(false);
//           }}
//           type="primary"
//           className="square-primary-btn ant-btn-primary"
//         >
//           Apply
//         </Button>
//         <Button
//           type="outlined"
//           onClick={() => setIsPopoverVisibleData(false)}
//           className="square-outline-btn ant-delete"
//         >
//           Cancel
//         </Button>
//       </div>
//     </div>
//   );

//   const projectFilterContent = (
//     <div className="logtime-pop-wrapper">
//       <h4>Projects</h4>
//       <Checkbox
//         onChange={onProjectChange}
//         checked={selectedProject === "all"}
//         value="all"
//       >
//         All
//       </Checkbox>
//       <div className="log-time-data">
//         {loggedtime.map((project) => (
//           <div>
//             <Checkbox
//               key={project.project._id}
//               onChange={onProjectChange}
//               checked={selectedProject === project.project._id}
//               value={project.project._id}
//             >
//               {project.project.title}
//             </Checkbox>
//           </div>
//         ))}
//       </div>
//       <div className="popver-footer-btn">
//         <Button
//           onClick={() => {
//             getTimeLogged();
//             getTimeLoggedbyDate();
//             setIsPopoverVisibleProject(false);
//           }}
//           type="primary"
//           className="square-primary-btn ant-btn-primary"
//         >
//           Apply
//         </Button>
//         <Button
//           type="outlined"
//           onClick={() => setIsPopoverVisibleProject(false)}
//           className="square-outline-btn ant-delete"
//         >
//           Cancel
//         </Button>
//       </div>
//     </div>
//   );

//   const handleTaskInput = (name, value) => {
//     setAddInputTaskData({ [name]: value });
//   };

//   const exportCsv = async () => {
//     if (groupedTable === "date") {
//       try {
//         const reqBody = {
//           isExport: true,
//         };
//         if (radioOrderbyValue && radioOrderbyValue !== "") {
//           reqBody.orderBy = radioOrderbyValue ? radioOrderbyValue : "asc";
//         }
//         if (selectedProject !== "all" && selectedProject != []) {
//           reqBody.project_id = [selectedProject];
//         }

//         if (radioValue && radioValue !== "" && radioValue !== "Custom") {
//           reqBody.dateRange = radioValue;
//         }
//         if (radioValue == "Custom") {
//           reqBody.dateRange = radioValue;
//           reqBody.start_date = addInputStartDate?.start_date;
//           reqBody.end_date = addInputEndDate?.end_date;
//         }
//         const response = await Service.makeAPICall({
//           methodName: Service.postMethod,
//           api_url: Service.myLoggedTimeCSV,
//           body: reqBody,
//         });

//         if (response?.data && response?.data?.statusCode === 200) {
//           setHtml(response.data.data.html);
//         } else {
//           message.error(response.data.message);
//         }
//       } catch (error) {
//         console.log(error);
//       }
//     } else {
//       try {
//         const reqBody = {
//           orderBy: "asc",
//           isExport: true,
//         };
//         if (radioOrderbyValue && radioOrderbyValue !== "") {
//           reqBody.orderBy = radioOrderbyValue ? radioOrderbyValue : "asc";
//         }
//         if (selectedProject !== "all" && selectedProject != []) {
//           reqBody.project_id = [selectedProject];
//         }

//         if (radioValue && radioValue !== "" && radioValue !== "Custom") {
//           reqBody.dateRange = radioValue;
//         }
//         if (radioValue == "Custom") {
//           reqBody.dateRange = radioValue;
//           reqBody.start_date = addInputStartDate?.start_date;
//           reqBody.end_date = addInputEndDate?.end_date;
//         }
//         const response = await Service.makeAPICall({
//           methodName: Service.postMethod,
//           api_url: Service.myLoggedPojectsTimeCSV,
//           body: reqBody,
//         });

//         if (response?.data && response?.data?.statusCode === 200) {
//           setHtml(response.data.data.html);
//         } else {
//           message.error(response.data.message);
//         }
//       } catch (error) {
//         console.log(error);
//       }
//     }
//   };

//   useEffectAfterMount(() => {
//     if (loggedtime.length > 0 || loggedtimebyDate.length > 0) exportCsv();
//   }, [loggedtime, loggedtimebyDate]);

//   useEffect(() => {
//     form2.setFieldsValue({
//       dateUpdate: dayjs(modalData?.logged_date, "DD-MM-YYYY"),
//     });
//   }, [modalData?.logged_date]);

//   return (
//     <div className="ant-project-task time-logged-main-wrapper">
//       <Card>
//         <div className="profile-sub-head">
//           <h2>My Logged Time Details</h2>
//           <div className="block-status-content">
//             <div style={{ cursor: "pointer" }}>
//               <ConfigProvider>
//                 <h6
//                   onClick={() => setIsPopoverVisibleData(!isPopoverVisibleData)}
//                 >
//                   Date Range:
//                 </h6>
//                 <Popover
//                   placement="bottom"
//                   trigger="click"
//                   content={content1}
//                   visible={isPopoverVisibleData}
//                   onVisibleChange={setIsPopoverVisibleData}
//                 >
//                   <CalendarTwoTone />
//                   {radioValue === "last_week"
//                     ? "Last Week"
//                     : radioValue === "last_2_week"
//                     ? "Last 2 Week"
//                     : radioValue === "last_month"
//                     ? "Last Month"
//                     : radioValue === "Custom"
//                     ? "Custom"
//                     : "All"}
//                 </Popover>
//               </ConfigProvider>
//             </div>

//             <div style={{ cursor: "pointer" }}>
//               <ConfigProvider>
//                 <h6
//                   onClick={() =>
//                     setIsPopoverVisibleGroup(!isPopoverVisibleGroup)
//                   }
//                 >
//                   Group by:
//                 </h6>
//                 <Popover
//                   placement="bottom"
//                   trigger="click"
//                   content={contentGroupBy}
//                   visible={isPopoverVisibleGroup}
//                   onVisibleChange={setIsPopoverVisibleGroup}
//                 >
//                   <AiOutlineSwap />
//                   {groupBy === "project"
//                     ? "project"
//                     : groupBy === "date"
//                     ? "date"
//                     : "All"}
//                 </Popover>
//               </ConfigProvider>
//             </div>

//             <div style={{ cursor: "pointer" }}>
//               <ConfigProvider>
//                 <h6
//                   onClick={() =>
//                     setIsPopoverVisibleProject(!isPopoverVisibleProject)
//                   }
//                 >
//                   Project:
//                 </h6>
//                 <Popover
//                   placement="bottom"
//                   trigger="click"
//                   content={projectFilterContent}
//                   visible={isPopoverVisibleProject}
//                   onVisibleChange={setIsPopoverVisibleProject}
//                 >
//                   <AiOutlineSwap />
//                   {selectedProject === "all"
//                     ? "All"
//                     : loggedtime.find(
//                         (project) => project.project._id === selectedProject
//                       )?.project.title}
//                 </Popover>
//               </ConfigProvider>
//             </div>
//             <div style={{ cursor: "pointer" }}>
//               <ConfigProvider>
//                 <h6
//                   onClick={() =>
//                     setIsPopoverVisibleOrder(!isPopoverVisibleOrder)
//                   }
//                 >
//                   Order by:
//                 </h6>
//                 <Popover
//                   placement="bottom"
//                   trigger="click"
//                   content={content5}
//                   visible={isPopoverVisibleOrder}
//                   onVisibleChange={setIsPopoverVisibleOrder}
//                 >
//                   <AiOutlineSwap />
//                   {radioOrderbyValue === "asc"
//                     ? "Asc"
//                     : radioOrderbyValue === "desc"
//                     ? "Desc"
//                     : "All"}
//                 </Popover>
//               </ConfigProvider>
//             </div>
//             <div style={{ cursor: "pointer" }}>
//               <ConfigProvider>
//                 <h6>Export CSV:</h6>
//                 <i
//                   onClick={() => {
//                     csvRef.click();
//                   }}
//                   style={{
//                     color: "#358CC0",
//                     fontSize: "16px",
//                     cursor: "pointer",
//                   }}
//                   className="fi fi-rr-file-download"
//                 ></i>
//               </ConfigProvider>
//             </div>
//           </div>
//         </div>

//         <div hidden>
//           <ReactHTMLTableToExcel
//             id="test-table-xls-button"
//             className="ant-btn-primary"
//             table="table-to-xls"
//             filename={
//               groupedTable === "date"
//                 ? "MyLoggedTime"
//                 : "MyLoggedTimeProjectWise"
//             }
//             sheet="tablexls"
//             buttonText="Export XLS"
//           />
//           <div dangerouslySetInnerHTML={{ __html: html }}></div>
//         </div>
//         {loggedtime.length > 0 ? (
//           <div className="block-table-content new-block-table">
//             <table className="custom-table">
//               <thead>
//                 <tr>
//                   <th className=" time-logged-createdby">Created By</th>
//                   <th className=" time-logged-date">Date</th>
//                   <th className=" time-logged-task">Task</th>
//                   <th className=" time-logged-description">Description</th>
//                   <th className=" time-logged-bug">Bug</th>
//                   <th className=" time-logged-time">Time</th>
//                   <th className=" time-logged-action">Actions</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {groupBy === "project" &&
//                   loggedtime.map((project) => (
//                     <React.Fragment key={project.project._id}>
//                       <tr>
//                         <td colSpan="8" className="project-title">
//                           <h3>{project.project.title}</h3>
//                         </td>
//                       </tr>
//                       {project.logged_data.map((log) =>
//                         log.data.map((entry) => (
//                           <tr className="clickable-roww" key={entry._id}>
//                             <td onClick={() => handleRowClick(entry)}>
//                               <Avatar
//                                 src={
//                                   entry?.createdBy?.emp_img
//                                     ? `${Service.HRMS_Base_URL}/uploads/emp_images/${entry?.createdBy?.emp_img}`
//                                     : generateAvatarFromName1(
//                                         entry?.createdBy?.full_name || "N/A"
//                                       )
//                                 }
//                               />
//                               {removeTitle(
//                                 entry?.createdBy?.full_name || "N/A"
//                               )}
//                             </td>
//                             <td
//                               className="text-align-center"
//                               onClick={() => handleRowClick(entry)}
//                             >
//                               {moment(entry?.logged_date, "DD-MM-YYYY").format(
//                                 "D MMM YYYY"
//                               )}
//                             </td>
//                             <td onClick={() => handleRowClick(entry)}>
//                               <span className="logtime-task">Task</span>
//                               <span> {entry?.task || "-"}</span>
//                               <br />
//                               <span>
//                                 <i>Tasklist-</i>
//                                 {entry?.main_taskList || "-"}
//                               </span>
//                             </td>
//                             <td
//                               dangerouslySetInnerHTML={{
//                                 __html: entry?.descriptions || "-",
//                               }}
//                               onClick={() => handleRowClick(entry)}
//                             ></td>
//                             <td onClick={() => handleRowClick(entry)}>
//                               {entry?.bug || "-"}
//                             </td>
//                             <td
//                               className="text-align-center"
//                               onClick={() => handleRowClick(entry)}
//                             >
//                               {entry?.time || "N/A"}
//                             </td>
//                             <td className="text-align-center">
//                               <div className="edit-delete-btn-wrapper">
//                                 <EditOutlined
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     setOnEditClick(true);
//                                     setModalData(entry);
//                                     setModalVisible(true);
//                                     seteditModalDescription(entry.descriptions);
//                                   }}
//                                   style={{ color: "green" }}
//                                 />
//                                 <Popconfirm
//                                   title="Do you want to delete?"
//                                   okText="Yes"
//                                   cancelText="No"
//                                   onConfirm={(e) => {
//                                     e.stopPropagation();
//                                     deleteTime(entry._id);
//                                   }}
//                                 >
//                                   <DeleteOutlined style={{ color: "red" }} />
//                                 </Popconfirm>
//                               </div>
//                             </td>
//                           </tr>
//                         ))
//                       )}
//                       <tr>
//                         <td className="border-none"></td>
//                         <td className="border-none"></td>
//                         <td className="border-none"> </td>
//                         <td className="border-none"></td>
//                         <td className="border-none"></td>
//                         <td className="right-border-none border-none">
//                           <h6>
//                             {project?.total_hours +
//                               "h" +
//                               " " +
//                               project?.total_minutes +
//                               "m"}
//                           </h6>
//                         </td>
//                         <td className="border-none"></td>
//                       </tr>
//                     </React.Fragment>
//                   ))}
//                 {groupBy === "date" &&
//                   Object.entries(loggedtimebyDate)?.map(
//                     ([date, entries], value) => (
//                       <React.Fragment key={date}>
//                         <tr>
//                           <td colSpan="8" className="date-title">
//                             <h3>{formatDate(new Date(date), "YYYY-MM-DD")}</h3>
//                           </td>
//                         </tr>
//                         {entries.items?.map((entry) => (
//                           <tr className="clickable-roww" key={entry._id}>
//                             <td onClick={() => handleRowClick(entry)}>
//                               <MyAvatar
//                                 src={entry?.createdBy?.emp_img}
//                                 alt={entry?.createdBy?.full_name}
//                                 key={entry._id}
//                                 userName={entry?.createdBy?.full_name}
//                               />
//                               {removeTitle(
//                                 entry?.createdBy?.full_name || "N/A"
//                               )}
//                             </td>
//                             <td
//                               className="text-align-center"
//                               onClick={() => handleRowClick(entry)}
//                             >
//                               {moment(entry?.logged_date, "DD-MM-YYYY").format(
//                                 "D MMM YYYY"
//                               )}
//                             </td>
//                             <td onClick={() => handleRowClick(entry)}>
//                               <span className="logtime-task">Task</span>
//                               <span> {entry?.task || "-"}</span>
//                               <br />
//                               <span>
//                                 <i>Tasklist-</i>
//                                 {entry?.main_taskList || "-"}
//                               </span>
//                             </td>
//                             <td
//                               dangerouslySetInnerHTML={{
//                                 __html: entry?.descriptions || "-",
//                               }}
//                               onClick={() => handleRowClick(entry)}
//                             ></td>
//                             <td onClick={() => handleRowClick(entry)}>
//                               {entry?.bug || "-"}
//                             </td>
//                             <td
//                               className="text-align-center"
//                               onClick={() => handleRowClick(entry)}
//                             >
//                               {entry?.time || "N/A"}
//                             </td>
//                             <td className="text-align-center">
//                               <div className="edit-delete-btn-wrapper">
//                                 <EditOutlined
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     setOnEditClick(true);
//                                     setModalData(entry);
//                                     form2.setFieldsValue({
//                                       Hours: entry?.logged_hours || "",
//                                       Minutes: entry?.logged_minutes || "",
//                                     });
//                                     setModalVisible(true);
//                                     seteditModalDescription(entry.descriptions);
//                                   }}
//                                   style={{ color: "green" }}
//                                 />
//                                 <Popconfirm
//                                   title="Do you want to delete?"
//                                   okText="Yes"
//                                   cancelText="No"
//                                   onConfirm={(e) => {
//                                     e.stopPropagation();
//                                     deleteTime(entry._id);
//                                   }}
//                                 >
//                                   <DeleteOutlined style={{ color: "red" }} />
//                                 </Popconfirm>
//                               </div>
//                             </td>
//                           </tr>
//                         ))}
//                         {entries?.totalTime ? (
//                           <tr>
//                             <td className="border-none"></td>
//                             <td className="border-none"></td>

//                             <td className="border-none"> </td>
//                             <td className="border-none"></td>
//                             <td className="border-none"></td>

//                             <td className="border-none">
//                               <h6>
//                                 {entries?.totalTime?.hours +
//                                   "h" +
//                                   " " +
//                                   entries?.totalTime?.minutes +
//                                   "m"}
//                               </h6>
//                             </td>
//                             <td className="border-none"></td>
//                           </tr>
//                         ) : (
//                           <></>
//                         )}
//                       </React.Fragment>
//                     )
//                   )}
//                 <tr>
//                   <td className="border-none"></td>
//                   <td className="border-none"></td>
//                   <td className="border-none"> </td>
//                   <td className="border-none"></td>
//                   <td className="border-none"></td>
//                   <td className="grand-total border-none">
//                     {" "}
//                     <p>Grand Total Time</p>
//                     <span>
//                       {loggedtimebyDate?.grandTotal?.hours + "h"}{" "}
//                       {loggedtimebyDate?.grandTotal?.minutes + "m"}
//                     </span>
//                   </td>
//                   <td className="border-none"></td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>
//         ) : (
//           <div className="no-data-found-my-log-time">
//             <p>No data</p>
//           </div>
//         )}
//       </Card>
//       {modalVisible && modalData && (
//         <Modal
//           title={null}
//           key="unique"
//           open={modalVisible}
//           onCancel={handleModalClose}
//           footer={null}
//           width={600}
//           className="log-time-modal my-logtime-modal"
//         >
//           <div className="modal-header">
//             {!onEditClick ? (
//               <h1>Logged Time Details ({dayAndMonth})</h1>
//             ) : (
//               <h1>Edit Logged Time Details ({dayAndMonth})</h1>
//             )}
//             <Dropdown trigger={["click"]} overlay={ModalMenu}>
//               <MoreOutlined />
//             </Dropdown>
//           </div>
//           <Form
//             name="edit_form"
//             initialValues={{
//               Hours: modalData?.logged_hours || "",
//               Minutes: modalData?.logged_minutes || "",
//               descriptions: modalData?.descriptions || "",
//             }}
//             form={form2}
//             onFinish={handleSubmit2}
//           >
//             <div className="overview-modal-wrapper">
//               <div className="d-flex log-time-details align-center">
//                 <div className="d-flex align-center logtime-left-wrapper">
//                   <div className="loggtime-main-wrapper">
//                     <span className="loggtime-avatar">
//                       <Avatar
//                         key={modalData._id}
//                         src={
//                           modalData?.createdBy?.emp_img &&
//                           modalData?.createdBy.emp_img !== ""
//                             ? `${Service.HRMS_Base_URL}/uploads/emp_images/${modalData?.createdBy?.emp_img}`
//                             : generateAvatarFromName1(
//                                 modalData?.createdBy?.full_name
//                               )
//                         }
//                       />
//                     </span>
//                     <div className="logged-by-wrapper">
//                       <p>Logged by</p>
//                       <h4>{removeTitle(modalData?.createdBy?.full_name)}</h4>
//                     </div>
//                   </div>
//                   <div className="logtime-right-wrapper">
//                     {!onEditClick ? (
//                       <h4>
//                         {modalData?.logged_hours}h {modalData?.logged_minutes}m
//                       </h4>
//                     ) : (
//                       <div
//                         className="hours-time-wrapper"
//                         style={{ display: "flex", flexWrap: "wrap" }}
//                       >
//                         <p className="my-logged-time-edit">Time Logged:</p>

//                         <Form.Item
//                           colon={false}
//                           className="hours"
//                           value={modalData?.logged_hours}
//                           name="Hours"
//                           rules={[
//                             {
//                               validator: (_, value) => {
//                                 if (
//                                   !value ||
//                                   (Number(value) >= 0 && Number(value) <= 24)
//                                 ) {
//                                   return Promise.resolve();
//                                 }
//                                 return Promise.reject(
//                                   new Error(
//                                     "Please enter a valid number between 0 and 24."
//                                   )
//                                 );
//                               },
//                             },
//                           ]}
//                         >
//                           <Input
//                             type="text"
//                             placeholder="Hours"
//                             onChange={(e) => {
//                               const { value } = e.target;
//                               if (
//                                 /^\d*$/.test(value) &&
//                                 (value === "" ||
//                                   (Number(value) >= 0 && Number(value) <= 24))
//                               ) {
//                                 e.target.value = value;
//                               } else {
//                                 e.preventDefault();
//                               }
//                             }}
//                           />
//                         </Form.Item>

//                         <Form.Item
//                           colon={false}
//                           className="minutes"
//                           name="Minutes"
//                           rules={[
//                             {
//                               validator: (_, value) => {
//                                 if (
//                                   !value ||
//                                   (Number(value) >= 0 && Number(value) <= 59)
//                                 ) {
//                                   return Promise.resolve();
//                                 }
//                                 return Promise.reject(
//                                   new Error(
//                                     "Please enter a valid number between 0 and 59."
//                                   )
//                                 );
//                               },
//                             },
//                           ]}
//                         >
//                           <Input
//                             type="text"
//                             value={modalData?.logged_minutes}
//                             placeholder="Minutes"
//                             onChange={(e) => {
//                               const { value } = e.target;
//                               if (
//                                 /^\d*$/.test(value) &&
//                                 (value === "" ||
//                                   (Number(value) >= 0 && Number(value) <= 59))
//                               ) {
//                                 e.target.value = value;
//                               } else {
//                                 e.preventDefault();
//                               }
//                             }}
//                           />
//                         </Form.Item>

//                         <Form.Item
//                           label="Logged Date"
//                           name="dateUpdate"
//                           className="date-time-picker"
//                         >
//                           <DatePicker
//                             placeholder="When"
//                             value={
//                               form2?.dateUpdate
//                                 ? dayjs(form2?.dateUpdate, "DD-MM-YYYY")
//                                 : dayjs("01-01-2001", "DD-MM-YYYY")
//                             }
//                             onChange={(date, dateString) =>
//                               handleTaskInput(
//                                 "start_date",
//                                 dayjs(dateString, "YYYY-MM-DD")
//                               )
//                             }
//                             disabledDate={(current) => {
//                               return current && current > dayjs().endOf("day");
//                             }}
//                             format="DD-MM-YYYY"
//                           >
//                             <i className="fi fi-rr-calendar-day"></i>
//                           </DatePicker>
//                         </Form.Item>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//               <div className="d-flex align-start">
//                 {!onEditClick ? (
//                   <p
//                     className="logged-time-text-wrapper "
//                     dangerouslySetInnerHTML={{
//                       __html: modalData?.descriptions?.replace(/\n/g, "<br>"),
//                     }}
//                   ></p>
//                 ) : (
//                   <div className="description-loggedtime-details">
//                     <Form.Item name="descriptions">
//                       <CKEditor
//                         editor={Custombuild}
//                         data={editModalDescription}
//                         onChange={handleChangeData}
//                         onPaste={handlePasteData}
//                         config={{
//                           toolbar: [
//                             "heading",
//                             "|",
//                             "bold",
//                             "italic",
//                             "underline",
//                             "|",
//                             "fontColor",
//                             "fontBackgroundColor",
//                             "|",
//                             "link",
//                             "|",
//                             "numberedList",
//                             "bulletedList",
//                             "|",
//                             "alignment:left",
//                             "alignment:center",
//                             "alignment:right",
//                             "|",
//                             "fontSize",
//                             "|",
//                             "print",
//                           ],
//                           fontSize: {
//                             options: [
//                               "default",
//                               1,
//                               2,
//                               3,
//                               4,
//                               5,
//                               6,
//                               7,
//                               8,
//                               9,
//                               10,
//                               11,
//                               12,
//                               13,
//                               14,
//                               15,
//                               16,
//                               17,
//                               18,
//                               19,
//                               20,
//                               21,
//                               22,
//                               23,
//                               24,
//                               25,
//                               26,
//                               27,
//                               28,
//                               29,
//                               30,
//                               31,
//                               32,
//                             ],
//                           },

//                           print: {},
//                           styles: {
//                             height: "10px",
//                           },
//                         }}
//                       />
//                     </Form.Item>
//                   </div>
//                 )}
//               </div>
//               <div className="d-flex project-bg align-center">
//                 <h5>Project</h5>
//                 <span className="bg-label project-bg-label">
//                   {modalData?.projectDetails?.title}
//                 </span>
//               </div>
//               <div className="d-flex align-center">
//                 <h5>Timesheet</h5>
//                 <p>{modalData?.timesheet?.title}'s Timesheet</p>
//               </div>
//               <div className="d-flex align-center">
//                 <h5>TaskList</h5>
//                 <p>{modalData?.main_taskList}</p>
//               </div>
//               <div className="d-flex align-center">
//                 <h5>Task</h5>
//                 <p>{modalData?.task}</p>
//               </div>
//               {onEditClick && (
//                 <div>
//                   <Button
//                     style={{ width: 250 }}
//                     htmlType="submit"
//                     type="primary"
//                     className="square-primary-btn"
//                   >
//                     Update Logged Time Details
//                   </Button>
//                 </div>
//               )}

//               {selectedRow && (
//                 <div>
//                   <p>{selectedRow.logged_by}</p>
//                   <p>{selectedRow.time_logged}</p>
//                   <p>{selectedRow.Date}</p>
//                   <p
//                     dangerouslySetInnerHTML={{
//                       __html: selectedRow.Description?.replace(/\n/g, "<br>"),
//                     }}
//                   ></p>
//                 </div>
//               )}
//               {console.log(html, "hhh")}
//             </div>
//           </Form>
//         </Modal>
//       )}
//     </div>
//   );
// };

// export default MylogtimeWidget;
