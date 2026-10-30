import React from "react";
import { Popconfirm } from "antd";

/**
 * The app's one delete confirmation (as on the Project Expense page): a Popconfirm next to
 * the delete control, "Delete this <item>?" with Yes / No (Yes first via common-buttons.css).
 * Clicks inside never bubble to a row / card / menu underneath.
 *
 * In a Dropdown menu, wrap the item's label (not the whole menu):
 *   label: <DeleteConfirm title="Delete this task?" onConfirm={...}><DeleteConfirm.MenuLabel /></DeleteConfirm>
 */
const DeleteConfirm = ({ title = "Delete this item?", onConfirm, onCancel, children, ...rest }) => (
  <Popconfirm
    title={title}
    okText="Yes"
    cancelText="No"
    onConfirm={(e) => {
      e?.stopPropagation?.();
      onConfirm?.(e);
    }}
    onCancel={(e) => {
      e?.stopPropagation?.();
      onCancel?.(e);
    }}
    {...rest}
  >
    {children}
  </Popconfirm>
);

// Full-width "Delete" label for a menu item: keeps the menu open while the confirmation shows.
const MenuLabel = ({ children = "Delete" }) => (
  <span style={{ display: "block" }} onClick={(e) => e.stopPropagation()}>
    {children}
  </span>
);

DeleteConfirm.MenuLabel = MenuLabel;

export default DeleteConfirm;
