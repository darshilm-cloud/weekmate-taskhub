import React, { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Button,
  Checkbox,
  ConfigProvider,
  Menu,
  Popover,
  Table,
  Input,
  Dropdown,
  Modal,
  Form,
  DatePicker,
  message,
  Badge,
  Popconfirm,
} from "antd";
import {
  UsergroupAddOutlined,
  CalendarTwoTone,
  MoreOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import queryString from "query-string";
import { AiOutlineSwap } from "react-icons/ai";
import useEffectAfterMount from "../../util/useEffectAfterMount";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions/Auth";
import ReactHTMLTableToExcel from "react-html-table-to-excel";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useLocation, useParams } from "react-router-dom";
import Service from "../../service";
import dayjs from "dayjs";
import "./TimeForPms.css";

import moment from "moment";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import { socketEvents } from "../../settings/socketEventName";
import { useSocketAction } from "../../hooks/useSocketAction";
import {
  getSubscribersList,
  getTaggedUserList,
  setData,
} from "../../appRedux/reducers/ApiData";
import { getRoles } from "../../util/hasPermission";
import { removeTitle } from "../../util/nameFilter";
import AddTimeModal from "../Modal/AddTimeModal";
import AddComment from "../../ReuseComponent/AddComment/AddComment";
import UtilFunctions from "../../util/UtilFunctions";
import { calculateTimeDifference } from "../../util/formatTimeDifference";

import MyAvatar from "../../components/Avatar/MyAvatar";
import useUserColors from "../../hooks/customColor";
import { isCreatedBy } from "../../util/isCreatedBy";
import { fileImageSelect } from "../../util/FIleSelection";
import EditCommentModal from "../Modal/EditCommentModal";
import TimeForPMSFilterComponent from "./TimeForPMSFilterComponent";
import { TimeSkeleton } from "../common/SkeletonLoader";

function TimeForPMS() {
  const { emitEvent } = useSocketAction();

  //custom date range default
  const now = moment();
  const [formComment] = Form.useForm();
  const location = useLocation();
  const attachmentfileRef = useRef();
  const history = useHistory();
  const firstDayOfMonth = now.startOf("month").format("YYYY-MM-DD");
  const { loggedID } = queryString.parse(location.search);
  const today = moment().format("YYYY-MM-DD");
  const csvRef = document.getElementById("test-table-xls-button");
  const { projectId } = useParams();
  const [form] = Form.useForm();
  const [form1] = Form.useForm();
  const [form2] = Form.useForm();
  const dispatch = useDispatch();
  const { subscribersList, taggedUserList, foldersList } = useSelector(
    (state) => state.apiData
  );

  const [selectedRow, setSelectedRow] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [taskdropdown, setTaskdropdown] = useState([]);
  const [buglistdropdown, setBuglistDropdown] = useState([]);
  const [timesheetdropdownById, setTimesheetdropdownById] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedTimesheet, setSelectedTimesheet] = useState({});
  const [timesheetList, setTimesheetList] = useState([]);
  const [radioValue, setRadioValue] = useState("this_month");
  const [radioStatusValue, setRadioStatusValue] = useState("all");
  const [radioOrderbyValue, setRadioOrderbyValue] = useState("asc");
  const [modalData, setModalData] = useState({});
  const [addInputTaskData, setAddInputTaskData] = useState({});
  const [summaryData, setSummaryData] = useState({});
  const [addInputStartDate, setaddInputStartDate] = useState({
    start_date: firstDayOfMonth,
  });
  const [addInputEndDate, setaddInputEndDate] = useState({
    end_date: today,
  });
  const [addEditTimesheet, setAddEditTimesheet] = useState("");
  const [editTimesheetData, setEditTimesheetData] = useState({});
  const [html, setHtml] = useState([]);
  const [dataCustom, setDataCustom] = useState(true);
  const [onEditClick, setOnEditClick] = useState(false);
  const [searchTextFilter, setSearchTextFilter] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isPopoverVisibleData, setIsPopoverVisibleData] = useState(false);
  const [isPopoverVisibleOrder, setIsPopoverVisibleOrder] = useState(false);
  const [isPopoverVisibleMore, setIsPopoverVisibleMore] = useState(false);
  const [isPopoverVisibleInfo, setIsPopoverVisibleInfo] = useState(false);
  const [editorData, setEditorData] = useState("");
  const [editModalDescription, seteditModalDescription] = useState("");
  const [users, setUsers] = useState([]);
  const [estHrs, setEstHrs] = useState("");
  const [estMins, setEstMins] = useState("");
  const [estHrsError, setEstHrsError] = useState("");
  const [estMinsError, setEstMinsError] = useState("");
  const [popOver, setPopoverVisible] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [textAreaValue, setTextAreaValue] = useState("");
  const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
  const [loggedHoursId, setLoggedHoursID] = useState({});
  const [comments, setComments] = useState([]);
  const [openCommentModel, setOpenCommentModle] = useState(false);
  const [commentVal, setCommentVal] = useState("");
  const [fileAttachment, setfileAttachment] = useState([]);
  const [deleteFileData, setDeleteFileData] = useState([]);
  const [taggedUser, setTaggedUser] = useState([]);
  const [populatedFiles, setPopulatedFiles] = useState([]);
  const [commentsedit, setCommentsedit] = useState({});

  useEffect(() => {
    if (loggedID) {
      dispatch(getTaggedUserList(false, false, false, false, loggedID));
    }
  }, [loggedID]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const currentTaskId = searchParams.get("loggedID");

    if (selectedId && currentTaskId !== selectedId) {
      searchParams.set("loggedID", selectedId);
      history.replace({ search: searchParams.toString() });
    }
  }, [selectedId, location.search, history]);

  const handleEstTimeInput = (name, value) => {
    if (name === "est_hrs") {
      setEstHrs(value);
      const hrs = parseInt(value);
      if (hrs < 0) {
        setEstHrsError("Time should be greater than or equal to 0");
      } else {
        setEstHrsError("");
      }
      if (hrs === 0 && parseInt(estMins) === 0) {
        setEstHrsError("Enter a non-zero value for hours");
        setEstMinsError("Enter a non-zero value for minutes");
      }
    }
    if (name === "est_mins") {
      setEstMins(value);
      const mins = parseInt(value);
      if (mins < 0 || mins > 59) {
        setEstMinsError("Minutes should be between 0 and 59");
      } else {
        setEstMinsError("");
      }
      if (mins === 0 && parseInt(estHrs) === 0) {
        setEstMinsError("Enter a non-zero value for minutes");
        setEstHrsError("Enter a non-zero value for hours");
      }
    }
    setEstHrsError("");
    setEstMinsError("");
  };

  const handleChangeData = (event, editor) => {
    const data = editor.getData();
    seteditModalDescription(data);
  };

  const handlePasteData = (event, editor) => {
    const pastedData = (event.clipboardData || window.clipboardData).getData(
      "text"
    );
    const newData = pastedData.replace(
      /(https?:\/\/[^\s]+)(?=\s|$)/g,
      '<a href="$1" target="_blank">$1</a>'
    );
    editor.setData(newData);
  };

  const handleChange = (event, editor) => {
    const data = editor.getData();
    setEditorData(data);
  };

  const handlePaste = (event, editor) => {
    const pastedData = (event.clipboardData || window.clipboardData).getData(
      "text"
    );
    const newData = pastedData.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank">$1</a>'
    );
    editor.setData(newData);
  };

  function removeHTMLTags(inputText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(inputText, "text/html");
    return doc.body.textContent || "";
  }

  const handleRowClick = (record) => {
    setModalData({});
    form2.setFieldsValue({
      Hours: record?.logged_hours,
      Minutes: record?.logged_minutes,
      status: record?.logged_status,
      descriptions: removeHTMLTags(
        record?.descriptions ? record?.descriptions : ""
      ),
      dateUpdate: dayjs(record?.logged_date, "DD-MM-YYYY"),
    });
    setOnEditClick(false);
    setModalData(record);
    setLoggedHoursID(record._id);
    seteditModalDescription(record?.descriptions ? record?.descriptions : "");
    setModalVisible(true);
    getComment(record._id);
  };

  const handleModalClose = () => {
    setModalData({});
    setSelectedRow(null);
    setModalVisible(false);
    setSelectedId(null);
    setSelectedId(null);
    setTextAreaValue("");
  };

  const handleTaskInput = (name, value) => {
    setAddInputTaskData({ [name]: value });
  };

  const handleTaskStartDate = (name, value) => {
    setaddInputStartDate({ [name]: value });
  };

  const handleTaskEndDate = (name, value) => {
    setaddInputEndDate({ [name]: value });
  };

  useEffect(() => {
    getTaskdropdown();
    getTimesheetSummary();
    handleBuglist();
    dispatch(getSubscribersList(projectId));
  }, [projectId]);

  useEffect(() => {
    getTimesheet();
  }, [projectId]);

  useEffectAfterMount(() => {
    getTimesheetCsv();
  }, [
    selectedTimesheet,
    radioValue,
    radioStatusValue,
    radioOrderbyValue,
    selectedRowKeys,
  ]);

  useEffect(() => {
    if (loggedID || timesheetdropdownById.length > 0) {
      const dynamicDiv = document.getElementById(`row-${loggedID}`);
      if (dynamicDiv) {
        dynamicDiv.click();
      }
    }
  }, [loggedID, timesheetdropdownById]);
  const getTimesheet = async () => {
    try {
      setPageLoading(true);
      dispatch(showAuthLoader());

      const reqBody = {
        project_id: projectId,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTimesheet,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        const emp = response.data.data;
        setTimesheetList(response.data.data);
        setSelectedTimesheet(response.data.data[0]);
        await getTimesheetById(response.data?.data[0]?._id);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setPageLoading(false);
    }
  };

  const getEditTimesheet = async (id) => {
    try {
      setAddEditTimesheet("Edit Timesheet");
      dispatch(showAuthLoader());

      const reqBody = {
        project_id: projectId,
        _id: id,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTimesheet,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setIsModalOpenTimesheet(true);

        setEditTimesheetData(response.data.data);
        getTimesheet();
        form1.setFieldsValue({
          title: response.data.data?.title,
        });
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getComment = async (loggedHoursID) => {
    try {
      const reqBody = {
        logged_hour_id: loggedHoursID,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.listLoggedTimeComments,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setComments(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleComments = async (values, updateType) => {
    if (values.uploadedFiles1.length > 0) {
      updateType = handleUpdateComment(values, values.uploadedFiles1);
      return;
    } else {
      handleUpdateComment(values);
    }
  };

  const handleEditComment = async (taskId) => {
    try {
      const reqBody = {
        comment_id: taskId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.loggedhoursHistorycomments,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setCommentsedit(response.data.data);
        setTextAreaValue(response.data.data.comment);
        setIsTextAreaFocused(true);
        const editedComment = UtilFunctions.revertLinks(
          response.data.data.comment
        );
        setCommentVal(editedComment);
        setPopulatedFiles(response.data.data.attachments);
        formComment.setFieldsValue({
          comment: editedComment,
        });
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleUpdateComment = async (values, uploadedFiles) => {
    const formattedText = UtilFunctions.formatLinks(textAreaValue);

    if (deleteFileData.length > 0) {
      deleteUploadedFiles(deleteFileData, "comment");
    }
    try {
      let reqBody = {
        comment: formattedText,
        taggedUsers: values.taggedUser,
      };
      if (populatedFiles.length > 0) {
        reqBody = {
          ...reqBody,
          attachments: [
            ...populatedFiles.map((item) => ({
              file_name: item.name,
              file_path: item.path,
              _id: item._id,
              file_type: item.file_type,
            })),
          ],
        };
      }
      if (uploadedFiles) {
        reqBody = {
          ...reqBody,
          attachments: [
            ...populatedFiles.map((item) => ({
              file_name: item.name,
              file_path: item.path,
              _id: item._id,
              file_type: item.file_type,
            })),
            ...uploadedFiles,
          ],
          folder_id: values.folder,
        };
      }
      const params = `/${commentsedit._id}`;
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.editLoggedTimeComments + params,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setCommentVal("");
        formComment.resetFields();
        setOpenCommentModle(false);
        setfileAttachment([]);
        setPopulatedFiles([]);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
    getComment(loggedHoursId);
  };

  const onFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const newFiles = [];
    selectedFiles.forEach((file) => {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB <= 20) {
        newFiles.push(file);
      } else {
        message.error(`File '${file.name}' exceeds the 20MB file size limit.`);
      }
    });
    setfileAttachment([...fileAttachment, ...newFiles]);
  };

  const removeAttachmentFile = (index, file) => {
    if (file?._id) {
      populatedFiles.splice(index - fileAttachment.length, 1);
      setPopulatedFiles([...populatedFiles]);
      return setDeleteFileData([...deleteFileData, file._id]);
    }
    const newArr = fileAttachment.filter((_, i) => i !== index);
    setfileAttachment(newArr);
  };

  const handleSelect = (option) => {
    setTaggedUser((prevIds) => [...new Set([...prevIds, option.key])]);
  };

  const handleCancelCommentModel = () => {
    setOpenCommentModle(false);
    setTextAreaValue("");
    setTaggedUser([]);
    setIsTextAreaFocused(false);
    setfileAttachment([]);
    formComment.resetFields();
  };
  const deleteUploadedFiles = async (files, type) => {
    try {
      let body = {
        del_files_arr: files,
        file_for: type,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileDelete}`,
        body: body,
        options: {
          "content-type": "multipart/form-data",
        },
      });
      setDeleteFileData([]);
      return response?.data?.data;
    } catch (error) {
      console.log(error);
    }
  };

  const addComments = async (id, taggedUser, folderId, attachments) => {
    const formattedText = UtilFunctions.formatLinks(textAreaValue);
    try {
      const reqBody = {
        logged_hour_id: id,
        taggedUsers: taggedUser,
        comment: formattedText,
        attachments: attachments,
      };
      if (folderId) {
        reqBody.folder_id = folderId;
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addLoggedTimeComments,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setTextAreaValue("");
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
    getComment(id);
  };

  const deleteComment = async (id) => {
    try {
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteLoggedTimeComments + params,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
      } else {
        message.error(response.data.message);
      }
      getComment(loggedHoursId);
    } catch (error) {
      console.log(error);
    }
  };

  const getTimesheetSummary = async () => {
    try {
      dispatch(showAuthLoader());

      const reqBody = {
        // isDropdown: false,
        // pageNo: pagination.current,
        // limit: pagination.pageSize,
        // project_id: projectId
        // sort: sortColumn,
        // sortBy: sortOrder,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.getTimesheetSummary}/${projectId}`,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setSummaryData(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteTime = async () => {
    dispatch(showAuthLoader());
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteTime}/${modalData?._id}`,
      });
      if (response?.data && response?.data?.status) {
        message.success(response.data.message);
        getTimesheetById();
        setModalVisible(false);
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };
  const deleteTime2 = async (id) => {
    dispatch(showAuthLoader());
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteTime}/${id}`,
      });
      if (response?.data && response?.data?.status) {
        message.success(response.data.message);
        getTimesheetById();
        setModalVisible(false);
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const onChange = (e) => {
    setRadioValue(e.target.value);
  };

  const onChange3 = (e) => {
    setRadioOrderbyValue(e.target.value);
  };

  const getTaskdropdown = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectMianTask,
        body: { project_id: projectId },
      });
      if (response?.data?.data?.length > 0) {
        setTaskdropdown(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleBuglist = async (selectedTaskId) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getBug,
        body: { project_id: projectId },
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        const bugs = response.data.data.flatMap((stage) => stage.bugs || []);
        setBuglistDropdown(bugs);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleCheckboxChange = (value, checked) => {
    if (value === "") {
      setUsers([]);
    } else {
      if (checked) {
        setUsers((prevUsers) => [...prevUsers, value]);
      } else {
        setUsers((prevUsers) => prevUsers.filter((user) => user !== value));
      }
    }
  };

  const handleSearch = (e) => {
    setSearchTextFilter(e.target.value);
  };

  const filteredSubscribers = subscribersList.filter((item) =>
    item.full_name
      .toLowerCase()
      .includes((searchTextFilter || "").toString().toLowerCase())
  );

  const handleSubmit = async (values) => {
    if (!estHrs && !estMins) {
      setEstHrsError("Enter hours");
      setEstMinsError("Enter minutes");
      return;
    }
    if (estHrs === 0 && !estMins) {
      setEstHrsError("Enter estimated hours");
      setEstMinsError("");
      return;
    }
    if (estMins === 0 && !estHrs) {
      setEstMinsError("Enter estimated hours");
      setEstHrsError("");
    }

    if (estHrs == 0 && estMins == 0) {
      setEstHrsError("Minutes and hours both cannot be 0");
      setEstMinsError("Minutes and hours both cannot be 0");
      return;
    }
    try {
      const reqBody = {
        project_id: projectId,
        bugs_id: values?.bug_list,
        task_id: values?.task_name,
        timesheet_id: selectedTimesheet._id,
        descriptions: editorData,
        logged_hours: estHrs ? estHrs : "00",
        logged_minutes: estMins ? estMins : "00",
        logged_date: addInputTaskData?.start_date,
        logged_status: values?.status,
      };

      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addLoggedHours,
        body: reqBody,
      });

      if (response?.data && response?.data?.data && response?.data?.status) {
        if (values?.bug_list) {
          await emitEvent(
            socketEvents.ADD_BUG_LOGGED_HOURS,
            response.data.data
          );
        } else {
          await emitEvent(
            socketEvents.ADD_TASK_LOGGED_HOURS,
            response.data.data
          );
        }
        message.success(response.data.message);
        form.resetFields();
        setAddInputTaskData({});
        getTimesheet();
        getTimesheetById();
        setIsModalOpenTime(false);
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
    setEstHrs("");
    setEstMins("");
    setEstHrsError("");
    setEstMinsError("");
  };

  const handleSubmit1 = async (values, e) => {
    try {
      const reqBody = {
        title: values?.title.trim(),
        project_id: projectId,
      };

      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addTimesheet,
        body: reqBody,
      });

      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        form1.resetFields();
        getTimesheet();
        setIsModalOpenTimesheet(false);
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  const updateTimesheet = async (values) => {
    try {
      const reqBody = {
        title: values?.title.trim(),
      };

      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateTimesheetApi + "/" + editTimesheetData?._id,
        body: reqBody,
      });

      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        form1.resetFields();
        getTimesheet();
        setIsModalOpenTimesheet(false);
        setEditTimesheetData({});
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit2 = async (values, e) => {
    try {
      const reqBody = {
        descriptions: editModalDescription,
        logged_hours:
          values?.Hours && values?.Hours != "" ? values?.Hours : "00",
        logged_minutes:
          values?.Minutes && values?.Minutes != "" ? values?.Minutes : "00",
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
        form2.setFieldsValue({
          Hours: "",
          Minutes: "",
          status: "",
          descriptions: "",
        });
        handleModalClose();
        setOnEditClick(false);
        getTimesheet();
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  const deleteMultipleTimesheet = async () => {
    try {
      const reqBody = {
        ids: selectedRowKeys,
      };

      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteMultipleTimesheet,
        body: reqBody,
      });

      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        getTimesheet();
        setSelectedRowKeys("");
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  const getTimesheetById = async (id,skipArray=[]) => {
    try {
      if (id || selectedTimesheet?._id) {
        const reqBody = {
          project_id: projectId,
          timesheet_id: id ? id : selectedTimesheet?._id,
        };
        if(!skipArray.includes("SkipDateRange")){
          if (radioValue && radioValue !== "" && radioValue !== "Custom") {
            reqBody.dateRange = radioValue;
          }
          if (radioValue == "Custom") {
            reqBody.dateRange = radioValue;
            reqBody.startDate = addInputStartDate?.start_date;
            reqBody.endDate = addInputEndDate?.end_date;
          }
        }else{
          reqBody.dateRange = "this_month";
        }

        if (radioStatusValue && radioStatusValue !== "") {
          reqBody.logged_status = radioStatusValue;
        }

        if (radioOrderbyValue && radioOrderbyValue !== "") {
          reqBody.orderBy = radioOrderbyValue;
        }
        if (users.length && !skipArray.includes("SkipUser")) {
          reqBody.users = users;
        }
        
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getLoggedHoursById,
          body: reqBody,
        });
        if (response?.data && response?.data?.data && response?.data?.status) {
          const emp = response.data.data;
          emp?.map((val, index) => (val["key"] = val?._id));
          setTimesheetdropdownById(emp);
          setIsPopoverVisibleData(false);
          setIsPopoverVisibleOrder(false);
        } else {
          message.error(response.data.message);
        }
      }
    } catch (error) {
      dispatch(hideAuthLoader());
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

  const handleModalOpenTimesheet = () => {
    setIsModalOpenTimesheet(false);
    setEditTimesheetData({});
    form1.resetFields();
  };

  const dateObject = new Date(modalData?.logged_date);
  const dayOfMonth = dateObject.getDate().toString().padStart(2, "0"); // Ensures leading zero if necessary
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const date = moment(modalData?.logged_date, "DD-MM-YYYY");
  const dayAndMonth = date.format("DD MMMM YYYY");

  const handleTimeSheetSelection = (item) => {
    getTimesheetById(item?._id);
    setSelectedTimesheet(item);
    setRadioValue("");
    setRadioStatusValue("");
    setRadioOrderbyValue("");
    setSelectedRowKeys("");
  };

  const clearCheckbox = () => {
    setSelectedRowKeys("");
  };

  const getTimesheetCsv = async (id) => {
    try {
      if (selectedTimesheet?._id) {
        const reqBody = {
          project_id: projectId,
          timesheet_id: selectedTimesheet?._id,
        };
        if (radioValue && radioValue !== "" && radioValue !== "Custom") {
          reqBody.dateRange = radioValue;
        }
        if (radioValue == "Custom") {
          reqBody.dateRange = radioValue;
          reqBody.startDate = addInputStartDate?.start_date;
          reqBody.endDate = addInputEndDate?.end_date;
        }

        if (radioStatusValue && radioStatusValue !== "") {
          reqBody.logged_status = radioStatusValue;
        }

        if (radioOrderbyValue && radioOrderbyValue !== "") {
          reqBody.orderBy = radioOrderbyValue;
        }

        if (radioOrderbyValue && radioOrderbyValue !== "") {
          reqBody.orderBy = radioOrderbyValue;
        }

        if (selectedRowKeys) {
          reqBody.ids = selectedRowKeys;
        }

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getCsv,
          body: reqBody,
        });
        if (response?.data?.data && response?.data?.status) {
          setHtml(response.data.data);
        }
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error, "err");
    }
  };

  function getTotalTime(entries) {
    // sum everything in minutes
    const totalMins = entries.reduce((sum, e) => {
      const h = parseInt(e.logged_hours, 10) || 0;
      const m = parseInt(e.logged_minutes, 10) || 0;
      return sum + h * 60 + m;
    }, 0);

    const H = Math.floor(totalMins / 60);
    const M = totalMins % 60;

    const paddedM = M < 10 ? "0" + M : "" + M;
    return `${H}h ${paddedM}m`;
  }

          const isDisabledTrackManually = getRoles(["TL"]) && getRoles(["Admin"]) && getRoles(["Client"]) 
  

  const columns = [
    {
      title: "Logged by",
      dataIndex: "loggedBy",
      render: (text) => (text ? removeTitle(text) : "-"),
    },
    {
      title: "Date",
      dataIndex: "logged_date",

      render: (text) => {
        const date = moment(text, "DD-MM-YYYY");
        const dayAndMonth = date.format("DD MMMM YYYY");
        return dayAndMonth;
      },
    },
    {
      title: "Time Logged",
      dataIndex: "time",
    },
    {
      title: "Project",
      dataIndex: "project",
    },
    {
      title: "Tasklist",
      dataIndex: "main_taskList",
    },
    {
      title: "Task",
      dataIndex: "task",
    },
    {
      title: "Bug",
      dataIndex: "bug",
      render: (text) => (text ? text : "-"),
    },
    {
      title: "Actions",
      dataIndex: "descriptions",
      render: (text, record) => (
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
            <EyeOutlined
              onClick={() => {
                handleRowClick(record);
                setSelectedId(record._id);
              }} // Call a function to handle storing _id
              style={{ cursor: "pointer" }}
            />
            {isDisabledTrackManually && (
            <EditOutlined
              style={{ color: "green" }}
              onClick={() => {
                setSelectedId(record._id);
                handleRowClick(record);
                setOnEditClick(true);
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
                setSelectedId(record._id);
                deleteTime2(record._id);
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

  const [selectionType, setSelectionType] = useState("checkbox");
  const onSelectChange = (newSelectedRowKeys, value) => {
    const zz = [...new Set(newSelectedRowKeys)];
    setSelectedRowKeys(zz);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    getCheckboxProps: (record) => ({
      disabled: record.name === "Disabled User",
      name: record.name,
      checked: record._id == selectedRowKeys?._id,
    }),
  };

  const expandedRowRender = () => {
    if (selectedRow) {
      return (
        <div>
          <p>{selectedRow.logged_by}</p>
          <p>{selectedRow.time_logged}</p>
          <p>{selectedRow.Date}</p>
          <p>{selectedRow.Description}</p>
          <p>{selectedRow.tasklist}</p>
          <p>{selectedRow.task}</p>
          <p>{selectedRow.manager}</p>
          <p>{selectedRow.actions}</p>
        </div>
      );
    }
    return null;
  };

  const MoreItem = (
    <Menu>
      <Menu.Item key="1">
        <UsergroupAddOutlined /> Manage People
      </Menu.Item>
      <Menu.Item key="2">
        <EditOutlined />
        Edit
      </Menu.Item>
      <Menu.Item key="3" className="ant-delete">
        <DeleteOutlined />
        Delete
      </Menu.Item>
    </Menu>
  );

  const content1 = (
    <div className="right-popover-wrapper time-module-date-range">
      <h4>Date Range</h4>
      <Checkbox
        onClick={() => setDataCustom(false)}
        onChange={onChange}
        checked={radioValue == "all"}
        value="all"
      >
        All
      </Checkbox>
      <Checkbox
        onClick={() => setDataCustom(false)}
        onChange={onChange}
        checked={radioValue == "last_week"}
        value="last_week"
      >
        Last Week
      </Checkbox>
      <Checkbox
        onClick={() => setDataCustom(false)}
        onChange={onChange}
        checked={radioValue == "last_2_week"}
        value="last_2_week"
      >
        Last 2 Week
      </Checkbox>
      <Checkbox
        onClick={() => setDataCustom(false)}
        onChange={onChange}
        checked={radioValue == "last_month"}
        value="last_month"
      >
        Last Month
      </Checkbox>
      <Checkbox
        onClick={() => setDataCustom(true)}
        onChange={onChange}
        checked={radioValue == "Custom"}
        value="Custom"
      >
        Custom
      </Checkbox>
      {dataCustom && (
        <div style={{ display: "flex", marginTop: "10px", gap: "15px" }}>
          <div>
            <label>Start</label>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <DatePicker
              value={
                addInputStartDate?.start_date &&
                dayjs(addInputStartDate?.start_date, "YYYY-MM-DD")
              }
              onChange={(date, dateString) =>
                handleTaskStartDate("start_date", dateString)
              }
            >
              <CalendarTwoTone />
            </DatePicker>
          </div>
          <div>
            <label>End</label>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <DatePicker
              value={
                addInputEndDate?.end_date &&
                dayjs(addInputEndDate?.end_date, "YYYY-MM-DD")
              }
              onChange={(date, dateString) =>
                handleTaskEndDate("end_date", dateString)
              }
            >
              <CalendarTwoTone />
            </DatePicker>
          </div>
        </div>
      )}

      {/* </Radio.Group> */}
      <div className="popver-footer-btn">
        <Button
          onClick={() => getTimesheetById()}
          type="primary"
          className="square-primary-btn ant-btn-primary"
        >
          Apply
        </Button>
        <Button
          type="outlined"
          onClick={() => setIsPopoverVisibleData(false)}
          className="square-outline-btn ant-delete"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const user = (
    <div className=" time-module-user-pop" style={{ maxWidth: "min-content" }}>
      <h4>User</h4>
      <Checkbox
        checked={users.length === 0}
        onChange={() => {
          handleCheckboxChange("", false);
        }}
      >
        All
      </Checkbox>
      <Input.Search placeholder="Search" onChange={handleSearch} className="ap-search-input" />
      <div className="assigness-data">
        {filteredSubscribers.map((item) => (
          <Checkbox
            key={item._id}
            value={item.full_name}
            checked={users.includes(item._id)}
            onChange={(e) => handleCheckboxChange(item._id, e.target.checked)}
          >
            {removeTitle(item.full_name)}
          </Checkbox>
        ))}
      </div>
      <div className="user-btn-wrapper">
        <Button
          onClick={() => {
            getTimesheetById();
            setPopoverVisible(false);
          }}
          type="primary"
          className="square-primary-btn ant-btn-primary"
        >
          Apply
        </Button>
        <Button
          type="outlined"
          onClick={() => {
            setPopoverVisible(false);
          }}
          className="square-outline-btn ant-delete"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const content5 = (
    <div className="right-popover-wrapper">
      <h4>Order by</h4>
      <Checkbox
        onChange={onChange3}
        checked={radioOrderbyValue == "asc"}
        value="asc"
      >
        Asc
      </Checkbox>
      <Checkbox
        onChange={onChange3}
        checked={radioOrderbyValue == "desc"}
        value="desc"
      >
        Desc
      </Checkbox>

      <div className="popver-footer-btn">
        <Button
          onClick={() => getTimesheetById()}
          type="primary"
          className="square-primary-btn ant-btn-primary"
        >
          Apply
        </Button>
        <Button
          type="outlined"
          onClick={() => setIsPopoverVisibleOrder(false)}
          className="square-outline-btn ant-delete"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const content6 = (
    <div style={{ cursor: "pointer" }} className="export-wrapper">
      <p
        onClick={() => {
          csvRef.click();
        }}
      >
        <i class="fi fi-rr-download"></i>
        Export as csv
      </p>
    </div>
  );

  const content7 = (
    <div className="summary-popover-wrapper">
      <h4>Summary</h4>
      <ul>
        <li>
          <h4>{summaryData?.projectEstimatedhours}</h4>
          <p>Estimated Time</p>
        </li>
        <li>
          <h4>{summaryData?.totalHours}</h4>
          <p>Total Logged Time</p>
        </li>
        <li>
          <h4>{summaryData?.billedHours}</h4>
          <p>Billed Time</p>
        </li>
        <li>
          <h4>{summaryData?.voidHours}</h4>
          <p>Void Time</p>
        </li>
        <li>
          <h4>{summaryData?.billableHours}</h4>
          <p>Billable Time</p>
        </li>
        <li>
          <h4>{summaryData?.nonBillableHours}</h4>
          <p>None Billable Time</p>
        </li>
      </ul>
    </div>
  );

  const handleMenuClick = (e) => {
    console.log(e);
  };

  const [isModalOpenTime, setIsModalOpenTime] = useState(false);
  const [isModalOpenTimesheet, setIsModalOpenTimesheet] = useState(false);
  const [isModalOpenStartTimer, setIsModalOpenStartTimer] = useState(false);

  const showModalTime = () => {
    if (timesheetList.length == 0) {
      return message.error("Please add Timesheet first");
    }
    setIsModalOpenTime(true);
  };
  const showModalTimesheet = () => {
    setIsModalOpenTimesheet(true);
    setAddEditTimesheet("Add Timesheet");
  };
  const showModalStartTimer = () => {
    setIsModalOpenStartTimer(true);
  };

  const closeAddTimesheetmodal = () => {
    setIsModalOpenTime(false);
    setEditorData("");
    setEstHrsError("");
    setEstMinsError("");
    form.resetFields();
  };

  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item onClick={showModalTime} key="1">
        <span>Time</span>
      </Menu.Item>
      <Menu.Item onClick={showModalTimesheet} key="2">
        <span>Timesheet</span>
      </Menu.Item>
    </Menu>
  );

  const Item = (
    <div>
      <Menu>
        <Menu.Item>
          <span>
            <EditOutlined />
          </span>
          Edit
        </Menu.Item>
        <Menu.Item className="ant-delete">
          <span>
            <DeleteOutlined />
          </span>
          Delete
        </Menu.Item>
      </Menu>
    </div>
  );

  const ModalMenu = (
    <Menu>
      {!onEditClick && (
        <Menu.Item onClick={() => setOnEditClick(true)}>
          <EditOutlined style={{ color: "green" }} /> <span>Edit</span>
        </Menu.Item>
      )}

      <Menu.Item
        className="ant-delete"
        style={{ cursor: "pointer" }}
        onClick={deleteTime}
      >
        <DeleteOutlined style={{ color: "red" }} /> <span>Delete</span>
      </Menu.Item>
    </Menu>
  );

  if (pageLoading) return <TimeSkeleton />;

  return (
    <>
      <AddTimeModal
        openModal={isModalOpenTime}
        cancelModal={closeAddTimesheetmodal}
        formName={form}
        onFinish={handleSubmit}
        taskdropdown={taskdropdown}
        addInputTaskData={addInputTaskData}
        handleTaskInput={handleTaskInput}
        estHrs={estHrs}
        handleEstTimeInput={handleEstTimeInput}
        estHrsError={estHrsError}
        estMins={estMins}
        estMinsError={estMinsError}
        handleChangedescription={handleChange}
        editorData={editorData}
        handlePaste={handlePaste}
        type="timesheet"
        handleBuglist={handleBuglist}
        buglistdropdown={buglistdropdown}
      />

      <Modal
        open={isModalOpenTimesheet}
        width={800}
        onCancel={handleModalOpenTimesheet}
        title={null}
        footer={null}
        className="add-task-modal"
      >
        <div className="modal-header">
          <h1>
            {addEditTimesheet === "Add Timesheet"
              ? "Add Timesheet"
              : "Edit Timesheet"}
          </h1>
        </div>
        <div className="overview-modal-wrapper">
          <Form
            form={form1}
            onFinish={(values) => {
              addEditTimesheet === "Add Timesheet"
                ? handleSubmit1(values)
                : updateTimesheet(values);
            }}
          >
            <Form.Item
              name="title"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Please enter a valid title",
                },
              ]}
            >
              <Input style={{ width: "440px" }} />
            </Form.Item>

            <div style={{ marginTop: "10px" }} className="modal-footer-flex">
              <div className="flex-btn">
                {addEditTimesheet === "Add Timesheet" ? (
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="square-primary-btn"
                  >
                    Add
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="square-primary-btn"
                  >
                    Update
                  </Button>
                )}
                <Button
                  type="Outlined"
                  onClick={() => setIsModalOpenTimesheet(false)}
                  className="square-outline-btn ant-delete"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </Modal>

      <Modal
        open={isModalOpenStartTimer}
        width={600}
        onCancel={() => setIsModalOpenStartTimer(false)}
        title={null}
        footer={null}
        className="timer-modal"
      >
        <div className="modal-header">
          <h1>Timer</h1>
          <div className="timer-modal-header">
            <Button>
              <ClockCircleOutlined />
              Start a timer
            </Button>
            <span className="info-btn">
              {/* <i className="fi fi-rr-info"></i> */}
            </span>
          </div>
        </div>
        <div className="overview-modal-wrapper">
          <div className="timer-modal-content-wrapper">
            <div className="timer-modal-flex">
              <span className="play-pause">
                <i className="fi fi-rs-pause-circle"></i>
              </span>
              <div className="time-details">
                <p>00:00:03</p>
                <p>
                  <span>Timesheet:</span> Prachi's Time
                </p>
                <p className="task-name">
                  <Avatar></Avatar>01-2021-SO3738/TM/Nustone.co.uk
                </p>
              </div>
            </div>
            <div className="time-save">
              <Button>Save time</Button>
              <Dropdown trigger={["click"]} overlay={Item}>
                <MoreOutlined />
              </Dropdown>
            </div>
          </div>
          <div className="timer-modal-content-wrapper">
            <div className="timer-modal-flex">
              <span className="play-pause">
                <i className="fi fi-rs-pause-circle"></i>
              </span>
              <div className="time-details">
                <p>00:00:03</p>
                <p>
                  <span>Timesheet:</span> Prachi's Time
                </p>
                <p className="task-name">
                  <Avatar></Avatar>01-2021-SO3738/TM/Nustone.co.uk
                </p>
              </div>
            </div>
            <div className="time-save">
              <Button>Save time</Button>
              <Dropdown trigger={["click"]} overlay={Item}>
                <MoreOutlined />
              </Dropdown>
            </div>
          </div>
          <div className="timer-modal-content-wrapper">
            <div className="timer-modal-flex">
              <span className="play-pause">
                <i className="fi fi-rs-pause-circle"></i>
              </span>
              <div className="time-details">
                <p>00:00:03</p>
                <p>
                  <span>Timesheet:</span> Prachi's Time
                </p>
                <p className="task-name">
                  <Avatar></Avatar>01-2021-SO3738/TM/Nustone.co.uk
                </p>
              </div>
            </div>
            <div className="time-save">
              <Button>Save time</Button>
              <Dropdown trigger={["click"]} overlay={Item}>
                <MoreOutlined />
              </Dropdown>
            </div>
          </div>
        </div>
      </Modal>

      <div className="task-panel-wrapper task-time-wrapper times-wrapper">
        <div className="profileleftbar time-wrapper-left">
          <div className="add-project-wrapper">
            <Button className="add-btn ant-btn-primary" onClick={showModalTime}>
              <i className="fi fi-br-plus"></i> Add
            </Button>
          </div>
          <ul className="sidebar-menu-links" style={{ listStyleType: "none" }}>
            {timesheetList.map((item, index) => {
              const timeSheet = item?.title;
              const formattedTitle = timeSheet?.replace(
                /(?:^|\s)([a-z])/g,
                function (match, group1) {
                  return match?.charAt(0) + group1?.toUpperCase();
                }
              );
              return (
                <li
                  key={index}
                  onClick={() => handleTimeSheetSelection(item)}
                  className={selectedTimesheet?._id == item._id && "active"}
                >
                  <div>{formattedTitle}</div>
                  <div className="time-module-hour-bar">
                    <small>{getTotalTime(timesheetdropdownById)}</small>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="profilerightbar time-wrapper-right">
          <div className="profile-sub-head">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "30px",
              }}
            >
              <h3>Logged time details</h3>
            </div>
            <div className="block-status-content">
              <div className="filter-btn-wrapper">
                <TimeForPMSFilterComponent
                  // Users props
                  users={users}
                  filteredSubscribers={filteredSubscribers}
                  handleCheckboxChange={handleCheckboxChange}
                  handleSearch={handleSearch}
                  // Date Range props
                  radioValue={radioValue}
                  onChange={onChange}
                  setDataCustom={setDataCustom}
                  dataCustom={dataCustom}
                  addInputStartDate={addInputStartDate}
                  addInputEndDate={addInputEndDate}
                  handleTaskStartDate={handleTaskStartDate}
                  handleTaskEndDate={handleTaskEndDate}
                  // Common props
                  getTimesheetById={getTimesheetById}
                  timesheetList={timesheetList}
                  isPopoverVisibleData={isPopoverVisibleData}
                  setIsPopoverVisibleData={setIsPopoverVisibleData}
                  // Role check function
                  getRoles={getRoles}
                />

                {selectedRowKeys.length > 0 && (
                  <div
                    style={{ color: "red", cursor: "pointer" }}
                    onClick={deleteMultipleTimesheet}
                    className="status-content"
                  >
                    <DeleteOutlined style={{ fontSize: "20px" }} />
                  </div>
                )}
                {selectedRowKeys.length > 0 && (
                  <div onClick={clearCheckbox} style={{ cursor: "pointer" }}>
                    <CloseCircleOutlined
                      style={{ fontSize: "20px", color: "red" }}
                    />
                  </div>
                )}
              </div>

              <div hidden>
                <ReactHTMLTableToExcel
                  id="test-table-xls-button"
                  className="ant-btn-primary"
                  table="table-to-xls"
                  filename="Timesheet"
                  sheet="tablexls"
                  buttonText="Export XLS"
                />
                <div dangerouslySetInnerHTML={{ __html: html["html"] }}></div>
              </div>
              <div className="time-inner-item">
                <div className="status-content">
                  <ConfigProvider>
                    <Popover
                      placement="bottom"
                      trigger="click"
                      content={content6}
                      visible={isPopoverVisibleMore}
                      onVisibleChange={setIsPopoverVisibleMore}
                    >
                      <h6 style={{ cursor: "pointer" }} className="font">
                        <span>
                          <MoreOutlined
                            onClick={() => {
                              setIsPopoverVisibleMore(!isPopoverVisibleMore);
                            }}
                          />
                        </span>
                      </h6>
                    </Popover>
                  </ConfigProvider>
                </div>
                <div className="status-content">
                  <ConfigProvider>
                    <Popover
                      placement="bottom"
                      trigger="click"
                      content={content7}
                      visible={isPopoverVisibleInfo}
                      onVisibleChange={setIsPopoverVisibleInfo}
                    >
                      <h6
                        className="font"
                        onClick={() =>
                          setIsPopoverVisibleInfo(!isPopoverVisibleInfo)
                        }
                      >
                        <span>{/* <InfoCircleOutlined /> */}</span>
                      </h6>
                    </Popover>
                  </ConfigProvider>
                </div>
              </div>
            </div>
          </div>

          <div className="time-cards-grid">
            {timesheetdropdownById?.length > 0 ? (
              timesheetdropdownById.map((record, index) => {
                const date = moment(record.logged_date, "DD-MM-YYYY");
                const formattedDate = date.isValid() ? date.format("DD MMMM YYYY") : record.logged_date;
                const isSelected = selectedRowKeys.includes(record._id);
                return (
                  <div
                    key={record._id || index}
                    className={`time-log-card${isSelected ? " time-log-card--selected" : ""}`}
                    onClick={() => {
                      const newKeys = isSelected
                        ? selectedRowKeys.filter((k) => k !== record._id)
                        : [...selectedRowKeys, record._id];
                      onSelectChange(newKeys);
                    }}
                  >
                    <div className="time-log-card__header">
                      <div className="time-log-card__user">
                        <MyAvatar userName={record.loggedBy} src={record.emp_img} />
                        <span className="time-log-card__name">{record.loggedBy ? removeTitle(record.loggedBy) : "-"}</span>
                      </div>
                      <span className="time-log-card__badge">{record.time || "-"}</span>
                    </div>
                    <div className="time-log-card__body">
                      <div className="time-log-card__row">
                        <span className="time-log-card__label">Date</span>
                        <span className="time-log-card__value">{formattedDate}</span>
                      </div>
                      <div className="time-log-card__row">
                        <span className="time-log-card__label">Project</span>
                        <span className="time-log-card__value">{record.project || "-"}</span>
                      </div>
                      <div className="time-log-card__row">
                        <span className="time-log-card__label">Tasklist</span>
                        <span className="time-log-card__value">{record.main_taskList || "-"}</span>
                      </div>
                      <div className="time-log-card__row">
                        <span className="time-log-card__label">Task</span>
                        <span className="time-log-card__value">{record.task || "-"}</span>
                      </div>
                      {record.bug && (
                        <div className="time-log-card__row">
                          <span className="time-log-card__label">Bug</span>
                          <span className="time-log-card__value">{record.bug}</span>
                        </div>
                      )}
                    </div>
                    <div className="time-log-card__footer" onClick={(e) => e.stopPropagation()}>
                      <EyeOutlined
                        className="time-log-card__action-icon time-log-card__action-icon--view"
                        onClick={() => { handleRowClick(record); setSelectedId(record._id); }}
                      />
                      <EditOutlined
                        className="time-log-card__action-icon time-log-card__action-icon--edit"
                        onClick={() => { setSelectedId(record._id); handleRowClick(record); setOnEditClick(true); }}
                      />
                      <Popconfirm
                        icon={<QuestionCircleOutlined style={{ color: "red" }} />}
                        title="Are you sure to delete this Logged Hours?"
                        onConfirm={() => { setSelectedId(record._id); deleteTime2(record._id); }}
                        okText="Yes"
                        cancelText="No"
                      >
                        <DeleteOutlined className="time-log-card__action-icon time-log-card__action-icon--delete" />
                      </Popconfirm>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="time-cards-empty">No logged time entries</div>
            )}
          </div>
        </div>
      </div>

      {modalVisible && modalData && (
        <Modal
          destroyOnClose
          title={null}
          key="unique"
          open={modalVisible && taggedUserList.length > 0}
          onCancel={() => {
            dispatch(setData({ stateName: "taggedUserList", data: [] }));
            handleModalClose();
            setOpenCommentModle(false);
            setTextAreaValue("");
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.delete("loggedID", selectedId);

            history.push({
              pathname: window.location.pathname,
              search: searchParams.toString(),
            });
          }}
          footer={null}
          width={1000}
          className="log-time-modal time-for-pms-modal"
        >
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
            <div
              className="overview-modal-wrapper task-detail-panel "
              style={{ maxHeight: "850px" }}
            >
              <div className="timesheet-logged-details-left-panel">
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
                <div className="d-flex log-time-details align-center myChng">
                  <div className="d-flex align-center logtime-left-wrapper  myChngLft">
                    <span className="loggtime-avatar">
                      <Avatar
                        key={modalData._id}
                        src={
                          modalData.loggedBy_img &&
                          modalData.loggedBy_img !== ""
                            ? `${Service.HRMS_Base_URL}/uploads/emp_images/${modalData.loggedBy_img}`
                            : generateAvatarFromName1(modalData?.loggedBy)
                        }
                      />
                    </span>
                    <div className="logged-by-name-title">
                      <p>Logged by</p>
                      <h4>{removeTitle(modalData?.loggedBy)}</h4>
                    </div>
                  </div>
                  <div className="logtime-right-wrapper myChngRght">
                    {!onEditClick ? (
                      <h4>
                        {modalData?.logged_hours}h {modalData?.logged_minutes}m
                      </h4>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          rowGap: "5px",
                          flexWrap: "wrap",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            width: "100%",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                          }}
                          className="timeforpms"
                        >
                          <Form.Item
                            colon={false}
                            label="Time Logged:"
                            name="Hours"
                            style={{ width: "100%" }}
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
                            label="Minutes Logged:"
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
                              placeholder="Minutes"
                              onChange={(e) => {
                                const { value } = e.target;
                                // Ensure the value is numeric and within range 0-59
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
                        </div>

                        <Form.Item
                          label="Logged Date"
                          style={{
                            width: "100%",
                            marginTop: "-15px",
                          }}
                          name="dateUpdate"
                        >
                          <DatePicker
                            style={{
                              width: "100%",
                            }}
                            placeholder="When"
                            value={
                              modalData?.logged_date &&
                              dayjs(modalData?.logged_date, "YYYY-MM-DD")
                            }
                            onChange={(date, dateString) =>
                              handleTaskInput(
                                "start_date",
                                dayjs(dateString, "YYYY-MM-DD")
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
                    )}
                  </div>
                </div>
                <div className="d-flex align-start">
                  {!onEditClick ? (
                    <p
                      className="logged-time-text-wrapper "
                      dangerouslySetInnerHTML={{
                        __html: modalData?.descriptions.replace(/\n/g, "<br>"),
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

                            print: {
                              // Implement print functionality here
                            },
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
                    {modalData?.project}
                  </span>
                </div>
                <div className="d-flex align-center">
                  <h5>Timesheet</h5>
                  <p>{modalData?.timesheet}'s Timesheet</p>
                </div>
                {onEditClick && (
                  <div className="update-logged-time-button">
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
                        __html: selectedRow.Description.replace(/\n/g, "<br>"),
                      }}
                    ></p>
                  </div>
                )}
              </div>

              <div className="right-task-detail-panel">
                <div className="right-toolbar">
                  <div className="right-toolbar-tab">
                    <label style={{ cursor: "pointer" }}>
                      Comments
                      <span className="comment-badge">
                        {comments.length || 0}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="task-history-inner  task-detail-inner comments">
                  <div class="comment-list-wrapper">
                    {comments && comments.length > 0 ? (
                      comments?.map((item, index) => {
                        const commentValue = item.comment;

                        return (
                          <div className="main-comment-wrapper" key={index}>
                            <div className="main-avatar-wrapper">
                              <MyAvatar
                                src={item.profile_pic}
                                userName={item.sender}
                                alt={item.sender}
                                key={item.sender}
                              />
                              <div className="comment-sender-name">
                                <h1
                                  style={{
                                    color: useUserColors[item.sender] || "#000",
                                  }}
                                >
                                  {removeTitle(item.sender)}
                                </h1>
                                <h4>
                                  {calculateTimeDifference(item.createdAt)}
                                </h4>
                              </div>

                              {isCreatedBy(item?.sender_id) && (
                                <div className="edit-bar">
                                  <Dropdown
                                    trigger={["click"]}
                                    overlay={
                                      <Menu>
                                        <Menu.Item
                                          key="1"
                                          onClick={() => {
                                            setOpenCommentModle(true);
                                            handleEditComment(item._id);
                                          }}
                                        >
                                          <EditOutlined
                                            style={{ color: "green" }}
                                          />
                                          Edit
                                        </Menu.Item>
                                        <Menu.Item
                                          key="2"
                                          onClick={() => {
                                            deleteComment(item._id);
                                          }}
                                          className="ant-delete"
                                        >
                                          <DeleteOutlined
                                            style={{ color: "red" }}
                                          />
                                          Delete
                                        </Menu.Item>
                                      </Menu>
                                    }
                                  >
                                    <MoreOutlined
                                      style={{ cursor: "pointer" }}
                                    />
                                  </Dropdown>
                                </div>
                              )}
                            </div>
                            <div className="comment-wrapper">
                              <p key={index}>
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: item?.comment.replace(
                                      /\n/g,
                                      "<br>"
                                    ),
                                  }}
                                ></span>
                              </p>
                              <div className="task-all-file-wrapper">
                                {item?.attachments.map((file, index) => (
                                  <Badge key={index}>
                                    <div className="fileAttachment_Box">
                                      <div className="fileAttachment_box-img">
                                        {fileImageSelect(file?.file_type)}
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          marginBottom: "10px",
                                          width: "100%",
                                          justifyContent: "space-between",
                                        }}
                                      >
                                        <p
                                          style={{ margin: "0px 10px" }}
                                          className="fileNameTxtellipsis"
                                        >
                                          <a
                                            className="fileNameTxtellipsis"
                                            href={`${process.env.REACT_APP_API_URL}/public/${file?.path}`}
                                            rel="noopener noreferrer"
                                            target="_blank"
                                          >
                                            {file.name.length > 15
                                              ? `${file.name.slice(
                                                  0,
                                                  15
                                                )}.....${file.file_type}`
                                              : file.name + file.file_type}
                                          </a>
                                        </p>
                                      </div>
                                    </div>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="task-no-comments">No comments</div>
                    )}
                  </div>
                  <AddComment
                    editFlagObj={{
                      flag: openCommentModel,
                      setFn: setOpenCommentModle,
                      submitFn: handleComments,
                    }}
                    populatedFiles={populatedFiles}
                    setPopulatedFiles={setPopulatedFiles}
                    deleteFileData={deleteFileData}
                    setDeleteFileData={setDeleteFileData}
                    addComment={addComments} // Function to handle adding comments
                    id={selectedId} // Task ID
                    setTextAreaValue={setTextAreaValue} // Function to set text area value
                    isTextAreaFocused={isTextAreaFocused} // Boolean for text area focus state
                    setIsTextAreaFocused={setIsTextAreaFocused} // Function to set focus state
                    textAreaValue={textAreaValue}
                    userList={taggedUserList}
                  />
                </div>
              </div>
            </div>
          </Form>
        </Modal>
      )}

      <EditCommentModal
        open={false}
        cancel={handleCancelCommentModel}
        formName={formComment}
        onFinish={handleComments}
        Mentionvalue={commentVal}
        onChange={setCommentVal}
        onSelect={handleSelect}
        fileAttachment={fileAttachment}
        populatedFiles={populatedFiles}
        removeAttachmentFile={removeAttachmentFile}
        attachmentfileRef={attachmentfileRef}
        foldersList={foldersList}
        onFileChange={onFileChange}
        setIsTextAreaFocused={setIsTextAreaFocused}
        userList={taggedUserList}
        setOpenCommentModle={setOpenCommentModle}
      />
    </>
  );
}

export default TimeForPMS;
