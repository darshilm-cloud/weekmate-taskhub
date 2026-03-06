import React, { memo } from "react";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

const defaultIndicator = <LoadingOutlined style={{ fontSize: 50, color: "#038fde" }} spin />;

const LoadingState = memo(function LoadingState({
  size = "large",
  tip = "",
  fullPage = false,
  className = "",
  indicator,
}) {
  const style = fullPage
    ? {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        width: "100%",
      }
    : {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 0",
        width: "100%",
      };

  return (
    <div className={`loading-state-container ${className}`} style={style}>
      <Spin size={size} tip={tip} indicator={indicator || defaultIndicator} />
    </div>
  );
});

export default LoadingState;
