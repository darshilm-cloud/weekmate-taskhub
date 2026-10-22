import React from "react";
import NodataFoundIcon from "./NodataFound";

/**
 * Centred empty state built on the shared no-data illustration.
 *
 * `compact` shrinks the artwork for tight containers - Select dropdown panels
 * and modal bodies - where the full 125x100 illustration overwhelms the space.
 */
const NoDataFoundIcon = ({ message = "No data found", compact = false }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      alignSelf: "stretch",
      // fills its container, so the artwork sits in the middle of the area rather than at the top
      ...(compact ? {} : { height: "100%", minHeight: 240, boxSizing: "border-box", flex: "1 1 auto", margin: "auto 0" }),
      textAlign: "center",
      gap: compact ? 4 : 12,
      padding: compact ? "8px 0" : "24px 0",
    }}
  >
    <NodataFoundIcon width={compact ? 90 : 125} height={compact ? 72 : 100} />
    {/* {message ? (
      <span style={{ color: "#8c8c8c", fontSize: compact ? 12 : 14 }}>{message}</span>
    ) : null} */}
  </div>
);

export default NoDataFoundIcon;
