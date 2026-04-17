/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, eqeqeq, jsx-a11y/anchor-is-valid, no-useless-concat */



import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  PlusOutlined,
  PaperClipOutlined,
  TagOutlined,
  UserAddOutlined,
  CalendarOutlined,
  MoreOutlined,
  DeleteOutlined,
  RightOutlined,
  EditOutlined,
  DownOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  LinkOutlined,
  FieldTimeOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import PropTypes from "prop-types";
import {
  Avatar,
  Button,
  Input,
  Modal,
  Dropdown,
  DatePicker,
  Menu,
  Select,
  Popover,
  Form,
  Badge,
  Popconfirm,
  Checkbox,
  Tooltip,
  message,
  Image,
} from "antd";
import dayjs from "dayjs";
import "../style.css";
import "../../TaskPage/TaskDetailModal.css";
import TaskDetailModal from "../../TaskPage/TaskDetailModal";
import moment from "moment";
import AddComment from "../../../ReuseComponent/AddComment/AddComment";
import { fileImageSelect } from "../../../util/FIleSelection";
import TaskKanbanController from "./TaskKanbanController";
import { getRoles, hasPermission } from "../../../util/hasPermission";
import { Link, useLocation } from "react-router-dom";
import useUserColors from "../../../hooks/customColor";
import { isCreatedBy } from "../../../util/isCreatedBy";
import { calculateTimeDifference } from "../../../util/formatTimeDifference";
import { removeTitle } from "../../../util/nameFilter";
import MyAvatarGroup from "../../../components/AvatarGroup/MyAvatarGroup";
import MyAvatar from "../../../components/Avatar/MyAvatar";
import AddTimeModal from "../../../components/Modal/AddTimeModal";
import LoggedTimeDetail from "../../../components/Modal/LoggedTimeDetail";
import ManagePeopleModal from "../../../components/Modal/ManagePeopleModal";
import EditCommentModal from "../../../components/Modal/EditCommentModal";
import MultiSelect from "../../../components/CustomSelect/MultiSelect";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import textColorPicker from "../../../util/textColorPicker";
import { setData } from "../../../appRedux/reducers/ApiData";
import { useDispatch, useSelector } from "react-redux";
import { moveWorkFlowTaskHandler } from "../../../appRedux/actions/Common";
import { isEqual } from "lodash";
import Service from "../../../service";
import queryString from "query-string";

const TaskList = ({
  tasks,
  showModalTaskModal,
  showEditTaskModal,
  selectedTask,
  deleteTasks,
  getProjectMianTask,
  getBoardTasks,
  updateTasks,
  updateTaskDraftStatus,
  updateBoardTaskLocally,
  moveBoardTaskLocally,
  refreshProjectMainTasks,
  projectDetails,
  isEditTaskSave,
  setEditTaskSave,
  onStageRename,
  onStageReorder,
  canEditStage,
}) => {
  console.log("🚀 ~ TaskList ~ isEditTaskSave:", isEditTaskSave)
  const companySlug = localStorage.getItem("companyDomain");
  const {
    dragged,
    onDragLeave,
    onDragEnter,
    onDragEnd,
    onDragOver,
    onDrop,
    showTextArea,
    setShowTextArea,
    onDragStart,
    shouldIgnoreTaskClick,
    getTaskByIdDetails,
    getTimeLogged,
    getComment,
    comments,
    handleCancelCommentModel,
    formComment,
    handleComments,
    commentVal,
    setCommentVal,
    handleSelect,
    setIsTextAreaFocused,
    modalIsOpen,
    handleCancel,
    taskDetails,
    viewTask,
    setViewTask,
    handleTaskDelete,
    estError,
    visible,
    popOver,
    popOverTimeLogged,
    openPopOver,
    isLoggedHoursMoreThanEstimated,
    subscribersList,
    assigneeOptions,
    taggedUserList,
    setOpenCommentModle,
    isModalOpenTaskModal,
    handleCancelTaskModal,
    addform,
    handleTaskOps,
    taskdropdown,
    addInputTaskData,
    handleTaskInput,
    handleViewTask,
    handleEstTimeInput,
    fileAttachment,
    removeAttachmentFile,
    attachmentfileRef,
    foldersList,
    onFileChange,
    onChange,
    handleTabChange,
    getTaskhistory,
    Option,
    setTempBoard,
    tempBoard,
    projectWorkflowStage,
    isPopoverVisible,
    setIsPopoverVisible,
    handleTaskStatusClick,
    taskId,
    projectId,
    setIssuetitle,
    issuetitle,
    newBugData,
    setNewBugData,
    setIssuetitleflag,
    issuetitleflag,
    handleissuedata,
    addissue,
    issuedata,
    deleteBug,
    editBug,
    updateBugWorkflow,
    bugWorkflowStatuses,
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
    addCopyOfTask,
    copyFormData,
    setCopyFormData,
    handleDelete,
    setManagePeople,
    ManagePeople,
    handleCopyTaskLink,
    clientsList,
    detailClientSubs,
    getDetailsClientSubs,
    handleChange,
    managePeopleForm,
    handleManagePeople,
    setTaskId,
    isVisibleTime,
    setVisibleTime,
    columnDetails,
    expandedRowKey,
    setExpandedRowKey,
    currDate,
    setSelectedTaskId,
    commentListRef,
    handleChangedescription,
    editorData,
    handlePaste,
    handleCancelManagePeople,
    setDetailsClientSubs,
    isEditable,
    setIsEditable,
    projectLabels,
    handleSearch,
    searchKeyword,
    handleSelectedItemsChange,
    viewEdit,
    handleViewEdit,
    handleFieldClick,
    handleSelectedLabelsChange,
    handleEstTimeViewInput,
    editViewModalDescription,
    removeAttachmentViewFile,
    populatedViewFiles,
    fileViewAttachment,
    onFileViewChange,
    attachmentViewfileRef,
    setDeleteFileData,
    deleteFileData,
    populatedFiles,
    setPopulatedFiles,
    deleteTime,
    setTextAreaValue,
    updateviewTask,
  } = TaskKanbanController({
    tasks,
    showModalTaskModal,
    showEditTaskModal,
    selectedTask,
    deleteTasks,
    getProjectMianTask,
    getBoardTasks,
    updateTasks,
    updateBoardTaskLocally,
    moveBoardTaskLocally,
    refreshProjectMainTasks,
  });
  const userData = JSON.parse(localStorage.getItem("user_data"));
  const roleName = userData.pms_role_id.role_name;
  const location = useLocation();

  let { listID } = queryString.parse(location.search);


  const dispatch = useDispatch();
  const observers = useRef({});
  const userColors = useUserColors(comments);

  const { task_ids } = useSelector(({ common }) => common);

  const [editorInstance, setEditorInstance] = useState(null);
  const [sliceStates, setSliceStates] = useState(6);
  const [taskDrafts, setTaskDrafts] = useState({});

  const [timerUpdateKey, setTimerUpdateKey] = useState(0);
  const [timerState, setTimerState] = useState({
    isRunning: false,
    elapsedTime: 0,
    isPopoverVisible: false,
    currentTaskId: null,
    isTimeExceeded: false
  });

  const [editingBugId, setEditingBugId] = useState(null);
  const [editingBugTitle, setEditingBugTitle] = useState("");
  const [editingBugCode, setEditingBugCode] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStageId, setEditingStageId] = useState(null);
  const [editingStageTitle, setEditingStageTitle] = useState("");
  const [draggingStageId, setDraggingStageId] = useState(null);

  // Reset edit mode when drawer opens for a new task
  useEffect(() => {
    if (modalIsOpen) {
      setIsEditMode(false);
      setEditingBugId(null);
    }
  }, [modalIsOpen, taskDetails?._id]);

  // Use a more optimized global state that doesn't cause re-renders
  const globalTimerRef = useRef({
    activeTaskId: null,
    timers: {},
    intervals: {} // Store intervals separately
  });


  // Optimized format time function
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };






  // Get timer display info for current task
  const getTimerDisplayInfo = () => {
    const currentTaskId = taskDetails?._id;
    const taskTimer = globalTimerRef.current.timers[currentTaskId];
    // Use only this task's stored elapsed time; do not fall back to shared timerState
    const elapsedTime = typeof taskTimer?.elapsedTime === 'number' ? taskTimer.elapsedTime : 0;
    const isActive = globalTimerRef.current.activeTaskId === currentTaskId;
    const estimatedSeconds = getEstimatedTimeInSeconds(taskDetails);
    const isNearLimit = estimatedSeconds > 0 && elapsedTime >= (estimatedSeconds * 0.9);
    const isExceeded = isEstimatedTimeExceeded(elapsedTime, taskDetails);

    // console.log(taskTimer,"taskTimer",currentTaskId)
    // console.log(currentTaskId,"currentTaskId")
    return {
      timeString: formatTime(elapsedTime),
      isActive,
      isNearLimit,
      isExceeded,
      canStart: shouldShowTimer(taskDetails) && !isActive,
      canStop: isActive
    };
  };

  // Optimized useEffect - only updates when the specific task changes, not on every timer tick
  useEffect(() => {
    const currentTaskId = taskDetails?._id;
    if (currentTaskId) {
      const taskTimer = globalTimerRef.current.timers[currentTaskId];
      const isActive = globalTimerRef.current.activeTaskId === currentTaskId;
      console.log("🚀 ~ TaskList ~ globalTimerRef:", isActive, taskTimer, currentTaskId)

      if (taskTimer && isActive) {
        setTimerState(prev => ({
          ...prev,
          isRunning: taskTimer?.isRunning || false,
          elapsedTime: taskTimer?.elapsedTime || 0,
          currentTaskId: isActive ? currentTaskId : null,
          isTimeExceeded: isEstimatedTimeExceeded(taskTimer?.elapsedTime || 0, taskDetails)
        }));
      } else {
        setTimerState(prev => ({
          ...prev,
          isRunning: false,
          elapsedTime: 0,
          currentTaskId: null,
          isTimeExceeded: false
        }));
      }
    }
  }, [taskDetails?._id, timerUpdateKey]); // Only depend on task ID change, not timer state

  // Cleanup function
  useEffect(() => {
    return () => {
      // Clean up all intervals when component unmounts
      Object.values(globalTimerRef.current.intervals).forEach(interval => {
        clearInterval(interval);
      });
      globalTimerRef.current.intervals = {};
    };
  }, []);

  // Fetch timer state when component mounts or task changes
  useEffect(() => {
    if (taskDetails?._id) {
      fetchTimerState(taskDetails._id);
    }
  }, [taskDetails?._id]);

  useEffect(() => {
    if (isEditTaskSave) {
      console.log("🚀 ~ getTaskByIdDetails ~ selectedTask:", selectedTask)
      getTaskByIdDetails(taskDetails?._id)
      setEditTaskSave(false);
    }
  }, [isEditTaskSave, taskDetails?._id])

  // Fetch timer states for all tasks when tasks are loaded
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      // Get all task IDs from all boards
      const allTaskIds = tasks.flatMap(boardData =>
        boardData.tasks.map(task => task._id)
      );

      // Fetch timer state for each task (with debouncing to prevent too many API calls)
      const fetchPromises = allTaskIds.map(taskId =>
        new Promise(resolve => {
          setTimeout(() => {
            fetchTimerState(taskId);
            resolve();
          }, Math.random() * 100); // Small random delay to spread API calls
        })
      );

      Promise.all(fetchPromises).then(() => {
        console.log('All timer states fetched successfully');
      });
    }
  }, [tasks]);

  // Handle page visibility changes to refresh timer states
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && taskDetails?._id) {
        // Page became visible, refresh timer state for current task
        fetchTimerState(taskDetails._id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [taskDetails?._id]);


  /// neww 

  // Enhanced timer functions with improved logic for task status management

  // Helper function to check if task is in "In Progress" status (enhanced)
  const isTaskInProgress = (task) => {
    if (!task?.task_status?.title) return false;
    const statusTitle = task.task_status.title.toLowerCase().replace(/\s+/g, '');
    return statusTitle === 'inprogress' || statusTitle === 'progress' || statusTitle === 'in progress' || statusTitle === "In Progress"
      ;
  };

  // Helper function to convert estimated time to seconds
  const getEstimatedTimeInSeconds = (task) => {
    const hours = parseInt(task?.estimated_hours || 0);
    const minutes = parseInt(task?.estimated_minutes || 0);
    return (hours * 3600) + (minutes * 60);
  };

  // Helper function to check if estimated time is exceeded
  const isEstimatedTimeExceeded = (elapsedSeconds, task) => {
    const estimatedSeconds = getEstimatedTimeInSeconds(task);
    return estimatedSeconds > 0 && elapsedSeconds >= estimatedSeconds;
  };

  // Enhanced start timer function
  const startTimer = async (taskId = taskDetails?._id) => {
    // First, find the task object to check its status
    const currentTask = tasks.find(boardData =>
      boardData.tasks.find(task => task._id === taskId)
    )?.tasks.find(task => task._id === taskId) || taskDetails;

    console.log(isTaskInProgress(taskDetails), "currentTaskcurrentTask")

    // Check if task is in "In Progress" status
    if (!isTaskInProgress(taskDetails)) {
      console.log('Timer can only be started for tasks in "In Progress" status');
      // Optional: Show user notification
      // notification.warning({
      //   message: 'Timer Unavailable',
      //   description: 'Timer can only be started for tasks in "In Progress" status',
      // });
      return;
    }

    // Check if estimated time is already exceeded
    // const currentElapsed = globalTimerRef.current.timers[taskId]?.elapsedTime || 0;
    // if (isEstimatedTimeExceeded(currentElapsed, currentTask)) {
    //   console.log('Cannot start timer: Estimated time already exceeded');
    //   return;
    // }

    // Check if there's already a running timer for a different task
    if (globalTimerRef.current.activeTaskId && globalTimerRef.current.activeTaskId !== taskId) {
      const runningTaskId = globalTimerRef.current.activeTaskId;
      console.log(`Stopping timer for task ${runningTaskId} to start timer for task ${taskId}`);

      // Stop the currently running timer
      await stopTimer(runningTaskId, false);

      // Optional: Show user notification about timer switching
      // notification.info({
      //   message: 'Timer Switched',
      //   description: 'Previous task timer stopped. Starting timer for current task.',
      // });
    }

    try {
      // Call API to start timer
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.startTaskTimer,
        body: { task_id: taskId }
      });

      if (response?.data?.status) {
        console.log('Timer started successfully via API');

        // Initialize timer data if doesn't exist
        if (!globalTimerRef.current.timers[taskId]) {
          globalTimerRef.current.timers[taskId] = {
            elapsedTime: 0,
            isRunning: false,
            startTime: null
          };
        }

        // Start new timer
        const currentElapsedTime = globalTimerRef.current.timers[taskId].elapsedTime || 0;
        const startTime = Date.now() - (currentElapsedTime * 1000);

        globalTimerRef.current.activeTaskId = taskId;
        globalTimerRef.current.timers[taskId] = {
          ...globalTimerRef.current.timers[taskId],
          isRunning: true,
          startTime: startTime
        };

        // Update local state only for current task
        if (taskId === taskDetails?._id) {
          setTimerState(prev => ({
            ...prev,
            isRunning: true,
            isPopoverVisible: false,
            currentTaskId: taskId,
            elapsedTime: currentElapsedTime
          }));
        }

        // Clear any existing interval for this task
        if (globalTimerRef.current.intervals[taskId]) {
          clearInterval(globalTimerRef.current.intervals[taskId]);
        }

        // Start interval for the active task
        globalTimerRef.current.intervals[taskId] = setInterval(() => {
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);

          // Update timer data
          globalTimerRef.current.timers[taskId].elapsedTime = elapsed;
          setTimerUpdateKey(k => k + 1);

          // Update local state only if this is the current task being viewed
          if (taskId === taskDetails?._id) {
            console.log("🚀 ~ startTimer ~ taskId === taskDetails?._id:", taskId === taskDetails?._id, taskId, taskDetails?._id)
            setTimerState(prev => ({
              ...prev,
              elapsedTime: elapsed,
              isTimeExceeded: isEstimatedTimeExceeded(elapsed, currentTask)
            }));
          }

          // Auto-stop if estimated time is exceeded (disabled to allow overtime)
          // if (isEstimatedTimeExceeded(elapsed, currentTask)) {
          //   stopTimer(taskId, true);
          // }
        }, 1000);
      } else {
        console.error('Failed to start timer via API:', response?.data?.message);
        // Optional: Show error notification
        // notification.error({
        //   message: 'Timer Start Failed',
        //   description: response?.data?.message || 'Failed to start timer',
        // });
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      // Optional: Show error notification
      // notification.error({
      //   message: 'Timer Start Error',
      //   description: 'An error occurred while starting the timer',
      // });
    }
  };

  // Enhanced stop timer function
  const stopTimer = async (taskId = taskDetails?._id, autoStopped = false) => {
    try {
      // Call API to stop timer
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.stopTaskTimer,
        body: { task_id: taskId }
      });

      if (response?.data?.status) {
        console.log('Timer stopped successfully via API');
        // getTaskByIdDetails(taskId);
        getBoardTasks(listID, taskId)
      } else {
        console.error('Failed to stop timer via API:', response?.data?.message);
        // Optional: Show error notification
        // notification.error({
        //   message: 'Timer Stop Failed',
        //   description: response?.data?.message || 'Failed to stop timer',
        // });
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
      // Optional: Show error notification
      // notification.error({
      //   message: 'Timer Stop Error',
      //   description: 'An error occurred while stopping the timer',
      // });
    }

    // Clear interval for this task
    if (globalTimerRef.current.intervals[taskId]) {
      clearInterval(globalTimerRef.current.intervals[taskId]);
      delete globalTimerRef.current.intervals[taskId];
    }

    // Update global state
    if (globalTimerRef.current.timers[taskId]) {
      globalTimerRef.current.timers[taskId].isRunning = false;
    }

    if (globalTimerRef.current.activeTaskId === taskId) {
      globalTimerRef.current.activeTaskId = null;
    }

    // Update local state only for current task
    if (taskId === taskDetails?._id) {
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        isPopoverVisible: autoStopped ? false : prev.isPopoverVisible,
        currentTaskId: null
      }));

      // Show notification if auto-stopped
      if (autoStopped) {
        console.log('Timer stopped automatically: Estimated time exceeded');
        // Optional: Show user notification
        // notification.warning({
        //   message: 'Timer Stopped',
        //   description: 'Timer stopped automatically as estimated time was exceeded',
        // });
      }
    }
  };

  const stopMultipleTimer = async (task_id, assignees) => {
    let user_ids = [];
    assignees.forEach(a => {
      user_ids.push(a._id);
    })
    let payload = {
      user_ids,
      task_id
    }
    const response = await Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: Service.stopMultiple,
      body: payload,
    })
    if (response.data?.data?.success_count == 1) {
      // message.success("State Updated and Timer Stopped Suuccessfully")
    }

  }

  // Function to fetch timer state from API
  const fetchTimerState = async (taskId) => {
    if (!taskId) return;

    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getTaskTimer}/${taskId}`
      });

      if (response?.data?.status && response?.data?.data) {
        const timerData = response.data.data;
        console.log('Timer state fetched from API:', timerData);

        const active = !!timerData?.active_timer?.is_active;
        const baseSeconds = Number(timerData?.total_time_spent?.total_seconds || 0);

        // Ensure timer object exists
        if (!globalTimerRef.current.timers[taskId]) {
          globalTimerRef.current.timers[taskId] = {
            elapsedTime: 0,
            isRunning: false,
            startTime: null,
            baseSeconds: 0
          };
        }

        if (active) {
          const startTime = new Date(timerData.active_timer.start_time).getTime();
          const now = Date.now();
          const activeElapsed = Math.max(0, Math.floor((now - startTime) / 1000));
          const elapsedTime = baseSeconds + activeElapsed;

          // Mark this task as active and running
          globalTimerRef.current.activeTaskId = taskId;
          globalTimerRef.current.timers[taskId] = {
            ...globalTimerRef.current.timers[taskId],
            isRunning: true,
            elapsedTime,
            startTime,
            baseSeconds
          };

          // Update local state if this is the current task
          if (taskId === taskDetails?._id) {
            setTimerState(prev => ({
              ...prev,
              isRunning: true,
              elapsedTime,
              currentTaskId: taskId
            }));
          }

          // Clear any existing interval for this task
          if (globalTimerRef.current.intervals[taskId]) {
            clearInterval(globalTimerRef.current.intervals[taskId]);
          }

          // Start interval to keep time ticking (base + active elapsed)
          globalTimerRef.current.intervals[taskId] = setInterval(() => {
            const tickNow = Date.now();
            const elapsed = baseSeconds + Math.max(0, Math.floor((tickNow - startTime) / 1000));

            globalTimerRef.current.timers[taskId].elapsedTime = elapsed;
            setTimerUpdateKey(k => k + 1);

            if (taskId === taskDetails?._id) {
              setTimerState(prev => ({
                ...prev,
                elapsedTime: elapsed
              }));
            }

            // if (isEstimatedTimeExceeded(elapsed, taskDetails)) {
            //   stopTimer(taskId, true);
            // }
          }, 1000);
        } else {
          // Not active: show accumulated total only
          if (globalTimerRef.current.intervals[taskId]) {
            clearInterval(globalTimerRef.current.intervals[taskId]);
            delete globalTimerRef.current.intervals[taskId];
          }

          globalTimerRef.current.timers[taskId].elapsedTime = baseSeconds;
          globalTimerRef.current.timers[taskId].isRunning = false;
          globalTimerRef.current.timers[taskId].startTime = null;
          globalTimerRef.current.timers[taskId].baseSeconds = baseSeconds;

          if (globalTimerRef.current.activeTaskId === taskId) {
            globalTimerRef.current.activeTaskId = null;
          }

          if (taskId === taskDetails?._id) {
            setTimerState(prev => ({
              ...prev,
              isRunning: false,
              elapsedTime: baseSeconds,
              currentTaskId: null
            }));
          }
        }
      } else {
        console.log('No timer data found for task:', taskId);
        // Initialize empty timer state
        if (!globalTimerRef.current.timers[taskId]) {
          globalTimerRef.current.timers[taskId] = {
            elapsedTime: 0,
            isRunning: false,
            startTime: null
          };
        }
      }
    } catch (error) {
      console.error('Error fetching timer state:', error);
      // Initialize empty timer state on error
      if (!globalTimerRef.current.timers[taskId]) {
        globalTimerRef.current.timers[taskId] = {
          elapsedTime: 0,
          isRunning: false,
          startTime: null
        };
      }
    }
  };

  // New function to handle task status change
  const handleTaskStatusChange = (taskId, newStatusId, newStatusTitle) => {
    // Check if the task had a running timer and new status is not "In Progress"
    const wasTimerRunning = globalTimerRef.current.activeTaskId === taskId;
    const isNewStatusInProgress = newStatusTitle?.toLowerCase().replace(/\s+/g, '') === 'inprogress' ||
      newStatusTitle?.toLowerCase().replace(/\s+/g, '') === 'progress' ||
      newStatusTitle?.toLowerCase().replace(/\s+/g, '') === 'in progress' ||
      newStatusTitle === "In Progress";
    console.log("🚀 ~ handleTaskStatusChange ~ isNewStatusInProgress:", isNewStatusInProgress)

    if (wasTimerRunning && !isNewStatusInProgress) {
      console.log(`Task status changed from "In Progress" to "${newStatusTitle}". Stopping timer.`);
      stopTimer(taskId, false);
    }
  };
  function getAssigneesByTaskId(taskLists, taskId) {
    for (const list of taskLists) {
      const task = list.tasks.find(t => t._id === taskId);
      if (task) {
        return task.assignees || [];
      }
    }
    return []; // not found
  }
  // Enhanced handleTaskStatusClick function
  const handleTaskStatusClickFor = (statusId, taskId) => {
    // Find the new status details
    const newStatus = projectWorkflowStage.find(stage => stage._id === statusId);
    // const taskData = tasks.find(t => t._id === taskId)
    if (newStatus) {
      const assignees = getAssigneesByTaskId(tasks, taskId)
      // Handle timer logic before updating status
      handleTaskStatusChange(taskId, statusId, newStatus.title, assignees);
      stopMultipleTimer(taskId, assignees)
      // Update the task status (your existing logic)
      // setSelectedTaskStatusTitle(newStatus.title);
      setIsPopoverVisible(false);

      // Call your existing API to update task status
      // updateTaskStatus(taskId, statusId);
    }
  };

  // Function to check if timer should be visible for current task
  const shouldShowTimer = (task) => {
    if (!isTaskInProgress(task)) {
      return false;
    }

    // const currentElapsed = globalTimerRef.current.timers[task?._id]?.elapsedTime || 0;
    // if (isEstimatedTimeExceeded(currentElapsed, task)) {
    //   return false;
    // }

    return true;
  };

  // Enhanced function to get all running timers (for debugging/monitoring)
  const getAllRunningTimers = () => {
    const runningTimers = [];
    Object.entries(globalTimerRef.current.timers).forEach(([taskId, timerData]) => {
      if (timerData.isRunning) {
        runningTimers.push({
          taskId,
          elapsedTime: timerData.elapsedTime,
          isActive: globalTimerRef.current.activeTaskId === taskId
        });
      }
    });
    return runningTimers;
  };

  // Function to stop all timers (useful for cleanup or when user logs out)
  const stopAllTimers = () => {
    Object.keys(globalTimerRef.current.intervals).forEach(taskId => {
      stopTimer(taskId, false);
    });
  };



  // Function to get current timer state for any task (for display in task cards)
  const getTaskTimerState = (taskId) => {
    const taskTimer = globalTimerRef.current.timers[taskId];
    const isActive = globalTimerRef.current.activeTaskId === taskId;

    return {
      isRunning: isActive && taskTimer?.isRunning,
      elapsedTime: taskTimer?.elapsedTime || 0,
      isActive
    };
  };

  const handleCancelLoggedTime = () => {
    setVisibleTime(false);
    setIsEditable((prevState) => ({ ...prevState, estimated_time: false }));
  };

  const loadMoreTasks = (columnId) => {
    setSliceStates((prevState) => ({
      ...prevState,
      [columnId]: prevState[columnId] + 6, // Increase the slice value
    }));
  };

  const lastTaskElementRef = useCallback((node, columnId) => {
    if (observers.current[columnId]) observers.current[columnId].disconnect();

    if (!node || typeof document === "undefined") return;
    const root = document.getElementById(`scrollableDiv-${columnId}`);
    if (!root) return;

    observers.current[columnId] = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && node) {
          loadMoreTasks(columnId);
        }
      },
      { root, rootMargin: "0px 0px 180px 0px", threshold: 0 }
    );

    if (node) observers.current[columnId].observe(node);
  }, []);

  useEffect(() => {
    const initialSliceState = tasks.reduce((acc, boardData) => {
      acc[boardData.workflowStatus?._id] = 6;
      return acc;
    }, {});
    console.log("initialSliceState", initialSliceState);
    setSliceStates(initialSliceState);
  }, [tasks]);

  const moveTaskHandler = (taskId, isChecked) => {
    if (isChecked) {
      dispatch(moveWorkFlowTaskHandler([...task_ids, taskId]));
    } else {
      dispatch(moveWorkFlowTaskHandler(task_ids.filter((id) => id !== taskId)));
    }
  };

  const handleDraftChange = (taskId, hasDraft) => {
    setTaskDrafts((prev) => ({
      ...prev,
      [taskId]: hasDraft,
    }));
  };

  const handleDownloadFile = async (file) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/public/${file?.path}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name + file.file_type;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };
  const isDisabled =
    taskDetails?.task_status?.isDefault ||
    getRoles(["User"]);


  const isDisabledTrackManually = !getRoles(["TL"]) && !getRoles(["Admin"]) && !getRoles(["Client"])
  const boardCardStyle = {};
  const taskBoxStyle = {};
  const boardSectionStyle = {
    height: "calc(100dvh - 220px)",
    maxHeight: "calc(100dvh - 220px)",
    overflowX: "auto",
    overflowY: "hidden",
    display: "flex",
    gap: 16,
    alignItems: "stretch",
  };
  const columnShellStyle = {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    maxHeight: "100%",
  };
  const columnInnerStyle = {
    flex: "1 1 auto",
    minHeight: 0,
    maxHeight: "100%",
    height: "auto",
  };
  const dragRowStyle = {
    flex: "1 1 auto",
    minHeight: 0,
  };
  const boardScrollStyle = {
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
  };

  return (
    <>
      <div className="container project-task-section" style={boardSectionStyle}>
        {tasks.map((boardData, index) => (
          (() => {
            const stageData =
              boardData?.workflowStatus ||
              boardData?.workflow_status ||
              boardData?.status ||
              {};
            const stageId = stageData?._id || stageData?.id || boardData?._id;
            const stageTitle = stageData?.title || boardData?.title || "";
            const stageColor = stageData?.color || boardData?.color || "#3b82f6";
            return (
          <div
            key={`${boardData?._id}_${index}`}
            className={`order small-box ${dragged ? "dragged-over" : ""}`}
            style={{ "--wm-col-border-color": stageColor, ...columnShellStyle }}
            onDragLeave={(e) => onDragLeave(e)}
            onDragEnter={(e) => onDragEnter(e)}
            onDragOver={(e) => onDragOver(e)}
            onDrop={(e) => onDrop(e, stageId)}
          >
            <section className="drag_container" style={columnInnerStyle}>
              <div className="container project-task-list" style={columnInnerStyle}>
                <div className="drag_column" style={columnInnerStyle}>
                  <h4
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData("application/x-item-type", "task-stage");
                      e.dataTransfer.setData(
                        "application/x-stage-id",
                        String(stageId || "")
                      );
                      setDraggingStageId(stageId);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onStageReorder?.(draggingStageId, stageId);
                      setDraggingStageId(null);
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      setDraggingStageId(null);
                    }}
                  >
                    {editingStageId === stageId ? (
                      <Input
                        size="small"
                        autoFocus
                        value={editingStageTitle}
                        onChange={(e) => setEditingStageTitle(e.target.value)}
                        onPressEnter={async () => {
                          await onStageRename?.({ ...stageData, _id: stageId, title: stageTitle, color: stageColor }, editingStageTitle);
                          setEditingStageId(null);
                        }}
                        onBlur={async () => {
                          await onStageRename?.({ ...stageData, _id: stageId, title: stageTitle, color: stageColor }, editingStageTitle);
                          setEditingStageId(null);
                        }}
                        style={{ maxWidth: 180 }}
                      />
                    ) : (
                    <span
                      className="wm-col-title"
                      style={{ color: stageColor }}
                      onDoubleClick={() => {
                        if (!canEditStage?.({ ...stageData, _id: stageId, title: stageTitle, color: stageColor })) return;
                        setEditingStageId(stageId);
                        setEditingStageTitle(stageTitle);
                      }}
                    >
                      {stageTitle}
                    </span>
                    )}
                    <span
                      className="wm-col-badge"
                      style={{
                        background: stageColor,
                        color: "#ffffff",
                      }}
                    >
                      {boardData.tasks.length}
                    </span>
                  </h4>

                  <div
                    className="drag_row"
                    style={dragRowStyle}
                    onDragLeave={(e) => onDragLeave(e)}
                    onDragEnter={(e) => onDragEnter(e)}
                    onDragOver={(e) => onDragOver(e)}
                    onDragOverCapture={(e) => onDragOver(e)}
                    onDrop={(e) => onDrop(e, boardData.workflowStatus?._id)}
                    onDropCapture={(e) => onDrop(e, boardData.workflowStatus?._id)}
                  >
                    {showTextArea && index == 0 && (
                      <div className="project-add-task">
                        <Input.TextArea
                          autoFocus
                          rows={4}
                          onClick={() => setShowTextArea(false)}
                          placeholder="add task and hit enter key"
                        />
                        <div className="project-task-icons">
                          <CalendarOutlined />
                          <div className="project-task-inner-icon">
                            <TagOutlined />
                            <UserAddOutlined />
                            <PaperClipOutlined />
                          </div>
                        </div>
                      </div>
                    )}

                    <div
                      className="borad-task-data"
                      id={`scrollableDiv-${boardData.workflowStatus?._id}`}
                      style={boardScrollStyle}
                      onDragLeave={(e) => onDragLeave(e)}
                      onDragEnter={(e) => onDragEnter(e)}
                      onDragOver={(e) => onDragOver(e)}
                      onDragOverCapture={(e) => onDragOver(e)}
                      onDrop={(e) => onDrop(e, boardData.workflowStatus?._id)}
                      onDropCapture={(e) => onDrop(e, boardData.workflowStatus?._id)}
                    >
                      {boardData.tasks
                        .map((task) => {
                          const isDoneColumn =
                            boardData.workflowStatus?.title === "Done";
                          return (
                            <>
                              <div
                                className={`wm-task-card ${dragged ? "dragged" : ""}${isDoneColumn ? " wm-task-card-done" : ""}`}
                                key={task?._id}
                                id={task?._id}
                                style={boardCardStyle}
                                draggable
                                onDragStart={(e) => onDragStart(e)}
                                onDragEnd={(e) => onDragEnd(e)}
                              >
                                <div
                                  className={`wm-task-box ${isDoneColumn ? "wm-task-box-done" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (shouldIgnoreTaskClick?.()) return;
                                    getTaskByIdDetails(task?._id, {
                                      projectId,
                                      mainTaskId:
                                        selectedTask?._id || listID || task?.mainTask?._id,
                                    });
                                    getComment(task?._id);
                                    setTempBoard(boardData);
                                    setSelectedTaskId(task?._id);
                                  }}
                                >
                                  {/* Task labels */}
                                  {task.task_labels?.length > 0 && (
                                    <div className="wm-card-labels">
                                      {task.task_labels.map((lbl) => (
                                        <span
                                          key={lbl._id}
                                          className="wm-card-label"
                                          style={{ background: lbl.color || "#e5e7eb", color: lbl.color ? "#fff" : "#374151" }}
                                        >
                                          {lbl.title}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Title */}
                                  <div className="wm-card-title" style={{ textDecoration: isDoneColumn ? "line-through" : "none" }}>
                                    {task.title}
                                  </div>

                                  {/* List name */}
                                  {selectedTask?.title && (
                                    <div className="wm-card-list">{selectedTask.title}</div>
                                  )}

                                  {/* Due date */}
                                  <div
                                    className="wm-card-due"
                                    style={{ color: task.due_date && moment(task.due_date).isBefore(currDate, "day") ? "#f87171" : undefined }}
                                  >
                                    {task.due_date ? (
                                      <>
                                        <i className="fa-regular fa-calendar-days" style={{ marginRight: 4 }}></i>
                                        {moment(task.due_date).format("MMM D, YYYY")}
                                      </>
                                    ) : "—"}
                                  </div>

                                  {/* Footer: assignees + progress */}
                                  <div className="wm-card-footer">
                                    <span className="wm-card-assignees">
                                      {task.assignees?.length > 0
                                        ? task.assignees.map((a) => a.full_name).filter(Boolean).slice(0, 2).join(", ") || "Unassigned"
                                        : "Unassigned"}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <input
                                    type="checkbox"
                                    style={{
                                      position: "absolute",
                                      top: "17px",
                                      right: "25px",
                                    }}
                                    checked={Array.isArray(task_ids) && task_ids.includes(task?._id)}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      moveTaskHandler(task?._id, e?.target?.checked);
                                    }}
                                  />
                                  <Dropdown
                                    overlay={
                                      <Menu>
                                        {hasPermission(["task_edit"]) ? (
                                          <Menu.Item
                                            onClick={() => {
                                              showEditTaskModal(
                                                task,
                                                boardData?.workflowStatus?._id ||
                                                  task?._stId ||
                                                  task?.task_status?._id ||
                                                  task?.task_status
                                              );
                                            }}
                                          >
                                            <EditOutlined
                                              style={{ color: "green" }}
                                            />{" "}
                                            Edit
                                          </Menu.Item>
                                        ) : null}

                                        {hasPermission(["task_delete"]) && (
                                          <Popconfirm
                                            title="Are you sure you want to delete this task?"
                                            onConfirm={() => {
                                              handleDelete(task?._id);
                                            }}
                                            okText="Yes"
                                            cancelText="No"
                                          >
                                            <Menu.Item className="ant-delete">
                                              <DeleteOutlined
                                                style={{ color: "red" }}
                                              />{" "}
                                              Delete
                                            </Menu.Item>
                                          </Popconfirm>
                                        )}
                                        {hasPermission(["task_add"]) && (
                                          <Menu.Item
                                            onClick={() => {
                                              setIsCopyModalOpen(true);
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
                                              setCopyFormData({
                                                title: "",
                                                project_id: "",
                                                task_id: "",
                                                task_status: "",
                                                isCopyAssignee: true,
                                                isCopyClients: true,
                                                isCopyDates: true,
                                                isCopyComments: true,
                                              });
                                              getTaskByIdDetails(
                                                task?._id,
                                                "",
                                                true
                                              );
                                            }}
                                          >
                                            <CopyOutlined />
                                            Create a Copy
                                          </Menu.Item>
                                        )}

                                        <Menu.Item
                                          onClick={() =>
                                            handleCopyTaskLink(task?._id)
                                          }
                                        >
                                          <LinkOutlined />
                                          Copy Task Link
                                        </Menu.Item>
                                        {hasPermission(
                                          ["task_edit"] && ["manage_people"]
                                        ) && (
                                            <Menu.Item
                                              onClick={() => {
                                                setTaskId(task?._id);
                                                setManagePeople(true);

                                                managePeopleForm.setFieldsValue({
                                                  assignees:
                                                    detailClientSubs?.assignees?.map(
                                                      (item) => item?._id
                                                    ),
                                                  clients:
                                                    detailClientSubs?.pms_clients?.map(
                                                      (item) => item?._id
                                                    ),
                                                });
                                              }}
                                            >
                                              <i className="fi fi-rr-users"></i>{" "}
                                              Manage People
                                            </Menu.Item>
                                          )}
                                      </Menu>
                                    }
                                    trigger={["click"]}
                                  >
                                    <a
                                      className="task-edit-pop-btn"
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                      onClick={(e) => e.preventDefault()}
                                    >
                                      <MoreOutlined
                                        onClick={() => {
                                          getDetailsClientSubs(
                                            projectId,
                                            task?._id,
                                            true
                                          );
                                          managePeopleForm.setFieldsValue({
                                            assignees:
                                              detailClientSubs?.assignees?.map(
                                                (item) => item?._id
                                              ),
                                            clients:
                                              detailClientSubs?.pms_clients?.map(
                                                (item) => item?._id
                                              ),
                                          });
                                        }}
                                      />
                                    </a>
                                  </Dropdown>
                                </div>
                              </div>
                            </>
                          );
                        })}
                    </div>
                    <div className="add-task-col-btn-wrapper" style={{ padding: "0 10px 10px", marginTop: "auto", flexShrink: 0 }}>
                      <Button 
                        type="text" 
                        icon={<PlusOutlined />} 
                        onClick={() => showModalTaskModal(boardData?.workflowStatus?._id)}
                        className="add-task-col-btn"
                        style={{ 
                          width: "100%", 
                          textAlign: "left", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "flex-start", 
                          marginTop: 8, 
                          color: "#64748b",
                          background: "rgba(241, 245, 249, 0.6)",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          fontWeight: 500,
                          border: "1px dashed #cbd5e1",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#e2e8f0";
                          e.currentTarget.style.color = "#334155";
                          e.currentTarget.style.borderColor = "#94a3b8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(241, 245, 249, 0.6)";
                          e.currentTarget.style.color = "#64748b";
                          e.currentTarget.style.borderColor = "#cbd5e1";
                        }}
                      >
                        Add Task
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
            );
          })()
        ))}
      </div>

      <Modal
        title={null}
        open={isCopyModalOpen}
        footer={null}
        onCancel={handleCancelCopyModal}
        onOk={handleOkCopyModal}
        className="copy-task-modal add-list-modal"
      >
        <div className="modal-header">
          <h1>Copy Task</h1>
        </div>
        <div className="overview-modal-wrapper">
          <Form form={copyform} onFinish={addCopyOfTask}>
            <div className="topic-cancel-wrapper task-list-pop-wrapper">
              <Form.Item>
                <Input
                  name="title"
                  placeholder="Title"
                  value={copyFormData.title || `Copy Of ${taskDetails?.title}`}
                  onChange={(e) =>
                    setCopyFormData({ ...copyFormData, title: e.target.value })
                  }
                />
              </Form.Item>
              <Form.Item className="subscriber-btn">
                <Select
                  disabled={true}
                  placeholder="select project"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option.children
                      ?.toLowerCase()
                      .indexOf(input?.toLowerCase()) >= 0
                  }
                  filterSort={(optionA, optionB) =>
                    optionA.children
                      ?.toLowerCase()
                      .localeCompare(optionB.children?.toLowerCase())
                  }
                  value={projectTitle}
                >
                  <option>{projectTitle}</option>
                </Select>
              </Form.Item>
              <Form.Item className="subscriber-btn">
                <Select
                  placeholder="select Task"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option.children
                      ?.toLowerCase()
                      .indexOf(input?.toLowerCase()) >= 0
                  }
                  filterSort={(optionA, optionB) =>
                    optionA.children
                      ?.toLowerCase()
                      .localeCompare(optionB.children?.toLowerCase())
                  }
                  value={copyFormData.task_id || taskDetails?.mainTask?.title}
                  onChange={(value) =>
                    setCopyFormData({ ...copyFormData, task_id: value })
                  }
                >
                  {mainTask.map((item, index) => (
                    <Option
                      key={index}
                      value={item._id}
                      style={{ textTransform: "capitalize" }}
                    >
                      {item.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item className="subscriber-btn">
                <Select
                  placeholder="select workflow stage"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option.children
                      ?.toLowerCase()
                      .indexOf(input?.toLowerCase()) >= 0
                  }
                  filterSort={(optionA, optionB) =>
                    optionA.children
                      ?.toLowerCase()
                      .localeCompare(optionB.children?.toLowerCase())
                  }
                  value={
                    copyFormData.task_status || taskDetails?.task_status?._id
                  }
                  onChange={(value) =>
                    setCopyFormData({ ...copyFormData, task_status: value })
                  }
                >
                  {projectWorkflowStage.map((item, index) => (
                    <Option
                      key={index}
                      value={item._id}
                      style={{ textTransform: "capitalize" }}
                    >
                      {item.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <h2>Copy:</h2>
              <div className="coppy-task-data">
                <Form.Item
                  name="assignee"
                  valuePropName="checked"
                  initialValue={copyFormData.isCopyAssignee}
                >
                  <Checkbox
                    value={copyFormData.isCopyAssignee}
                    checked={true}
                    onChange={(e) =>
                      setCopyFormData({
                        ...copyFormData,
                        isCopyAssignee: e.target.checked,
                      })
                    }
                  >
                    Assignees
                  </Checkbox>
                </Form.Item>

                <Form.Item
                  name="dates"
                  valuePropName="checked"
                  initialValue={copyFormData.isCopyDates}
                >
                  <Checkbox
                    value={copyFormData.isCopyDates}
                    onChange={(e) =>
                      setCopyFormData({
                        ...copyFormData,
                        isCopyDates: e.target.checked,
                      })
                    }
                  >
                    Dates
                  </Checkbox>
                </Form.Item>

                <Form.Item
                  name="comments"
                  valuePropName="checked"
                  initialValue={copyFormData.isCopyComments}
                >
                  <Checkbox
                    value={copyFormData.isCopyComments}
                    onChange={(e) =>
                      setCopyFormData({
                        ...copyFormData,
                        isCopyComments: e.target.checked,
                      })
                    }
                  >
                    Comments
                  </Checkbox>
                </Form.Item>
              </div>
            </div>

            <div className="modal-footer-flex">
              <div className="flex-btn">
                <Button
                  type="primary"
                  className="square-primary-btn"
                  htmlType="submit"
                >
                  Save
                </Button>
                <Button
                  onClick={handleCancelCopyModal}
                  className="square-outline-btn ant-delete"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </Modal>

      <TaskDetailModal
        open={modalIsOpen}
        onClose={() => {
          dispatch(setData({ stateName: "taggedUserList", data: [] }));
          handleCancel();
          setSelectedTaskId(null);
          setOpenCommentModle(false);
          setIsEditMode(false);
          setEditingBugId(null);
          setIsEditable({
            title: false,
            proj_description: false,
            start_date: true,
            end_date: true,
            taskLabels: false,
            assignees: false,
            estimated_time: false,
          });
        }}
        task={taskDetails}
        companySlug={companySlug}
        onOpenInProject={(url) => {
          window.location.href = url;
        }}
        // Bug tracking props
        bugs={issuedata}
        bugStatuses={bugWorkflowStatuses}
        onBugAdd={addissue}
        onBugDelete={deleteBug}
        onBugEdit={editBug}
        onBugStatusUpdate={updateBugWorkflow}
        issueTitle={issuetitle}
        onIssueTitleChange={setIssuetitle}
        newBugData={newBugData}
        onNewBugDataChange={setNewBugData}
        onIssueDataKeypress={handleissuedata}
        // Edit mode prop
        onUpdateTask={updateviewTask}
      />

      <AddTimeModal
        openModal={isModalOpenTaskModal}
        cancelModal={handleCancelTaskModal}
        formName={addform}
        onFinish={handleTaskOps}
        taskdropdown={taskdropdown}
        addInputTaskData={addInputTaskData}
        handleTaskInput={handleTaskInput}
        estHrs={estHrs}
        handleEstTimeInput={handleEstTimeInput}
        estHrsError={estHrsError}
        estMins={estMins}
        estMinsError={estMinsError}
        handleChangedescription={handleChangedescription}
        editorData={editorData}
        handlePaste={handlePaste}
        type="task"
      />

      <LoggedTimeDetail
        isVisibleTime={isVisibleTime}
        setVisibleTime={setVisibleTime}
        columnDetails={columnDetails}
        setExpandedRowKey={setExpandedRowKey}
        expandedRowKey={expandedRowKey}
        deleteTime={deleteTime}
        getTimeLogged={getTimeLogged}
        taskId={taskId}
        getTaskByIdDetails={getTaskByIdDetails}
        getBoardTasks={getBoardTasks}
        onCancel={handleCancelLoggedTime}
        selectedTask={selectedTask}
        taskDetails={taskDetails}
      />

      <ManagePeopleModal
        open={ManagePeople}
        cancel={handleCancelManagePeople}
        formName={managePeopleForm}
        onFinish={handleManagePeople}
        subscribersList={subscribersList}
        clientsList={clientsList}
        type="task"
        onChange={handleChange}
        assignees={detailClientSubs?.assignees}
        clients={detailClientSubs?.clients}
        detailClientSubs={detailClientSubs}
        setDetailsClientSubs={setDetailsClientSubs}
      />

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
};

TaskList.propTypes = {
  tasks: PropTypes.array.isRequired,
  showModalTaskModal: PropTypes.func.isRequired,
  showEditTaskModal: PropTypes.func.isRequired,
  getBoardTasks: PropTypes.func.isRequired,
  selectedTask: PropTypes.shape({
    project: PropTypes.shape({
      _id: PropTypes.string.isRequired,
    }),
    _id: PropTypes.string.isRequired,
  }),
  deleteTasks: PropTypes.func.isRequired,
  getProjectMianTask: PropTypes.func.isRequired,
  onStageRename: PropTypes.func,
  onStageReorder: PropTypes.func,
  canEditStage: PropTypes.func,
};

export default React.memo(TaskList, (prevProps, nextProps) => {
  console.log("🚀 ~ prevProps, nextProps:", prevProps, nextProps)
  return isEqual(prevProps.tasks, nextProps.tasks) && isEqual(prevProps.isEditTaskSave, nextProps.isEditTaskSave);
});
