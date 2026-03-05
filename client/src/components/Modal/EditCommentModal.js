import React from "react";
import { useSelector } from "react-redux";
import { Modal, Form, Mentions, Button, Badge, Tooltip, Select } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import { Option } from "antd/es/mentions";
import { removeTitle } from "../../util/nameFilter";

const EditCommentModal = ({
  open,
  cancel,
  formName,
  onFinish,
  Mentionvalue,
  onChange,
  onSelect,
  fileAttachment,
  populatedFiles,
  removeAttachmentFile,
  attachmentfileRef,
  foldersList,
  onFileChange,
  setIsTextAreaFocused,
  userList,
}) => {
  const { authUser } = useSelector(({ auth }) => auth);

  return (
    <Modal
      open={open}
      footer={null}
      onCancel={cancel}
      className="add-task-modal add-list-modal edit-comment-task-model"
    >
      <div className="modal-header">
        <h1>Edit Comment</h1>
      </div>

      <Form form={formName} onFinish={(values) => onFinish(values, true)}>
        <div className="topic-cancel-wrapper">
          <Form.Item
            name="comment"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "comment is not allowed to be empty",
              },
            ]}
          >
            <Mentions
              style={{ width: "100%" }}
              value={Mentionvalue}
              onChange={(newValue) => onChange(newValue)}
              onSelect={onSelect}
              placeholder="Write a comment (Type @ to mention users)"
              onBlur={() => setIsTextAreaFocused(false)}
              onFocus={() => setIsTextAreaFocused(true)}
            >
              {userList
                ?.filter((s) => authUser._id !== s._id)
                ?.map((user) => (
                  <Mentions.Option
                    key={user._id}
                    value={removeTitle(user.full_name || user.name)}
                  >
                    {removeTitle(user.full_name || user.name)}
                  </Mentions.Option>
                ))}
            </Mentions>
          </Form.Item>
        </div>
        <div className="overview-modal-wrapper">
          {[...fileAttachment, ...populatedFiles].map((file, index) => (
            <Badge
              key={index}
              count={
                <CloseCircleOutlined
                  onClick={() => removeAttachmentFile(index, file)}
                />
              }
            >
              <div className="fileAttachment_Box">
                <a
                  className="fileNameTxtellipsis"
                  href={`${process.env.REACT_APP_API_URL}/public/${file?.path}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {file.name.length > 15
                    ? `${file.name.slice(0, 15)}.....${
                        file.file_type || file.type
                      }`
                    : file.name + file.file_type || file.type}
                </a>
              </div>
            </Badge>
          ))}
        </div>

        <div className="modal-footer-flex">
          <div className="flex-btn">
            <Button
              type="primary"
              htmlType="submit"
              className="square-primary-btn"
            >
              Update
            </Button>
            <Button onClick={cancel} className="square-outline-btn ant-delete">
              Cancel
            </Button>
            <div className="attachment-comment">
              <Tooltip placement="top" title="Attached file">
                <Button
                  className="link-btn"
                  onClick={() => attachmentfileRef.current.click()}
                >
                  <i className="fi fi-ss-link"></i>
                  Attach files
                </Button>
              </Tooltip>
            </div>
          </div>
          {fileAttachment.length > 0 && (
            <div className="folder-comment">
              <Form.Item
                name="folder"
                initialValue={
                  foldersList.length > 0 ? foldersList[0]._id : undefined
                }
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Select placeholder="Please Select Folder" showSearch>
                  {foldersList.map((data) => (
                    <Option
                      key={data._id}
                      value={data._id}
                      style={{ textTransform: "capitalize" }}
                    >
                      {data.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
          )}

          <input
            multiple
            type="file"
            onChange={onFileChange}
            hidden
            ref={attachmentfileRef}
          />
        </div>
      </Form>
    </Modal>
  );
};

export default EditCommentModal;
