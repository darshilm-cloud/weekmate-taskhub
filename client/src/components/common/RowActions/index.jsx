import React from "react";
import { Button, Dropdown, Modal, Popconfirm, Tooltip } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import "./rowActions.css";

/**
 * A table row's actions, laid out like WeekMate HRMS:
 *  - up to 2 actions → icon buttons side by side
 *  - 3 or more       → one "⋮" button opening a menu of labelled items
 *
 * actions: [{ key, label, icon, onClick, danger, confirm, hidden }]
 *   confirm: question shown before running onClick (Popconfirm inline,
 *            a confirm dialog when the action sits in the menu).
 */
const RowActions = ({ actions = [], max = 2 }) => {
  const visible = actions.filter((action) => action && !action.hidden);
  if (!visible.length) return null;

  if (visible.length <= max) {
    return (
      <div className="row-actions">
        {visible.map((action) => {
          const button = (
            <Button
              size="small"
              className={`row-actions-btn${action.danger ? " danger" : ""}`}
              icon={action.icon}
              aria-label={action.label}
              onClick={action.confirm ? undefined : action.onClick}
            />
          );
          return action.confirm ? (
            <Popconfirm
              key={action.key}
              title={action.confirm}
              okText="Yes"
              cancelText="No"
              onConfirm={action.onClick}
            >
              <Tooltip title={action.label}>{button}</Tooltip>
            </Popconfirm>
          ) : (
            <Tooltip key={action.key} title={action.label}>
              {button}
            </Tooltip>
          );
        })}
      </div>
    );
  }

  const onMenuClick = ({ key, domEvent }) => {
    domEvent?.stopPropagation?.();
    const action = visible.find((item) => item.key === key);
    if (!action) return;
    if (action.confirm) {
      Modal.confirm({
        title: action.confirm,
        okText: "Yes",
        cancelText: "No",
        okButtonProps: action.danger ? { danger: true } : undefined,
        onOk: () => action.onClick?.(),
      });
    } else {
      action.onClick?.();
    }
  };

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      overlayClassName="row-actions-menu"
      menu={{
        items: visible.map((action) => ({ key: action.key, label: action.label, danger: action.danger })),
        onClick: onMenuClick,
      }}
    >
      <Button
        size="small"
        type="text"
        className="row-actions-more"
        icon={<MoreOutlined />}
        aria-label="More actions"
        onClick={(e) => e.stopPropagation()}
      />
    </Dropdown>
  );
};

export default RowActions;
