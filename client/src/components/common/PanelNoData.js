import React from "react";
import NoDataFoundIcon from "./NoDataFoundIcon";

/** Empty state for a side panel / tab body: the no-data illustration, centred in the available space. */
const PanelNoData = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      minHeight: 360,
      height: "100%",
    }}
  >
    <NoDataFoundIcon />
  </div>
);

export default PanelNoData;
