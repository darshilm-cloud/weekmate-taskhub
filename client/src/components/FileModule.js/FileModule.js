import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  message,
  Menu,
  Avatar,
  Checkbox,
  Modal,
  Input,
  Popover,
  Form,
  Select,
  Dropdown,
  Popconfirm,
  Badge,
  Tooltip,
  Col,
  Row,
} from "antd";
import {
  PlusOutlined,
  MoreOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  FolderAddOutlined,
  FolderAddFilled,
  CheckCircleOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import "./filemodule.css";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import {
  getClientList,
  getSubscribersList,
} from "../../appRedux/reducers/ApiData";
import { fileImageSelect } from "../../util/FIleSelection";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";
import MultiSelect from "../CustomSelect/MultiSelect";
import moment from "moment";
import { removeTitle } from "../../util/nameFilter";
import MyAvatar from "../Avatar/MyAvatar";
import FileSortComponent from "./FileSortComponent";
import { FilesSkeleton } from "../common/SkeletonLoader";
import NoDataFoundIcon from "../common/NoDataFoundIcon";
import DeleteConfirm from "../common/DeleteConfirm";

import { can } from "../../util/hasPermission";

const IMAGE_FILE_TYPES = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];
const isImageFileProp = (file) => {
  const type = String(file?.file_type || "").toLowerCase();
  if (IMAGE_FILE_TYPES.includes(type) || type.startsWith("image/")) return true;
  const path = String(file?.path || "").toLowerCase();
  return IMAGE_FILE_TYPES.some((ext) => path.endsWith(ext));
};

function FileModule() {
  const { emitEvent } = useSocketAction();
  const canAddFiles = can("files_add");
  const canEditFiles = can("files_edit");
  const canDeleteFiles = can("files_delete");
  const [editFileForm] = Form.useForm();
  const searchRef = useRef();
  const { projectId } = useParams();
  const { Option } = Select;
  const [addFolderForm] = Form.useForm();
  const attachmentfileRef = useRef();
  const dispatch = useDispatch();
  const [fileForm] = Form.useForm();
  const { Search } = Input;
  const { subscribersList, clientsList } = useSelector(
    (state) => state.apiData
  );

  const [isopenModelUpload, setIsOpenModelUpload] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  // Ref guard as well: several quick clicks land before the disabled state re-renders
  const uploadingRef = useRef(false);
  const [isopenModelFolder, setIsOpenModelFolder] = useState(false);
  const [isopenModelSubscribers, setIsOpenModelSubscribers] = useState(false);
  const [isOpenModalClients, setIsOpenModalClients] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState({});
  const [addEditFolder, setAddEditFolder] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [folderList, setFolderList] = useState([]);
  const [editFolderData, setEditFolderData] = useState({});
  const [fileAttachment, setFileAttachment] = useState([]);
  const [deleteFileData, setDeleteFileData] = useState([]);
  const [editFolderDataById, setEditFolderDataById] = useState([]);
  const [populatedFiles, setPopulatedFiles] = useState([]);
  const [editFileName, setEditFileName] = useState({});
  // Phones: a file's properties open in a modal (with a close button) instead of beside the list.
  const [isPhone, setIsPhone] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 991 : false
  );
  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth <= 991);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [subscribers, setSubscribers] = useState([]);
  const [pms_clients, setPMSClients] = useState([]);
  const [isModalOpenFile, setIsModalOpenFile] = useState(false);
  const [radioStatusValue, setRadioStatusValue] = useState("createdAt");
  const [radioStatusValueOrder, setRadioStatusValueOrder] = useState("desc");
  // Applied "Created Date" filter on files ([dayjs, dayjs] | null). Mirrored in a ref so the
  // file fetches fired right after applying it already see the new range.
  const [createdDateRange, setCreatedDateRangeState] = useState(null);
  const createdDateRangeRef = useRef(null);
  const setCreatedDateRange = (range) => {
    createdDateRangeRef.current = range;
    setCreatedDateRangeState(range);
  };
  const addCreatedDateParams = (reqBody) => {
    const range = createdDateRangeRef.current;
    if (range?.[0]) reqBody.start_date = range[0].format("YYYY-MM-DD");
    if (range?.[1]) reqBody.end_date = range[1].format("YYYY-MM-DD");
    return reqBody;
  };
  const [isPopoverVisibleStatus, setIsPopoverVisibleStatus] = useState(false);
  const [isPopoverVisibleOrder, setIsPopoverVisibleOrder] = useState(false);
  const [allFiles, setAllFiles] = useState("");
  const [searchText, setSearchText] = useState("");
  const [managePeopleVisible, setManagePeopleVisible] = useState(false);
  const [manageClientVisible, setManageClientVisible] = useState(false);
  const [manageSubscribers, setManageSubscribers] = useState([]);
  const [initialDetails, setInitialDetails] = useState([]);
  const [manageClients, setManageClients] = useState([]);
  const [tempFileID, setTempFileID] = useState([]);
  const [fileId, setFileId] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedClient, setSelectedClient] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [IsEdit, setIsEdit] = useState(true);

  const handleSearch = (searchValue) => {
    setSearchKeyword(searchValue);
  };

  const handleSelectedClientsChange = (selectedItemIds) => {
    // This ensures that we keep track of selected items by their full details, not just ID
    setSelectedClient(
      clientsList.filter((item) => selectedItemIds.includes(item._id))
    );
    setSearchKeyword("");
  };

  const handleSelectedItemsChange = (selectedItemIds) => {
    // This ensures that we keep track of selected items by their full details, not just ID
    setSelectedItems(
      subscribersList.filter((item) => selectedItemIds.includes(item._id))
    );
    setSearchKeyword("");
  };

  const openUploadModel = () => {
    setIsOpenModelUpload(true);
  };

  const handleCancelUpload = () => {
    setIsOpenModelUpload(false);
    setSelectedItems([]);
    setSelectedClient([]);
    setFileAttachment([]);
  };

  const openFolderModel = () => {
    setIsOpenModelFolder(true);
    setAddEditFolder("Add Folder");
  };

  const handleCancelFolder = () => {
    setIsOpenModelFolder(false);
    addFolderForm.resetFields();
  };

  const handleCancelSubscribers = () => {
    setIsOpenModelSubscribers(false);
    setManagePeopleVisible(false);
    getFileById1(tempFileID);
  };

  const handleCancelClients = () => {
    setIsOpenModalClients(false);
    setManageClientVisible(false);
  };

  const yourMenu = (
    <Menu>
      <Menu.Item onClick={openUploadModel} key="1">
        Upload Files
      </Menu.Item>
      <Menu.Item onClick={openFolderModel} key="2">
        Folder
      </Menu.Item>
    </Menu>
  );

  useEffect(() => {
    getFolderList();
    dispatch(getSubscribersList(projectId));
    dispatch(getClientList(projectId));
  }, [searchText, projectId]);

  // Add Folder api start
  const handleSubmit = async (values, e) => {
    try {
      const reqBody = {
        project_id: projectId,
        name: values.title,
      };

      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addFolder,
        body: reqBody,
      });

      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setAllFiles("");
        addFolderForm.resetFields();
        setIsOpenModelFolder(false);
        getFolderList();
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  // Get Folder api start
  const getFolderList = async () => {
    try {
      setPageLoading(true);
      dispatch(showAuthLoader());
      const reqBody = {
        project_id: projectId,
      };

      if (searchText && searchText !== "") {
        reqBody.search = searchText;
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getFolder,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setFolderList(response.data.data);
        setIsEdit(response.data.data.some((item) => item.isEditable));
        setSelectedFolder(response.data.data[0]);
        await getEditFolderOneId(response.data.data[0]?._id);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setPageLoading(false);
    }
  };

  // Edit Folder api start
  const getEditFolder = async (id) => {
    try {
      setAddEditFolder("Edit Folder");
      dispatch(showAuthLoader());

      const reqBody = {
        project_id: projectId,
        _id: id,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getFolder,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setIsOpenModelFolder(true);
        setEditFolderData(response.data.data);
        addFolderForm.setFieldsValue({
          title: response.data.data?.name,
        });
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getEditFolderOneId = async (id) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        project_id: projectId,
        _id: id,
      };
      if (radioStatusValue && radioStatusValue !== "") {
        reqBody.sort = radioStatusValue;
      }
      if (radioStatusValueOrder && radioStatusValueOrder !== "") {
        reqBody.sortBy = radioStatusValueOrder;
      }
      addCreatedDateParams(reqBody);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getFolder,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setEditFolderDataById(response.data.data?.files);
        setIsPopoverVisibleStatus(false);
        setIsPopoverVisibleOrder(false);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Update Folder api start
  const updateFolder = async (values) => {
    try {
      const reqBody = {
        name: values?.title.trim(),
        project_id: projectId,
      };

      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateFolder + "/" + editFolderData?._id,
        body: reqBody,
      });

      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        addFolderForm.resetFields();
        getFolderList();
        setIsOpenModelFolder(false);
        setEditFolderData({});
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };
  // Update Folder api end

  // Delete Folder api start
  const deleteFolder = async (id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteFolder + "/" + id,
      });

      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        addFolderForm.resetFields();
        getFolderList();
        setEditFolderData({});
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };
  // Delete Folder api end

  const handleSelectTask = (task) => {
    setSelectedFolder(task);
    setEditFileName({});
    getEditFolderOneId(task._id);
    setAllFiles("");
  };

  // upload file function start

  const handleTaskOps = async (values) => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setUploadingFiles(true);
    try {
      if (fileAttachment.length > 0) {
        const uploadedfile = await uploadFiles(fileAttachment, "folder");
        if (uploadedfile.length > 0) {
          await upoadFileFolder(values, uploadedfile);
          return;
        }
        message.error("File not uploaded something went wrong");
        return;
      }
      await upoadFileFolder(values);
    } finally {
      uploadingRef.current = false;
      setUploadingFiles(false);
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

  const upoadFileFolder = async (values, uploadedFiles) => {
    dispatch(showAuthLoader());
    try {
      let reqBody = {
        project_id: projectId,
        folder_id: values?.folder_name || selectedFolder?._id,
        subscribers: selectedItems.map((item) => item._id),
        pms_clients: selectedClient.map((item) => item._id),
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
          folder_id: values?.folder_name || selectedFolder?._id,
        };
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.uploadFolder,
        body: reqBody,
      });
      if (response?.data && response.data.data && response?.data?.status) {
        await emitEvent(socketEvents.ADD_FILE_SUBSCRIBERS, {
          _id: response.data.data[0],
          subscribers: selectedItems.map((item) => item._id),
          pms_clients: selectedClient.map((item) => item._id),
        });

        getEditFolderOneId(selectedFolder?._id);
        setSelectedItems([]);
        setSelectedClient([]);
        setFileAttachment([]);
        setIsOpenModelUpload(false);
      } else {
        message.error(response?.data?.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const onFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (files) => {
    const newFiles = [];
    files.forEach((file) => {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB <= 20) {
        newFiles.push(file);
      } else {
        message.error(`File '${file.name}' exceeds the 20MB file size limit.`);
      }
    });
    setFileAttachment([...fileAttachment, ...newFiles]);
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const selectedFiles = Array.from(event.dataTransfer.files);
    handleFiles(selectedFiles);
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
  // upload file function end

  const handlemenuClick = (e) => { };
  const handlemenuClickEdit = (e) => { };

  // rename file function start
  const renameFile = async (values) => {
    try {
      dispatch(showAuthLoader());

      const reqBody = {
        project_id: projectId,
        file_id: editFileName?._id,
        name: values?.name,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.renameFile,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setIsModalOpenFile(false);
        getFolderList();
        fileForm.resetFields();
      } else {
        // setWorkflowList([]);
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };
  // rename file function end

  // get single file by id start
  const getFileById = async (id) => {
    try {
      dispatch(showAuthLoader());

      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getFileById + "/" + id,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setIsModalOpenFile(true);
        setEditFileName(response.data.data[0]);
        setSubscribers(response.data.data[0]?.subscribers);
        setPMSClients(response.data.data[0]?.pms_clients);
        editFileForm.setFieldsValue({
          name: response.data.data[0]?.name,
        });
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };
  // get single file by id end
  const getFileById1 = async (id) => {
    try {
      dispatch(showAuthLoader());
      setTempFileID(id);
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getFileById + "/" + id,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setSubscribers(response.data.data[0]?.subscribers);

        setPMSClients(response.data.data[0]?.pms_clients);
        setEditFileName(response.data.data[0]);
        setFileId(response.data.data.map((item) => item._id));
        setInitialDetails(response.data.data);
        editFileForm.setFieldsValue({
          name: response.data.data[0]?.name,
        });
        const data = response?.data?.data[0]?.subscribers.map((val) => {
          return val?._id;
        });
        const client = response?.data?.data[0]?.pms_clients.map((val) => {
          return val?._id;
        });
        setManageSubscribers(data);
        setManageClients(client);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // delete file start
  const deleteFile = async (id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteFile + "/" + id,
      });

      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        addFolderForm.resetFields();
        getEditFolderOneId(selectedFolder?._id);
      } else {
        message.error(response?.data?.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };
  // delete file end
  const handleModalCloseFile = () => {
    setIsModalOpenFile(false);
  };

  const getAllFileList = async () => {
    setAllFiles("active");
    setSelectedFolder({});
    try {
      dispatch(showAuthLoader());

      const reqBody = {
        project_id: projectId,
      };

      if (radioStatusValue && radioStatusValue !== "") {
        reqBody.sort = radioStatusValue;
      }
      if (radioStatusValueOrder && radioStatusValueOrder !== "") {
        reqBody.sortBy = radioStatusValueOrder;
      }
      addCreatedDateParams(reqBody);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getAllFiles,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setEditFolderDataById(response.data.data);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onChange1 = (e) => {
    setRadioStatusValue(e.target.value);
  };

  const onChange2 = (e) => {
    setRadioStatusValueOrder(e.target.value);
  };

  const onSearch = (value) => {
    setSearchText(value);
  };

  const handleUpdateClients = async () => {
    try {
      const reqBody = {
        pms_clients: manageClients,
        project_id: projectId,
        file_id: editFileName?._id,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.updateSubscribers,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setManageClientVisible(false);
        setIsOpenModalClients(false);
        getFileById1(fileId);

        let client = new Set(
          initialDetails[0]?.pms_clients.map((item) => item._id)
        );
        let newClients = manageClients.filter((id) => !client.has(id));
        await emitEvent(socketEvents.EDIT_FILE_SUBSCRIBERS, {
          _id: fileId[0],
          subscribers: [],
          pms_clients: newClients,
        });
      } else {
        message.error(response?.data?.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };
  const handleUpdateSubscribers = async () => {
    dispatch(showAuthLoader());
    try {
      const reqBody = {
        subscribers: manageSubscribers,
        project_id: projectId,
        file_id: editFileName?._id,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.updateSubscribers,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setManagePeopleVisible(false);
        setIsOpenModelSubscribers(false);
        getFileById1(fileId);

        let assignee = new Set(
          initialDetails[0]?.subscribers.map((item) => item._id)
        );
        let newAssignees = manageSubscribers.filter((id) => !assignee.has(id));

        await emitEvent(socketEvents.EDIT_FILE_SUBSCRIBERS, {
          _id: fileId[0],
          subscribers: newAssignees,
          pms_clients: [],
        });
      } else {
        message.error(response?.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  const content2 = (
    <div className="right-popover-wrapper">
      {/* <ul> */}
      <h4>Sort By</h4>
      <Checkbox
        onChange={onChange1}
        checked={radioStatusValue == "createdAt"}
        value="createdAt"
      >
        Date
      </Checkbox>
      <Checkbox
        onChange={onChange1}
        checked={radioStatusValue == "name"}
        value="name"
      >
        Name
      </Checkbox>
      <Checkbox
        onChange={onChange1}
        checked={radioStatusValue == "file_type"}
        value="file_type"
      >
        Type
      </Checkbox>
      <div className="popver-footer-btn">
        <Button
          onClick={
            allFiles === "active"
              ? getAllFileList
              : () => getEditFolderOneId(selectedFolder?._id)
          }
          type="primary"
          className="square-primary-btn ant-btn-primary"
        >
          Apply
        </Button>
        <Button
          className="square-outline-btn ant-delete"
          onClick={() => setIsPopoverVisibleStatus(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const content3 = (
    <div className="right-popover-wrapper">
      <h4>Order by</h4>
      <Checkbox
        onChange={onChange2}
        checked={radioStatusValueOrder == "asc"}
        value="asc"
      >
        Asc
      </Checkbox>
      <Checkbox
        onChange={onChange2}
        checked={radioStatusValueOrder == "desc"}
        value="desc"
      >
        Desc
      </Checkbox>
      <div className="popver-footer-btn">
        <Button
          onClick={
            allFiles === "active"
              ? getAllFileList
              : () => getEditFolderOneId(selectedFolder?._id)
          }
          type="primary"
          className="square-primary-btn ant-btn-primary"
        >
          Apply
        </Button>
        <Button
          className="square-outline-btn ant-delete"
          onClick={() => setIsPopoverVisibleOrder(false)}
        >
          Cancel
        </Button>
      </div>
      {/* </ul> */}
    </div>
  );

  const handleCheckboxChange = (subscriberId) => {
    setManageSubscribers((prevSelected) =>
      prevSelected.includes(subscriberId)
        ? prevSelected.filter((id) => id !== subscriberId)
        : [...prevSelected, subscriberId]
    );
  };

  const handleCheckboxClient = (clientID) => {
    setManageClients((prevSelected) =>
      prevSelected.includes(clientID)
        ? prevSelected.filter((id) => id != clientID)
        : [...prevSelected, clientID]
    );
  };

  const folder = selectedFolder?.name;
  const formattedTitle = folder?.replace(
    /(?:^|\s)([a-z])/g,
    function (match, group1) {
      return match?.charAt(0) + group1?.toUpperCase();
    }
  );
  if (pageLoading) return <FilesSkeleton />;

  return (
    <>
      <div className="project-wrapper discussion-wrapper file-wrapper">
        <div className="peoject-page">
          <div className="profileleftbar">
            <div className="add-project-wrapper">
              <Search
                ref={searchRef}
                placeholder="Search..."
                style={{
                  width: 200,
                  "& .ant-input-wrapper": {
                    "& .ant-input-group-addon": {
                      display: "none",
                    },
                  },
                }}
                onSearch={onSearch}
              />
            </div>

            <ul style={{ listStyle: "none" }}>
              {folderList?.map((item, index) => {
                const project_title = item?.name;
                const formattedTitle = project_title?.replace(
                  /(?:^|\s)([a-z])/g,
                  function (match, group1) {
                    return match?.charAt(0) + group1?.toUpperCase();
                  }
                );
                return (
                  <li
                    onClick={() => handleSelectTask(item)}
                    key={index}
                    className="project-list"
                  >
                    <div
                      className={
                        selectedFolder._id == item._id
                          ? "design-graph"
                          : "design-graph-inactive"
                      }
                    >
                      <FolderAddOutlined />
                      <span className="projesct-file-text active-folder">
                        {/* {item?.name.length > 20
                            ? `${item?.name.slice(0, 10)}...`
                            : item?.name} */}
                        {formattedTitle}
                      </span>
                      {item?.isDefault === false &&
                        ((item.isEditable && canEditFiles) || (item.isDeletable && canDeleteFiles)) && (
                          <div className="toogle-action" onClick={(e) => e.stopPropagation()}>
                            <Dropdown
                              trigger={["click"]}
                              placement="bottomRight"
                              menu={{
                                items: [
                                  item.isEditable && canEditFiles && {
                                    key: "edit",
                                    label: "Edit",
                                  },
                                  item.isDeletable && canDeleteFiles && {
                                    key: "delete",
                                    label:
                                      Array.isArray(item.files) && item.files.length > 0
                                        ? "Delete (folder has files)"
                                        : (
                                          <DeleteConfirm
                                            title="Delete this folder?"
                                            placement="left"
                                            onConfirm={() => deleteFolder(item?._id)}
                                          >
                                            <DeleteConfirm.MenuLabel />
                                          </DeleteConfirm>
                                        ),
                                    // a folder that still holds files can't be deleted
                                    disabled: Array.isArray(item.files) && item.files.length > 0,
                                  },
                                ].filter(Boolean),
                                onClick: ({ key, domEvent }) => {
                                  domEvent?.stopPropagation?.();
                                  if (key === "edit") getEditFolder(item?._id);
                                },
                              }}
                            >
                              <a
                                style={{ display: "flex", alignItems: "center" }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                <MoreOutlined />
                              </a>
                            </Dropdown>
                          </div>
                        )}
                    </div>
                  </li>
                );
              })}

              <li onClick={getAllFileList} className="project-list">
                <span
                  className={
                    allFiles == "active"
                      ? "design-graph"
                      : "design-graph-inactive"
                  }
                >
                  <FolderAddFilled />
                  All files
                </span>
              </li>
            </ul>
          </div>
          <div className="profilerightbar">
            <div className="profile-sub-head">
              <h3>
                {" "}
                {formattedTitle?.length > 100
                  ? `${formattedTitle?.slice(0, 100)}.....`
                  : formattedTitle}
              </h3>
              <div className="thumb-view"></div>
              <div className="block-status-content">
                <div className="filter-btn-wrapper">
                  <FileSortComponent
                    // Sort props
                    radioStatusValue={radioStatusValue}
                    onChange1={onChange1}
                    // Order props
                    radioStatusValueOrder={radioStatusValueOrder}
                    onChange2={onChange2}
                    // Common props
                    allFiles={allFiles}
                    getAllFileList={getAllFileList}
                    getEditFolderOneId={getEditFolderOneId}
                    selectedFolder={selectedFolder}
                    isPopoverVisibleStatus={isPopoverVisibleStatus}
                    setIsPopoverVisibleStatus={setIsPopoverVisibleStatus}
                    isPopoverVisibleOrder={isPopoverVisibleOrder}
                    setIsPopoverVisibleOrder={setIsPopoverVisibleOrder}
                    // Created Date filter
                    createdDateRange={createdDateRange}
                    setCreatedDateRange={setCreatedDateRange}
                  />
                </div>
                {canAddFiles && (
                  <Dropdown trigger={["click"]} overlay={yourMenu}>
                    <Button type="primary" className="add-btn">
                      <PlusOutlined /> Add
                      <i className="fi fi-ss-angle-small-down"></i>
                    </Button>
                  </Dropdown>
                )}
              </div>
            </div>

            <div className="upload-file-main-wrapper">
              {editFolderDataById?.length > 0 && (
                <div className="upload-file-left">
                  {editFolderDataById.map((file, index) => {
                    return (
                      <Badge key={index}>
                        <a
                          onClick={(e) => {
                            if (isPhone) e.preventDefault();
                            getFileById1(file?._id);
                          }}
                          href={`${process.env.REACT_APP_API_URL}/public/${file?.path}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <div className="fileAttachment_Box">
                            <div className="fileAttachment_box-img">
                              {fileImageSelect(file?.file_type)}
                            </div>
                            <div style={{ width: "100%", borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                              <p className="fileNameTxtellipsis" style={{ flex: 1, minWidth: 0 }}>
                                {file.name.length > 14
                                  ? `${file.name.slice(0, 14)}...${file.file_type}`
                                  : file.name + file.file_type}
                              </p>
                              <span
                                className="file-row-menu"
                                // the ⋮ menu (and its popup, which is a React child of this row) must not
                                // trigger the row's own click: opening the file / its details
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              >
                                <Dropdown
                                overlay={
                                  <Menu onClick={handlemenuClickEdit}>
                                    {file.isEditable && canEditFiles && (
                                      <Menu.Item
                                        key="edit"
                                        onClick={() => getFileById(file?._id)}
                                      >
                                        Rename
                                      </Menu.Item>
                                    )}
                                    {file.isDeletable && canDeleteFiles && (
                                      <Popconfirm
                                        title="Delete this file?"
                                        okText="Yes"
                                        cancelText="No"
                                        onConfirm={() => deleteFile(file?._id)}
                                      >
                                        <Menu.Item
                                          key="delete"
                                          className="ant-delete"
                                        >
                                          Delete
                                        </Menu.Item>
                                      </Popconfirm>
                                    )}
                                    <Menu.Item
                                      key="properties"
                                      onClick={() => getFileById1(file?._id)}
                                    >
                                      Properties
                                    </Menu.Item>
                                  </Menu>
                                }
                                trigger={["click"]}
                              >
                                <a style={{ display: "flex", alignItems: "center", flexShrink: 0, color: "#8c8c8c" }} onClick={(e) => e.preventDefault()}>
                                  <MoreOutlined />
                                </a>
                              </Dropdown>
                              </span>
                            </div>
                          </div>
                        </a>
                      </Badge>
                    );
                  })}
                </div>
              )}
              {/* } */}
              { }
              {!(editFolderDataById?.length > 0) && (
                <div className="upload-file-wrapper">
                  <NoDataFoundIcon />
                  <p>
                    Upload design docs spreadsheets etc..organize them in
                    folders and proof files for review and feedback.{" "}
                    <a href="#"> Learn how it works</a>{" "}
                  </p>
                  {canAddFiles && (
                    <Button onClick={() => setIsOpenModelUpload(true)}>
                      {" "}
                      <PlusOutlined />
                      <span>Upload Files</span>
                    </Button>
                  )}
                </div>
              )}
              <Modal
                open={isModalOpenFile}
                width={800}
                onCancel={handleModalCloseFile}
                title={<h2>Edit Filename</h2>}
                footer={[<>
                  <Button
                    type="default"

                    onClick={handleModalCloseFile}
                    className="cancel-btn"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="square-primary-btn"
                  >
                    Update
                  </Button>


                </>]}
                className="add-task-modal"
                destroyOnClose
              >

                <div className="overview-modal-wrapper">
                  <Form
                    form={editFileForm}
                    layout="vertical"
                    onFinish={(values) => renameFile(values)}
                  >
                    <Row gutter={[16, 16]}>

                      {/* File Name */}
                      <Col xs={24}>
                        <Form.Item
                          name="name"
                          rules={[
                            {
                              required: true,
                              whitespace: true,
                              message: "Please enter a valid file name",
                            },
                          ]}
                        >
                          <Input placeholder="Enter file name" />
                        </Form.Item>
                      </Col>



                    </Row>
                  </Form>
                </div>
              </Modal>

              {editFolderDataById?.length > 0 &&
                editFileName &&
                Object.keys(editFileName)?.length == 0 && (
                  <div className="setDefaultError">
                    <p>Select a file to view its properties</p>
                  </div>
                )}
              {editFolderDataById?.length > 0 &&
                editFileName &&
                Object.keys(editFileName)?.length != 0 && (() => {
                  const panel = (
                  <div className="project-file-side-bar">
                    <div className="project-flie-img-wrapper">
                      <div className="project-file-img">
                        {fileImageSelect(editFileName?.file_type)}
                      </div>
                      <div className="project-file-img-text">
                        {editFileName?.name?.length > 15
                          ? `${editFileName?.name.slice(0, 15)}.....${editFileName.file_type
                          }`
                          : editFileName?.name + editFileName?.file_type}
                        {/* <p>{editFileName?.name}</p> */}
                      </div>
                    </div>

                    <div className="properties-wrapper">
                      <div>
                        <p>Properties</p>
                      </div>
                    </div>
                    <div className="properties-details-wrapper">
                      <div className="properties-detail">
                        <div className="properties-tyeps">
                          <div className="setFileDetails">
                            <p>Type</p>
                          </div>
                          <div className="setFileDetailsFlex">
                            <p>{editFileName?.file_type}</p>
                          </div>
                        </div>
                        <div className="properties-tyeps">
                          <div className="setFileDetails">
                            <p>Section</p>
                          </div>
                          <div className="setFileDetailsFlex">
                            <p>{editFileName?.file_section}</p>
                          </div>
                        </div>
                        <div className="properties-tyeps">
                          <div className="setFileDetails">
                            <p>Updated</p>
                          </div>
                          <div className="setFileDetailsFlex">
                            {moment(editFileName?.updatedAt).format(
                              "DD-MM-YYYY"
                            )}
                          </div>
                        </div>
                        <div className="properties-tyeps">
                          <div className="setFileDetails">
                            <p>Date</p>
                          </div>
                          <div className="setFileDetailsFlex">
                            {moment(editFileName?.createdAt).format(
                              "DD-MM-YYYY"
                            )}
                          </div>
                        </div>
                        <div className="properties-tyeps">
                          <div className="setFileDetails">
                            <p>Folder</p>
                          </div>
                          <div className="setFileDetailsFlex">
                            <p>{editFileName?.folder?.name}</p>
                          </div>
                        </div>
                        <div className="properties-tyeps">
                          <div className="setFileDetails">
                            <p>Uploaded by</p>
                          </div>
                          <div className="setFileDetailsFlex">
                            <p>
                              {removeTitle(editFileName?.createdBy?.full_name)}
                            </p>
                          </div>
                        </div>
                        <div className="properties-tyeps">
                          <div className="setFileDetails">
                            <p>Subscribers</p>
                          </div>
                          <div className="setFileDetailsFlex">
                            <div className="subscribers-list-wrapper">
                              <Avatar.Group
                                maxCount={3}
                                maxPopoverTrigger="click"
                                size="default"
                                maxStyle={{
                                  color: "#fa8c16",
                                  backgroundColor: "#ffe7ba",
                                  cursor: "pointer",
                                }}
                              >
                                {subscribers.map((item, index) => (
                                  <>
                                    <p className="subscribers-list">
                                      <Tooltip
                                        title={removeTitle(item.full_name)}
                                        key={item._id}
                                      >
                                        <MyAvatar
                                          key={item._id}
                                          userName={item?.full_name}
                                          alt={item?.full_name}
                                          src={item.emp_img}
                                        />
                                      </Tooltip>
                                    </p>
                                  </>
                                ))}
                              </Avatar.Group>
                            </div>

                            <div className="icon-plus" onClick={() => setIsOpenModelSubscribers(true)}>
                              <PlusOutlined />
                            </div>
                          </div>
                        </div>
                        <div className="properties-tyeps">
                          <div className="setFileDetails">
                            <p>Clients</p>
                          </div>
                          <div className="setFileDetailsFlex">
                            <div className="subscribers-list-wrapper">
                              <Avatar.Group
                                maxCount={3}
                                maxPopoverTrigger="click"
                                size="default"
                                maxStyle={{
                                  color: "#fa8c16",
                                  backgroundColor: "#ffe7ba",
                                  cursor: "pointer",
                                }}
                              >
                                {pms_clients?.map((item, index) => (
                                  <>
                                    <p className="subscribers-list">
                                      <Tooltip
                                        title={removeTitle(item?.full_name)}
                                        key={item._id}
                                      >
                                        <MyAvatar
                                          userName={item.full_name}
                                          alt={item.full_name}
                                          key={item._id}
                                          src={item.emp_img}
                                        />
                                      </Tooltip>
                                    </p>
                                  </>
                                ))}
                              </Avatar.Group>
                            </div>
                            <div className="icon-plus" onClick={() => setIsOpenModalClients(true)}>
                              <PlusOutlined />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                  return isPhone ? (
                    <Modal
                      open
                      onCancel={() => setEditFileName({})}
                      footer={null}
                      title="File details"
                      className={`file-properties-modal${isImageFileProp(editFileName) ? " has-image-preview" : ""}`}
                      destroyOnClose
                    >
                      {isImageFileProp(editFileName) && (
                        <a
                          href={`${process.env.REACT_APP_API_URL}/public/${editFileName?.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-preview-link"
                        >
                          <img
                            className="file-preview-img"
                            src={`${process.env.REACT_APP_API_URL}/public/${editFileName?.path}`}
                            alt={editFileName?.name || "preview"}
                          />
                        </a>
                      )}
                      {panel}
                      <Button
                        type="primary"
                        block
                        href={`${process.env.REACT_APP_API_URL}/public/${editFileName?.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginTop: 12 }}
                      >
                        Open file
                      </Button>
                    </Modal>
                  ) : (
                    panel
                  );
                })()}
            </div>
          </div>
        </div>
      </div>

      {/* Subscriber modal */}
  <Modal
  open={isopenModelSubscribers}
  onCancel={handleCancelSubscribers}
  className="add-task-modal add-list-modal file-people-modal"
  title="Subscribers"
  footer={[
    !managePeopleVisible && IsEdit && canEditFiles && (
      <Button
        key="manage"
        type="primary"
        onClick={() => {
          getSubscribersList();
          setManagePeopleVisible(true);
        }}
      >
        <UsergroupAddOutlined /> Manage People
      </Button>
    ),

    managePeopleVisible && (
      <Button key="update" type="primary" onClick={handleUpdateSubscribers}>
        Update
      </Button>
    ),

    managePeopleVisible && (
      <Button
        key="cancel"
        onClick={() => {
          setManagePeopleVisible(false);
          getFileById1(tempFileID);
        }}
        className="ant-delete"
      >
        Cancel
      </Button>
    ),
  ]}
>
  <div className="overview-modal-wrapper">
    <div className="project-comments-block">
      <div className="project-search">
        <div className="file-people-list">
          {managePeopleVisible ? (
            subscribersList
              ?.filter((data) => data.full_name?.toLowerCase())
              .map((subscriber) => (
                <label key={subscriber._id} className="file-people-row selectable">
                  <Checkbox
                    onChange={() => handleCheckboxChange(subscriber._id)}
                    checked={manageSubscribers.includes(subscriber._id)}
                  />
                  <MyAvatar
                    userName={subscriber.full_name}
                    alt={subscriber.full_name}
                    src={subscriber.emp_img}
                  />
                  <span className="file-people-name">{removeTitle(subscriber.full_name)}</span>
                </label>
              ))
          ) : subscribers?.length ? (
            subscribers.map((item) => (
              <div className="file-people-row" key={item._id}>
                <MyAvatar userName={item.full_name} alt={item.full_name} src={item.emp_img} />
                <span className="file-people-name">{removeTitle(item?.full_name || "")}</span>
              </div>
            ))
          ) : (
            <div className="file-people-empty">No subscribers yet</div>
          )}
        </div>
      </div>
    </div>
  </div>
</Modal>
      <Modal
        open={isOpenModalClients}
        footer={null}
        onCancel={handleCancelClients}
        className="add-task-modal add-list-modal file-people-modal"
      >
        <div className="modal-header">
          <h1>Clients</h1>
        </div>

        <div className="overview-modal-wrapper">
          <>
            <div className="project-comments-block">
              <div className="project-search">
                <div className="file-people-list">
                  {manageClientVisible ? (
                    clientsList
                      ?.filter((data) => data.full_name?.toLowerCase())
                      .map((client) => (
                        <label key={client._id} className="file-people-row selectable">
                          <Checkbox
                            onChange={() => handleCheckboxClient(client._id)}
                            checked={manageClients.includes(client._id)}
                          />
                          <MyAvatar userName={client.full_name} alt={client.full_name} src={client.emp_img} />
                          <span className="file-people-name">{removeTitle(client.full_name)}</span>
                        </label>
                      ))
                  ) : pms_clients?.length ? (
                    pms_clients.map((item, index) => (
                      <div className="file-people-row" key={item._id || index}>
                        <MyAvatar userName={item.full_name} alt={item.full_name} src={item.emp_img} />
                        <span className="file-people-name">{removeTitle(item?.full_name || "")}</span>
                      </div>
                    ))
                  ) : (
                    <div className="file-people-empty">No clients yet</div>
                  )}
                </div>
              </div>
            </div>
            <div className="task-tab-btn">
              {!manageClientVisible && IsEdit && canEditFiles && (
                <Button
                  type="primary"
                  onClick={() => {
                    // getClientList();
                    getClientList();
                    setManageClientVisible(true);
                  }}
                >
                  <span>
                    <UsergroupAddOutlined />
                  </span>
                  Manage Client
                </Button>
              )}
              {manageClientVisible && (
                <div className="manage-btn">
                  <Button type="primary" onClick={handleUpdateClients}>
                    Update
                  </Button>
                  <Button
                    onClick={() => {
                      setManageClientVisible(false);
                      getFileById1(tempFileID);
                    }}
                    className="ant-delete"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </>
        </div>
      </Modal>

      {/*                               upload modal                                      */}
      <Modal
        open={isopenModelUpload}
        onCancel={uploadingFiles ? undefined : handleCancelUpload}
        closable={!uploadingFiles}
        maskClosable={!uploadingFiles}
        title="Upload Files"

        footer={[
          <Button
            key="cancel"
            onClick={handleCancelUpload}
            size="large"
            className="cancel-btn"
            disabled={uploadingFiles}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            size="large"
            onClick={() => fileForm.submit()}
            type="primary"
            loading={uploadingFiles}
            disabled={uploadingFiles}
          >
            Upload
          </Button>,
        ]}
      >
        <div className="overview-modal-wrapper">
          <Form
            form={fileForm}
            layout="vertical"
            onFinish={(values) => handleTaskOps(values)}
          >
            <Row gutter={[0, 0]}>
              {/* File Upload Section - Full width */}
              <Col xs={24} sm={24} md={24} lg={24}>
                <Form.Item label="Upload Files">
                  <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                      border: "2px dashed #cccccc",
                      padding: "15px 10px",
                      textAlign: "center",
                      minHeight: "80px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <p
                      onClick={() => attachmentfileRef.current.click()}
                      style={{
                        margin: 0,
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      Drag and Drop Files here
                    </p>
                  </div>
                  <Button
                    className="link-btn"
                    onClick={() => attachmentfileRef.current.click()}
                    icon={<UploadOutlined />}
                    size="large"
                    style={{ marginTop: "8px", width: "100%" }}
                  >
                    Browse Files
                  </Button>
                </Form.Item>
              </Col>

              {/* File Attachments Section - Full width */}
              {fileAttachment.length > 0 && (
                <Col xs={24} sm={24} md={24} lg={24}>
                  <div className="file-attachments-section">
                    <h4
                      style={{
                        marginBottom: 12,
                        color: "#666",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      Attached Files
                    </h4>
                    <div
                      className="fileAttachment_container"
                    >
                      {fileAttachment.map((file, index) => (
                        <Badge
                          key={index}
                          count={
                            <CloseCircleOutlined
                              onClick={() => removeAttachmentFile(index)}
                              style={{ cursor: "pointer" }}
                            />
                          }
                        >
                          <div className="fileAttachment_Box">
                            <p className="fileNameTxtellipsis">{file.name}</p>
                          </div>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Col>
              )}

              {/* Subscribers Section - Half width */}
              {fileAttachment.length > 0 && (
                <Col xs={24} sm={24} md={12} lg={12}>
                  <Form.Item
                    label="Subscribers"
                    name="subscribers"
                    className="subscriber-section"
                  >
                    <MultiSelect
                      onSearch={handleSearch}
                      onChange={handleSelectedItemsChange}
                      values={
                        selectedItems
                          ? selectedItems.map((item) => item._id)
                          : []
                      }
                      listData={subscribersList}
                      search={searchKeyword}
                    />
                    {selectedItems && selectedItems.length > 0 && (
                      <div className="list-clear-btn" style={{ marginTop: 8 }}>
                        <Button
                          onClick={() => setSelectedItems([])}
                          className="list-clear-btn ant-delete"
                          size="small"
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </Form.Item>
                </Col>
              )}

              {/* Client Section - Half width */}
              {fileAttachment.length > 0 && (
                <Col xs={24} sm={24} md={12} lg={12}>
                  <Form.Item
                    label="Client"
                    name="client"
                    className="client-section"
                  >
                    <MultiSelect
                      onSearch={handleSearch}
                      onChange={handleSelectedClientsChange}
                      values={
                        selectedClient
                          ? selectedClient.map((item) => item._id)
                          : []
                      }
                      listData={clientsList}
                      search={searchKeyword}
                    />
                    {selectedClient && selectedClient.length > 0 && (
                      <div className="list-clear-btn" style={{ marginTop: 8 }}>
                        <Button
                          onClick={() => setSelectedClient([])}
                          className="list-clear-btn ant-delete"
                          size="small"
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </Form.Item>
                </Col>
              )}

              {/* Folder Selection - Full width on mobile */}
              {fileAttachment.length > 0 && allFiles === "active" && (
                <Col xs={24} sm={24} md={12} lg={12}>
                  <Form.Item
                    label="Folder"
                    name="folder_name"
                    rules={[
                      { required: true, message: "Please select a folder" },
                    ]}
                  >
                    <Select
                      placeholder="Select Folder"
                      showSearch
                      size="large"
                      filterOption={(input, option) =>
                        option.children
                          ?.toLowerCase()
                          .indexOf(input?.toLowerCase()) >= 0
                      }
                      filterSort={(optionA, optionB) =>
                        optionA.children
                          ?.toLowerCase()
                          ?.localeCompare(optionB.children?.toLowerCase())
                      }
                    >
                      {folderList?.map((item, index) => (
                        <Option
                          key={index}
                          value={item?._id}
                          style={{ textTransform: "capitalize" }}
                        >
                          {item?.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
            </Row>

            {/* Hidden file input */}
            <input
              multiple
              type="file"
              accept="*"
              onChange={onFileChange}
              hidden
              ref={attachmentfileRef}
            />
          </Form>
        </div>
      </Modal>

      <Modal
        open={isopenModelFolder}
        onCancel={handleCancelFolder}
        className="file-folder-modal"
        width={600}
        title={
          <>
            <h2>
              {addEditFolder === "Add Folder" ? "Add Folder" : "Edit Folder"}
            </h2>
            <h5>
              Create a clean space for files, proofs, and references inside this project.
            </h5>
          </>
        }
        footer={[
          addEditFolder === "Add Folder" ? (
            <Button
              key="cancel"
              onClick={handleCancelFolder}
              className="cancel-btn"
            >
              Cancel
            </Button>,
            <Button
              key="add"
              type="primary"
              className="file-folder-modal__primary"
              onClick={() => addFolderForm.submit()}
            >
              Add
            </Button>
          ) : (
            <Button
              key="update"
              type="primary"
              className="file-folder-modal__primary"
              onClick={() => addFolderForm.submit()}
            >
              Update
            </Button>
          ),


        ]}
      >
        <div className="file-folder-modal__body">
          <Form
            form={addFolderForm}
            onFinish={(values) => {
              addEditFolder === "Add Folder"
                ? handleSubmit(values)
                : updateFolder(values);
            }}
            layout="vertical"
            className="file-folder-modal__form"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Form.Item
                  label="Folder Name"
                  name="title"
                  rules={[{ required: true, message: "Please add a title" }]}
                >
                  <Input placeholder="Enter folder name" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>
    </>
  );
}

export default FileModule;
