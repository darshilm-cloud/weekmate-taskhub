import React, { useState } from "react";
import { Popconfirm, Tooltip } from "antd";

/**
 * A button with a hover tooltip that opens a confirmation popup when clicked.
 * The tooltip is hidden while the confirmation is open, so the two never stack
 * on top of each other (and the tooltip does not stay behind after clicking).
 */
const ConfirmIconTip = ({ tip, children, ...popconfirmProps }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  return (
    <Popconfirm {...popconfirmProps} open={confirmOpen} onOpenChange={setConfirmOpen}>
      <Tooltip
        title={tip}
        open={tipOpen && !confirmOpen}
        onOpenChange={setTipOpen}
      >
        {children}
      </Tooltip>
    </Popconfirm>
  );
};

export default ConfirmIconTip;
