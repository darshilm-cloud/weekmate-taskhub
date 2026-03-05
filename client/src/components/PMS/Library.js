import {
  DeleteOutlined,
  EditOutlined,
  FileOutlined,
  FilePdfOutlined,
  AudioOutlined,
  PictureOutlined,
  DownOutlined,
  AntDesignOutlined,
  UserOutlined,
  FilePptOutlined,
  MoreOutlined,
  FileZipOutlined,
  FolderOpenOutlined,
  UploadOutlined,
  FileProtectOutlined,
  FolderFilled,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Popover,
  Image,
  Dropdown,
  Menu,
  Tooltip,
  Card,
} from "antd";
import React, { useState } from "react";

function Library() {
  const [openTypeMenu, setOpenTypeMenu] = useState(false);
  const [openLibMenu, setOpenLibMenu] = useState(false);
  const [openModified, setModified] = useState(false);

  const handleTypeMenu = (newOpen) => {
    setOpenTypeMenu(newOpen);
  };
  const handleLibMenu = (newOpen) => {
    setOpenLibMenu(newOpen);
  };
  const handleModified = (newOpen) => {
    setModified(newOpen);
  };
  const MoreItem = (
    <Menu>
      <Menu.Item>
        <EditOutlined /> Edit
      </Menu.Item>
      <Menu.Item className="ant-delete">
        <DeleteOutlined /> Delete
      </Menu.Item>
    </Menu>
  );
  const MoreItem2 = (
    <Menu>
      <Menu.Item>
        <UploadOutlined /> Download
      </Menu.Item>
      <Menu.Item>
        <DeleteOutlined /> Remove
      </Menu.Item>
    </Menu>
  );
  return (
    <Card className="file-folder-wrapper">
      <div className="heading-main">
        <h2>Library</h2>
      </div>
      <div className="profile-sub-head">
        <div className="head-box-inner">
          <Popover
            placement="rightTop"
            content={
              <div className="right-popover-wrapper">
                <ul>
                  <li>
                    <FolderOpenOutlined />
                    New folder
                  </li>
                  <li>
                    <FileProtectOutlined />
                    File Upload
                  </li>
                  <li>
                    <UploadOutlined />
                    Folder Upload
                  </li>
                </ul>
                <div className="popver-footer-btn">
                  <Button
                    type="primary"
                    className="square-primary-btn ant-btn-primary"
                  >
                    Apply
                  </Button>
                  <Button className="square-outline-btn ant-delete">
                    Cancel
                  </Button>
                </div>
              </div>
            }
            trigger="click"
            open={openLibMenu}
            onOpenChange={handleLibMenu}
          >
            <Button>
              My library
              <DownOutlined />
            </Button>
          </Popover>
          <Popover
            placement="rightTop"
            content={
              <div className="right-popover-wrapper">
                <ul>
                  <li>
                    <FileOutlined />
                    Documents
                  </li>
                  <li>
                    <FileProtectOutlined />
                    SpreadSheets
                  </li>
                  <li>
                    <FilePptOutlined />
                    Presentation
                  </li>
                  <li>
                    <PictureOutlined />
                    Photos & images
                  </li>
                  <li>
                    <FilePdfOutlined />
                    PDFs
                  </li>
                  <li>
                    <AudioOutlined />
                    Audio
                  </li>
                  <li>
                    <FileZipOutlined />
                    Archives (zip,rar)
                  </li>
                  <li>
                    <FolderOpenOutlined />
                    Folder
                  </li>
                </ul>
                <div className="popver-footer-btn">
                  <Button
                    type="primary"
                    className="square-primary-btn ant-btn-primary"
                  >
                    Apply
                  </Button>
                  <Button className="square-outline-btn"></Button>
                </div>
              </div>
            }
            trigger="click"
            open={openTypeMenu}
            onOpenChange={handleTypeMenu}
          >
            <Button>
              Type
              <DownOutlined />
            </Button>
          </Popover>
          <Popover
            placement="rightTop"
            content={
              <div className="right-popover-wrapper">
                <ul>
                  <li>Last 7 days</li>
                  <li>Last 30 days</li>
                  <li>This Year (2023)</li>
                  <li>Last Year (2022)</li>
                  <li>Custom Range Data</li>
                </ul>
                <div className="popver-footer-btn">
                  <Button
                    type="primary"
                    className="square-primary-btn ant-btn-primary"
                  >
                    Apply
                  </Button>
                  <Button className="square-outline-btn ant-delete">
                    Cancel
                  </Button>
                </div>
              </div>
            }
            trigger="click"
            open={openModified}
            onOpenChange={handleModified}
          >
            <Button>
              Modified
              <DownOutlined />
            </Button>
          </Popover>
        </div>
        <div className="block-status-content">
          <i className="fi fi-rr-list"></i>
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
            <Avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />
            <Avatar
              style={{
                backgroundColor: "#f56a00",
              }}
            >
              K
            </Avatar>
            <Tooltip title="Ant User" placement="top">
              <Avatar
                style={{
                  backgroundColor: "#87d068",
                }}
                icon={<UserOutlined />}
              />
            </Tooltip>
            <Avatar
              style={{
                backgroundColor: "#1677ff",
              }}
              icon={<AntDesignOutlined />}
            />
          </Avatar.Group>
          <Dropdown trigger={["click"]} overlay={MoreItem}>
            <span>
              <i className="fi fi-br-menu-dots-vertical"></i>
            </span>
          </Dropdown>
        </div>
      </div>

      <div className="library-folder">
        <div className="cover-folder-wrapper">
          <div className="heading">
            <h3>Folders</h3>
          </div>
          <div className="cover-folder-list">
            <div className="cover-content">
              <div className="folder-item-tag">
                <FolderFilled />
                New Folder
              </div>
              <span className="ant-dropdown-trigger">
                <MoreOutlined />
              </span>
            </div>
            <div className="cover-content">
              <div className="folder-item-tag">
                <FolderFilled />
                New Folder
              </div>
              <span className="ant-dropdown-trigger">
                <MoreOutlined />
              </span>
            </div>
            <div className="cover-content">
              <div className="folder-item-tag">
                <FolderFilled />
                New Folder
              </div>
              <span className="ant-dropdown-trigger">
                <MoreOutlined />
              </span>
            </div>
            <div className="cover-content">
              <div className="folder-item-tag">
                <FolderFilled />
                New Folder
              </div>
              <span className="ant-dropdown-trigger">
                <MoreOutlined />
              </span>
            </div>
            <div className="cover-content">
              <div className="folder-item-tag">
                <FolderFilled />
                New Folder
              </div>
              <span className="ant-dropdown-trigger">
                <MoreOutlined />
              </span>
            </div>
            <div className="cover-content">
              <div className="folder-item-tag">
                <FolderFilled />
                New Folder
              </div>
              <span className="ant-dropdown-trigger">
                <MoreOutlined />
              </span>
            </div>
            <div className="cover-content">
              <div className="folder-item-tag">
                <FolderFilled />
                New Folder
              </div>
              <span className="ant-dropdown-trigger">
                <MoreOutlined />
              </span>
            </div>
          </div>
        </div>
        <div className="cover-folder-wrapper">
          <div className="heading">
            <h3>Files</h3>
          </div>
          <div className="cover-folder-list">
            <div className="cover-folder-item">
              <div className="cover-content">
                <div className="folder-item-tag">
                  <FolderFilled />
                  New Folder
                </div>
                <span className="ant-dropdown-trigger">
                  <Dropdown trigger={["click"]} overlay={MoreItem2}>
                    <MoreOutlined />
                  </Dropdown>
                </span>
              </div>
              <div className="folder-item-content">
                <Image
                  height={150}
                  width={150}
                  src="https://file-examples.com/storage/fe02dbc794655b5e699ae4d/2017/10/file_example_JPG_100kB.jpg"
                />
              </div>
            </div>
            <div className="cover-folder-item">
              <div className="cover-content">
                <div className="folder-item-tag">
                  <FolderFilled />
                  New Folder
                </div>
                <span className="ant-dropdown-trigger">
                  <Dropdown trigger={["click"]} overlay={MoreItem2}>
                    <MoreOutlined />
                  </Dropdown>
                </span>
              </div>
              <div className="folder-item-content">
                <Image
                  height={150}
                  width={150}
                  src="https://file-examples.com/storage/fe02dbc794655b5e699ae4d/2017/10/file_example_JPG_100kB.jpg"
                />
              </div>
            </div>
            <div className="cover-folder-item">
              <div className="cover-content">
                <div className="folder-item-tag">
                  <FolderFilled />
                  New Folder
                </div>
                <span className="ant-dropdown-trigger">
                  <Dropdown trigger={["click"]} overlay={MoreItem2}>
                    <MoreOutlined />
                  </Dropdown>
                </span>
              </div>
              <div className="folder-item-content">
                <Image
                  height={150}
                  width={150}
                  src="https://file-examples.com/storage/fe02dbc794655b5e699ae4d/2017/10/file_example_JPG_100kB.jpg"
                />
              </div>
            </div>
            <div className="cover-folder-item">
              <div className="cover-content">
                <div className="folder-item-tag">
                  <FolderFilled />
                  New Folder
                </div>
                <span className="ant-dropdown-trigger">
                  <Dropdown trigger={["click"]} overlay={MoreItem2}>
                    <MoreOutlined />
                  </Dropdown>
                </span>
              </div>
              <div className="folder-item-content">
                <Image
                  height={150}
                  width={150}
                  src="https://file-examples.com/storage/fe02dbc794655b5e699ae4d/2017/10/file_example_JPG_100kB.jpg"
                />
              </div>
            </div>
            <div className="cover-folder-item">
              <div className="cover-content">
                <div className="folder-item-tag">
                  <FolderFilled />
                  New Folder
                </div>
                <span className="ant-dropdown-trigger">
                  <Dropdown trigger={["click"]} overlay={MoreItem2}>
                    <MoreOutlined />
                  </Dropdown>
                </span>
              </div>
              <div className="folder-item-content">
                <Image
                  height={150}
                  width={150}
                  src="https://file-examples.com/storage/fe02dbc794655b5e699ae4d/2017/10/file_example_JPG_100kB.jpg"
                />
              </div>
            </div>
            <div className="cover-folder-item">
              <div className="cover-content">
                <div className="folder-item-tag">
                  <FolderFilled />
                  New Folder
                </div>
                <span className="ant-dropdown-trigger">
                  <Dropdown trigger={["click"]} overlay={MoreItem2}>
                    <MoreOutlined />
                  </Dropdown>
                </span>
              </div>
              <div className="folder-item-content">
                <Image
                  height={150}
                  width={150}
                  src="https://file-examples.com/storage/fe02dbc794655b5e699ae4d/2017/10/file_example_JPG_100kB.jpg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default Library;
