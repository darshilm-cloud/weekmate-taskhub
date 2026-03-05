import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import PropTypes from "prop-types";
import {
  Button,
  Checkbox,
  Dropdown,
  Form,
  Input,
  List,
  Menu,
  Modal,
  Tooltip,
  Select,
  Badge,
  Popconfirm,
  message,
  Row,
  Col,
} from "antd";
import UtilFunctions from "../../util/UtilFunctions";
import { Comment } from "@ant-design/compatible";
import React, { useEffect, useRef, useState } from "react";

import CkEditorSuperBuild from "../CkEditorSuperBuild";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getSubscribersList,
  getFolderList,
  getClientList,
  getTaggedUserList,
} from "../../appRedux/reducers/ApiData";
import "./discussionForm.css";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import { fileImageSelect } from "../../util/FIleSelection";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";
import useUserColors from "../../hooks/customColor";
import MultiSelect from "../CustomSelect/MultiSelect";
import { isCreatedBy } from "../../util/isCreatedBy";
import { calculateTimeDifference } from "../../util/formatTimeDifference";
import { removeTitle } from "../../util/nameFilter";
import MyAvatar from "../Avatar/MyAvatar";

const { TextArea } = Input;

function CommentList({ comments }) {
  return (
    <List
      dataSource={ comments }
      itemLayout="horizontal"
      renderItem={ (props) => <Comment { ...props } /> }
    />
  );
}

function Editor({ onChange, value }) {
  return (
    <>
      <TextArea
        rows={ 1 }
        onChange={ onChange }
        value={ value }
        placeholder="Write a comment"
      />
    </>
  );
}

function DiscussionForm() {
  const { subscribersList, foldersList, clientsList, taggedUserList } =
    useSelector((state) => state.apiData);
  const { emitEvent } = useSocketAction();
  const dispatch = useDispatch();
  const [formComment] = Form.useForm();

  const searchRef = useRef();
  const Search = Input.Search;
  const { Option } = Select;
  const [discussionForm] = Form.useForm();
  const { projectId } = useParams();

  const attachmentfileRef = useRef();
  const attachmentfileRef2 = useRef();

  const [editedCommnent, setEditedCommnent] = useState("");
  const [discussionComments, setDiscussionComments] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [fileAttachment, setFileAttachment] = useState([]);
  const [commentFile, setCommentFile] = useState([]);
  const [populatedFiles, setPopulatedFiles] = useState([]);
  const [editedFiles, setEditedFiles] = useState([]);
  const [discussionTopic, setDiscussionTopic] = useState([]);
  const [editDiscussionTopic, setEditDiscussionTopic] = useState({});
  const [addEditDiscussion, setAddEditDiscussion] = useState("");
  const [textAreaValue, setTextAreaValue] = useState("");
  const [deleteFileData, setDeleteFileData] = useState([]);
  const [deleteEditedFileData, setDeleteEditedFileData] = useState([]);
  const [folderId, setFolderId] = useState("");
  const [selectedTopic, setselectedTopic] = useState({});
  const [openEditDiscussionModel, setOpenEditDiscussionModel] = useState(false);
  const [topicId, setTopicId] = useState("");
  const [taggedUser, setTaggedUser] = useState([]);
  const [commentId, setCommentId] = useState("");
  const [newFilteredAssignees, setNewFilteredAssignees] = useState([]);
  const [newFilteredClients, setNewFilteredClients] = useState([]);
  const [isModalOpenTopic, setIsModalOpenTopic] = useState(false);
  const [editorData, setEditorData] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  const handleSearch = (searchValue) => {
    setSearchKeyword(searchValue);
  };

  const handleSelectedClientsChange = (selectedItemIds) => {
    // This ensures that we keep track of selected items by their full details, not just ID
    setSelectedClients(
      clientsList.filter((item) => selectedItemIds.includes(item._id))
    );
    setSearchKeyword("");
  };

  const handleSelectedItemsChange = (selectedItemIds) => {
    setSelectedItems(
      subscribersList.filter((item) => selectedItemIds.includes(item._id))
    );
    setSearchKeyword("");
  };

  const handleChangeChatCkeditor = (event, editor) => {
    const data = editor.getData();
    setTextAreaValue(data);
  };

  const handleChangeChatEditCkeditor = (event, editor) => {
    const data = editor.getData();
    setEditedCommnent(data);
  };

  function removeHTMLTags(inputText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(inputText, "text/html");
    return doc.body.textContent || "";
  }
  const showAddTopicModal = () => {
    setIsModalOpenTopic(true);
    setAddEditDiscussion("Add Topic");
  };

  const handleCancelTopic = () => {
    setIsModalOpenTopic(false);
    setSelectedItems([]);

    setFileAttachment([]);
    discussionForm.resetFields();
    discussionForm.setFieldValue({
      pinToTop: "",
      markAsPrivate: "",
    });
    setEditDiscussionTopic({
      isPinToTop: false,
      isPrivate: false,
    });
  };

  const handleSelectToic = (val) => {
    setselectedTopic(val);
    getDiscussionComment(val?._id);
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
    setFileAttachment([...fileAttachment, ...newFiles]);
  };

  const onFileChange1 = (event) => {
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
    setCommentFile([...commentFile, ...newFiles]);
  };

  const removeAttachmentFile = (index, file) => {
    if (file?._id) {
      populatedFiles.splice(index - fileAttachment.length, 1);
      setPopulatedFiles([...populatedFiles]);
      return setDeleteFileData([...deleteFileData, file._id]);
    }
    const newArr = fileAttachment.filter((_, i) => i !== index);
    setFileAttachment(newArr);
  };

  const removeAttachmentFile1 = (index, file) => {
    if (file?._id) {
      editedFiles.splice(index - commentFile.length, 1);
      setEditedFiles([...editedFiles]);
      return setDeleteEditedFileData([...deleteEditedFileData, file._id]);
    }
    const newArr = commentFile.filter((_, i) => i !== index);
    setCommentFile(newArr);
  };

  useEffect(() => {
    const handlePaste = (event) => {
      if (event.clipboardData && event.clipboardData.items.length > 0) {
        for (let i = 0; i < event.clipboardData.items.length; i++) {
          const item = event.clipboardData.items[i];
          if (item.type.indexOf("image") !== -1) {
            const blob = item.getAsFile();
            const file = new File(
              [blob],
              `pasted_image_${Service.uuidv4()}.png`,
              {
                type: blob.type,
                lastModified: Date.now(),
              }
            );
            setCommentFile([...commentFile, file]);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [commentFile]);

  useEffect(() => {
    dispatch(getFolderList(projectId));
    getDiscussionTopic();
    dispatch(getSubscribersList(projectId));
    dispatch(getClientList(projectId));
  }, [projectId, searchText]);

  useEffect(() => {
    if (selectedTopic?._id) {
      dispatch(
        getTaggedUserList(selectedTopic?._id, false, false, false, false)
      );
    }
  }, [selectedTopic]);

  const onSearch = (value) => {
    setSearchText(value);
  };

  // Get Folder api start
  const getDiscussionTopic = async (selectionFalse) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        // isDropdown: false,
        // pageNo: pagination.current,
        // limit: pagination.pageSize,
        // search: searchText,
        project_id: projectId,
        // _id: editTimesheetData?._id
        // sort: sortColumn,
        // sortBy: sortOrder,
      };

      if (searchText && searchText !== "") {
        reqBody.search = searchText;
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getDiscussionTopic,
        body: reqBody,
      });

      if (response?.data?.data && response?.data?.status) {
        setDiscussionTopic(response.data.data);
        setDiscussionComments(response.data.data);
        setDiscussionComments(response.data.data);
        if (response?.data?.data?.length > 0) {
          getDiscussionComment(response.data.data[0]?._id);
        }
        setselectedTopic(response.data.data[0]);
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  // Edit Folder api start
  const getEditDiscussion = async (id) => {
    try {
      setAddEditDiscussion("Edit Topic");
      dispatch(showAuthLoader());

      const reqBody = {
        project_id: projectId,
        _id: id,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getDiscussionTopic,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setIsModalOpenTopic(true);
        setPopulatedFiles(response.data.data?.attachments || []);
        setEditDiscussionTopic(response.data.data);

        const subData = response?.data?.data?.subscribers.map(
          (item) => item?._id
        );
        const subData_client = response?.data?.data?.pms_clients.map(
          (item) => item?._id
        );

        //Set New State for filter notification data;
        setSelectedItems(response?.data?.data?.subscribers);
        setSelectedClients(response?.data?.data?.pms_clients);
        setNewFilteredAssignees(
          response?.data?.data?.subscribers.map((item) => item?._id)
        );
        setNewFilteredClients(
          response?.data?.data?.pms_clients.map((item) => item?._id)
        );
        setEditorData(response.data.data?.descriptions);

        discussionForm.setFieldsValue({
          title: response?.data?.data?.title,
          description: removeHTMLTags(
            response?.data?.data?.descriptions
              ? response?.data?.data?.descriptions
              : ""
          ),
          subscribers: subData,
          clients: subData_client,
          pinToTop: response?.data?.data.isPinToTop,
          markAsPrivate: response?.data?.data.isPrivate,
        });
      } else {
        // setWorkflowList([]);
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteDiscussion = async (id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteDiscussionTopic + "/" + id,
      });

      if (response?.data?.data && response?.data?.status) {
        message.success(response?.data?.message);
        if (discussionTopic.length > 0) {
          getDiscussionTopic();
        }

        getDiscussionTopic();
        setFileAttachment([]);
        dispatch(hideAuthLoader());
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // upload file function start
  const handleTaskOps = async (values, updateType) => {
    if (fileAttachment.length > 0) {
      const uploadedfile = await uploadFiles(fileAttachment, "folder");
      if (uploadedfile.length > 0) {
        updateType
          ? update(values, uploadedfile)
          : upoadFileFolder(values, uploadedfile);
        return;
      } else {
        return message.error("File not uploaded something went wrong");
      }
    }
    updateType ? update(values) : upoadFileFolder(values);
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

  // add discussion  api
  const upoadFileFolder = async (values, uploadedFiles) => {
    dispatch(showAuthLoader());
    try {
      let reqBody = {
        title: values?.title,
        project_id: projectId,
        status: "active",
        descriptions: editorData,
        subscribers: selectedItems.map((item) => item._id),
        pms_clients: selectedClients.map((item) => item._id),
        isPinToTop: values?.pinToTop,
        isPrivate: values?.markAsPrivate,
        folder_id: values?.folder,
      };
      if (populatedFiles?.length > 0) {
        reqBody = {
          ...reqBody,
          attachments: [...populatedFiles],
        };
      }
      if (uploadedFiles) {
        reqBody = {
          ...reqBody,
          attachments: [...populatedFiles, ...uploadedFiles],
        };
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addDiscussion,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        await emitEvent(
          socketEvents.ADD_DISCUSSION_SUBSCRIBERS,
          response.data.data
        );
        setIsModalOpenTopic(false);
        setFileAttachment([]);
        discussionForm.resetFields();
        getDiscussionTopic();
      } else {
        message.error(response?.data?.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
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

  // update discussion api
  const update = async (values, uploadedFiles) => {
    if (deleteFileData.length > 0) {
      deleteUploadedFiles(deleteFileData, "folder");
    }
    dispatch(showAuthLoader());
    try {
      let reqBody = {
        title: values?.title,
        project_id: projectId,
        status: "active",
        descriptions: editorData,
        subscribers: selectedItems.map((item) => item._id),
        pms_clients: selectedClients.map((item) => item._id),
        isPinToTop: values?.pinToTop,
        isPrivate: values?.markAsPrivate,
      };
      if (populatedFiles.length > 0) {
        reqBody = {
          ...reqBody,
          attachments: [
            ...populatedFiles.map((item) => ({
              file_name: item?.name,
              file_path: item?.path,
              _id: item?._id,
              file_type: item?.file_type,
            })),
          ],
        };
      }
      if (uploadedFiles) {
        reqBody = {
          ...reqBody,
          attachments: [
            ...populatedFiles.map((item) => ({
              file_name: item?.name,
              file_path: item?.path,
              _id: item?._id,
              file_type: item?.file_type,
            })),
            ...uploadedFiles,
          ],
          folder_id: values.folder,
        };
      }

      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateDiscussionTopic + "/" + editDiscussionTopic?._id,
        body: reqBody,
      });

      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);

        let filterAssignees = selectedItems
          .map((item) => item._id)
          .filter((id) => !newFilteredAssignees.some((user) => user === id));
        let filterClients = selectedClients
          .map((item) => item._id)
          .filter((id) => !newFilteredClients.some((user) => user === id));
        console.log(
          "🚀 ~ update ~ filterAssignees:",
          filterAssignees,
          filterClients
        );
        //Send notification to users:
        await emitEvent(socketEvents.EDIT_DISCUSSION_SUBSCRIBERS, {
          _id: editDiscussionTopic?._id,
          subscribers: filterAssignees,
          pms_clients: filterClients,
        });
        discussionForm.resetFields();
        getDiscussionTopic();
        setFileAttachment([]);
        setIsModalOpenTopic(false);
        setEditDiscussionTopic({});
      } else {
        message.error(response?.data?.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      message.error("Something went wrong!");
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const handlecomments = async (values, updateType) => {
    dispatch(showAuthLoader());
    if (commentFile.length > 0) {
      const uploadedfile = await uploadFiles(commentFile, "comment");
      if (uploadedfile.length > 0) {
        updateType
          ? updateComment(values, uploadedfile)
          : handleAddComment(values, uploadedfile);
        return;
      } else {
        return message.error("File not uploaded something went wrong");
      }
    }
    updateType ? updateComment(values) : handleAddComment(values);
  };

  const handleAddComment = async (values, uploadedfile) => {
    const formattedText = textAreaValue;

    const extractMentions = (htmlString) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");
      const mentionElements = doc.querySelectorAll(".mention");
      let mentionValues = Array.from(mentionElements).map((mention) =>
        mention.getAttribute("data-mention")
      );
      mentionValues = mentionValues.map((ele) => ele.slice(1));
      mentionValues = mentionValues.map((mentionUser) =>
        taggedUserList.find(
          (employee) => removeTitle(employee?.full_name) === mentionUser
        )
      );
      mentionValues = mentionValues.map((ele) => ele?._id);
      return mentionValues;
    };

    let taggedUserIds = extractMentions(textAreaValue);
    setTaggedUser(taggedUserIds);
    console.log("🚀 ~ handleAddComment ~ taggedUserIds:", taggedUserIds);
    try {
      let reqBody = {
        project_id: projectId,
        title: formattedText,
        taggedUsers: taggedUserIds || taggedUser,
        topic_id: selectedTopic?._id,
        folder_id: folderId,
      };

      if (populatedFiles?.length > 0) {
        reqBody = {
          ...reqBody,
          attachments: [...populatedFiles],
        };
      }
      if (uploadedfile) {
        reqBody = {
          ...reqBody,
          attachments: [...populatedFiles, ...uploadedfile],
        };
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addDiscussionTopicList,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response.data?.status) {
        getDiscussionComment(selectedTopic?._id);

        await emitEvent(
          socketEvents.ADD_DISCUSSION_TAGGED_USERS,
          response.data.data
        );

        setTextAreaValue("");
        setCommentFile([]);
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  const updateComment = async (values, uploadedFiles) => {
    if (deleteEditedFileData.length > 0) {
      deleteUploadedFiles(deleteEditedFileData, "comment");
    }
    dispatch(showAuthLoader());
    try {
      const formattedText = editedCommnent;
      const extractMentions = (htmlString) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        const mentionElements = doc.querySelectorAll(".mention");
        let mentionValues = Array.from(mentionElements).map((mention) =>
          mention.getAttribute("data-mention")
        );
        mentionValues = mentionValues.map((ele) => ele.slice(1));
        mentionValues = mentionValues.map((mentionUser) =>
          taggedUserList.find(
            (employee) => removeTitle(employee?.full_name) === mentionUser
          )
        );
        mentionValues = mentionValues.map((ele) => ele?._id);
        return mentionValues;
      };

      let taggedUserIds = extractMentions(formattedText);
      setTaggedUser(taggedUserIds);

      let reqBody = {
        title: formattedText,
        project_id: projectId,
        topic_id: selectedTopic?._id,
        taggedUsers: taggedUserIds || taggedUser,
      };
      if (editedFiles.length > 0) {
        reqBody = {
          ...reqBody,
          attachments: [
            ...editedFiles.map((item) => ({
              file_name: item?.name,
              file_path: item?.path,
              _id: item?._id,
              file_type: item?.file_type,
            })),
          ],
        };
      }
      if (uploadedFiles) {
        reqBody = {
          ...reqBody,
          attachments: [
            ...editedFiles.map((item) => ({
              file_name: item?.name,
              file_path: item?.path,
              _id: item?._id,
              file_type: item?.file_type,
            })),
            ...uploadedFiles,
          ],
          folder_id: folderId,
        };
      }

      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateDiscussionComment + "/" + commentId?._id,
        body: reqBody,
      });

      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setOpenEditDiscussionModel(false);
        getDiscussionComment(selectedTopic?._id);
        setCommentFile([]);
        setEditedCommnent("");
        setTextAreaValue("");
        formComment.resetFields();
      } else {
        message.error(response?.data?.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  const handleFolderIdChange = (id) => {
    setFolderId(id);
  };

  const getDiscussionComment = async (id) => {
    try {
      const reqBody = {
        project_id: projectId,
        topic_id: id,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getDiscussionComment,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response.data?.status) {
        setDiscussionComments(response.data.data);
        setTopicId(response?.data?.data[0]?._id);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getDiscussionCommentById = async (id) => {
    try {
      const reqBody = {
        project_id: projectId,
        topic_id: selectedTopic?._id || topicId,
        _id: id,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getDiscussionComment,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        let title = UtilFunctions.revertLinks(response.data?.data?.title);
        setOpenEditDiscussionModel(true);
        setEditedCommnent(title);
        setCommentId(response.data.data);
        setEditedFiles(response.data.data?.attachments || []);
        formComment.setFieldsValue({
          comment: response.data.data.title,
        });
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (discussionComments.length == 0) return;
    const element = document.getElementById(
      discussionComments[discussionComments.length - 1]?._id
    );
    if (element) {
      element.scrollIntoView();
    }
  }, [discussionComments]);

  useEffect(() => {
    if (foldersList.length > 0 && folderId == "") {
      handleFolderIdChange(foldersList[0]._id);
    }
  }, [foldersList]);

  const deleteDiscussionComment = async (id) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteDiscussionComment + "/" + id,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        getDiscussionComment(selectedTopic?._id);
        message.success(response?.data?.message);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const userColors = useUserColors(discussionComments);

  return (
    <div className="project-wrapper discussion-wrapper discussion-module">
      <div className="peoject-page">
        <div className="profileleftbar">
          <div className="add-project-wrapper">
            <Button
              type="primary"
              onClick={ showAddTopicModal }
              className="add-btn ant-btn-primary"
            >
              <i className="fi fi-br-plus"></i> Add
            </Button>
            <Search
              ref={ searchRef }
              placeholder="Search..."
              onSearch={ onSearch }
              style={ { width: 200 } }
              className="mr2"
            />
          </div>
          <div className="project-update">
            <ul>
              { discussionTopic?.map((item, index) => {
                return (
                  <li
                    className="design-graph-wrapper"
                    key={ index }
                    style={ { cursor: "pointer" } }
                    onClick={ () => {
                      handleSelectToic(item);
                    } }
                  >
                    <div
                      className={
                        selectedTopic._id == item?._id
                          ? "design-graph"
                          : "design-graph-inactive"
                      }
                    >
                      <span className="discussion-pin-wrapper">
                        { (item?.isPinToTop || item?.isPrivate) && (
                          <span className="louckandpin">
                            { item?.isPinToTop && (
                              <i className="fi fi-rs-thumbtack"></i>
                            ) }
                            { item?.isPrivate && (
                              <i className="fi fi-sr-lock"></i>
                            ) }
                          </span>
                        ) }

                        <h6 style={ { textTransform: "capitalize" } }>
                          { item?.title }
                        </h6>
                      </span>
                      <div></div>
                      { (item.isEditable || item.isDeletable) && (
                        <Dropdown
                          overlay={
                            <Menu>
                              { item.isEditable && (
                                <Menu.Item
                                  key="edit"
                                  onClick={ () => {
                                    getEditDiscussion(item?._id);
                                  } }
                                  icon={
                                    <EditOutlined style={ { color: "green" } } />
                                  }
                                >
                                  Edit
                                </Menu.Item>
                              ) }
                              { item.isDeletable && (
                                <Popconfirm
                                  title="Do you want to delete?"
                                  okText="Yes"
                                  cancelText="No"
                                  onConfirm={ () => {
                                    deleteDiscussion(item?._id);
                                  } }
                                >
                                  <Menu.Item
                                    key="delete"
                                    icon={
                                      <DeleteOutlined
                                        style={ { color: "red" } }
                                      />
                                    }
                                    className="ant-delete"
                                  >
                                    Delete
                                  </Menu.Item>
                                </Popconfirm>
                              ) }
                            </Menu>
                          }
                          trigger={ ["click"] }
                        >
                          <a
                            style={ { display: "flex", alignItems: "center" } }
                            onClick={ (e) => e.preventDefault() }
                          >
                            <MoreOutlined />
                          </a>
                        </Dropdown>
                      ) }
                      {/* </div> */ }
                    </div>
                  </li>
                );
              }) }
            </ul>
          </div>
        </div>
        <div className="profilerightbar ">
          <div className="profile-sub-head">
            <h3 style={ { textTransform: "capitalize" } }>
              { selectedTopic?.title?.length > 100
                ? `${selectedTopic?.title?.slice(0, 100)}.....`
                : selectedTopic?.title }
            </h3>
            <div className="status-content"></div>
          </div>

          <div className="discussion-comment-block">
            <div className="discusstion-main-btn">
              { discussionTopic.length === 0 && !searchText ? (
                <div className="discusstion-btn">
                  <Button type="primary" onClick={ showAddTopicModal }>
                    { " " }
                    <PlusCircleOutlined />
                    <span>Add Topic</span>
                  </Button>
                </div>
              ) : discussionComments &&
                discussionComments.length === 0 &&
                searchText ? (
                <div className="no-data-div">No Record Found</div>
              ) : (
                <>
                  <div className="comment-module">
                    { discussionComments.length > 0 &&
                      !searchText &&
                      discussionComments?.map((item, index) => (
                        <div
                          className="main-comment-wrapper"
                          key={ index }
                          id={ item?._id }
                        >
                          <div className="main-avatar-wrapper">
                            <MyAvatar
                              userName={ item?.createdBy?.full_name }
                              key={ item?.createdBy?._id }
                              alt={ item?.createdBy?.full_name }
                              src={ item?.createdBy?.emp_img }
                            />
                            <div>
                              <span
                                style={ {
                                  color:
                                    userColors[item?.createdBy?.full_name] ||
                                    "#000",
                                } }
                                className="discussion-name-edit"
                              >
                                { removeTitle(item?.createdBy?.full_name) }
                              </span>
                              <span className="discussion-time">
                                { calculateTimeDifference(item?.createdAt) }
                              </span>
                            </div>

                            { isCreatedBy(item.createdBy?._id) && (
                              <div
                                className="edit-bar"
                                style={ {
                                  display: "flex",
                                  justifyContent: "end",
                                } }
                              >
                                <Dropdown
                                  trigger={ ["click"] }
                                  overlay={
                                    <Menu>
                                      { item.isEditable && (
                                        <Menu.Item
                                          key="1"
                                          onClick={ () => {
                                            // setOpenCommentModle(true);
                                            //  setOpenEditDiscussionModel(true)
                                            getDiscussionCommentById(item?._id);
                                          } }
                                        >
                                          <EditOutlined
                                            style={ { color: "green" } }
                                          />
                                          Edit
                                        </Menu.Item>
                                      ) }
                                      { item.isDeletable && (
                                        <Menu.Item
                                          key="2"
                                          onClick={ () => {
                                            deleteDiscussionComment(item?._id);
                                          } }
                                          className="ant-delete"
                                        >
                                          <DeleteOutlined
                                            style={ { color: "red" } }
                                          />
                                          Delete
                                        </Menu.Item>
                                      ) }
                                    </Menu>
                                  }
                                // onClick={handleDropdownClick2}
                                >
                                  <MoreOutlined style={ { cursor: "pointer" } } />
                                </Dropdown>
                              </div>
                            ) }

                            <div className="comment-sender-name">
                              {/* <h1>{item?.sender}</h1> */ }
                              <h4>
                                {/* {formatTimeDifference(item?.createdAt)} */ }
                              </h4>
                            </div>
                          </div>
                          <div className="comment-wrapper">
                            {/* <p key={index}>{item?.title}</p> */ }
                            { item?.isDefault ? (
                              <i>
                                <div
                                  dangerouslySetInnerHTML={ {
                                    __html: item?.title.replace(/\n/g, "<br>"),
                                  } }
                                />
                              </i>
                            ) : (
                              <div
                                dangerouslySetInnerHTML={ {
                                  __html: item?.title.replace(/\n/g, "<br>"),
                                } }
                              />
                            ) }

                            <div className="view-attachment">
                              { item?.attachments.map((file, index) => (
                                <Badge key={ index }>
                                  { console.log(file.name, "1003") }
                                  <div className="fileAttachment_Box attachment-discussion">
                                    <div className="fileAttachment_box-img">
                                      { fileImageSelect(file?.file_type) }
                                    </div>
                                    <div
                                      style={ {
                                        display: "flex",
                                        marginBottom: "10px",
                                        width: "100%",
                                        justifyContent: "space-between",
                                      } }
                                    >
                                      <a
                                        style={ { wordBreak: "break-all" } }
                                        href={ `${process.env.REACT_APP_API_URL}/public/${file?.path}` }
                                        rel="noopener noreferrer"
                                        target="_blank"
                                      >
                                        { file.name.length > 8
                                          ? `${file.name.slice(0, 8)}...${file.file_type
                                          }`
                                          : file.name + file.file_type }
                                      </a>
                                    </div>
                                  </div>
                                </Badge>
                              )) }
                            </div>
                          </div>
                        </div>
                      )) }
                  </div>
                  <div id="hexaChat" className="comment-mention-textbox">
                    <CkEditorSuperBuild
                      handleChange={
                        openEditDiscussionModel
                          ? handleChangeChatEditCkeditor
                          : handleChangeChatCkeditor
                      }
                      mentionArray={ taggedUserList }
                      valueState={
                        openEditDiscussionModel ? editedCommnent : textAreaValue
                      }
                      placeholder={ "Write a comment (Type @ to mention users)" }
                    />

                    <div className="main-btn-wrapper">
                      { [...commentFile, ...editedFiles].map((file, index) => (
                        <Badge
                          key={ index }
                          count={
                            <CloseCircleOutlined
                              onClick={ () => removeAttachmentFile1(index, file) }
                            />
                          }
                        >
                          <div className="input-file-name-detail">
                            <p className="fileNameTxtellipsis">{ file.name }</p>
                          </div>
                        </Badge>
                      )) }
                    </div>

                    <div className="mention-field-btn-wrapper">
                      <div className="mention-input-add-file-btn">
                        <Button
                          type="primary"
                          disabled={
                            textAreaValue.trim() || commentFile.length > 0
                              ? false
                              : true
                          }
                          onClick={ (values) =>
                            handlecomments(values, openEditDiscussionModel)
                          }
                        >
                          { openEditDiscussionModel ? "Update" : "Add" }
                        </Button>

                        { openEditDiscussionModel && (
                          <Button
                            type="primary"
                            onClick={ () => {
                              setOpenEditDiscussionModel(false);
                              setCommentFile([]);
                            } }
                            className="ant-delete"
                          >
                            Cancel
                          </Button>
                        ) }

                        <Tooltip placement="top" title="Attached file">
                          <Button
                            style={ { marginLeft: "10px" } }
                            className="link-btn"
                            onClick={ () => attachmentfileRef.current.click() }
                          >
                            <i className="fi fi-ss-link"></i>
                            Attach files
                          </Button>
                        </Tooltip>
                        <input
                          multiple
                          type="file"
                          onChange={ onFileChange1 }
                          hidden
                          ref={ attachmentfileRef }
                        />
                      </div>
                      { textAreaValue && (
                        <div className="mention-input-close-btn">
                          <Button
                            type="ghost"
                            icon={ <CloseOutlined /> }
                            onClick={ () => {
                              setTextAreaValue("");
                              setCommentFile([]);
                            } }
                          />
                        </div>
                      ) }
                      { commentFile.length > 0 && !openEditDiscussionModel && (
                        <div>
                          <Form.Item
                            label="Folder"
                            name="folder"
                            rules={ [
                              {
                                required: true,
                                message: "Please select the folder",
                              },
                            ] }
                          >
                            <Select
                              placeholder="Please Select Folder"
                              showSearch
                              defaultValue={
                                foldersList.length > 0
                                  ? foldersList[0]._id
                                  : undefined
                              }
                              onChange={ (e) => handleFolderIdChange(e) }
                            >
                              { foldersList.map((data) => {
                                return (
                                  <Option
                                    key={ data._id }
                                    value={ data._id }
                                    style={ { textTransform: "capitalize" } }
                                  >
                                    { data.name }
                                  </Option>
                                );
                              }) }
                            </Select>
                          </Form.Item>
                        </div>
                      ) }
                    </div>
                  </div>
                </>
              ) }
            </div>
          </div>
        </div>
      </div>

    <Modal
        open={ isModalOpenTopic }
        onCancel={ () => handleCancelTopic() }
        title={ addEditDiscussion === "Add Topic" ? "Add Topic" : "Edit Topic" }
        className="add-task-modal add-list-modal disscusion-pop-wrapper"
        width={800}
        footer={ [
          <Button
            key="cancel"
            onClick={ () => handleCancelTopic() }
            className="delete-btn"
            size="large"
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            className="square-primary-btn"
            size="large"
            onClick={ () => discussionForm.submit() }
          >
            { addEditDiscussion === "Add Topic" ? "Save" : "Update" }
          </Button>,
        ] }
      >
        <div className="overview-modal-wrapper">
          <Form
            form={ discussionForm }
            layout="vertical"
            onFinish={ (values) => {
              addEditDiscussion === "Add Topic"
                ? handleTaskOps(values)
                : handleTaskOps(values, true);
            } }
          >
            <Row gutter={ [0, 0] }>
              {/* Title Field - Full width */ }
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                <Form.Item
                  label="Title"
                  name="title"
                  rules={ [{ required: true, message: "Please add title" }] }
                >
                  <Input placeholder="Enter topic title" size="large" />
                </Form.Item>
              </Col>

              {/* Subscribers and Client */ }
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item
                  label="Subscribers"
                  name="subscribers"
                  className="subscriber-section"
                >
                  <MultiSelect
                    onSearch={ handleSearch }
                    onChange={ handleSelectedItemsChange }
                    values={
                      selectedItems && selectedItems.map((item) => item._id)
                    }
                    listData={ subscribersList }
                    search={ searchKeyword }
                  />
                  { selectedItems && selectedItems.length > 0 && (
                    <div className="list-clear-btn" style={ { marginTop: 8 } }>
                      <Button
                        onClick={ () => setSelectedItems([]) }
                        className="list-clear-btn ant-delete"
                        size="small"
                      >
                        Clear
                      </Button>
                    </div>
                  ) }
                </Form.Item>
              </Col>

              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item
                  label="Client"
                  name="client"
                  className="client-section"
                >
                  <MultiSelect
                    onSearch={ handleSearch }
                    onChange={ handleSelectedClientsChange }
                    values={
                      selectedClients
                        ? selectedClients.map((item) => item._id)
                        : []
                    }
                    listData={ clientsList }
                    search={ searchKeyword }
                  />
                  { selectedClients && selectedClients.length > 0 && (
                    <div className="list-clear-btn" style={ { marginTop: 8 } }>
                      <Button
                        onClick={ () => setSelectedClients([]) }
                        className="list-clear-btn ant-delete"
                        size="small"
                      >
                        Clear
                      </Button>
                    </div>
                  ) }
                </Form.Item>
              </Col>

              {/* Folder Selection and Attach Files */ }
              { fileAttachment.length > 0 && (
                <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                  <Form.Item
                    label="Folder"
                    name="folder"
                    initialValue={
                      foldersList.length > 0 ? foldersList[0]._id : undefined
                    }
                    rules={ [
                      {
                        required: true,
                        message: "Please select a folder",
                      },
                    ] }
                  >
                    <Select
                      placeholder="Select Folder"
                      showSearch
                      size="large"
                      filterOption={ (input, option) =>
                        option.children?.toLowerCase().indexOf(input?.toLowerCase()) >= 0
                      }
                      filterSort={ (optionA, optionB) =>
                        optionA.children
                          ?.toLowerCase()
                          ?.localeCompare(optionB.children?.toLowerCase())
                      }
                    >
                      { foldersList.map((data) => (
                        <Option
                          key={ data._id }
                          value={ data._id }
                          style={ { textTransform: "capitalize" } }
                        >
                          { data.name }
                        </Option>
                      )) }
                    </Select>
                  </Form.Item>
                </Col>
              ) }

              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item label="Attach Files">
                  <Tooltip placement="top" title="Attach files">
                    <Button
                      className="link-btn"
                      onClick={ () => attachmentfileRef2.current.click() }
                      icon={ <i className="fi fi-ss-link"></i> }
                      size="large"
                    >
                      Attach files
                    </Button>
                  </Tooltip>
                </Form.Item>
              </Col>

              {/* Checkboxes */ }
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item
                  form={ discussionForm }
                  name="pinToTop"
                  valuePropName="checked"
                  style={ { marginBottom: 0 } }
                >
                  <Checkbox
                    checked={ editDiscussionTopic?.isPinToTop === true ? true : false }
                    valuePropName="checked"
                  >
                    Pin to top
                  </Checkbox>
                </Form.Item>
              </Col>

              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item
                  form={ discussionForm }
                  name="markAsPrivate"
                  valuePropName="checked"
                  style={ { marginBottom: 0 } }
                >
                  <Checkbox
                    checked={ editDiscussionTopic?.isPrivate === true ? true : false }
                    valuePropName="checked"
                  >
                    Mark as Private
                  </Checkbox>
                </Form.Item>
              </Col>

              {/* File Attachments Section - Full width */ }
              { ((addEditDiscussion === "Add Topic" && fileAttachment.length > 0) ||
                (addEditDiscussion !== "Add Topic" && (fileAttachment.length > 0 || populatedFiles?.length > 0))) && (
                  <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                    <div className="file-attachments-section">
                      <h4 style={ {
                        marginBottom: 12,
                        color: '#666',
                        fontSize: '14px',
                        fontWeight: 500
                      } }>
                        Attached Files
                      </h4>
                      <div className="fileAttachment_container">
                        { addEditDiscussion === "Add Topic"
                          ? fileAttachment.map((file, index) => (
                            <Badge
                              key={ index }
                              count={
                                <CloseCircleOutlined
                                  onClick={ () => removeAttachmentFile(index) }
                                  style={ { cursor: 'pointer' } }
                                />
                              }
                            >
                              <div className="fileAttachment_Box">
                                <p className="fileNameTxtellipsis">{ file.name }</p>
                              </div>
                            </Badge>
                          ))
                          : [...fileAttachment, ...populatedFiles].map((file, index) => (
                            <Badge
                              key={ index }
                              count={
                                <CloseCircleOutlined
                                  onClick={ () => removeAttachmentFile(index, file) }
                                  style={ { cursor: 'pointer' } }
                                />
                              }
                            >
                              <div className="fileAttachment_Box">
                                <a
                                  className="fileNameTxtellipsis"
                                  href={ `${process.env.REACT_APP_API_URL}/public/${file?.path}` }
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  { file?.name?.length > 20
                                    ? file?.name?.substring(0, 17) + "..."
                                    : file?.name }
                                </a>
                              </div>
                            </Badge>
                          )) }
                      </div>
                    </div>
                  </Col>
                ) }

            </Row>

            {/* Hidden file input */ }
            <input
              multiple
              type="file"
              accept="*"
              onChange={ onFileChange }
              hidden
              ref={ attachmentfileRef2 }
            />
          </Form>
        </div>
      </Modal>
    </div>
  );
}

CommentList.propTypes = {
  comments: PropTypes.arrayOf(
    PropTypes.shape({
      author: PropTypes.string.isRequired,
      avatar: PropTypes.string.isRequired,
      content: PropTypes.element.isRequired,
      datetime: PropTypes.element.isRequired,
    })
  ).isRequired,
};
Editor.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
};
export default DiscussionForm;
