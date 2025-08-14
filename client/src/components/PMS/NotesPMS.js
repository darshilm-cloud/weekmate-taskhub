import {
  Button,
  Popover,
  Menu,
  Dropdown,
  Modal,
  Form,
  Input,
  Avatar,
  Checkbox,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Row,
  Col,
} from "antd";
import UtilFunctions from "../../util/UtilFunctions";
import {
  UsergroupAddOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { debounce } from "lodash";
import Service from "../../service";
import { useDispatch, useSelector } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions/Auth";
import { useParams } from "react-router-dom";
import useEffectAfterMount from "../../util/useEffectAfterMount";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import { AiOutlineDelete } from "react-icons/ai";
import AddComment from "../../ReuseComponent/AddComment/AddComment";
import { fileImageSelect } from "../../util/FIleSelection";
import {
  getFolderList,
  getTaggedUserList,
  setData,
} from "../../appRedux/reducers/ApiData";
import { socketEvents } from "../../settings/socketEventName";
import { useSocketAction } from "../../hooks/useSocketAction";
import "./Notestyle.css";
import useUserColors from "../../hooks/customColor";
import MultiSelect from "../CustomSelect/MultiSelect";
import { isCreatedBy } from "../../util/isCreatedBy";
import { calculateTimeDifference } from "../../util/formatTimeDifference";
import { removeTitle } from "../../util/nameFilter";
import MyAvatar from "../Avatar/MyAvatar";
import EditCommentModal from "../Modal/EditCommentModal";
import {
  getNotesDraft,
  hasNoteCommentDraft,
  hasNotesDraft,
  saveNotesDraft,
} from "../../cacheDB";
import moment from "moment";
import NotesFilter from "./NotesFilter";

function NotesPMS() {
  const { emitEvent } = useSocketAction();

  const [formNotes] = Form.useForm();
  const attachmentfileRef = useRef();
  const commentListRef = useRef(null);
  const { foldersList, taggedUserList } = useSelector((state) => state.apiData);
  const { Search } = Input;
  const searchRef = useRef();
  const { projectId } = useParams();
  const dispatch = useDispatch();

  const [projectNotebook, setProjectNotebook] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageNo: 10,
  });
  const [filterData] = useState([]);
  const [sortColumn] = useState("_id");
  const [sortOrder] = useState("desc");
  const [searchText, setSearchText] = useState("");
  const [isopenNotes, setIopenNotes] = useState(false);
  const [selectedNotebook, setSelectedNotebook] = useState({});
  const [selectedSubscribers, setselectedSubscribers] = useState([]);
  const [modelModeNotes, setModelModeNotes] = useState("add");
  const [notesDetails, setNotesDetails] = useState([]);
  const [isPrivate, setIsprivate] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState("");
  const [EditNotedetailId, setEditNotedetailId] = useState("");
  const [isOpenTechnicalModal, setIsOpenTechnicalModal] = useState(false);
  const [openSubscribers, setOpenSubscribers] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");
  const [filterSubscribers, setfilterSubscribers] = useState(["all"]);
  const [filterSubscribersSearchInput, setfilterSubscribersSearchInput] =
    useState("");
  const [subscribers, setSubscribers] = useState([]);
  const [clients, setClients] = useState([]);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(notesDetails.title);
  const [storeSubscribers, setStoreSubscribers] = useState(null);
  const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
  const [textAreaValue, setTextAreaValue] = useState("");
  const [comments, setComments] = useState([]);
  const [commentsedit, setCommentsedit] = useState({});
  const [openCommentModel, setOpenCommentModle] = useState(false);
  const [formComment] = Form.useForm();
  const [commentVal, setCommentVal] = useState("");
  const [getDetails, setGetDetails] = useState([]);
  const [allSubscribers, setallSubscribers] = useState([]);
  const [managePeopleVisible, setManagePeopleVisible] = useState(false);
  const [manageSubscribers, setManageSubscribers] = useState([]);
  const [initialDetails, setInitialDetails] = useState([]);
  const [notesId, setNotesId] = useState("");
  const [editorData, setEditorData] = useState("");

  const [filterSubscribersSearch, setfilterSubscribersSearch] = useState("");
  const [filterSubscribersSearch1, setfilterSubscribersSearch1] = useState("");

  const [fileAttachment, setfileAttachment] = useState([]);
  const [populatedFiles, setPopulatedFiles] = useState([]);
  const [deleteFileData, setDeleteFileData] = useState([]);
  const [taggedUser, setTaggedUser] = useState([]);
  const [tempSubID, setTempSubID] = useState("");

  //UseState to store exist data for notification:
  const [newFilteredAssignees, setNewFilteredAssignees] = useState([]);
  const [newFilteredClients, setNewFilteredClients] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedClient, setSelectedClient] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [searchKeyword, setSearchKeyword] = useState("");
  const [IsEdit, setIsEdit] = useState(true);

  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSearch = (searchValue) => {
    setSearchKeyword(searchValue);
  };

  const handleCommentDraftChange = (noteId, hasDraft) => {
    setCommentDrafts((prev) => ({
      ...prev,
      [noteId]: hasDraft,
    }));
  };

  const handleSelectedClientsChange = (selectedItemIds) => {
    setSelectedClient(
      clients.filter((item) => selectedItemIds.includes(item._id))
    );
    setSearchKeyword("");
  };

  const handleSelectedItemsChange = (selectedItemIds) => {
    setselectedSubscribers(
      subscribers.filter((item) => selectedItemIds.includes(item._id))
    );
    setSearchKeyword("");
  };

  const handleOpenChangeAssignees = (newOpen) => {
    setOpenSubscribers(newOpen);
  };

  const userColors = useUserColors(comments);

  const showModalTechnical = () => {
    setIsOpenTechnicalModal(!isOpenTechnicalModal);
    setManagePeopleVisible(false);
    handleTabChange("comments");
    setTextAreaValue("");
    setIsTextAreaFocused(false);
    setfileAttachment([]);
    formComment.resetFields();
  };

  const handleDropdownClick2 = () => {
    setIsOpenTechnicalModal(true);
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const activeClass = () => {
    if (activeTab === "comments") {
      return "active";
    } else {
      return "";
    }
  };

  const activeClass1 = () => {
    if (activeTab === "Subscribers") {
      return "active";
    } else {
      return "";
    }
  };

  const openModelNotes = () => {
    formNotes.setFieldsValue({
      subscribers: subscribers.map((item) => item._id),
    });
    setSelectedItems(subscribers.map((item) => item._id));
    setIopenNotes(true);
    setModelModeNotes("add");
  };

  const handleCancelNote = () => {
    setEditorData("");
    setIopenNotes(false);
    setselectedSubscribers([]);
    setSelectedItems([]);
    setSelectedClient([]);
    formNotes.resetFields();
  };

  // listing subscribers api
  const getProjectSubscribersList = async (notebook_id) => {
    try {
      const reqBody = {
        notebook_id: notebook_id,
      };
      const params = `/${projectId}`;
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getMasterSubscribers + params,
        body: reqBody,
      });
      if (response?.data && response?.data?.data?.length > 0) {
        const uniqueNamesSet = new Set();

        // Filter the data array to get unique names and their corresponding IDs
        const uniqueNamesWithIds = response?.data?.data.reduce(
          (result, item) => {
            if (!uniqueNamesSet.has(item.full_name)) {
              uniqueNamesSet.add(item.full_name);
              result.push({
                _id: item._id,
                full_name: item.full_name,
                first_name: item.first_name,
                emp_img: item.emp_img,
              });
            }
            return result;
          },
          []
        );

        setSubscribers(uniqueNamesWithIds);

        setallSubscribers(uniqueNamesWithIds);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getClientList = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getClients,
        body: {
          isDropdown: true,
          project_id: projectId,
        },
      });
      if (response?.data?.data) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // click on the edit then getnotesbyid api is calling
  const showEditModalNote = async (data, value) => {
    setModelModeNotes("edit");
    try {
      const reqBody = {
        notebook_id: selectedNotebook._id,
        _id: data?._id,
        subscribers: value,
        project_id: projectId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getNotes,
        body: reqBody,
      });
      if (response?.data && response?.data?.data) {
        setCurrentNoteId(data?._id);
        getProjectSubscribersList(data);
        setIopenNotes(true);
        const subData_client = data.pms_clients.map((item) => item._id);
        const subData = data.subscribers.map((item) => item._id);
        formNotes.setFieldsValue({
          title: data?.title,
          subscribers: subData,
          clients: subData_client,
        });
        handleSelectedItemsChange(subData);
        handleSelectedClientsChange(subData_client);
        //Set Data for send notification to filtered users:
        setNewFilteredAssignees(subData);
        setNewFilteredClients(subData_client);
        setIsprivate(response.data.data.isPrivate);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // add project notes
  const addProjectNotes = async (values, isPrivate) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        title: values.title.trim(),
        color: "#000000",
        subscribers: values.subscribers,
        project_id: projectId,
        noteBook_id: selectedNotebook._id,
        isPrivate: isPrivate ? true : false,
        pms_clients: selectedClient.map((item) => item._id),
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addNotes,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        getNotesById(selectedNotebook._id);
        await emitEvent(socketEvents.ADD_NOTE_SUBSCRIBERS, response.data.data);
        formNotes.resetFields();
        handleCancelNote();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get project notes api
  const getNotesById = async (id, value) => {
    try {
      const reqBody = {
        // notebook_id: id,
        subscribers: value,
        project_id: projectId,
      };
      if (searchText && searchText != "") {
        reqBody.search = searchText;
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getNotes,
        body: reqBody,
      });
      if (response?.data && response?.data?.data) {
        const notesWithDrafts = await Promise.all(
          response.data.data.map(async (note) => ({
            ...note,
            hasDraft: await hasNotesDraft(note._id),
          }))
        );
        setGetDetails(notesWithDrafts);
        setIsEdit(response.data.data.some((item) => item.isEditable));
      }
    } catch (error) {
      console.log(error);
    }
  };

  // delete project notes
  const deleteProjectNotes = async (id) => {
    dispatch(showAuthLoader());
    try {
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteNotes + params,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.status) {
        message.success(response.data.message);
        getNotesById(selectedNotebook._id);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // update project notes
  const updateProjectNotes = async (values, isPrivate) => {
    dispatch(showAuthLoader());
    try {
      const params = `/${currentNoteId}`;
      const reqBody = {
        title: values.title.trim(),
        isPrivate: isPrivate ? true : false,
        color: "#000000",
        subscribers: selectedSubscribers.map((item) => item._id)
          ? selectedSubscribers.map((item) => item._id)
          : selectedItems,
        notebook_id: selectedNotebook._id,
        notesInfo: editorData,
        pms_clients: selectedClient,
        project_id: projectId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateNotes + params,
        body: reqBody,
      });

      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        let filterAssignees = selectedSubscribers
          .map((item) => item._id)
          .filter((id) => !newFilteredAssignees.some((user) => user === id));
        let filterClients = selectedClient
          .map((item) => item._id)
          .filter((id) => !newFilteredClients.some((user) => user === id));

        await emitEvent(socketEvents.EDIT_NOTE_SUBSCRIBERS, {
          _id: currentNoteId,
          subscribers: filterAssignees,
          pms_clients: filterClients,
        });
        getNotesById(selectedNotebook._id);
        handleCancelNote();
        setEditorData("");
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  // update when details model open
  const updateNotesModel = async (values, isPrivate) => {
    dispatch(showAuthLoader());
    try {
      const params1 = EditNotedetailId;
      const params = `/${params1}`;

      const reqBody = {
        title: values.title,
        isPrivate: isPrivate ? true : false,
        color: "#000000",
        subscribers: storeSubscribers,
        notebook_id: selectedNotebook._id,
        notesInfo: editorData,
      };
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateNotes + params,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        await saveNotesDraft(EditNotedetailId, "");
        setHasUnsavedChanges((prev) => ({
          ...prev,
          [notesDetails._id]: false,
        }));
        message.success(response.data.message);
        getNotesById(selectedNotebook._id);
        handleCancelNote();
        setEditorData("");
        setIsOpenTechnicalModal(false);
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  // get notes details
  const openModelList = async (id) => {
    try {
      setTempSubID(id);
      const reqBody = {
        _id: id,
        notebook_id: selectedNotebook._id,
        project_id: projectId,
      };
      if (filterSubscribers != "all" && filterSubscribers != "unassigned") {
        reqBody.subscribers =
          filterSubscribers.length > 0
            ? filterSubscribers
            : subscribers.map((item) => item.id);
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getNotes,
        body: reqBody,
      });
      if (response?.data && response?.data?.data) {
        setStoreSubscribers(
          response.data.data.subscribers.map((item) => item._id)
        );
        setNotesDetails(response.data.data);
        setEditNotedetailId(response.data.data._id);
        getProjectSubscribersList(id);

        const data = response.data?.data?.subscribers.map((val) => {
          return val?._id;
        });
        setManageSubscribers(data);
        setInitialDetails(data);
        setNotesId(id);
        setEditorData(response.data.data.notesInfo);
        getNotesById(selectedNotebook?._id);
      }
      const draftContent = await getNotesDraft(id);
      if (draftContent) {
        setEditorData(draftContent);
        setHasUnsavedChanges((prev) => ({
          ...prev,
          [id]: draftContent !== response.data.data.notesInfo,
        }));
      } else {
        setEditorData(response.data.data.notesInfo);
        setHasUnsavedChanges((prev) => ({
          ...prev,
          [id]: false,
        }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  useEffect(() => {
    getNotesById();
    getProjectSubscribersList();
    getClientList(projectId);
  }, [
    searchText,
    pagination.current,
    pagination.pageSize,
    sortOrder,
    sortColumn,
  ]);

  useEffect(() => {
    if (notesDetails?._id) {
      dispatch(
        getTaggedUserList(false, false, false, notesDetails?._id, false)
      );
    }
  }, [notesDetails]);

  //  get project notebook
  const getProjectNotebook = async (noteId, selectionFalse) => {
    try {
      const reqBody = {
        pageNo: pagination.current,
        sort: sortColumn,
        sortBy: sortOrder,
        project_id: projectId,
      };
      if (searchText && searchText != "") {
        reqBody.search = searchText;
      }
      if (noteId) {
        reqBody._id = noteId;
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getNotebook,
        body: reqBody,
      });
      if (response?.data?.data?.length > 0) {
        if (filterData?.isActive == true) {
          setPagination((prevPagination) => ({
            ...prevPagination,
            total: response.data.metadata.total,
          }));
        } else {
          setPagination({
            ...pagination,
            total: response.data.metadata.total,
          });
        }
        setProjectNotebook(response.data.data);
        if (selectionFalse) {
          getNotesById(selectedNotebook._id);
          return;
        }
        getNotesById(response.data.data[0]?._id);
        setSelectedNotebook(response.data.data[0]);
      } else {
        setProjectNotebook([]);
        setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffectAfterMount(() => {
    // getProjectNotebook();
    dispatch(getFolderList(projectId));
    // dispatch(getSubscribersList(projectId));
  }, [searchText, projectId]);

  useEffectAfterMount(() => {
    getNotesById();
  }, [searchText, projectId]);

  useEffect(() => {
    const checkDrafts = async () => {
      const drafts = {};
      for (const note of getDetails) {
        drafts[note._id] = await hasNotesDraft(note._id);
      }
    };

    checkDrafts();
  }, [getDetails]);

  useEffect(() => {
    const checkCommentDrafts = async () => {
      if (notesId) {
        const hasDraft = await hasNoteCommentDraft(notesId);
        setCommentDrafts((prev) => ({
          ...prev,
          [notesId]: hasDraft,
        }));
      }
    };

    checkCommentDrafts();
  }, [notesId]);

  // filtering
  const handleSelectionAssignedFilter = (value) => {
    if (
      value === "all" ||
      value === "" ||
      value === undefined ||
      value === null
    ) {
      return setfilterSubscribers(["all"]);
    }
    if (value === "unassigned") {
      return setfilterSubscribers(["unassigned"]);
    } else {
      setfilterSubscribers((prevFilterSubscribers) => {
        if (prevFilterSubscribers.includes("all")) {
          return [value];
        } else if (prevFilterSubscribers.includes("unassigned")) {
          return [value];
        } else {
          return prevFilterSubscribers.includes(value)
            ? prevFilterSubscribers.filter((item) => item !== value)
            : [...prevFilterSubscribers, value];
        }
      });
    }
  };
  const handleAllFilter = (reset) => {
    if (filterSubscribers === "all") {
      getNotesById(selectedNotebook._id, "all");
    } else if (filterSubscribers === "unassigned") {
      getNotesById(selectedNotebook._id, "unassigned");
    } else {
      getNotesById(selectedNotebook._id, reset ? [] : filterSubscribers);
    }
    setfilterSubscribersSearchInput("");
    setOpenSubscribers(false);
  };

  const handleCancleFilter = () => {
    setOpenSubscribers(false);
    setfilterSubscribersSearchInput("");
  };

  const handleCommentModel = () => {
    setOpenCommentModle(false);
  };

  const addComments = async (id, taggedUser, folderId, attachments) => {
    const formattedText = UtilFunctions.formatLinks(textAreaValue);
    try {
      const reqBody = {
        note_id: notesId,
        taggedUsers: taggedUser,
        comment: formattedText,
        attachments: attachments,
      };
      if (folderId) {
        reqBody.folder_id = folderId;
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addNotesComment,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response.data?.status) {
        await emitEvent(
          socketEvents.ADD_NOTE_COMMENTS_TAGGED_USERS,
          response.data.data
        );
        getComment(id);
        setTextAreaValue("");
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getComment = async (noteId) => {
    try {
      const reqBody = {
        note_id: noteId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getNotesComment,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response.data?.status) {
        setComments(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleEditComment = async (noteId) => {
    try {
      const reqBody = {
        comment_id: noteId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.historyNotesComment,
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
        getComment(notesId);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteComment = async (Comentid) => {
    try {
      const params = `/${Comentid}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteNotesComment + params,
      });
      if (response?.data && response?.data.data && response?.data?.status) {
        message.success(response.data.message);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
    getComment(notesId);
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

  const handleComments = async (values, updateType) => {
    if (values.uploadedFiles1.length > 0) {
      updateType = handleUpdateComment(values, values.uploadedFiles1);
      return;
    } else {
      handleUpdateComment(values);
    }
    setTextAreaValue("");
    setIsTextAreaFocused(false);
    setOpenCommentModle(false);
  };

  const handleSelect = (option) => {
    setTaggedUser([...new Set([option.key])]);
  };

  const handleUpdateComment = async (values, uploadedFiles) => {
    const formattedText = UtilFunctions.formatLinks(textAreaValue);
    if (deleteFileData.length > 0) {
      deleteUploadedFiles(deleteFileData, "comment");
    }
    try {
      let reqBody = {
        comment: formattedText,
        note_id: notesId,
        taggedUsers: values.taggedUser,
      };
      if (populatedFiles?.length > 0) {
        reqBody = {
          ...reqBody,
          attachments: [
            ...populatedFiles?.map((item) => ({
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
            ...populatedFiles?.map((item) => ({
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
        api_url: Service.updateNotesComment + params,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        await emitEvent(socketEvents.EDIT_NOTE_COMMENTS_TAGGED_USERS, {
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
    getComment(notesId);
  };

  // subscribers checkbox function
  const handleCheckboxChange = (subscriberId) => {
    setManageSubscribers((prevSelected) =>
      prevSelected.includes(subscriberId)
        ? prevSelected.filter((id) => id !== subscriberId)
        : [...prevSelected, subscriberId]
    );
  };

  // subscribers api for click on the update button
  const handleUpdateSubscribers = async () => {
    dispatch(showAuthLoader());
    try {
      const params1 = EditNotedetailId;
      const params = `/${params1}`;
      const reqBody = {
        subscribers: manageSubscribers,
        notebook_id: selectedNotebook._id,
      };
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateNotes + params,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setManagePeopleVisible(false);
        openModelList(notesDetails._id);

        let assignee = new Set(initialDetails);
        let newAssignees = manageSubscribers.filter((id) => !assignee.has(id));

        await emitEvent(socketEvents.EDIT_NOTE_SUBSCRIBERS, {
          _id: notesId,
          subscribers: newAssignees,
          pms_clients: [],
        });
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  const debouncedSaveDraft = useMemo(
    () =>
      debounce(async (noteId, content) => {
        await saveNotesDraft(noteId, content);
      }, 500),
    []
  );

  // for ck editor
  const handleChange = (event, editor) => {
    const data = editor.getData();
    setEditorData(data);

    // Save draft when content changes
    if (notesDetails?._id) {
      debouncedSaveDraft(notesDetails._id, data);
      setHasUnsavedChanges((prev) => ({
        ...prev,
        [notesDetails._id]: data !== notesDetails.notesInfo,
      }));
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

  return (
    <>
      {/* -----------Notes Model----------------- */}
      <Modal
        open={isopenNotes}
        onCancel={handleCancelNote}
        title={modelModeNotes === "add" ? "Add Note" : "Edit Note"}
        className="add-task-modal add-list-modal"
        width="800"
        footer={[
          <Button
            key="cancel"
            className="delete-btn"
            onClick={handleCancelNote}
            size="large"
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            onClick={() => formNotes.submit()}
          >
            Add
          </Button>,
        ]}
      >
        <div className="overview-modal-wrapper">
          <Form
            form={formNotes}
            layout="vertical"
            onFinish={(values) => {
              const val = isPrivate;
              modelModeNotes === "add"
                ? addProjectNotes(values, val)
                : updateProjectNotes(values, val);
            }}
          >
            <Row gutter={[0, 0]}>
              {/* Title - Full width */}
              <Col xs={24} sm={24} md={12} lg={12}>
                <Form.Item
                  label="Title"
                  name="title"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Please enter a valid title",
                    },
                  ]}
                >
                  <Input placeholder="Title" size="large" />
                </Form.Item>
              </Col>

              {/* Subscribers - Full width */}
              <Col xs={24} sm={24} md={12} lg={12}>
                <Form.Item
                  label="Subscribers"
                  name="subscribers"
                  className="subscriber-btn"
                >
                  {subscribers && (
                    <MultiSelect
                      onSearch={handleSearch}
                      onChange={handleSelectedItemsChange}
                      values={
                        selectedItems && selectedItems.map((item) => item._id)
                      }
                      listData={subscribers}
                      search={searchKeyword}
                      onDropdownVisibleChange={(open) =>
                        open && getProjectSubscribersList(selectedNotebook._id)
                      }
                    />
                  )}
                  <div className="list-clear-btn" style={{ marginTop: 8 }}>
                    <Button
                      className="clearbtn ant-delete"
                      onClick={() => {
                        formNotes.setFieldsValue({
                          subscribers: [],
                        });
                        setSelectedItems([]);
                        setselectedSubscribers([]);
                      }}
                      size="small"
                    >
                      Clear
                    </Button>
                  </div>
                </Form.Item>
              </Col>

              {/* Client - Full width */}
              <Col xs={24} sm={24} md={12} lg={12}>
                <Form.Item
                  label="Client"
                  name="clients"
                  className="subscriber-btn"
                >
                  {clients && (
                    <MultiSelect
                      onSearch={handleSearch}
                      onChange={handleSelectedClientsChange}
                      listData={clients}
                      search={searchKeyword}
                    />
                  )}
                  <div className="clear-btn" style={{ marginTop: 8 }}>
                    <Button
                      className="clearbtn ant-delete"
                      onClick={() => {
                        formNotes.setFieldsValue({
                          clients: [],
                        });
                        setSelectedClient([]);
                      }}
                      size="small"
                    >
                      Clear
                    </Button>
                  </div>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>

      <div className="project-wrapper discussion-wrapper notes-wrapper">
        <div className="profilerightbar">
          <div className="profile-sub-head">
            <div className="add-project-wrapper">
              <Search
                ref={searchRef}
                placeholder="Search..."
                onSearch={onSearch}
                style={{ width: 200 }}
                className="mr2"
              />
            </div>
            <div className="head-box-inner"></div>
            <div className="block-status-content">
              <div className="filter-btn-wrapper">
                <NotesFilter
                  filterSubscribers={filterSubscribers}
                  subscribers={subscribers}
                  filterSubscribersSearchInput={filterSubscribersSearchInput}
                  setfilterSubscribersSearchInput={
                    setfilterSubscribersSearchInput
                  }
                  handleSelectionAssignedFilter={handleSelectionAssignedFilter}
                  handleAllFilter={handleAllFilter}
                  handleCancleFilter={handleCancleFilter}
                  getDetails={getDetails}
                />

                {/* <div className="status-content" style={ { cursor: "pointer" } }>

                  <Popover
                    placement="bottomRight"
                    content={
                      <div className="right-popover-wrapper">
                        <ul>
                          <div className="filter-search-box">
                            <li>
                              <Checkbox
                                checked={
                                  filterSubscribers[0] == "all" ||
                                  filterSubscribers.length === 0
                                }
                                onChange={ () =>
                                  handleSelectionAssignedFilter("all", true)
                                }
                              >
                                All
                              </Checkbox>
                            </li>
                            <li>
                              <Checkbox
                                checked={ filterSubscribers[0] == "unassigned" }
                                onChange={ () =>
                                  handleSelectionAssignedFilter(
                                    "unassigned",
                                    true
                                  )
                                }
                              >
                                Unassigned Tasks
                              </Checkbox>
                            </li>
                            <li>
                              <Search
                                value={ filterSubscribersSearchInput }
                                onSearch={ (val) =>
                                  setfilterSubscribersSearchInput(val)
                                }
                                onChange={ (e) =>
                                  setfilterSubscribersSearchInput(e.target.value)
                                }
                              />
                            </li>
                          </div>
                          <div className="filter-assignees assigness-data">
                            { subscribers
                              ?.filter((data) =>
                                data.full_name
                                  ?.toLowerCase()
                                  .includes(
                                    filterSubscribersSearchInput.toLowerCase()
                                  )
                              )
                              .map((item, index) => (
                                <li
                                  key={ index }
                                  className={
                                    filterSubscribers.includes(item._id)
                                      ? "selected-filter-member"
                                      : ""
                                  }
                                >
                                  <Checkbox
                                    key={ index }
                                    checked={ filterSubscribers.includes(item._id) }
                                    onChange={ () =>
                                      handleSelectionAssignedFilter(item._id)
                                    }
                                  />

                                  <MyAvatar
                                    key={ item._id }
                                    userName={ item?.full_name }
                                    alt={ item?.full_name }
                                    src={ item.emp_img }
                                  />
                                  { removeTitle(item.full_name) }
                                </li>
                              )) }
                          </div>
                        </ul>
                        <div className="popver-footer-btn">
                          <Button
                            type="primary"
                            className="square-primary-btn ant-btn-primary"
                            onClick={ () => {
                              handleAllFilter();
                              setfilterSubscribersSearchInput("");
                            } }
                          >
                            Apply
                          </Button>
                          <Button
                            className="square-outline-btn ant-delete"
                            // onClick={() => setOpenSubscribers(false)}
                            onClick={ () => handleCancleFilter() }
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    }
                    trigger="click"
                    open={ openSubscribers && getDetails.length > 0 }
                    onOpenChange={ handleOpenChangeAssignees }
                  >
                    <Button className="dropdown-button">
                      <span className="filter-text">
                        <span> Subscribers: </span>

                        { filterSubscribers.length == 0
                          ? "All"
                          : filterSubscribers == "unassigned"
                            ? "Unassigned "
                            : "Selected" }
                      </span>
                    </Button>
                  </Popover>
                </div> */}
              </div>
            </div>
          </div>
          <div className="notes">
            {getDetails.length == 0 && (
              <div className="error-message">
                <p>No Data</p>
              </div>
            )}

            {projectNotebook.length == 0 &&
              (getDetails.length > 0 ? (
                getDetails?.map((note, index) => {
                  const Title = note.title;

                  return (
                    <>
                      {index == 0 && (
                        <div onClick={openModelNotes} className="notes-box">
                          <div
                            className="note-inner-block"
                            style={{
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <h3 style={{ textAlign: "center", width: "100%" }}>
                              Add a Note
                            </h3>
                          </div>
                        </div>
                      )}
                      <div className="main-notes-wrapper" key={note._id}>
                        <div
                          className="notes-div"
                          style={{ marginBottom: "0px" }}
                        >
                          <div className="notes-box">
                            <div className="note-inner-block">
                              <div className="note-block-head">
                                <h1
                                  onClick={() => {
                                    openModelList(note._id);
                                    setIsOpenTechnicalModal(true);
                                    getComment(note._id);
                                  }}
                                  style={{
                                    textTransform: "capitalize",
                                    cursor: "pointer",
                                  }}
                                >
                                  {Title.length > 23
                                    ? `${Title.slice(0, 22)}...`
                                    : Title}{" "}
                                  {(commentDrafts[note._id] ||
                                    commentDrafts[note._id] ||
                                    hasUnsavedChanges[note._id]) && (
                                    <span style={{ color: "red" }}>Draft</span>
                                  )}
                                </h1>
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      note?.notesInfo.length > 50
                                        ? `${note?.notesInfo.slice(
                                            0,
                                            50
                                          )}........`
                                        : note?.notesInfo,
                                  }}
                                />
                              </div>
                              <footer>
                                <div className="notes-item">
                                  <div className="footer-subscribers">
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
                                      {note.client_sub.map((client_sub) => (
                                        <Tooltip
                                          title={removeTitle(
                                            client_sub.full_name
                                          )}
                                          key={client_sub._id}
                                        >
                                          <MyAvatar
                                            key={client_sub._id}
                                            userName={client_sub.full_name}
                                            alt={client_sub.full_name}
                                            src={client_sub.emp_img}
                                          />
                                        </Tooltip>
                                      ))}
                                    </Avatar.Group>
                                    {
                                      <PlusOutlined
                                        onClick={() => {
                                          openModelList(note._id);
                                          setIsOpenTechnicalModal(true);
                                        }}
                                      />
                                    }
                                  </div>
                                </div>
                                <div className="time-icon-note">
                                  <div className="note-time">
                                    <p>
                                      {calculateTimeDifference(note.createdAt)}
                                    </p>
                                  </div>

                                  <div className="note-view">
                                    <div
                                      className="note-btn-edit"
                                      onClick={(e) => {
                                        showEditModalNote(note);
                                        setIopenNotes(true);
                                      }}
                                    >
                                      {isCreatedBy(note?.createdBy) && (
                                        <EditOutlined
                                          style={{
                                            color: "green",
                                            cursor: "pointer",
                                            marginLeft: "10px",
                                          }}
                                        />
                                      )}
                                    </div>
                                    {isCreatedBy(note?.createdBy) && (
                                      <Popconfirm
                                        title="Do you want to delete?"
                                        okText="Yes"
                                        cancelText="No"
                                        onConfirm={() => {
                                          deleteProjectNotes(note._id);
                                        }}
                                      >
                                        <div className="note-btn-delete">
                                          <AiOutlineDelete
                                            style={{
                                              color: "red",
                                              cursor: "pointer",
                                            }}
                                          />
                                        </div>
                                      </Popconfirm>
                                    )}
                                  </div>
                                </div>
                              </footer>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })
              ) : (
                <div onClick={openModelNotes} className="notes-box">
                  <div
                    className="note-inner-block"
                    style={{ justifyContent: "center", cursor: "pointer" }}
                  >
                    <h3 style={{ textAlign: "center", width: "100%" }}>
                      Add a Note
                    </h3>
                  </div>
                </div>
              ))}

            <Modal
              destroyOnClose
              className="notes-project-modal"
              width={1000}
              title={null}
              open={isOpenTechnicalModal && taggedUserList.length > 0}
              onOk={showModalTechnical}
              footer={null}
              onCancel={() => {
                dispatch(setData({ stateName: "taggedUserList", data: [] }));
                setOpenCommentModle(false);
                setTextAreaValue("");
                showModalTechnical();
              }}
            >
              <div className="task-detail-panel notes-details-model">
                <div className="left-task-detail-panel">
                  <div className="project-title">
                    {isTitleEditing ? (
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                      />
                    ) : (
                      <h1>
                        {notesDetails.title?.length > 40
                          ? `${notesDetails.title.slice(0, 39)}...`
                          : notesDetails.title}
                      </h1>
                    )}
                    <div className="project-edit-block">
                      <Button
                        onClick={updateNotesModel}
                        disabled={!editorData.trim()}
                        type="primary"
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  <header className="editor-action-icons product-details-icons">
                    <CKEditor
                      editor={Custombuild}
                      data={editorData}
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
                      }}
                      onChange={handleChange}
                      onPaste={handlePaste}
                    />
                  </header>
                </div>
                <div className="right-task-detail-panel">
                  <div className="right-toolbar">
                    <div
                      className={`right-toolbar-tab ${activeTab.toLowerCase()}`}
                    >
                      <label
                        onClick={() => {
                          handleTabChange("comments");
                          getComment(notesDetails._id);
                        }}
                        style={{ cursor: "pointer" }}
                        className={`${activeClass()}`}
                      >
                        Comments
                        <span className="comment-badge">
                          {comments.length || 0}
                        </span>
                      </label>
                      <label
                        onClick={() => handleTabChange("Subscribers")}
                        style={{ cursor: "pointer" }}
                        className={`${activeClass1()}`}
                      >
                        Subscribers
                      </label>
                    </div>
                  </div>
                  <div
                    className={`task-detail-inner ${activeTab.toLowerCase()}`}
                  >
                    {activeTab === "comments" ? (
                      <>
                        <div
                          className="comment-list-wrapper"
                          ref={commentListRef}
                        >
                          {comments && comments.length > 0 ? (
                            comments?.map((item, index) => (
                              <div className="main-comment-wrapper" key={index}>
                                <div className="main-avatar-wrapper">
                                  <MyAvatar
                                    key={item._id}
                                    userName={item.sender}
                                    alt={item.sender}
                                    src={item.profile_pic}
                                  />
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
                                        onClick={handleDropdownClick2}
                                      >
                                        <MoreOutlined
                                          style={{ cursor: "pointer" }}
                                        />
                                      </Dropdown>
                                    </div>
                                  )}
                                  <div className="comment-sender-name">
                                    <h1
                                      style={{
                                        color:
                                          userColors[item.sender] || "#000",
                                      }}
                                    >
                                      {removeTitle(item.sender)}
                                    </h1>
                                    <h4>
                                      {calculateTimeDifference(item.createdAt)}{" "}
                                      (
                                      {moment(item?.createdAt).format(
                                        "DD-MM-YYYY"
                                      )}
                                      )
                                    </h4>
                                  </div>
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
                                  <div className="notes-pop-file-wrapper">
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
                                                  )}.....${
                                                    file.file_type || file.type
                                                  }`
                                                : file.name + file.file_type ||
                                                  file.type}
                                            </a>
                                          </div>
                                        </div>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="notes-no-comments">No Comments</div>
                          )}
                        </div>
                        <div className="comment-textarea">
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
                            addComment={addComments}
                            id={notesId}
                            setTextAreaValue={setTextAreaValue}
                            isTextAreaFocused={isTextAreaFocused}
                            setIsTextAreaFocused={setIsTextAreaFocused}
                            textAreaValue={textAreaValue}
                            userList={taggedUserList}
                            onDraftChange={handleCommentDraftChange}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="project-comments-block">
                          <div className="project-search">
                            <Search
                              placeholder="Search..."
                              onSearch={(val) => {
                                setfilterSubscribersSearch(val);
                                setfilterSubscribersSearch1(val);
                              }}
                              className="mr2"
                              suffix={null}
                              style={{
                                width: 200,
                              }}
                            />
                            <h3>
                              {managePeopleVisible ? (
                                allSubscribers
                                  ?.filter((data) =>
                                    data.full_name
                                      ?.toLowerCase()
                                      .includes(
                                        filterSubscribersSearch.toLowerCase()
                                      )
                                  )
                                  .map((subscriber) => (
                                    <div key={subscriber._id}>
                                      <Checkbox
                                        onChange={() =>
                                          handleCheckboxChange(subscriber._id)
                                        }
                                        checked={manageSubscribers.includes(
                                          subscriber._id
                                        )}
                                        value={manageSubscribers}
                                      />
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "row",
                                          marginLeft: "10px",
                                        }}
                                      >
                                        <MyAvatar
                                          userName={subscriber.full_name}
                                          key={subscriber._id}
                                          alt={subscriber.full_name}
                                          src={subscriber.emp_img}
                                        />

                                        <h3>
                                          {removeTitle(subscriber.full_name)}
                                        </h3>
                                      </div>
                                    </div>
                                  ))
                              ) : (
                                <>
                                  {notesDetails.subscribers &&
                                  notesDetails.subscribers.length > 0 ? (
                                    notesDetails.subscribers
                                      ?.filter((data) =>
                                        data.full_name
                                          ?.toLowerCase()
                                          .includes(
                                            filterSubscribersSearch1.toLowerCase()
                                          )
                                      )
                                      .map((subscriber) => (
                                        <div key={subscriber._id}>
                                          <MyAvatar
                                            userName={subscriber.full_name}
                                            key={subscriber._id}
                                            alt={subscriber.full_name}
                                            src={subscriber.emp_img}
                                          />
                                          <h3 className="subscriber-name">
                                            <div className="model-subscribers">
                                              {removeTitle(
                                                subscriber.full_name
                                              )}
                                            </div>
                                          </h3>
                                        </div>
                                      ))
                                  ) : (
                                    <p>Add People to view Subscribers</p>
                                  )}
                                </>
                              )}
                            </h3>
                          </div>
                        </div>
                        <div className="task-tab-btn">
                          {!managePeopleVisible && IsEdit && (
                            <Button
                              type="primary"
                              onClick={() => {
                                getProjectSubscribersList();
                                setManagePeopleVisible(true);
                              }}
                            >
                              <span>
                                <UsergroupAddOutlined />
                              </span>
                              Manage People
                            </Button>
                          )}
                          {managePeopleVisible && (
                            <div className="manage-btn">
                              <Button
                                type="primary"
                                onClick={handleUpdateSubscribers}
                              >
                                Update
                              </Button>
                              <Button
                                onClick={() => {
                                  setManagePeopleVisible(false);
                                  openModelList(tempSubID);
                                }}
                                className="ant-delete"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Modal>
          </div>
        </div>
      </div>

      <EditCommentModal
        open={false}
        cancel={handleCommentModel}
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
      />
    </>
  );
}

export default NotesPMS;
