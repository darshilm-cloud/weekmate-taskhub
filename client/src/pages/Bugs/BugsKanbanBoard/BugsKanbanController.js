/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, eqeqeq */
import React, { useState, useEffect, useRef } from "react";
import UtilFunctions from "../../../util/UtilFunctions";
import moment from "moment";
import { getEmployeeList, getSubscribersList, getTaggedUserList } from "../../../appRedux/reducers/ApiData";
import {
  message,
  Select,
  Form,
} from "antd";
import Service from "../../../service";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions/Auth";
import { useDispatch, useSelector } from "react-redux";
import { useSocketAction } from "../../../hooks/useSocketAction";
import { socketEvents } from "../../../settings/socketEventName";
import queryString from "query-string";
import config from "../../../settings/config.json";

const BugsKanbanController = ({
  tasks,
  showEditTaskModal,
  getBoardTasks,
  boardTasksBugs,
  deleteTasks,
}) => {
  const location = useLocation();
  const history = useHistory();
  const dispatch = useDispatch();
  const { emitEvent } = useSocketAction();
  const { bugID } = queryString.parse(location.search);
  const [addform] = Form.useForm();
  const [formComment] = Form.useForm();
  const { Option } = Select;
  const attachmentfileRef = useRef();
  const attachmentViewfileRef = useRef();
  let currDate = moment()

  const { foldersList, subscribersList, taggedUserList, projectLabels, employeeList } = useSelector(
    (state) => state.apiData
  );
  const { authUser } = useSelector(({ auth }) => auth);
  const { projectId } = useParams();
  
  
  const [taskHistory, setTaskHistory] = useState([]);
  const [dragged, setDragged] = useState(false);
  const [taskDetails, setTaskDetails] = useState({});
  const [viewBug,setViewBug] = useState({
    bug_labels: "",
    start_date: null,
    due_date: null,
    assignees: null,
    estimated_hours: "",
    estimated_minutes: "",
    title: "",
    descriptions: "",
    isRepeated : null,    
  });
  const [commentsedit, setCommentsedit] = useState({});
  const [taskdropdown, setTaskdropdown] = useState([]);
  const [estError, setEstError] = useState(false);
  const [comments, setComments] = useState([]);
  const [openCommentModel, setOpenCommentModle] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [bugId, setBugId] = useState({});
  const [storeIndex, setIndex] = useState("");
  const [activeTab, setActiveTab] = useState("comments");
  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [textAreaValue, setTextAreaValue] = useState("");
  const [showTextArea, setShowTextArea] = useState(false);
  const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
  const [commentVal, setCommentVal] = useState("");
  const [isModalOpenTaskModal, setIsModalOpenTaskModal] = useState(false);
  const [addInputTaskData, setAddInputTaskData] = useState({});
  const [visible, setVisible] = useState(false);
  const [fileAttachment, setfileAttachment] = useState([]);
  const [populatedFiles, setPopulatedFiles] = useState([]);
  const [deleteFileData, setDeleteFileData] = useState([]);
  const [taggedUser, setTaggedUser] = useState([]);
  const [bugWorkFlowStatusList, setBugWorkflowStatusList] = useState([]);
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const [selectedBugStatusTitle, setSelectedBugStatusTitle] = useState(null);
  const [selectedBugStatusColor, setSelectedBugStatusColor] = useState("");
  const [editorData, setEditorData] = useState("");
  const [tempBoard, setTempBoard] = useState({});
  const [selectedBugId, setSelectedBugId] = useState(bugID);
  const [fileViewAttachment,setFileViewAttachment] = useState([]);
  const [populatedViewFiles,setPopulatedViewFiles] = useState([]); 
  const [estHrs, setEstHrs] = useState("");
  const [estMins, setEstMins] = useState("");
  const [estHrsError, setEstHrsError] = useState("");
  const [estMinsError, setEstMinsError] = useState("");
  const [isEditable, setIsEditable] = useState({
    title: false,
    proj_description: false,
    start_date: false,
    end_date: false,
    bug_labels: false,
    assignees: false,
    estimated_time: false
  })
  const [searchKeyword, setSearchKeyword] = useState("")  

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
   
    const currentTaskId = searchParams.get('bugID');
    
    if (selectedBugId && currentTaskId !== selectedBugId) {
      searchParams.set('bugID', selectedBugId);
      history.replace({ search: searchParams.toString() });
    } 
  }, [selectedBugId, location.search, history]);

  const handleCancelTaskModal = () => {
    setIsModalOpenTaskModal(false);
    setEstHrsError("");
    setEstMinsError("")
    setIsEditable(prevState => ({ ...prevState, estimated_time: false }))
    addform.resetFields();
  };
  
  const handleFieldClick = (fieldName) => {
    if (fieldName === "all") {
      setIsEditable({
        title: true,
        proj_description: true,
        start_date: true,
        end_date: true,
        bug_labels: true,
        assignees: true,
        estimated_time: true
      });
      return;
    }
    setIsEditable((prevIsEditable) => ({
      ...prevIsEditable,
      [fieldName]: true,
    }));
  };

  const handleEstTimeViewInput = (name, value) => {    
    if (name === "est_hrs") {
      const hrs = parseInt(value);
      if (isNaN(hrs) || hrs < 0) {
        setEstHrsError("Time should be greater than or equal to 0");
      } else {
        setEstHrsError("");
        setViewBug(prevBugDetails => ({
          ...prevBugDetails,
          estimated_hours: hrs
        }));
      }
      if (hrs === 0 && parseInt(viewBug.estimated_minutes) === 0) {
        setEstHrsError("Enter a non-zero value for hours");
        setEstMinsError("Enter a non-zero value for minutes");
      }
    }

    if (name === "est_mins") {
      const mins = parseInt(value);
      if (isNaN(mins) || mins < 0 || mins > 59) {
        setEstMinsError("Minutes should be between 0 and 59");
      } else {
        setEstMinsError("");
        setViewBug(prevBugDetails => ({
          ...prevBugDetails,
          estimated_minutes: mins
        }));
      }
      if (mins === 0 && parseInt(viewBug.estimated_hours || 0, 10) === 0) {
        setEstMinsError("Enter a non-zero value for minutes");
        setEstHrsError("Enter a non-zero value for hours");
      }
    }
  };

  const handleSearch = searchValue => {
    setSearchKeyword(searchValue);
  };

  const handleSelectedItemsChange = selectedItemIds => {
    const pool = [
      ...(Array.isArray(subscribersList) ? subscribersList : []),
      ...(Array.isArray(employeeList) ? employeeList : []),
      ...(Array.isArray(taggedUserList) ? taggedUserList : []),
    ].filter(Boolean);

    const byId = new Map();
    for (const user of pool) {
      const id = user?._id || user?.id;
      if (id && !byId.has(id)) byId.set(id, user);
    }

    const updatedAssignees = selectedItemIds
      .map((id) => byId.get(id))
      .filter(Boolean);
    setViewBug(prevBugDetails => ({
      ...prevBugDetails,
      assignees: updatedAssignees
    }));
    setSearchKeyword("");   
  };

  const handleSelectedLabelsChange = selectedLabelIds => {
    const updatedLabels = projectLabels.filter(item =>
      selectedLabelIds.includes(item._id)
    );
    setViewBug(prevBugDetails => ({
      ...prevBugDetails,
      bug_labels: updatedLabels
    }));
  };

  const updateviewBug = async (_viewBug = viewBug, uploadedFiles) => {    
    dispatch(showAuthLoader());
    try {
      let reqBody = {
        updated_key: [
          "title",
          "status",
          "descriptions",
          "bug_labels",
          "start_date",
          "due_date",
          "assignees",
          "estimated_hours",
          "estimated_minutes",
          "progress",
          "attachments",
          "bug_status",
          "task",
        ],
        project_id: projectId,
        task_id: bugID,
        title: _viewBug?.title,
        descriptions: _viewBug?.descriptions,
        bug_labels: Array.isArray(_viewBug?.bug_labels) 
          ? (_viewBug.bug_labels[0]?._id || _viewBug.bug_labels[0]?.id || _viewBug.bug_labels[0] || "") 
          : (_viewBug?.bug_labels || ""),
        assignees: Array.isArray(_viewBug?.assignees) 
          ? _viewBug.assignees.map(item => item?._id || item?.id || item) 
          : [],
        estimated_hours: _viewBug?.estimated_hours && _viewBug?.estimated_hours != "" ? _viewBug?.estimated_hours.toString() : "00",
        estimated_minutes: _viewBug.estimated_minutes && _viewBug.estimated_minutes != "" ? _viewBug.estimated_minutes.toString() : "00",
        start_date: _viewBug.start_date
          ? _viewBug.start_date
          : null,
        due_date: _viewBug?.due_date ? _viewBug?.due_date : null,
        isRepeated : _viewBug?.isRepeated
      };
                
      if (populatedViewFiles.length > 0) {
        reqBody = {
          ...reqBody,
          attachments: [
            ...populatedViewFiles.map(item => ({
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
            ...populatedViewFiles.map(item => ({
              file_name: item.name,
              file_path: item.path,
              _id: item._id,
              file_type: item.file_type,
            })),
            ...uploadedFiles,
          ],
          // folder_id: values.folder,
        };
      }
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.editBugTask}/${bugID}`,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        getBoardTasks(taskDetails?.mainTask?._id);       
        setIsEditable({
          title: false,
          proj_description: false,
          start_date: false,
          end_date: false,
          bug_labels: false,
          assignees: false,
          estimated_time: false
        })        
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  }

  const handleViewBug = (name, value) => {   
    setViewBug(prevViewBug => ({
      ...prevViewBug,
      [name]: value
    }));
    setSearchKeyword("");
  }

  function removeHTMLTags(inputText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(inputText, "text/html");
    return doc.body.textContent || "";
  }

  const handleTaskOps = async (values) => {
    const formattedText = UtilFunctions.formatLinks(values?.descriptions);
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
        bugs_id: bugId,
        // task_id: taskid,
        timesheet_id: values?.workflow_id,
        descriptions: formattedText,
        logged_hours: estHrs ? estHrs : "00",
        logged_minutes: estMins ? estMins : "00",
        logged_date: addInputTaskData?.start_date,
        logged_status: values?.status,
        // user_id: authUser?._id,
      };

      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addLoggedHours,
        body: reqBody,
      });

      if (response?.data && response?.data?.data && response?.data?.status) {
        await emitEvent(socketEvents.ADD_BUG_LOGGED_HOURS, response.data.data);

        message.success(response.data.message);
        addform.resetFields();
        setEstHrs("")
        setEstMins("")
        getTaskByIdDetails(bugId);
        setIsModalOpenTaskModal(false);
        setIsEditable(prevState => ({ ...prevState, estimated_time: false }))
        getBoardTasks();
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

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

  const handleDropdownClick = (e) => {
    e.stopPropagation();
  };

  const getTaskByIdDetails = async (taskId, editType, refresh) => {
    try {
      const reqBody = {
        project_id: projectId,
        _id: taskId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getBugDetails,
        body: reqBody,
      });

      if (response?.data && response?.data?.data) {
        if (editType?.editFlag) {
          return showEditTaskModal(response.data.data, editType.boardID);
        }
        setTaskDetails(response.data.data);
        setFileViewAttachment(response.data.data.attachments)
        setViewBug(response.data.data)        
        setSelectedBugStatusTitle(response.data.data.bug_status?.title);
        const clickedBugStatusIndex = bugWorkFlowStatusList.findIndex(
          (item) => item.title === response.data.data.bug_status?.title
        );

        if (clickedBugStatusIndex !== -1) {
          setSelectedBugStatusColor(config.COLORS[clickedBugStatusIndex]);
        }
        setBugId(response.data.data._id);
        if (refresh) return;
        setModalIsOpen(true);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onChange = (date, dateString) => {
    console.log(date, dateString);
  };

  const handleCancel = () => {
    if (bugID) {
      setSelectedBugId(null);
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete("bugID", bugID);
      console.log(searchParams.toString(),"searchParams")
      history.push({
        pathname: window.location.pathname,
        search: searchParams.toString(),
      });
    }
    setModalIsOpen(false);
    handleTabChange("comments");
    setShowTaskHistory(false);
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const getBughistory = async (id) => {
    try {
      const reqBody = {
        bug_id: id,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.historyofbugs,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setTaskHistory(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getTaskdropdown();
    dispatch(getEmployeeList());
    dispatch(getSubscribersList(projectId));    
  }, [projectId]);
  
  useEffect(() => {
    if(bugID){
      dispatch(getTaggedUserList(false,false,bugID,false,false));
    }
  },[bugID])

  const getTaskdropdown = async () => {
    try {
      const reqBody = {
        // branch: branch ? branch : "none",
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getTimesheetList + "/" + projectId,
        body: reqBody,
      });
      // dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data && response?.data?.status) {
        const emp = response.data.data;
        setTaskdropdown(emp);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const updateTaskWorkflowStats = async (status, bugId) => {
    dispatch(showAuthLoader());
    try {
      const reqBody = {
        bug_status: status,
      };

      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateWorkflowOfBugs}/${bugId}`,
        body: reqBody,
      });

      if (response?.data?.data && response?.data?.status) {
        getBoardTasks();
      } else {
        message.error(response.data.message);
        getBoardTasks();
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const onDragStart = (evt) => {
    const element = evt.currentTarget;
    element.classList.add("dragged");
    evt.dataTransfer.setData("text/plain", evt.currentTarget.id);
    evt.dataTransfer.effectAllowed = "move";
    setDragged(true);
  };

  const onDragEnd = (evt) => {
    evt.currentTarget.classList.remove("dragged");
    setDragged(false);
  };

  const onDragEnter = (evt) => {
    evt.preventDefault();
    const element = evt.currentTarget;
    element.classList.add("dragged-over");
    evt.dataTransfer.dropEffect = "move";
  };

  const onDragLeave = (evt) => {
    const currentTarget = evt?.currentTarget;
    const newTarget = evt?.relatedTarget;
    if (newTarget.parentNode === currentTarget || newTarget === currentTarget)
      return;
    evt.preventDefault();
    const element = evt.currentTarget;
    element?.classList?.remove("dragged-over");
  };

  const onDragOver = (evt) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "move";
  };

  const onDrop = (evt, status) => {
    evt.preventDefault();
    evt?.currentTarget?.classList?.remove("dragged-over");
    let data = evt.dataTransfer.getData("text/plain");
    console.log("🚀 ~ onDrop ~ data:", evt, data)
    data = getIdFromString(data)
    updateTaskWorkflowStats(status, data);
  };

  function getIdFromString(str) {
    return str.startsWith("bug-") ? str.substring(4) : str;
  }

  const activeClass = () => {
    if (activeTab === "comments") {
      return "active";
    } else {
      return "";
    }
  };

  const activeClass1 = () => {
    if (activeTab === "task") {
      return "active";
    } else {
      return "";
    }
  };

  const handleTaskDelete = (id) => {
    handleCancel();
    deleteTasks(id);
  };

  const handleTaskInput = (name, value) => {
    setAddInputTaskData({ ...addInputTaskData, [name]: value });
  };

  const popOver = () => {
    setIsModalOpenTaskModal(true);
    setVisible(false);
  };

  const openPopOver = (visible) => {
    setVisible(visible);
  };

  const getComment = async (taskID) => {
    try {
      const reqBody = {
        bug_id: taskID,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.listBugComment,
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

  const onFileViewChange =async event => {
    const selectedFiles = Array.from(event.target.files);
    const newFiles = [];
    selectedFiles.forEach(file => {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB <= 20) {
        newFiles.push(file);
      } else {
        message.error(`File '${file.name}' exceeds the 20MB file size limit.`);
      }
    }); 
    const uploadedfile = await uploadFiles(newFiles, "task");
    updateviewBug({...viewBug},uploadedfile)
      
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

  const removeAttachmentViewFile = (index, file) => {
    if (file?._id) {
      deleteUploadedFiles([file._id], "task");
      getBoardTasks(taskDetails?.mainTask?._id);
    }
  };

  const uploadFiles = async (files, type) => {
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("document", file);
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileUpload}?file_for=${type}`,
        body: formData,
        options: {
          "content-type": "multipart/form-data",
        },
      });
      return response?.data?.data;
    } catch (error) {
      console.log(error);
    }
  };

  const handleToggle = (item) => {
    if (storeIndex === item._id) {
      setIndex("");
      setShowTaskHistory(false);
    } else {
      setIndex(item._id);
      setShowTaskHistory(true);
    }
  };

  const isLoggedHoursMoreThanEstimated = (loggedHours, estimatedHours) => {
    const loggedTime = moment.duration(loggedHours);
    const estimatedTime = moment.duration(estimatedHours);
    return loggedTime.asHours() > estimatedTime.asHours();
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

  const handleUpdateComment = async (values, uploadedFiles) => {
    const formattedText = UtilFunctions.formatLinks(textAreaValue);
    if (deleteFileData.length > 0) {
      deleteUploadedFiles(deleteFileData, "comment");
    }
    try {
      let reqBody = {
        comment: formattedText,
        bug_id: bugId,
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
        api_url: Service.editBugComment + params,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        //Send Notification to mentioned users:
        await emitEvent(socketEvents.EDIT_BUG_COMMENTS,{
          _id : bugID,
          taggedUsers : values.taggedUser
        });
        setCommentVal("");
        formComment.resetFields();
        setOpenCommentModle(false);
        setfileAttachment([]);
        setPopulatedFiles([])
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
    getComment(taskDetails?._id);
  };

  const deleteComment = async (id) => {
    try {
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteBugComment + params,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
      } else {
        message.error(response.data.message);
      }
      getComment(taskDetails?._id);
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

  const addComments = async (id, taggedUser, folderId, attachments) => {
    const formattedText = UtilFunctions.formatLinks(textAreaValue);
    try {
      const reqBody = {
        bug_id: id,
        taggedUsers: taggedUser,
        comment: formattedText,
        attachments: attachments,
      };
      if (folderId) {
        reqBody.folder_id = folderId;
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.bugAddComment,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        await emitEvent(socketEvents.ADD_BUG_COMMENTS, response.data.data);
        message.success(response.data.message);
        setTextAreaValue("");
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
    getComment(id);
  };
 
  const handleEditComment = async (taskId) => {
    try {
      const reqBody = {
        comment_id: taskId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.historyOfBugComments,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setCommentsedit(response.data.data);
        setTextAreaValue(response.data.data.comment)
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

  const handleSelect = option => {
    setTaggedUser((prevIds) => [...new Set([...prevIds, option.key])]);
  };

  //details modal refresh when edit modal is saved
  useEffect(() => {
    if (modalIsOpen && bugId) {
      getTaskByIdDetails(bugId, null, true);
    }
  }, [tasks]);

  useEffect(() => {
    if (bugID && tasks.length > 0) {
      const dynamicDiv = document.getElementById(`bug-${bugID}`);
      if (dynamicDiv) {
        dynamicDiv.click();
      }
    }
  }, [bugID, tasks]);

  const getBugWorkFlowStatus = async () => {
    try {
      dispatch(showAuthLoader());

      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getBugWorkFlowStatus,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setBugWorkflowStatusList(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getBugWorkFlowStatus();
  }, []);

  const handleBugStatusClick = (workFlowStatusId, bugId) => {
    const clickedBugStatusIndex = bugWorkFlowStatusList.findIndex(
      (item) => item._id === workFlowStatusId
    );
    if (clickedBugStatusIndex) {
      setSelectedBugStatusTitle(
        clickedBugStatusIndex ? clickedBugStatusIndex.title : null
      );
    }
    if (clickedBugStatusIndex !== -1) {
      const selectedColor = config.COLORS[clickedBugStatusIndex]; // Assuming you have an array of colors named COLORS in your config
      setSelectedBugStatusColor(selectedColor);
    }

    updateTaskWorkflowStats(workFlowStatusId, bugId);
    setIsPopoverVisible(false); // Close the popover after clicking
  };

  const commentListRef = useRef(null);

  const handleCancelCommentModel = () =>{
    setOpenCommentModle(false)
  }
  useEffect(() => {    
    if (commentListRef.current) {      
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;      
    }
  }, [comments]);

  const handleChangedescription = (event, editor) => {
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

  return {
    boardTasksBugs,
    dragged,
    onDragLeave,
    onDragEnter,
    onDragEnd,
    onDragOver,
    onDrop,
    showTextArea,
    setShowTextArea,
    getTaskByIdDetails,
    getComment,
    modalIsOpen,
    handleCancel,
    taskDetails,
    viewBug,
    isEditable,
    handleTaskDelete,
    estError,
    visible,
    popOver,
    openPopOver,
    isLoggedHoursMoreThanEstimated,
    onChange,
    activeClass,
    activeClass1,
    activeTab,
    comments,
    handleEditComment,
    deleteComment,
    handleDropdownClick,
    addComments,
    setTextAreaValue,
    isTextAreaFocused,
    setIsTextAreaFocused,
    textAreaValue,
    subscribersList,
    employeeList,
    taggedUserList,
    taskHistory,
    showTaskHistory,
    handleToggle,
    storeIndex,
    addform,
    taskdropdown,
    Option,
    addInputTaskData,
    handleTaskInput,
    openCommentModel,
    setCommentVal,
    handleSelect,
    commentVal,
    fileAttachment,
    populatedFiles,
    removeAttachmentFile,
    foldersList,
    attachmentfileRef,
    onFileChange,
    isModalOpenTaskModal,
    onDragStart,    
    handleTabChange,
    getBughistory,
    setOpenCommentModle,
    handleCancelTaskModal,
    handleTaskOps,
    formComment,
    handleComments,
    setTempBoard,
    tempBoard,
    removeHTMLTags,
    authUser,
    bugWorkFlowStatusList,
    isPopoverVisible,
    setIsPopoverVisible,
    handleBugStatusClick,
    bugId,
    handleEstTimeInput,
    estHrsError,
    estMinsError,
    estHrs,
    estMins,
    selectedBugStatusTitle,
    selectedBugStatusColor,
    currDate,
    setSelectedBugId,
    commentListRef,
    handleCancelCommentModel,
    handleChangedescription,
    editorData,
    handlePaste,
    handleFieldClick,
    handleEstTimeViewInput,    
    handleSearch,
    handleSelectedItemsChange,
    handleSelectedLabelsChange,
    searchKeyword,
    projectLabels,
    handleViewBug,
    removeAttachmentViewFile,
    populatedViewFiles,
    fileViewAttachment,
    onFileViewChange,
    attachmentViewfileRef,
    updateviewBug,
    setIsEditable,
    setPopulatedFiles,
    deleteFileData,
    setDeleteFileData
  };
};

export default BugsKanbanController;
