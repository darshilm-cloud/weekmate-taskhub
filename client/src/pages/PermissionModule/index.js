import React, { useCallback, useMemo, useState } from "react";
import { Button, Card, Modal, Switch, Table } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import PermissionModuleController from "./PermissionModuleController";
import "./PermissionModule.css";

const PermissionModule = () => {
  const companySlug = localStorage.getItem("companyDomain");
  const [roleName, setRoleName] = useState("")
  const {
    roleListData,
    permissionListData,
    PermissionModalOpen,
    setPermissionModalOpen,
    onPermissionChange,
    getPermissionByRole,
  } = PermissionModuleController();

  // Memoized handlers
  const handleCloseModal = useCallback(() => {
    setPermissionModalOpen(false);
  }, [setPermissionModalOpen]);

  const handlePermissionToggle = useCallback(
    (checked, permissionId) => {
      onPermissionChange(checked, permissionId);
    },
    [onPermissionChange]
  );

  const handleRolePermissionClick = useCallback(
    (roleId) => {
      setPermissionModalOpen(true);
      getPermissionByRole(roleId);
    },
    [setPermissionModalOpen, getPermissionByRole]
  );

  // Memoized table columns
  const roleTableColumns = useMemo(
    () => [
      {
        title: "Role Name",
        dataIndex: "role_name",
        key: "role_name",
        render: (text, record) => (
          <span style={{ textTransform: "capitalize" }}>
            {record?.role_name}
          </span>
        ),
      },
      {
        title: "Action",
        dataIndex: "action",
        key: "action",
        render: (text, record) => {
          const url = `/${companySlug}/permission-access?role_id=${record._id}`;

          return (
            <Link to={url}>
              <Button
                className="add-permission-button"
                type="primary"
                size="large"
                onClick={() => {
                  handleRolePermissionClick(record._id)
                  setRoleName(record?.role_name)
                }}
              >
                Add Permission For Role
              </Button>
            </Link>
          );
        },
      },
    ],
    [handleRolePermissionClick]
  );

  // Memoized permission list items
  const permissionItems = useMemo(
    () =>
      permissionListData.map((permission) => (
        <li key={permission._id}>
          <div style={{ textTransform: "capitalize" }}>
            {permission.name.replaceAll("_", " ")}
          </div>
          <div>
            <Switch
              checked={permission?.isAccess}
              onChange={(checked) =>
                handlePermissionToggle(checked, permission._id)
              }
              size="small"
            />
          </div>
        </li>
      )),
    [permissionListData, handlePermissionToggle]
  );

  return (
    <>
      <Card className="permission-card">
        <div className="heading-main">
          <h2>Permissions</h2>
        </div>
        <div className="block-table-content">
          <Table
            columns={roleTableColumns}
            dataSource={roleListData}
            pagination={false}
            rowKey="_id"
          />
        </div>
      </Card>

      <Modal
        footer={false}
        open={PermissionModalOpen}
        width={500}
        closable={false}
        onCancel={handleCloseModal}
        className="permission-edit-modal"
      >
        <div className="permission-modal-content-wrapper">
            <h2 style={{textAlign:"center"}}>{roleName}</h2>
          <div className="permission-content-header">
            <div className="permission-content-title">
              <h2>Permission List</h2>
            </div>
            <div className="permission-modla-close-icon">
              <CloseOutlined onClick={handleCloseModal} />
            </div>
          </div>
          <div className="permission-list-wrapper">
            <ul>{permissionItems}</ul>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default React.memo(PermissionModule);
