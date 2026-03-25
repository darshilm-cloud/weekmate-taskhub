import React, { useState, useRef, useEffect } from "react";
import { Input, Button, Mentions, Badge, Form, Select, message, Tooltip } from "antd";
import {
  CloseOutlined,
  LinkOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { getFolderList } from "../../appRedux/reducers/ApiData";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import "./AddComment.css";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";
import CkEditorSuperBuild from "../../components/CkEditorSuperBuild";
import { cacheData, getCachedData } from "../../cacheDB";

const { TextArea } = Input;
const { Option } = Select;


function AddComment({
  addComment, // Function to add a comment
  id, // Task ID for the comment
  setTextAreaValue, // Function to set the text area value in the parent state
  isTextAreaFocused, // Boolean indicating if the text area is focused
  setIsTextAreaFocused, // Function to set the focus state of the text area
  textAreaValue, // Current value of the text area
  userList,
  editFlagObj,
  setDeleteFileData,
  deleteFileData,
  populatedFiles,
  setPopulatedFiles,
  updateTaskDraftStatus,
  onDraftChange,
  // getBoardTasks,
  // mainTaskId,
  ...otherProps
}) {
  const [taggedUser, setTaggedUser] = useState([]);
  const [OwnTextAreaValue, setOwnTextAreaValue] = useState(textAreaValue || "");
  const [fileAttachment, setfileAttachment] = useState([]);

  const { foldersList } = useSelector((state) => state.apiData);
  const { authUser } = useSelector(({ auth }) => auth);

  const [folderId, setFolderId] = useState("");

  const { projectId } = useParams();
  const dispatch = useDispatch();
  const attachmentfileRef = useRef();

  const handleSelect = (option) => {
    setTaggedUser((prevIds) => [...new Set([...prevIds, option.key])]);
  };

  const updateDraftStatus = (hasDraft) => {
    onDraftChange?.(id, hasDraft);
    updateTaskDraftStatus?.(id, hasDraft);
  };

  const { taggedUserList } =
    useSelector(state => state.apiData);

  const handleAddComment = async () => {
    const extractMentions = htmlString => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");
      const mentionElements = doc.querySelectorAll(".mention");
      let mentionValues = Array.from(mentionElements).map(mention =>
        mention.getAttribute("data-mention")
      );
      mentionValues = mentionValues.map(ele => ele.slice(1));
      mentionValues = mentionValues.map(mentionUser =>
        taggedUserList.find(
          employee => removeTitle(employee?.full_name) === mentionUser
        )
      );
      mentionValues = mentionValues.map(ele => ele?._id);
      return mentionValues;
    };

    let taggedUserIds = extractMentions(setTextAreaValue ? textAreaValue : OwnTextAreaValue);
    setTaggedUser(taggedUserIds);
    // Only call upload API if there are actual files to upload
    const uploadedFiles1 = fileAttachment.length > 0
      ? await uploadFiles(fileAttachment, "comment")
      : [];
    const defaultFolderId = foldersList?.[0]?._id ?? null;
    const resolvedFolderId = folderId || defaultFolderId;
    editFlagObj?.flag
      ? editFlagObj?.submitFn(
          {
            taggedUserIds,
            folder: resolvedFolderId,
            uploadedFiles1,
          },
          true,
          setTextAreaValue ? textAreaValue : OwnTextAreaValue
        )
      : addComment(
          id,
          taggedUserIds,
          resolvedFolderId,
          uploadedFiles1,
          setTextAreaValue ? textAreaValue : OwnTextAreaValue
        );

        await cacheData(`comment_${id}`, "");
        if (typeof updateTaskDraftStatus === 'function') {
          updateTaskDraftStatus(id, false);
        }

        await cacheData(`bug_comment_${id}`, "");
        updateDraftStatus(false);

    // Reset the local and parent states
    setTextAreaValue ? setTextAreaValue("") : setOwnTextAreaValue("")
    setTaggedUser([]);
    setIsTextAreaFocused(false);
    setFolderId(null);
    setfileAttachment([]);
    // NOTE: getBoardTasks intentionally NOT called here — adding a comment
    // does not require re-fetching the full board (was causing full page reload)
    if (otherProps.onDraftChange) {
      otherProps.onDraftChange(id, false);
    }
    // }
  };

  useEffect(() => {
    dispatch(getFolderList(projectId));
  }, []);

  useEffect(()=>{
    if(!setTextAreaValue){
      setOwnTextAreaValue(textAreaValue)
    }
  },[textAreaValue])

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

  const handleFolderIdChange = (id) => {
    setFolderId(id);
  };

  useEffect(() => {
    if (foldersList.length > 0 && folderId == "") {
      handleFolderIdChange(foldersList[0]._id);
    }
  }, [foldersList]);

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
            setfileAttachment([...fileAttachment, file]);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [fileAttachment]);

    useEffect(() => {
    const loadCachedComment = async () => {
      const cachedComment = await getCachedData(`comment_${id}`);
      if (cachedComment) {
        setTextAreaValue ? setTextAreaValue(cachedComment) : setOwnTextAreaValue(cachedComment);
      }
    };
    loadCachedComment();
  }, [id]);

  useEffect(() => {
  const loadDraft = async () => {
    const bugDraft = await getCachedData(`bug_comment_${id}`);
    const noteDraft = await getCachedData(`note_comment_${id}`);
    const draft = bugDraft || noteDraft;
    
    if (draft) {
      setTextAreaValue ? setTextAreaValue(draft) : setOwnTextAreaValue(draft);
      updateDraftStatus(true);
    }
  };

  loadDraft();
}, [id]);

  const handleChange = async (event, editor) => {
    const data = editor.getData();
    setTextAreaValue ? setTextAreaValue(data) : setOwnTextAreaValue(data);
    await cacheData(`comment_${id}`, data);
    await cacheData(`bug_comment_${id}`, data);
    await cacheData(`note_comment_${id}`, data);
    updateDraftStatus(data.trim() !== "");

    if (otherProps.onDraftChange) {
    otherProps.onDraftChange(id, data.trim() !== "");
  }
  };

  const handleEditCancel = async() => {
    await cacheData(`comment_${id}`, "");
    if (typeof updateTaskDraftStatus === 'function') {
    updateTaskDraftStatus(id, false);
  }
    await cacheData(`bug_comment_${id}`, "");
    await cacheData(`note_comment_${id}`, "");
    updateDraftStatus(false);
    editFlagObj.setFn(false)
    setIsTextAreaFocused(false);
    setTextAreaValue ? setTextAreaValue("") : setOwnTextAreaValue("")
    if (otherProps.onDraftChange) {
    otherProps.onDraftChange(id, false);
  }
  }


  return (
    <div className="comment-textarea" style={{ paddingTop: "12px" }}>
      <CkEditorSuperBuild
        handleChange={handleChange}
        mentionArray={taggedUserList}
        valueState={setTextAreaValue ? textAreaValue : OwnTextAreaValue}
        placeholder={"Write a comment (Type @ to mention users)"}
        editorId={"commect add"}
      />

      <div className="fileAttachment_container">
        {[...fileAttachment, ...(populatedFiles ? populatedFiles : [])]?.map(
          (file, index) => (
            <Badge
              key={index}
              count={
                <CloseCircleOutlined
                  onClick={() => removeAttachmentFile(index, file)}
                />
              }
            >
              <div className="fileAttachment_Box">
                <p className="fileNameTxtellipsis">
                  {file.name.length > 15
                    ? `${file.name.slice(0, 15)}.....${file.type}`
                    : file.name + file.type}
                </p>
              </div>
            </Badge>
          )
        )}
      </div>

      <div className="main-btn-wrapper" style={{ marginTop: 8 }}>
        <div className="main-wrapper-btn">
          <Button
            type="primary"
            className="add-comment-btn"
            disabled={
              (setTextAreaValue ? textAreaValue.trim() : OwnTextAreaValue.trim() )|| fileAttachment.length > 0 ? false : true
            }
            onClick={handleAddComment}
          >
            {editFlagObj?.flag ? "Update Comment" : "Add Comment"}
          </Button>

          {editFlagObj?.flag && (
            <Button className="ant-delete" type="primary" onClick={handleEditCancel}>
              Cancel
            </Button>
          )}

          <Tooltip placement="top" title="Attached file">
            <Button
              className="link-btn"
              onClick={() => attachmentfileRef.current.click()}
            >
              <i className="fi fi-ss-link"></i>Attach files
            </Button>
          </Tooltip>
          {fileAttachment.length > 0 && (
            <div className="folder-comment">
              <Form.Item
                name="folder"
                rules={[
                  {
                    required: true,
                    message: "Please select the folder",
                  },
                ]}
              >
                <Select
                  placeholder="Please Select Folder"
                  showSearch
                  defaultValue={
                    foldersList.length > 0 ? foldersList[0]._id : undefined
                  }
                  onChange={(e) => handleFolderIdChange(e)}
                >
                  {foldersList.map((data) => {
                    return (
                      <Option
                        key={data._id}
                        value={data._id}
                        style={{ textTransform: "capitalize" }}
                      >
                        {data.name}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </div>
          )}
        </div>
        <div className="btn-close-icon">
          <Button
            type="ghost"
            icon={<CloseOutlined />}
            disabled={!(setTextAreaValue ? textAreaValue.trim() : OwnTextAreaValue.trim())}
            onClick={() => {
              setIsTextAreaFocused(false);
              setTextAreaValue ? setTextAreaValue("") : setOwnTextAreaValue("")
            }}
          />
        </div>
        <input
          multiple
          type="file"
          onChange={onFileChange}
          hidden
          ref={attachmentfileRef}
        />
      </div>
    </div>
  );
}

export default AddComment;
