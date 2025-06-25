// DrawerComponent.jsx
import React, { useRef, useEffect } from "react";
import { Drawer as AntDrawer } from "antd";
import "./DrawerComponent.css";
const DrawerComponent = ({ visible, onClose, title, children, width }) => {
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target) &&
        !event.target.closest(".ant-drawer-body")
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div ref={drawerRef}>
      <AntDrawer
        className="common-drawer-projectlist-wrapper"
        title={title}
        placement="left"
        onClose={onClose}
        visible={visible}
        mask={false}
        width={width}
        style={{ left: "120px" }}
        maskClosable={true}
      >
        {children}
      </AntDrawer>
    </div>
  );
};

export default DrawerComponent;
