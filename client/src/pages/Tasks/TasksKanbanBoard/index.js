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
} from "@ant-design/icons";
import PropTypes from "prop-types";
import {
  Avatar,
  Button,
  Input,
  Modal,
  Dropdown,
  DatePicker,
  Tooltip,
  Menu,
  Select,
  Popover,
  Form,
  Badge,
  Popconfirm,
  Checkbox,
  message,
} from "antd";
import dayjs from "dayjs";
import "../style.css";
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
import isEqual from "lodash/isEqual";
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
  projectDetails,
  isEditTaskSave,
  setEditTaskSave
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
    getTaskByIdDetails,
    getTimeLogged,
    getComment,
    modalIsOpen,
    handleCancel,
    taskDetails,
    viewTask,
    handleTaskDelete,
    estError,
    visible,
    popOver,
    popOverTimeLogged,
    openPopOver,
    isLoggedHoursMoreThanEstimated,
    textAreaValue,
    subscribersList,
    taggedUserList,
    activeClass,
    activeClass1,
    activeTab,
    comments,
    setOpenCommentModle,
    handleEditComment,
    deleteComment,
    handleDropdownClick,
    addComments,
    isTextAreaFocused,
    setIsTextAreaFocused,
    taskHistory,
    handleToggle,
    storeIndex,
    showTaskHistory,
    isModalOpenTaskModal,
    handleCancelTaskModal,
    addform,
    handleTaskOps,
    taskdropdown,
    addInputTaskData,
    handleTaskInput,
    handleViewTask,
    handleEstTimeInput,
    openCommentModel,
    handleCancelCommentModel,
    formComment,
    handleComments,
    commentVal,
    setCommentVal,
    handleSelect,
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
    setIssuetitleflag,
    issuetitleflag,
    handleissuedata,
    issuedata,
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

    observers.current[columnId] = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && node) {
        loadMoreTasks(columnId);
      }
    });

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
    (projectDetails.projectHoursExceeded && !getRoles(["Client"])) || getRoles(["User"]);


  const isDisabledTrackManually = !getRoles(["TL"]) && !getRoles(["Admin"]) && !getRoles(["Client"])
  const boardCardStyle = {};
  const taskBoxStyle = {};

  return (
    <>
      <div className="container project-task-section">
        {tasks.map((boardData, index) => (
          <div
            key={`${boardData._id}_${index}`}
            className={`order small-box ${dragged ? "dragged-over" : ""}`}
            style={{ "--wm-col-border-color": boardData?.workflowStatus?.color || "#3b82f6" }}
            onDragLeave={(e) => onDragLeave(e)}
            onDragEnter={(e) => onDragEnter(e)}
            onDragEnd={(e) => onDragEnd(e)}
            onDragOver={(e) => onDragOver(e)}
            onDrop={(e) => onDrop(e, boardData.workflowStatus?._id)}
          >
            <section className="drag_container">
              <div className="container project-task-list">
                <div className="drag_column">
                  <h4>
                    <span className="wm-col-title" style={{ color: boardData?.workflowStatus?.color || "#3b82f6" }}>{boardData?.workflowStatus?.title}</span>
                    <span
                      className="wm-col-count"
                      style={{
                        background: `${boardData?.workflowStatus?.color || "#3b82f6"}22`,
                        color: boardData?.workflowStatus?.color || "#3b82f6",
                        border: `1px solid ${boardData?.workflowStatus?.color || "#3b82f6"}55`,
                      }}
                    >
                      {boardData.tasks.length}
                    </span>
                  </h4>

                  <div className="drag_row">
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

                    <div className="borad-task-data">
                      {boardData.tasks
                        .slice(0, sliceStates[boardData.workflowStatus?._id])
                        .map((task, cardIndex) => {
                          const isDoneColumn =
                            boardData.workflowStatus?.title === "Done";
                          const isLastTask =
                            cardIndex ===
                            boardData.tasks.slice(
                              0,
                              sliceStates[boardData.workflowStatus?._id]
                            ).length -
                            1;
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
                                ref={
                                  isLastTask &&
                                    boardData.tasks.length >
                                    sliceStates[boardData.workflowStatus?._id]
                                    ? (node) =>
                                      lastTaskElementRef(
                                        node,
                                        boardData.workflowStatus?._id
                                      )
                                    : null
                                }
                              >
                                <div
                                  className={`wm-task-box ${isDoneColumn ? "wm-task-box-done" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    getTaskByIdDetails(task._id);
                                    getComment(task._id);
                                    setTempBoard(boardData);
                                    setSelectedTaskId(task._id);
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
                                  {task.due_date && (
                                    <div
                                      className="wm-card-due"
                                      style={{ color: moment(task.due_date).isBefore(currDate, "day") ? "#f87171" : undefined }}
                                    >
                                      <i className="fa-regular fa-calendar-days" style={{ marginRight: 4 }}></i>
                                      {moment(task.due_date).format("MMM D, YYYY")}
                                    </div>
                                  )}

                                  {/* Footer: assignees + comments */}
                                  <div className="wm-card-footer">
                                    <span className="wm-card-assignees">
                                      {task.assignees?.length > 0
                                        ? task.assignees.map((a) => a.full_name).filter(Boolean).slice(0, 2).join(", ") || "Unassigned"
                                        : "Unassigned"}
                                    </span>
                                    <span className="wm-card-meta">
                                      <i className="fa-regular fa-comment" style={{ marginRight: 3 }}></i>
                                      {task.comments || 0}
                                      {(taskDrafts[task._id] || task.hasDraft) && (
                                        <span className="draft-indicator" style={{ color: "#ff4d4f", marginLeft: 4 }}>Draft</span>
                                      )}
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
                                    onChange={(e) =>
                                      moveTaskHandler(
                                        task?._id,
                                        e?.target?.checked
                                      )
                                    }
                                  />
                                  <Dropdown
                                    overlay={
                                      <Menu>
                                        {hasPermission(["task_edit"]) ? (
                                          projectDetails?.projectHoursExceeded ? (
                                            <Tooltip
                                              title="Project hours exceeded"
                                              placement="top"
                                            >
                                              <Menu.Item
                                                disabled
                                                onClick={() => {
                                                  getTaskByIdDetails(task._id, {
                                                    editFlag: true,
                                                    boardID:
                                                      boardData?.workflowStatus
                                                        ._id,
                                                  });
                                                }}
                                              >
                                                <EditOutlined
                                                  style={{ color: "green" }}
                                                />{" "}
                                                Edit
                                              </Menu.Item>
                                            </Tooltip>
                                          ) : (
                                            <Menu.Item
                                              onClick={() => {
                                                getTaskByIdDetails(task._id, {
                                                  editFlag: true,
                                                  boardID:
                                                    boardData?.workflowStatus
                                                      ._id,
                                                });
                                              }}
                                            >
                                              <EditOutlined
                                                style={{ color: "green" }}
                                              />{" "}
                                              Edit
                                            </Menu.Item>
                                          )
                                        ) : null}

                                        {hasPermission(["task_delete"]) && (
                                          <Popconfirm
                                            title="Are you sure you want to delete this task?"
                                            onConfirm={() => {
                                              handleDelete(task._id);
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
                                                task._id,
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
                                            handleCopyTaskLink(task._id)
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
                                                setTaskId(task._id);
                                                setManagePeople(true);

                                                managePeopleForm.setFieldsValue({
                                                  assignees:
                                                    detailClientSubs?.assignees?.map(
                                                      (item) => item._id
                                                    ),
                                                  clients:
                                                    detailClientSubs?.pms_clients?.map(
                                                      (item) => item._id
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
                                            task._id,
                                            true
                                          );
                                          managePeopleForm.setFieldsValue({
                                            assignees:
                                              detailClientSubs?.assignees?.map(
                                                (item) => item._id
                                              ),
                                            clients:
                                              detailClientSubs?.pms_clients?.map(
                                                (item) => item._id
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
                  </div>
                </div>
              </div>
            </section>
          </div>
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

      <Modal
        className="task-detail-popup"
        open={modalIsOpen && taggedUserList.length > 0}
        destroyOnClose
        width={1000}
        footer={null}
        onCancel={() => {
          dispatch(setData({ stateName: "taggedUserList", data: [] }));
          handleCancel();
          setSelectedTaskId(null);
          setOpenCommentModle(false);
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
        zIndex={1000}
      >
        <div className="task-detail-panel task-model">
          <div className="left-task-detail-panel">
            <div className="head-toolbar">
              <div className="status-button">
                <Popover
                  trigger="click"
                  placement="bottomLeft"
                  visible={isPopoverVisible}
                  onVisibleChange={setIsPopoverVisible}
                  content={
                    <div className="assignees-popover stages-task-popover">
                      <ul
                        className="workflow-stages-task-main-wrapper"
                        style={{ paddingLeft: "0px !important" }}
                      >
                        {projectWorkflowStage.map((item) => (
                          <div
                            className="workflow-stages-task"
                            key={item._id}
                            style={{
                              display: "flex",
                              cursor: "pointer",
                              justifyContent: "space-between",
                              gap: "20px !important",
                            }}
                          >
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                              }}
                            >
                              <div
                                style={{
                                  width: "10px",
                                  height: "10px",
                                  backgroundColor: `${item.color}`,
                                  borderRadius: "50%",
                                }}
                              ></div>
                              <div
                                onClick={() => {
                                  handleTaskStatusClick(item._id, taskId);
                                  handleTaskStatusClickFor(item._id, taskId);
                                }}
                              >
                                {item.title}
                              </div>
                            </span>
                            {selectedTaskStatusTitle === item.title && (
                              <span style={{ float: "right" }}>
                                <i class="fi fi-br-check"></i>
                              </span>
                            )}
                          </div>
                        ))}
                      </ul>
                    </div>
                  }
                >
                  <Button className="done-btn">
                    <i
                      className="fi fi-ss-check-circle"
                      style={{ color: taskDetails?.task_status?.color }}
                    ></i>
                    {selectedTaskStatusTitle || taskDetails?.task_status?.title}
                  </Button>
                </Popover>

                <span>{taskDetails?.taskId}</span>
              </div>
              <div className="task-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Only show timer for In Progress tasks */}
                  {isDisabledTrackManually && (
                    isTaskInProgress(taskDetails)
                    && (
                      <Popover

                        content={
                          <div style={{ minWidth: '280px', padding: '8px' }}>
                            {/* Header Section */}
                            <div style={{
                              textAlign: 'center',
                              paddingBottom: '16px',
                              borderBottom: '1px solid #f0f0f0',
                              marginBottom: '16px'
                            }}>
                              <div style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#262626',
                                marginBottom: '8px'
                              }}>
                                Time Tracker
                              </div>
                              <div style={{
                                fontSize: '32px',
                                fontWeight: 'bold',
                                color: (() => {
                                  const displayInfo = getTimerDisplayInfo();
                                  if (displayInfo.isActive) return '#52c41a';
                                  return '#1890ff';
                                })(),
                                fontFamily: 'monospace',
                                letterSpacing: '1px'
                              }}>
                                {getTimerDisplayInfo().timeString}
                              </div>
                            </div>



                            {/* Action Buttons */}
                            <div style={{
                              display: 'flex',
                              gap: '8px',
                              justifyContent: 'center',
                              marginBottom: '12px'
                            }}>
                              {(() => {
                                const displayInfo = getTimerDisplayInfo();

                                if (displayInfo.canStart) {
                                  return (
                                    <Button
                                      type="primary"
                                      icon={<PlayCircleOutlined />}
                                      onClick={() => startTimer(taskDetails?._id)}
                                      style={{
                                        borderRadius: '6px',
                                        fontWeight: '500'
                                      }}
                                    >
                                      Start Timer
                                    </Button>
                                  );
                                }

                                if (displayInfo.canStop) {
                                  return (
                                    <Button
                                      danger
                                      icon={<PauseCircleOutlined />}
                                      onClick={() => stopTimer(taskDetails?._id)}
                                      style={{
                                        borderRadius: '6px',
                                        fontWeight: '500'
                                      }}
                                    >
                                      Stop Timer
                                    </Button>
                                  );
                                }

                                return null;
                              })()}
                            </div>

                            {/* Warning Messages */}
                            {globalTimerRef.current.activeTaskId &&
                              globalTimerRef.current.activeTaskId !== taskDetails?._id &&
                              shouldShowTimer(taskDetails) && (
                                <div style={{
                                  fontSize: '11px',
                                  color: '#fa8c16',
                                  padding: '8px 12px',
                                  backgroundColor: '#fffbe6',
                                  borderRadius: '4px',
                                  border: '1px solid #ffe58f',
                                  textAlign: 'center'
                                }}>
                                  Another timer is running and will be stopped
                                </div>
                              )}
                          </div>
                        }
                        title={null}
                        trigger="click"
                        visible={timerState.isPopoverVisible}
                        onVisibleChange={(visible) => setTimerState(prev => ({ ...prev, isPopoverVisible: visible }))}
                        placement="bottomRight"
                      >
                        <Button
                          style={{
                            marginRight: '10px',
                            border: (() => {
                              const displayInfo = getTimerDisplayInfo();
                              // if (displayInfo.isExceeded) return '2px solid #ff4d4f';
                              if (displayInfo.isActive) return '2px solid #52c41a';
                              // if (displayInfo.isNearLimit) return '2px solid #fa8c16';
                              return '1px solid #d9d9d9';
                            })(),
                            backgroundColor: (() => {
                              const displayInfo = getTimerDisplayInfo();
                              // if (displayInfo.isExceeded) return '#fff2f0';
                              if (displayInfo.isActive) return '#f6ffed';
                              // if (displayInfo.isNearLimit) return '#fffbe6';
                              return 'white';
                            })()
                          }}
                        >
                          <ClockCircleOutlined
                            style={{
                              color: (() => {
                                const displayInfo = getTimerDisplayInfo();
                                // if (displayInfo.isExceeded) return '#ff4d4f';
                                if (displayInfo.isActive) return '#52c41a';
                                // if (displayInfo.isNearLimit) return '#fa8c16';
                                return '#1890ff';
                              })(),
                              fontSize: '16px'
                            }}
                          />
                          {/* {(() => {
                        const displayInfo = getTimerDisplayInfo();
                        return displayInfo.isActive && displayInfo.timeString !== '00:00:00';
                      })() && ( */}
                          <span style={{
                            marginLeft: '5px',
                            fontSize: '12px',
                            color: (() => {
                              const displayInfo = getTimerDisplayInfo();
                              // if (displayInfo.isExceeded) return '#ff4d4f';
                              // if (displayInfo.isNearLimit) return '#fa8c16';
                              return 'inherit';
                            })()
                          }}>
                            {(() => getTimerDisplayInfo().timeString)()}
                          </span>
                          {/* )} */}
                        </Button>
                      </Popover>
                    )
                  )}

                  <div className="task-editbtn" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {hasPermission(["task_edit"]) &&
                      ((projectDetails.projectHoursExceeded && !getRoles(["Client"])) ? (
                        <Tooltip title="Project hours exceeded" placement="top">
                          <EditOutlined
                            style={{ color: "gray", cursor: "not-allowed" }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <EditOutlined
                          style={{ color: "green" }}
                          onClick={() => {
                            getTaskByIdDetails(taskDetails?._id, {
                              editFlag: true,
                              boardID: tempBoard?.workflowStatus._id,
                            });
                          }}
                        />
                      ))}

                    {hasPermission(["task_delete"]) && (
                      <Popconfirm
                        title="Do you want to delete?"
                        onConfirm={() => handleTaskDelete(taskDetails._id)}
                        okText="Yes"
                        cancelText="No"
                        placement="bottom"
                      >
                        <Button danger>
                          <i className="fi fi-rs-trash"></i>
                          {/* Delete */}
                        </Button>
                      </Popconfirm>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="task-inner-card">
              <div className="bredcamp-panel">
                <ul>
                  <li>
                    <p>
                      {taskDetails?.project?.color && (
                        <div
                          className="color-div"
                          style={{ background: taskDetails?.project?.color }}
                        ></div>
                      )}
                      {taskDetails?.project?.title}
                    </p>
                  </li>
                  <li>
                    <i className="fi fi-rr-angle-small-right"></i>
                  </li>

                  <li>
                    <span>{taskDetails?.mainTask?.title}</span>
                  </li>
                </ul>
              </div>
              {hasPermission(["task_edit"]) && isEditable.title ? (
                <Tooltip title="Enter the title and hit enter key">
                  <Input
                    placeholder="Title"
                    defaultValue={viewTask?.title}
                    onPressEnter={(e) => {
                      const value = e.target.value;
                      handleViewTask("title", value);
                    }}
                  />
                </Tooltip>
              ) : (
                <h3
                  onClick={() => {
                    handleFieldClick("title");
                  }}
                >
                  {taskDetails?.title}
                </h3>
              )}
              {hasPermission(["task_edit"]) && isEditable.proj_description ? (
                <div>
                  <CKEditor
                    editor={Custombuild}
                    data={editViewModalDescription || viewTask?.descriptions}
                    onReady={(editor) => {
                      setEditorInstance(editor);
                    }}
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
                  <div className="modal-footer-flex">
                    <div className="flex-btn">
                      <Button
                        htmlType="submit"
                        type="primary"
                        className="square-primary-btn"
                        onClick={() => {
                          if (editorInstance) {
                            const data = editorInstance.getData();
                            handleViewTask("descriptions", data);
                          }
                          setIsEditable((prevState) => ({
                            ...prevState,
                            proj_description: false,
                          }));
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() =>
                          setIsEditable((prevState) => ({
                            ...prevState,
                            proj_description: false,
                          }))
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="item-inner"
                  onClick={() => {
                    handleFieldClick("proj_description");
                  }}
                >
                  <p
                    dangerouslySetInnerHTML={{
                      __html: taskDetails?.descriptions,
                    }}
                  ></p>
                </div>
              )}

              <Form form={viewEdit} onFinish={handleViewEdit}>
                <Form.Item>
                  <div className="table-schedule-wrapper">
                    <ul>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-calendar-day"></i>
                            {hasPermission(["task_edit"]) &&
                              isEditable.start_date ? (
                              <DatePicker
                                value={
                                  viewTask?.start_date &&
                                  dayjs(viewTask?.start_date, "YYYY-MM-DD")
                                }
                                placeholder="Start Date"
                                onChange={(date, dateString) =>
                                  handleViewTask("start_date", dateString)
                                }
                                allowClear={false}
                              />
                            ) : (
                              <div>
                                <DatePicker
                                  open={false}
                                  inputReadOnly
                                  placeholder="Start Date"
                                  value={
                                    taskDetails?.start_date &&
                                    dayjs(taskDetails?.start_date, "YYYY-MM-DD")
                                  }
                                  allowClear={false}
                                  onChange={onChange}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            <i className="fi fi-rr-calendar-day"></i>
                            {hasPermission(["task_edit"]) &&
                              isEditable.end_date ? (
                              <DatePicker
                                value={
                                  viewTask?.due_date &&
                                  dayjs(viewTask?.due_date, "YYYY-MM-DD")
                                }
                                placeholder="End Date"
                                onChange={(date, dateString) =>
                                  handleViewTask("due_date", dateString)
                                }
                                disabledDate={(current) =>
                                  current &&
                                  current <
                                  dayjs(viewTask?.start_date, "YYYY-MM-DD")
                                }
                                allowClear={false}
                              />
                            ) : (
                              <div>
                                <DatePicker
                                  open={false}
                                  inputReadOnly
                                  placeholder="End Date"
                                  value={
                                    taskDetails?.due_date &&
                                    dayjs(taskDetails?.due_date, "YYYY-MM-DD")
                                  }
                                  allowClear={false}
                                  onChange={onChange}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rs-tags"></i>
                            <span className="schedule-label">Labels</span>
                          </div>
                        </div>
                        <div className="table-right">
                          {hasPermission(["task_edit"]) &&
                            isEditable.taskLabels ? (
                            <Select
                              value={viewTask?.taskLabels[0]?.title}
                              placeholder="Select labels"
                              onChange={handleSelectedLabelsChange}
                              bordered={false}
                            >
                              {projectLabels.map((item) => (
                                <Option
                                  key={item?._id}
                                  value={item?._id}
                                  style={{ textTransform: "capitalize" }}
                                >
                                  {item.title}
                                </Option>
                              ))}
                            </Select>
                          ) : (
                            <div onClick={() => handleFieldClick("taskLabels")}>
                              {taskDetails?.taskLabels?.length > 0 ? (
                                taskDetails.taskLabels.map((label) => (
                                  <div key={label._id}>
                                    {label.title.charAt(0).toUpperCase() +
                                      label.title.slice(1)}
                                  </div>
                                ))
                              ) : (
                                <div>Select</div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-users"></i>
                            <span className="schedule-label">Assignees</span>
                          </div>
                        </div>
                        <div className="table-right">
                          {hasPermission(["task_edit"]) &&
                            isEditable.assignees ? (
                            <MultiSelect
                              onSearch={handleSearch}
                              onChange={handleSelectedItemsChange}
                              values={
                                viewTask
                                  ? viewTask?.assignees?.map(
                                    (item) => item?._id
                                  )
                                  : []
                              }
                              listData={subscribersList}
                              search={searchKeyword}
                              bordered={false}
                            />
                          ) : (
                            <div onClick={() => handleFieldClick("assignees")}>
                              {taskDetails?.assignees?.length > 0 ? (
                                <Avatar.Group
                                  maxCount={2}
                                  maxPopoverTrigger="click"
                                  size="default"
                                  maxStyle={{
                                    color: "#f56a00",
                                    backgroundColor: "#fde3cf",
                                    cursor: "pointer",
                                  }}
                                >
                                  {taskDetails.assignees.map((data) => (
                                    <Tooltip
                                      title={removeTitle(data.name)}
                                      key={data._id}
                                    >
                                      <MyAvatar
                                        userName={data.name}
                                        alt={data.name}
                                        src={data?.emp_img}
                                        key={data._id}
                                      />
                                    </Tooltip>
                                  ))}
                                </Avatar.Group>
                              ) : (
                                <div>Select</div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-clock"></i>
                            <span className="schedule-label">
                              Estimated Time
                              {!getRoles(["Client"]) && (
                                <span style={{ color: "red" }}>*</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            {hasPermission(["task_edit"]) &&
                              isEditable.estimated_time ? (
                              <div className="estimated_time_input_container">
                                <div className="hours_min_container">
                                  <Tooltip title="Add hours and press enter key">
                                    <Input
                                      min={0}
                                      defaultValue={viewTask.estimated_hours}
                                      type="number"
                                      onPressEnter={(e) => {
                                        const value = e.target.value;
                                        handleEstTimeViewInput(
                                          "est_hrs",
                                          value
                                        );
                                      }}
                                      className={`hours_input ${estHrsError && "error-border"
                                        }`}
                                      placeholder="Hours"
                                    />
                                  </Tooltip>
                                  <div style={{ color: "red" }}>
                                    {estHrsError}
                                  </div>
                                </div>
                                <div className="hours_min_container">
                                  <Tooltip title="Add mins and press enter key">
                                    <Input
                                      min={0}
                                      max={59}
                                      type="number"
                                      defaultValue={viewTask.estimated_minutes}
                                      className={`hours_input ${estMinsError && "error-border"
                                        }`}
                                      placeholder="Minutes"
                                      onPressEnter={(e) => {
                                        const value = e.target.value;
                                        handleEstTimeViewInput(
                                          "est_mins",
                                          value
                                        );
                                      }}
                                    />
                                  </Tooltip>
                                  <div style={{ color: "red" }}>
                                    {estMinsError}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{ cursor: "pointer" }}>
                                  <Popover
                                    trigger="hover"
                                    visible={visible}
                                    arrow={false}
                                    placement="bottom"
                                    style={{ margin: "0" }}
                                    content={
                                      <>
                                        <div
                                          onClick={
                                            isDisabledTrackManually ? undefined : popOver
                                          }
                                          style={{
                                            cursor: isDisabledTrackManually
                                              ? "not-allowed"
                                              : "pointer",
                                            opacity: isDisabledTrackManually ? 0.5 : 1,
                                            pointerEvents: isDisabledTrackManually
                                              ? "none"
                                              : "auto",
                                          }}
                                        >
                                          <p >
                                            <EditOutlined
                                              style={{
                                                marginRight: "20px",
                                                marginBottom: "10px",
                                                color: isDisabledTrackManually
                                                  ? "gray"
                                                  : "green",
                                              }}

                                            />
                                            Track Manually
                                          </p>
                                        </div>
                                        {hasPermission(["view_timesheet"]) && (
                                          <div
                                            onClick={() => {
                                              popOverTimeLogged();
                                              getTimeLogged(taskId);
                                              setExpandedRowKey(null);
                                              setIsEditable((prevState) => ({
                                                ...prevState,
                                                estimated_time: false,
                                              }));
                                            }}
                                            style={{ cursor: "pointer" }}
                                          >
                                            <p>
                                              {" "}
                                              <FieldTimeOutlined
                                                style={{ marginRight: "20px" }}
                                              />{" "}
                                              Logged Time Detail
                                            </p>
                                          </div>
                                        )}
                                      </>
                                    }
                                    className="flex-table"
                                    onVisibleChange={openPopOver}
                                  >
                                    {isLoggedHoursMoreThanEstimated(
                                      taskDetails.time,
                                      `${taskDetails?.estimated_hours}:${taskDetails?.estimated_minutes}`
                                    ) && (
                                        <i
                                          style={{ color: "red" }}
                                          className="fi fi-ss-triangle-warning"
                                        ></i>
                                      )}
                                    <p className="logged-time">
                                      <span>Logged Time : </span>
                                      {taskDetails?.time} /{" "}
                                      <span>Estimated time : </span>
                                      <span
                                        onClick={() =>
                                          handleFieldClick("estimated_time")
                                        }
                                      >
                                        {`${taskDetails?.estimated_hours}:${taskDetails?.estimated_minutes}`}
                                      </span>
                                    </p>
                                  </Popover>
                                  {estError && (
                                    <div className="error-message">
                                      Logged hours cannot be greater than
                                      estimated hours.
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </Form.Item>
              </Form>

              <div className="file-upload">
                <h5>Attached Files</h5>
              </div>
              <div className="fileAttachment_container">
                {(() => {
                  const attachments = [
                    ...(fileViewAttachment || []),
                    ...(populatedViewFiles || []),
                  ];
                  return attachments.map((file, index) => {
                    const fileName = file?.name || file?.file_name || "";
                    const fileType = file?.file_type || file?.type || "";
                    const rawPath = file?.path || file?.file_path || "";
                    const href = rawPath
                      ? `${process.env.REACT_APP_API_URL}/public/${rawPath}`
                      : undefined;
                    return (
                    <Badge
                      key={index}
                      count={
                        <CloseCircleOutlined
                          onClick={() => removeAttachmentViewFile(index, file)}
                        />
                      }
                    >
                      <div className="fileAttachment_Box">
                          {href ? (
                            <a
                              className="fileNameTxtellipsis"
                              href={href}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                          {fileName && fileName.length > 15
                            ? `${fileName.slice(0, 15)}.....${fileType}`
                            : `${fileName}${fileType}`}
                            </a>
                          ) : (
                            <span className="fileNameTxtellipsis">
                              {fileName && fileName.length > 15
                                ? `${fileName.slice(0, 15)}.....${fileType}`
                                : `${fileName}${fileType}`}
                            </span>
                          )}
                      </div>
                    </Badge>
                    );
                  });
                })()}
              </div>
              {populatedViewFiles?.length > 0 && (
                <div className="folder-comment">
                  <Form.Item
                    label="Folder"
                    initialValue={
                      foldersList.length > 0 ? foldersList[0]?._id : undefined
                    }
                    name="folder"
                    rules={[
                      {
                        required: true,
                      },
                    ]}
                  >
                    <Select placeholder="Please Select Folder" showSearch>
                      {foldersList.map((data) => (
                        <Option
                          key={data?._id}
                          value={data?._id}
                          style={{ textTransform: "capitalize" }}
                        >
                          {data.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              )}

              <Tooltip placement="top" title="Attached file">
                <Button
                  className="link-btn"
                  onClick={() => attachmentViewfileRef.current.click()}
                >
                  <i className="fi fi-ss-link"></i> Attach files
                </Button>
              </Tooltip>
              <input
                multiple
                type="file"
                accept="*"
                onChange={onFileViewChange}
                hidden
                ref={attachmentViewfileRef}
              />

              <div className="attachment-comment">
                <div
                  className="table-schedule-wrapper"
                  style={{ background: "white" }}
                >
                  <h5>Bugs</h5>
                  <ul>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">Id</div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">Name</div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">Status</div>
                      </div>
                      <div className="table-right">
                        <div className="bug-iconwrapper">
                          <i class="fi fi-rr-briefcase"></i>
                          <div className="flex-table">Reporter</div>
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="bug-iconwrapper">
                          <i class="fi fi-tr-boss"></i>
                          <div className="flex-table">Assignee</div>
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="bug-iconwrapper">
                          <i class="fi fi-rr-calendar"></i>
                          <div className="flex-table"> Due Date</div>
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="bug-iconwrapper">
                          <i class="fi fi-rr-calendar"></i>
                          <div className="flex-table"> Created At</div>
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>
                      <div className="table-left">
                        {hasPermission(["bug_add"]) && issuetitleflag ? (
                          <Input
                            name="issue"
                            placeholder="Enter bug title"
                            onChange={(e) => {
                              setIssuetitle(e.target.value);
                            }}
                            onPressEnter={(e) => handleissuedata(e)}
                          />
                        ) : (
                          <div
                            className="flex-table"
                            onClick={() => setIssuetitleflag(true)}
                          >
                            <span className="add-bug">
                              Add Bug and hit enter key
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>{" "}
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>{" "}
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>{" "}
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>
                    </li>
                    {issuedata?.map((value) => {
                      return (
                        <li>
                          <div className="table-left">
                            <div className="flex-table">{value?.bugId}</div>
                          </div>
                          <div className="table-left">
                            <div className="flex-table">
                              <Link
                                to={`/${companySlug}/project/app/${projectId}?tab=Bugs&bugID=${value?._id}`}
                              >
                                {value?.title}
                              </Link>
                            </div>
                          </div>
                          <div className="table-left">
                            <div
                              className="flex-table"
                              style={{ color: "orange" }}
                            >
                              {value?.bug_status}
                            </div>
                          </div>

                          <div className="table-left">
                            <Tooltip
                              title={removeTitle(value?.reporter)}
                              key={value?.reporter}
                            >
                              <MyAvatar
                                userName={value?.reporter}
                                alt={value?.reporter}
                                key={value?.reporter}
                              />
                            </Tooltip>
                          </div>
                          <div className="table-left">
                            {value?.assignees?.length > 0 ? (
                              <Avatar.Group
                                maxCount={2}
                                maxPopoverTrigger="click"
                                size="default"
                                maxStyle={{
                                  color: "#f56a00",
                                  backgroundColor: "#fde3cf",
                                  cursor: "pointer",
                                }}
                              >
                                {value?.assignees &&
                                  value?.assignees?.map((data) => (
                                    <Tooltip
                                      title={removeTitle(data.full_name)}
                                      key={data.full_name}
                                    >
                                      <MyAvatar
                                        userName={data.full_name}
                                        alt={data.full_name}
                                        src={data.emp_img}
                                        key={data.full_name}
                                      />
                                    </Tooltip>
                                  ))}
                              </Avatar.Group>
                            ) : (
                              "-"
                            )}
                          </div>
                          <div className="table-left">
                            <div className="flex-table">
                              {moment(value?.due_date).format("DD-MMM-YYYY") ==
                                "Invalid date"
                                ? "-"
                                : moment(value?.due_date).format("DD-MMM-YYYY")}
                            </div>
                          </div>
                          <div className="table-left">
                            <div className="flex-table">
                              {moment(value?.createdAt).format("DD-MMM-YYYY")}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="right-task-detail-panel">
            <div className="right-toolbar">
              <div className="right-toolbar-tab">
                <label
                  onClick={() => {
                    handleTabChange("comments");
                    getComment(taskDetails?._id);
                  }}
                  style={{ cursor: "pointer" }}
                  className={`${activeClass()}`}
                >
                  Comments
                  <span className="comment-badge">{comments.length || 0}</span>
                </label>

                <label
                  onClick={() => {
                    handleTabChange("task");
                    getTaskhistory();
                  }}
                  style={{ cursor: "pointer" }}
                  className={`${activeClass1()}`}
                >
                  Task History
                </label>
              </div>
            </div>

            <div
              className={` task-history-inner  task-detail-inner ${activeTab?.toLowerCase()}`}
            >
              {activeTab === "comments" ? (
                <>
                  <div className="comment-list-wrapper" ref={commentListRef}>
                    {comments && comments.length > 0 ? (
                      comments?.map((item, index) => {
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
                                    color: userColors[item.sender] || "#000",
                                  }}
                                >
                                  {removeTitle(item.sender)}
                                </h1>
                                <h4>
                                  {calculateTimeDifference(item.createdAt)} (
                                  {moment(item?.createdAt).format("DD-MM-YYYY")}
                                  )
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
                                    onClick={handleDropdownClick}
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
                                    __html: item?.comment,
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
                                          alignItems: "center",
                                        }}
                                      >
                                        <p
                                          style={{
                                            margin: "0px 10px",
                                            flex: 1,
                                          }}
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
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<DownloadOutlined />}
                                          onClick={() =>
                                            handleDownloadFile(file)
                                          }
                                          style={{
                                            minWidth: "auto",
                                            padding: "4px 8px",
                                          }}
                                        />
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
                    id={taskDetails?._id} // Task ID
                    setTextAreaValue={setTextAreaValue} // Function to set text area value
                    isTextAreaFocused={isTextAreaFocused} // Boolean for text area focus state
                    setIsTextAreaFocused={setIsTextAreaFocused} // Function to set focus state
                    textAreaValue={textAreaValue}
                    userList={taggedUserList}
                    getBoardTasks={getBoardTasks}
                    mainTaskId={taskDetails?.mainTask?._id}
                    onDraftChange={handleDraftChange}
                    updateTaskDraftStatus={updateTaskDraftStatus}
                  />
                </>
              ) : activeTab === "issue" ? (
                <div
                  className="tab-schedule-wrapper"
                  style={{ background: "white" }}
                >
                  <ul>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">Id</div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">Name</div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">Status</div>
                      </div>
                      <div className="table-right">
                        <i class="fi fi-rr-briefcase"></i>
                        <div className="flex-table">Reporter</div>
                      </div>
                      <div className="table-right">
                        <i class="fi fi-tr-boss"></i>
                        <div className="flex-table">Assignee</div>
                      </div>
                      <div className="table-right">
                        <i class="fi fi-rr-calendar"></i>
                        <div className="flex-table"> Due Date</div>
                      </div>
                      <div className="table-right">
                        <i class="fi fi-rr-calendar"></i>
                        <div className="flex-table"> Created At</div>
                      </div>
                    </li>
                    <li>
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>
                      <div className="table-left">
                        {issuetitleflag ? (
                          <Input
                            name="issue"
                            placeholder="Enter bug title"
                            onChange={(e) => {
                              setIssuetitle(e.target.value);
                            }}
                            onPressEnter={(e) => handleissuedata(e)}
                          />
                        ) : (
                          <div
                            className="flex-table"
                            onClick={() => setIssuetitleflag(true)}
                          >
                            Add Bug and hit enter key
                          </div>
                        )}
                      </div>
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>{" "}
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>{" "}
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>{" "}
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>
                      <div className="table-left">
                        <div className="flex-table"></div>
                      </div>
                    </li>
                    {issuedata?.map((value) => {
                      return (
                        <li>
                          <div className="table-left">
                            <div className="flex-table">{value?.bugId}</div>
                          </div>
                          <div className="table-left">
                            <div className="flex-table">
                              <Link
                                to={`/${companySlug}/project/app/${projectId}?tab=Bugs&bugID=${value?._id}`}
                              >
                                {value?.title}
                              </Link>
                            </div>
                          </div>
                          <div className="table-left">
                            <div
                              className="flex-table"
                              style={{ color: "orange" }}
                            >
                              {value?.bug_status}
                            </div>
                          </div>

                          <div className="table-left">
                            <Tooltip
                              title={removeTitle(value?.reporter)}
                              key={value?.reporter}
                            >
                              <MyAvatar
                                userName={value?.reporter}
                                alt={value?.reporter}
                                key={value?.reporter}
                              />
                            </Tooltip>
                          </div>
                          <div className="table-left">
                            {value?.assignees.length > 0 ? (
                              <Avatar.Group
                                maxCount={2}
                                maxPopoverTrigger="click"
                                size="default"
                                maxStyle={{
                                  color: "#f56a00",
                                  backgroundColor: "#fde3cf",
                                  cursor: "pointer",
                                }}
                              >
                                {value?.assignees &&
                                  value?.assignees?.map((data) => (
                                    <Tooltip
                                      title={removeTitle(data.full_name)}
                                      key={data.full_name}
                                    >
                                      <MyAvatar
                                        key={data.full_name}
                                        userName={data.full_name}
                                        alt={data.full_name}
                                        src={data.emp_img}
                                      />
                                    </Tooltip>
                                  ))}
                              </Avatar.Group>
                            ) : (
                              "-"
                            )}
                          </div>
                          <div className="table-left">
                            <div className="flex-table">
                              {moment(value?.due_date).format("DD-MMM-YYYY") ==
                                "Invalid date"
                                ? "-"
                                : moment(value?.due_date).format("DD-MMM-YYYY")}
                            </div>
                          </div>
                          <div className="table-left">
                            <div className="flex-table">
                              {moment(value?.createdAt).format("DD-MMM-YYYY")}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="task-history">
                  {taskHistory.map((item, index) => {
                    let updateKey = item?.updated_key
                      .replace("_", " ")
                      .includes("assignee")
                      ? "Assigned people"
                      : item?.updated_key.replace("_", " ");

                    return (
                      <div className="task-history-wrapper" key={item._id}>
                        {item.updated_key === "createdAt" ? (
                          <div className="task-history-img">
                            <MyAvatar
                              key={item._id}
                              userName={item.createdBy?.full_name}
                              alt={item.createdBy?.full_name}
                              src={item.createdBy?.emp_img}
                            />
                            <span className="history-details">
                              <strong>
                                {removeTitle(item.createdBy.full_name)}
                              </strong>{" "}
                              added the task &nbsp;
                              <span className="hitory-time">
                                {calculateTimeDifference(item?.createdAt)} (
                                {moment(item?.createdAt).format("DD-MM-YYYY")})
                              </span>
                            </span>
                          </div>
                        ) : (
                          <div className="task-history-img">
                            <MyAvatar
                              key={item._id}
                              userName={item.updatedBy?.full_name}
                              alt={item.updatedBy?.full_name}
                              src={item.updatedBy?.emp_img}
                            />

                            <span className="history-details">
                              {item.updatedBy.full_name} updated the task &nbsp;
                              <span className="hitory-time">
                                {calculateTimeDifference(item?.updatedAt)}
                              </span>
                            </span>
                            <div
                              className="history-icon"
                              onClick={() => handleToggle(item, index)}
                              style={{ cursor: "pointer" }}
                            >
                              {storeIndex === item._id && showTaskHistory ? (
                                <DownOutlined />
                              ) : (
                                <RightOutlined />
                              )}
                            </div>
                            {storeIndex === item._id && (
                              <div
                                className="history-data-wrapper"
                                style={{ textTransform: "capitalize" }}
                              >
                                <div className="history-prev">
                                  <h2>Previous:</h2>
                                </div>
                                <div className="history-data">
                                  {/* <h5>
                                    {item.pervious_value
                                      ? item?.updated_key === "start_date" ||
                                        item?.updated_key === "due_date"
                                        ? item?.pervious_value
                                          ? updateKey +
                                          " : " +
                                          moment(item.pervious_value).format(
                                            "DD MMM, YY"
                                          )
                                          : updateKey + " : " + "-"
                                        : updateKey +
                                        " : " +
                                        item.pervious_value
                                      : updateKey + " : " + "-"}
                                  </h5> */}
                                  <h5>
                                    {item.pervious_value ? (
                                      item?.updated_key === "start_date" ||
                                        item?.updated_key === "due_date" ? (
                                        item?.pervious_value ? (
                                          <span>
                                            {updateKey + " : "}
                                            {moment(item.pervious_value).format("DD MMM, YY")}
                                          </span>
                                        ) : (
                                          updateKey + " : " + "-"
                                        )
                                      ) : (
                                        <span>
                                          {updateKey + " : "}
                                          <span dangerouslySetInnerHTML={{ __html: item.pervious_value }} />
                                        </span>
                                      )
                                    ) : (
                                      updateKey + " : " + "-"
                                    )}
                                  </h5>
                                </div>
                                <div className="history-prev">
                                  <h2>New:</h2>
                                </div>
                                <div className="history-data">
                                  <h5>
                                    {item.new_value ? (
                                      item?.updated_key === "start_date" ||
                                        item?.updated_key === "due_date" ? (
                                        item?.new_value ? (
                                          <span>
                                            {updateKey + " : "}
                                            {moment(item.new_value).format("DD MMM, YY")}
                                          </span>
                                        ) : (
                                          updateKey + " : " + "-"
                                        )
                                      ) : (
                                        <span>
                                          {updateKey + " : "}
                                          <span dangerouslySetInnerHTML={{ __html: item.new_value }} />
                                        </span>
                                      )
                                    ) : (
                                      updateKey + " : " + "-"
                                    )}
                                  </h5>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

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
};

export default React.memo(TaskList, (prevProps, nextProps) => {
  console.log("🚀 ~ prevProps, nextProps:", prevProps, nextProps)
  return isEqual(prevProps.tasks, nextProps.tasks) && isEqual(prevProps.isEditTaskSave, nextProps.isEditTaskSave);
});
