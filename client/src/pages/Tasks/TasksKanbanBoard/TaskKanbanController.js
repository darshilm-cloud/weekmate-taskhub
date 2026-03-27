/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, eqeqeq, no-dupe-keys */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { message, Select, Upload, Form, Avatar } from "antd";
import Service from "../../../service";
import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions/Auth";
import { useParams, useLocation, useHistory } from "react-router-dom";
import "../style.css";
import moment from "moment";
import {
  getSpecificProjectWorkflowStage,
  getTaggedUserList,
} from "../../../appRedux/reducers/ApiData";
import { useDispatch, useSelector } from "react-redux";
import { socketEvents } from "../../../settings/socketEventName";
import { useSocketAction } from "../../../hooks/useSocketAction";
import queryString from "query-string";
import UtilFunctions from "../../../util/UtilFunctions";
import { generateCacheKey } from "../../../util/generateCacheKey";
import { getCachedData } from "../../../cacheDB";

const TaskKanbanController = ({
  tasks,
  showEditTaskModal,
  selectedTask,
  deleteTasks,
  getProjectMianTask,
  getBoardTasks,
  updateBoardTaskLocally,
  moveBoardTaskLocally,
  refreshProjectMainTasks,
}) => {
  const location = useLocation();
  const history = useHistory();

  const { taskID, listID } = queryString.parse(location.search);

  const { projectId } = useParams();
  let currDate = moment();
  const { emitEvent, listenEvent } = useSocketAction();
  const {
    foldersList,
    subscribersList,
    employeeList,
    taggedUserList,
    projectWorkflowStage,
    projectLabels,
    clientsList,
  } = useSelector((state) => state.apiData);

  const assigneeOptions = useMemo(() => {
    const mergedUsers = [...(subscribersList || []), ...(employeeList || [])];
    const uniqueUsers = new Map();

    mergedUsers.forEach((user) => {
      if (!user?._id) return;

      uniqueUsers.set(user._id, {
        ...user,
        full_name: user.full_name || user.name || "",
      });
    });

    return Array.from(uniqueUsers.values());
  }, [employeeList, subscribersList]);

  const [editModalDescription, seteditModalDescription] = useState("");
  const attachmentfileRef = useRef();
  const attachmentViewfileRef = useRef();
  const pendingDescriptionSaveRef = useRef({
    timeoutId: null,
    // Latest viewTask snapshot that includes the user's current description text.
    latestViewTask: null,
    lastSentDescription: null,
  });

  const [dragged, setDragged] = useState(false);
  const [textAreaValue, setTextAreaValue] = useState("");
  const [taskDetails, setTaskDetails] = useState({});
  const [moveSelectedTaskLists,setMoveSelectedTaskLists] = useState([]);
  const [viewTask, setViewTask] = useState({
    taskLabels: "",
    start_date: null,
    due_date: null,
    assignees: null,
    estimated_hours: "",
    estimated_minutes: "",
    title: "",
    descriptions: "",
  });
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [commentsedit, setCommentsedit] = useState({});
  const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");
  const [commentVal, setCommentVal] = useState("");
  const [openCommentModel, setOpenCommentModle] = useState(false);
  const [showTextArea, setShowTextArea] = useState(false);
  const [formComment] = Form.useForm();
  const [managePeopleForm] = Form.useForm();
  const [viewEdit] = Form.useForm();
  const [comments, setComments] = useState([]);
  const [isModalOpenTaskModal, setIsModalOpenTaskModal] = useState(false);
  const [isVisibleTime, setVisibleTime] = useState(false);
  const [addInputTaskData, setAddInputTaskData] = useState({});
  const [visible, setVisible] = useState(false);
  const [taskdropdown, setTaskdropdown] = useState([]);
  const [taskId, setTaskId] = useState(null);
  const [taskHistory, setTaskHistory] = useState([]);
  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [estError, setEstError] = useState(false);
  const [storeIndex, setIndex] = useState("");
  const [fileAttachment, setfileAttachment] = useState([]);
  const [populatedFiles, setPopulatedFiles] = useState([]);
  const [deleteFileData, setDeleteFileData] = useState([]);
  const [fileViewAttachment, setFileViewAttachment] = useState([]);
  const [populatedViewFiles, setPopulatedViewFiles] = useState([]);
  const [taggedUser, setTaggedUser] = useState([]);
  const [tempBoard, setTempBoard] = useState({});
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const [estHrs, setEstHrs] = useState("");
  const [estMins, setEstMins] = useState("");
  const [estHrsError, setEstHrsError] = useState("");
  const [estMinsError, setEstMinsError] = useState("");
  const [selectedTaskStatusTitle, setSelectedTaskStatusTitle] = useState(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState(false);
  const [mainTask, setMainTask] = useState([]);
  const [detailClientSubs, setDetailsClientSubs] = useState({
    assignees: [],
    clients: [],
  });
  const [columnDetails, setColumnDetails] = useState([]);
  const [initialDetails, setInitialDetails] = useState([]);
  const [issuedata, setIssuedata] = useState([]);
  const [bugWorkflowStatuses, setBugWorkflowStatuses] = useState([]);
  const [issuetitleflag, setIssuetitleflag] = useState(false);
  const [issuetitle, setIssuetitle] = useState("");
  const [newBugData, setNewBugData] = useState({
    bugId: "",
    bug_status: undefined,
    createdBy: undefined,
    createdAt: null,
    assignees: [],
    due_date: null,
  });
  const [copyFormData, setCopyFormData] = useState({
    title: "",
    project_id: "",
    task_id: "",
    task_status: "",
    isCopyAssignee: true,
    isCopyClients: true,
    isCopyDates: true,
    isCopyComments: true,
  });
  const handleissuedata = (data) => {
    if (data.key == "Enter") {
      addissue();
    }
  };
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(taskID);
  const [editorData, setEditorData] = useState("");
  const [editorDataEditdesc, setEditorEditdesc] = useState("");
  const [isEditable, setIsEditable] = useState({
    title: false,
    proj_description: false,
    start_date: true,
    end_date: true,
    taskLabels: false,
    assignees: false,
    estimated_time: false,
  });
  const [editViewModalDescription, setEditViewModalDescription] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);

useEffect(() => {
  const loadDrafts = async () => {
    if (taskId) {
      const draft = await getCachedData(`task_comment_${taskId}`);
      if (draft) {
        setTextAreaValue(draft);
      }
    }
  };
  
  loadDrafts();
}, [taskId]);

  const handleFieldClick = (fieldName) => {
    setIsEditable((prevIsEditable) => ({
      ...prevIsEditable,
      [fieldName]: true,
    }));
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);

    const currentTaskId = searchParams.get("taskID");

    if (selectedTaskId && currentTaskId !== selectedTaskId) {
      searchParams.set("taskID", selectedTaskId);
      history.replace({ search: searchParams.toString() });
    }
  }, [selectedTaskId, location.search, history]);

  const [copyform] = Form.useForm();
  const [addform] = Form.useForm();
  const [editTaskform] = Form.useForm();
  const dispatch = useDispatch();
  const { Dragger } = Upload;
  const { Option } = Select;
  const [ManagePeople, setManagePeople] = useState(false);
  const [expandedRowKey, setExpandedRowKey] = useState(null);
  const [stagesId, setStagesId] = useState("");

  function removeHTMLTags(inputText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(inputText, "text/html");
    return doc.body.textContent || "";
  }
  const handleCancelCopyModal = () => {
    setIsCopyModalOpen(false);
    copyform.resetFields();
  };

  const handleOkCopyModal = () => {
    setIsCopyModalOpen(false);
    copyform.resetFields();
  };

  const handleDelete = (id) => {
    deleteTasks(id);
  };

  const handleCancelTaskModal = () => {
    setIsModalOpenTaskModal(false);
    setEstHrsError("");
    setEstMinsError("");
    setIsEditable((prevState) => ({ ...prevState, estimated_time: false }));
    addform.resetFields();
  };

  const handleChnageDescription = (event, editor) => {
    const data = editor.getData();

    seteditModalDescription(data);
  };

  const handleManagePeople = async (values) => {
    setManagePeople(false);
    try {
      let reqBody = {
        updated_key: ["assignees", "pms_clients"],
        project_id: projectId,
        main_task_id: selectedTask?._id,
        assignees: values?.assignees,
        pms_clients: values?.clients,
      };

      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.taskPropUpdation}/${taskId}`,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response?.data?.message);
        getBoardTasks(selectedTask?._id);

        let assignee = new Set(
          (initialDetails?.assignees || [])
            .map((item) => item?._id)
            .filter(Boolean)
        );
        let newAssignees = (values?.assignees || []).filter(
          (id) => !assignee.has(id)
        );

        let client = new Set(
          (initialDetails?.pms_clients || [])
            .map((item) => item?._id)
            .filter(Boolean)
        );
        let newClients = (values?.clients || []).filter(
          (id) => !client.has(id)
        );
        await emitEvent(socketEvents.EDIT_TASK_ASSIGNEE, {
          _id: taskId,
          assignees: newAssignees,
          pms_clients: newClients,
        });
      } else {
        message.error(response?.data?.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const isLoggedHoursMoreThanEstimated = (loggedHours, estimatedHours) => {
    const loggedTime = moment.duration(loggedHours);
    const estimatedTime = moment.duration(estimatedHours);

    return loggedTime.asHours() > estimatedTime.asHours();
  };

  useEffect(() => {
    getProjectByID();
    getTaskdropdown();
    if (stagesId) {
      dispatch(getSpecificProjectWorkflowStage(stagesId));
    }
    getBugWorkflowStatuses();
  }, [projectId]);

  useEffect(() => {
    if (selectedTaskId) {
      setTaskId(selectedTaskId);
      dispatch(getTaggedUserList(false, selectedTaskId, false, false));
      getIssuedata(selectedTaskId);
    }
  }, [selectedTaskId]);

  const handleCancelManagePeople = () => {
    setManagePeople(false);
    managePeopleForm.resetFields();
  };

  const handleTaskInput = (name, value) => {
    setAddInputTaskData({ ...addInputTaskData, [name]: value });
  };

  useEffect(() => {
    return () => {
      if (pendingDescriptionSaveRef.current.timeoutId) {
        clearTimeout(pendingDescriptionSaveRef.current.timeoutId);
        pendingDescriptionSaveRef.current.timeoutId = null;
      }
    };
  }, []);

  const handleViewTask = (name, value) => {
    setSearchKeyword("");

    // Description editor emits changes on every keystroke. Saving immediately causes
    // frequent re-renders and can feel like "auto fill / auto save" loops.
    if (name === "descriptions") {
      setViewTask((prevViewTask) => {
        const nextViewTask = { ...prevViewTask, [name]: value };
        pendingDescriptionSaveRef.current.latestViewTask = nextViewTask;

        if (pendingDescriptionSaveRef.current.timeoutId) {
          clearTimeout(pendingDescriptionSaveRef.current.timeoutId);
        }

        pendingDescriptionSaveRef.current.timeoutId = setTimeout(() => {
          pendingDescriptionSaveRef.current.timeoutId = null;
          const latest = pendingDescriptionSaveRef.current.latestViewTask;
          if (!latest) return;

          // Skip if nothing actually changed since the last send.
          if (
            pendingDescriptionSaveRef.current.lastSentDescription ===
            latest.descriptions
          ) {
            return;
          }
          pendingDescriptionSaveRef.current.lastSentDescription = latest.descriptions;
          updateviewTask(latest);
        }, 900);

        return nextViewTask;
      });
      return;
    }

    setViewTask((prevViewTask) => {
      const nextViewTask = { ...prevViewTask, [name]: value };
      updateviewTask(nextViewTask);
      return nextViewTask;
    });
  };

  const updateviewTask = async (
    _viewTask = viewTask,
    uploadedFiles,
    showSuccess = false
  ) => {
    try {
      let reqBody = {
        updated_key: [
          "title",
          "descriptions",
          "task_labels",
          "start_date",
          "due_date",
          "assignees",
          "estimated_hours",
          "estimated_minutes",
          "attachments",
        ],
        project_id: projectId,
        main_task_id: _viewTask?.mainTask?._id || _viewTask?._id || taskId,
        title: _viewTask.title,
        descriptions: _viewTask.descriptions,
        task_labels: (_viewTask?.taskLabels || _viewTask?.task_labels || [])
          .map((item) => (typeof item === 'string' ? item : item?._id))
          .filter(Boolean),
        assignees: (_viewTask?.assignees || [])
          .map((item) => (typeof item === 'string' ? item : item?._id))
          .filter(Boolean),
        estimated_hours:
          _viewTask.estimated_hours && _viewTask.estimated_hours != ""
            ? _viewTask.estimated_hours.toString()
            : "00",
        estimated_minutes:
          _viewTask.estimated_minutes && _viewTask.estimated_minutes != ""
            ? _viewTask.estimated_minutes.toString()
            : "00",
        start_date: _viewTask.start_date ? _viewTask.start_date : null,
        due_date: _viewTask.due_date ? _viewTask.due_date : null,
      };

      if (populatedViewFiles.length > 0) {
        reqBody = {
          ...reqBody,
          attachments: [
            ...populatedViewFiles.map((item) => ({
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
            ...populatedViewFiles.map((item) => ({
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
        api_url: `${Service.taskPropUpdation}/${taskId}`,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        const updatedTask = response.data.data;
        const latestLocalDescription =
          pendingDescriptionSaveRef.current.latestViewTask?.descriptions;
        const shouldPreserveDescription =
          typeof latestLocalDescription === "string" &&
          pendingDescriptionSaveRef.current.timeoutId;

        const nextTask = shouldPreserveDescription
          ? { ...updatedTask, descriptions: latestLocalDescription }
          : updatedTask;

        setTaskDetails(nextTask);
        setFileViewAttachment(nextTask.attachments || []);
        setViewTask(nextTask);
        setSelectedTaskStatusTitle(updatedTask.task_status?.title);
        updateBoardTaskLocally?.(nextTask);
        if (showSuccess) message.success("Task saved successfully!");
        setIsEditable({
          title: false,
          proj_description: false,
          start_date: true,
          end_date: true,
          taskLabels: false,
          assignees: false,
          estimated_time: false,
        });
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

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
        const emp = response?.data?.data;
        setTaskdropdown(emp);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const getIssuedata = async (taskid) => {
    if (taskid && typeof taskid === "string") {
      try {
        const reqBody = {
          project_id: projectId,
          task_id: taskid,
        };
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getissuedata,
          body: reqBody,
        });
        // dispatch(hideAuthLoader());
        if (response?.data && response?.data?.data && response?.data?.status) {
          const emp = response?.data?.data;
          setIssuedata(emp);
          // setTaskdropdown(emp);
        } else {
          message.error(response.data.message);
        }
      } catch (error) {
        dispatch(hideAuthLoader());
        console.log(error);
      }
    }
  };

  const deleteBug = async (bugId) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteBugs}/${bugId}`,
      });
      if (response?.data?.status) {
        getIssuedata(taskId);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const editBug = async (bugId, title, additionalFields = {}) => {
    try {
      const updatedKeys = ["title", ...Object.keys(additionalFields)];
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.editBugTask}/${bugId}`,
        body: {
          updated_key: updatedKeys,
          title,
          project_id: selectedTask?.project?._id,
          ...additionalFields,
        },
      });
      if (response?.data?.status) {
        getIssuedata(taskId);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateBugWorkflow = async (bugId, statusId) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateWorkflowOfBugs}/${bugId}`,
        body: { bug_status: statusId },
      });
      if (response?.data?.status) {
        getIssuedata(taskId);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getBugWorkflowStatuses = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getBugWorkFlowStatus,
      });
      if (response?.data?.status) {
        setBugWorkflowStatuses(response.data.data || []);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const addissue = async () => {
    if (!issuetitle?.trim()) {
      return false;
    }

    dispatch(showAuthLoader());
    try {
      let reqBody = {
        project_id: selectedTask?.project?._id || projectId,
        title: issuetitle.trim(),
        task_id: taskId,
        bugId: newBugData.bugId || undefined,
        createdBy: newBugData.createdBy || undefined,
        createdAt: newBugData.createdAt || undefined,
        assignees: newBugData.assignees || [],
        due_date: newBugData.due_date || null,
        ...(newBugData.bug_status ? { bug_status: newBugData.bug_status } : {}),
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addBug,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        getIssuedata(taskId);
        setIssuetitle("");
        setIssuetitleflag(false);
        setNewBugData({
          bugId: "",
          bug_status: undefined,
          createdBy: undefined,
          createdAt: null,
          assignees: [],
          due_date: null,
        });
        dispatch(hideAuthLoader());
        return true;
      } else {
        message.error(response.data.message);
        dispatch(hideAuthLoader());
        return false;
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
      return false;
    }
  };

  const getTimeLogged = async (taskId,empFilter) => {
    dispatch(showAuthLoader());
    try {
      let reqBody = {
        project_id: selectedTask?.project?._id,
        task_id: taskId,
      };
      if(empFilter){
        reqBody.employee_id = empFilter
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskLoggedHours,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      const dataWithKeys = response?.data?.data.map((item, index) => ({
        ...item,
        key: index.toString(),
      }));
      setColumnDetails(dataWithKeys);
    } catch (error) {
      console.log(error);
    }
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

  const handlePasteEditdescription = (event, editor) => {
    const pastedData = (event.clipboardData || window.clipboardData).getData(
      "text"
    );
    const newData = pastedData.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank">$1</a>'
    );
    editor.setData(newData);
  };

  const handleChangedescription = (event, editor) => {
    const data = editor.getData();
    setEditorData(data);
  };

  const handleChangeEditdescription = (e, editor) => {
    const data = editor.getData();
    setEditorEditdesc(data);
    handleViewTask("descriptions", data);
  };

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
        task_id: taskId,
        timesheet_id: values?.workflow_id,
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
        //Send Notification to user for logged Hours into Task or bugs:
        await emitEvent(socketEvents.ADD_TASK_LOGGED_HOURS, response.data.data);
        message.success(response.data.message);
        addform.resetFields();
        setEstHrs("");
        setEstMins("");
        setEditorData("");
        getTaskByIdDetails(taskId);
        getBoardTasks(taskDetails?.mainTask?._id);
        setIsModalOpenTaskModal(false);
        setIsEditable((prevState) => ({ ...prevState, estimated_time: false }));
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      // dispatch(hideAuthLoader());
      console.log(error);
    }
  };
  const getDetailsClientSubs = async (projectId, taskId, isDropdown) => {
    try {
      const reqBody = {
        project_id: projectId,
        main_task_id: selectedTask._id,
        _id: taskId,
        isDropdown: isDropdown,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTasks,
        body: reqBody,
      });
      if (response?.data && response?.data?.data) {
        setDetailsClientSubs(response.data.data);
        setInitialDetails(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getTaskByIdDetails = async (taskId, editType, refresh) => {
    try {
      const override =
        editType && typeof editType === "object" ? editType : null;
      const projectIdForReq =
        override?.projectId ||
        projectId ||
        taskDetails?.project?._id ||
        taskDetails?.project_id ||
        taskDetails?.projectId ||
        selectedTask?.project?._id ||
        selectedTask?.project_id ||
        selectedTask?.projectId ||
        selectedTask?.project?._id;
      const mainTaskIdForReq =
        override?.mainTaskId ||
        listID ||
        taskDetails?.mainTask?._id ||
        taskDetails?.main_task_id ||
        taskDetails?.mainTaskId ||
        selectedTask?._id ||
        selectedTask?.main_task_id ||
        selectedTask?.mainTaskId;

      if (!projectIdForReq || !mainTaskIdForReq || !taskId) {
        message.error("Unable to open task details (missing context).");
        return;
      }
      const reqBody = {
        project_id: projectIdForReq,
        main_task_id: mainTaskIdForReq,
        _id: taskId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTasks,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setTaskDetails(response.data.data);
        setFileViewAttachment(response.data.data.attachments);
        setViewTask(response.data.data);
        setSelectedTaskStatusTitle(response.data.data.task_status?.title);

        setTaskId(response.data.data._id);
        if (refresh) return;
        setModalIsOpen(true);

        getIssuedata(response.data.data._id);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateTaskWorkflowStats = async (workFlowStatusId, taskId) => {
    const targetStatus =
      (projectWorkflowStage || []).find((item) => item?._id === workFlowStatusId) ||
      (tasks || []).find((column) => column?.workflowStatus?._id === workFlowStatusId)?.workflowStatus ||
      null;

    moveBoardTaskLocally?.(taskId, workFlowStatusId, targetStatus || {});

    try {
      const reqBody = {
        task_status: workFlowStatusId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.taskUpdateWorkFlow}/${taskId}`,
        body: reqBody,
      });

      if (response?.data?.data && response?.data?.status) {
        const updatedTask = response.data.data;
        updateBoardTaskLocally?.({
          ...updatedTask,
          _stId:
            updatedTask?._stId ||
            updatedTask?.task_status?._id ||
            workFlowStatusId,
        });
        if (isPopoverVisible) {
          getTaskByIdDetails(taskId);
        }
        refreshProjectMainTasks?.({ suppressBoardReload: true });
      } else {
        const currentListId = selectedTask?._id;
        if (currentListId) {
          getBoardTasks(currentListId, { silent: true });
        }
        message.error(response?.data?.message || "Failed to update task status");
      }
    } catch (error) {
      const currentListId = selectedTask?._id;
      if (currentListId) {
        getBoardTasks(currentListId, { silent: true });
      }
      message.error(error?.response?.data?.message || "Failed to update task status");
      console.log(error);
    }
  };

  const handleTaskStatusClick = (workFlowStatusId, taskId) => {
    const selectedStatus = projectWorkflowStage.find(
      (item) => item._id === workFlowStatusId
    );
    setSelectedTaskStatusTitle(selectedStatus ? selectedStatus.title : null);
    updateTaskWorkflowStats(workFlowStatusId, taskId);
    setIsPopoverVisible(false); // Close the popover after clicking
  };

  const onChange = (date, dateString) => {
    console.log(date, dateString);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    if (taskID) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete("taskID", taskID);

      history.push({
        pathname: window.location.pathname,
        search: searchParams.toString(),
      });
    }
    setModalIsOpen(false);
    setIssuetitleflag(false);
    setIssuetitle("");
    setNewBugData({
      bugId: "",
      bug_status: undefined,
      createdBy: undefined,
      createdAt: null,
      assignees: [],
      due_date: null,
    });
    handleTabChange("comments");
    setShowTaskHistory(false);
    setTextAreaValue("");
    setTaggedUser([]);
    setIsTextAreaFocused(false);
    setfileAttachment([]);
    formComment.resetFields();
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const handleToggle = (item) => {
    if (storeIndex === item._id) {
      setIndex("");
      setShowTaskHistory(false);
    } else {
      // If another item is clicked, open it
      setIndex(item._id);
      setShowTaskHistory(true);
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
    const currentTarget = evt.currentTarget;
    const newTarget = evt.relatedTarget;
    if (!newTarget || newTarget.parentNode === currentTarget || newTarget === currentTarget)
      return;
    evt.preventDefault();
    const element = evt.currentTarget;
    element.classList.remove("dragged-over");
  };

  const onDragOver = (evt) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "move";
  };

  const onDrop = (evt, status) => {
    evt.preventDefault();
    evt.currentTarget.classList.remove("dragged-over");
    const data = evt.dataTransfer.getData("text/plain");
    updateTaskWorkflowStats(status, data);
  };

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

  const activeClass2 = () => {
    if (activeTab === "issue") {
      return "active";
    } else {
      return "";
    }
  };

  const deleteComment = async (id) => {
    try {
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteTaskComments + params,
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

  const handleEditComment = async (taskId) => {
    try {
      const reqBody = {
        comment_id: taskId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskHistorycomments,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setCommentsedit(response.data.data);
        setTextAreaValue(response.data.data.comment);
        setIsTextAreaFocused(true);
        // const editedComment = UtilFunctions.revertLinks(
        //   response.data.data.comment
        // );
        setCommentVal(response.data.data.comment);
        setPopulatedFiles(response.data.data.attachments);
        formComment.setFieldsValue({
          comment: response.data.data.comment,
        });
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

  const onFileViewChange = async (event) => {
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
    const uploadedfile = await uploadFiles(newFiles, "task");
    if (uploadedfile && uploadedfile.length > 0) {
      // Optimistically update local view attachments so UI reflects immediately
      setFileViewAttachment((prev) => [...prev, ...uploadedfile]);
    }
    updateviewTask({ ...viewTask }, uploadedfile);
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
      // Optimistically remove from local arrays so UI updates immediately
      setFileViewAttachment((prev) => prev.filter((f) => f._id !== file._id));
      setPopulatedViewFiles((prev) => prev.filter((f) => f._id !== file._id));
      deleteUploadedFiles([file._id], "task");
      getBoardTasks(taskDetails?.mainTask?._id);
    } else {
      // In case of newly added but not yet persisted items without _id
      setFileViewAttachment((prev) => prev.filter((_, i) => i !== index));
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

  const handleComments = async (values, updateType,commentTxt) => {
    if (values.uploadedFiles1.length > 0) {
      updateType = handleUpdateComment(values, values.uploadedFiles1,commentTxt);
      return;
    } else {
      handleUpdateComment(values,[],commentTxt);
    }
  };

  const handleUpdateComment = async (values, uploadedFiles,commentTxt) => {
    if (deleteFileData.length > 0) {
      deleteUploadedFiles(deleteFileData, "comment");
    }
    try {
      let reqBody = {
        comment: commentTxt,
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
        api_url: Service.editTaskComments + params,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        //Send Notification to Mention Users:
        await emitEvent(socketEvents.EDIT_TASK_COMMENTS_TAGGED_USERS, {
          _id: commentsedit._id,
          taggedUsers: values.taggedUser,
        });
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
    getComment(taskDetails?._id);
  };

  const getComment = async (taskID) => {
    try {
      const reqBody = {
        task_id: taskID,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.listTaskComments,
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

  const addComments = async (id, taggedUser, folderId, attachments,commentTxt) => {
    try {
      const reqBody = {
        task_id: id,
        taggedUsers: taggedUser,
        comment: commentTxt,
        attachments: attachments,
      };
      if (folderId) {
        reqBody.folder_id = folderId;
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addTaskComments,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        await emitEvent(
          socketEvents.ADD_TASK_COMMENTS_TAGGED_USERS,
          response.data.data
        );
        setTextAreaValue("");
      
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
    getComment(id);
  };

  const handleTaskDelete = (id) => {
    handleCancel();
    deleteTasks(id);
    setSelectedTaskId(null);
    if (taskID) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete("taskID", taskID);

      history.push({
        pathname: window.location.pathname,
        search: searchParams.toString(),
      });
    }
  };

  const popOver = () => {
    setIsModalOpenTaskModal(true);
    setVisible(false);
    setIsEditable((prevState) => ({ ...prevState, estimated_time: false }));
  };
  const popOverTimeLogged = () => {
    setVisibleTime(true);
    setVisible(false);
  };

  const openPopOver = (visible) => {
    setVisible(visible);
  };
  const handleDropdownClick = (e) => {
    e.stopPropagation();
  };

  const getTaskhistory = async () => {
    try {
      const reqBody = {
        task_id: taskId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTaskHistory,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setTaskHistory(response?.data?.data);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSelect = (option) => {
    setTaggedUser((prevIds) => [...new Set([...prevIds, option.key])]);
  };

  //copy Task link
  const handleCopyTaskLink = (taskId) => {
    const projID = projectId;
    const task = taskId;
    const taskLink = `${process.env.REACT_APP_URL}project/app/${projID}?tab=Tasks&listID=${selectedTask?._id}&taskID=${task}`;

    navigator.clipboard
      .writeText(taskLink)
      .then(() => {
        message.info("Copied to clipboard");
      })
      .catch((error) => {
        console.error("Error copying task link: ", error);
      });
  };

  const handleCancelCommentModel = () => {
    setOpenCommentModle(false);
    setTextAreaValue("");
    setTaggedUser([]);
    setIsTextAreaFocused(false);
    setfileAttachment([]);
    formComment.resetFields();
  };

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
        getTimeLogged(taskId)
        getTaskByIdDetails(taskId);
        getBoardTasks(selectedTask?._id);

      
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  useEffect(() => {
    if (modalIsOpen && taskId) {
      getTaskByIdDetails(taskId, null, true);
    } else if (taskID) {
      getTaskByIdDetails(taskID, null, false);
      getComment(taskID);
    }
  }, [tasks]);

  useEffect(() => {
    if (isCopyModalOpen && taskId) {
      getTaskByIdDetails(taskId, null, true);
    }
  }, [tasks]);

  useEffect(() => {
    if (taskID || tasks.length > 0) {
      const dynamicDiv = document.getElementById(`title-${taskID}`);
      if (dynamicDiv) {
        dynamicDiv.click();
      }
    }
  }, [taskID, tasks]);

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
      setViewTask((prevTaskDetails) => ({
        ...prevTaskDetails,
        estimated_minutes: mins,
      }));
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

  const handleEstTimeViewInput = (name, value) => {
    if (name === "est_hrs") {
      const hrs = parseInt(value);
      if (isNaN(hrs) || hrs < 0) {
        setEstHrsError("Time should be greater than or equal to 0");
      } else {
        setEstHrsError("");
        setViewTask((prevTaskDetails) => ({
          ...prevTaskDetails,
          estimated_hours: hrs,
        }));
        console.log(hrs, "hrshrs");
        updateviewTask({ ...viewTask, estimated_hours: hrs });
      }
      if (hrs === 0 && parseInt(viewTask.estimated_minutes) === 0) {
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
        setViewTask((prevTaskDetails) => ({
          ...prevTaskDetails,
          estimated_minutes: mins,
        }));
        updateviewTask({ ...viewTask, estimated_minutes: mins });
      }
      if (mins === 0 && parseInt(viewTask.estimated_hours || 0, 10) === 0) {
        setEstMinsError("Enter a non-zero value for minutes");
        setEstHrsError("Enter a non-zero value for hours");
      }
    }
  };

  const getProjectByID = async () => {
    try {
      const reqBody = {
        _id: projectId,
      };
      let Key = generateCacheKey("project", reqBody);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: {
          cachekey: Key,
        },
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setProjectTitle(response.data.data?.title);
        setStagesId(response.data.data?.workFlow?._id);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };
  
  const getMainTask = async () => {
    try {
      dispatch(showAuthLoader());
      let params = `/${projectId}`;
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getMainTaskData + params,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setMainTask(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const addCopyOfTask = async () => {
    dispatch(showAuthLoader());
    try {
      let reqBody = {
        title: copyFormData.title
          ? copyFormData.title
          : `Copy Of ${taskDetails?.title}`,
        task_id: taskDetails?._id,
        project_id: projectId,
        main_task_id: copyFormData.task_id
          ? copyFormData.task_id
          : taskDetails?.mainTask?._id,
        task_status: copyFormData.task_status
          ? copyFormData.task_status
          : taskDetails?.task_status?._id,
        isCopyAssignee: copyFormData.isCopyAssignee,
        isCopyClients: copyFormData.isCopyClients,
        isCopyDates: copyFormData.isCopyDates,
        isCopyComments: copyFormData.isCopyComments,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectTaskCopy,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response.data?.status) {
        message.success(response.data.message);
        setIsCopyModalOpen(false);
        getBoardTasks(taskDetails?.mainTask?._id);
        getProjectMianTask(taskID, true);
        copyform.setFieldsValue({
          title: "",
          project_id: "",
          task_id: "",
          task_status: "",
          assignee: true,
          client: true,
          dates: true,
          comments: true,
        });
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const handleChange = (name, value) => {
    setDetailsClientSubs({ ...detailClientSubs, [name]: value });
  };

  const handleSearch = (searchValue) => {
    setSearchKeyword(searchValue);
  };

  const handleSelectedItemsChange = (selectedItemIds) => {
    const updatedAssignees = assigneeOptions.filter((item) =>
      selectedItemIds.includes(item._id)
    );
    setViewTask((prevTaskDetails) => ({
      ...prevTaskDetails,
      assignees: updatedAssignees,
    }));
    setSearchKeyword("");
    updateviewTask({ ...viewTask, assignees: updatedAssignees });
  };

  const handleSelectedLabelsChange = (selectedLabelIds) => {
    const updatedLabels = projectLabels.filter((item) =>
      selectedLabelIds.includes(item._id)
    );
    setViewTask((prevTaskDetails) => ({
      ...prevTaskDetails,
      taskLabels: updatedLabels,
    }));
    updateviewTask({ ...viewTask, taskLabels: updatedLabels });
  };

  const handleViewEdit = (values) => {
    if (!values?._id) return;
    setModalIsOpen(true);
    setViewTask(values);
    setTaskId(values._id);
    getIssuedata(values._id);
  };

  const commentListRef = useRef(null);

  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments]);

  return {
    dragged,
    onDragLeave,
    onDragEnter,
    onDragEnd,
    onDragOver,
    onDrop,
    showTextArea,
    setShowTextArea,
    onDragStart,
    getTaskByIdDetails,
    getTimeLogged,
    getComment,
    modalIsOpen,
    handleCancel,
    taskDetails,
    handleTaskDelete,
    estError,
    visible,
    popOver,
    popOverTimeLogged,
    openPopOver,
    isLoggedHoursMoreThanEstimated,
    textAreaValue,
    subscribersList,
    assigneeOptions,
    taggedUserList,
    activeClass,
    activeClass1,
    activeClass2,
    activeTab,
    comments,
    setOpenCommentModle,
    handleEditComment,
    deleteComment,
    handleDropdownClick,
    // resolveComment,
    addComments,
    isTextAreaFocused,
    setIsTextAreaFocused,
    taskHistory,
    handleToggle,
    storeIndex,
    showTaskHistory,
    isModalOpenTaskModal,
    isVisibleTime,
    handleCancelTaskModal,
    addform,
    handleTaskOps,
    taskdropdown,
    addInputTaskData,
    handleTaskInput,
    handleEstTimeInput,
    openCommentModel,
    handleCancelCommentModel,
    formComment,
    handleComments,
    commentVal,
    setCommentVal,
    handleSelect,
    fileAttachment,
    populatedFiles,
    removeAttachmentFile,
    attachmentfileRef,
    attachmentViewfileRef,
    foldersList,
    onFileChange,
    onChange,
    handleTabChange,
    getTaskhistory,
    Option,
    setTempBoard,
    tempBoard,
    setIssuetitle,
    issuetitle,
    newBugData,
    setNewBugData,
    issuedata,
    setIssuedata,
    setIssuetitleflag,
    issuetitleflag,
    handleissuedata,
    addissue,
    deleteBug,
    editBug,
    updateBugWorkflow,
    bugWorkflowStatuses,
    removeHTMLTags,
    projectWorkflowStage,
    isPopoverVisible,
    setIsPopoverVisible,
    handleTaskStatusClick,
    taskId,
    projectId,
    estHrsError,
    estMinsError,
    estHrs,
    estMins,
    selectedTaskStatusTitle,
    copyform,
    isCopyModalOpen,
    handleCancelCopyModal,
    handleOkCopyModal,
    setIsCopyModalOpen,
    projectTitle,
    mainTask,
    setModalIsOpen,
    addCopyOfTask,
    copyFormData,
    setCopyFormData,
    listID,
    handleDelete,
    isModalVisible,
    setIsModalVisible,
    editTaskform,
    setManagePeople,
    ManagePeople,
    projectLabels,
    editModalDescription,
    handleChnageDescription,
    handleCopyTaskLink,
    clientsList,
    detailClientSubs,
    getDetailsClientSubs,
    handleChange,
    managePeopleForm,
    handleManagePeople,
    setTaskId,
    columnDetails,
    setVisibleTime,
    expandedRowKey,
    setExpandedRowKey,
    currDate,
    history,
    setSelectedTaskId,
    commentListRef,
    handleChangedescription,
    editorData,
    handlePaste,
    handleCancelManagePeople,
    setDetailsClientSubs,
    isEditable,
    setIsEditable,
    handleSearch,
    searchKeyword,
    handleSelectedItemsChange,
    selectedItems,
    viewEdit,
    handleViewEdit,
    viewTask,
    setViewTask,
    handleViewTask,
    updateviewTask,
    handleFieldClick,
    editorDataEditdesc,
    handlePasteEditdescription,
    handleChangeEditdescription,
    handleSelectedLabelsChange,
    handleEstTimeViewInput,
    editViewModalDescription,
    removeAttachmentViewFile,
    populatedViewFiles,
    fileViewAttachment,
    onFileViewChange,
    setDeleteFileData,
    deleteFileData,
    populatedFiles,
    setPopulatedFiles,
    setfileAttachment,
    moveSelectedTaskLists,
    setMoveSelectedTaskLists,
    deleteTime,
    setTextAreaValue
  };
};

export default TaskKanbanController;
