import React, { useEffect, useState } from "react";
import { Checkbox, Col, Modal, Row, message } from "antd";
import "./exportColumnsModal.css";

/**
 * "Select Columns for … Export" dialog - same layout as HRMS (MyInOut, Assets,
 * Tickets…): a Select All checkbox, the exportable columns in a 3-up grid, and
 * Cancel / Export in the footer. Every column starts checked.
 *
 * columns: [{ key, label }]
 * onExport(selectedKeys) runs after the dialog closes, keys in column order.
 */
const ExportColumnsModal = ({
  open,
  title = "Select Columns for Export",
  columns = [],
  initialKeys,
  okText = "Export CSV",
  onCancel,
  onExport,
}) => {
  const allKeys = columns.map((col) => col.key);
  const [selectedKeys, setSelectedKeys] = useState(allKeys);

  // Reset to the remembered (or full) selection each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const keys = columns.map((col) => col.key);
    const remembered = (initialKeys || []).filter((key) => keys.includes(key));
    setSelectedKeys(remembered.length ? remembered : keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOk = () => {
    if (selectedKeys.length === 0) {
      message.error("Please select at least one column");
      return;
    }
    onExport(allKeys.filter((key) => selectedKeys.includes(key)));
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={okText}
      cancelText="Cancel"
      width={600}
      destroyOnClose
      className="export-columns-modal"
    >
      <div className="export-columns-select-all">
        <Checkbox
          checked={allKeys.length > 0 && selectedKeys.length === allKeys.length}
          indeterminate={selectedKeys.length > 0 && selectedKeys.length < allKeys.length}
          onChange={(e) => setSelectedKeys(e.target.checked ? allKeys : [])}
        >
          Select All
        </Checkbox>
      </div>
      <Checkbox.Group
        value={selectedKeys}
        onChange={(values) => setSelectedKeys(values)}
        style={{ width: "100%" }}
      >
        <Row gutter={[16, 8]}>
          {columns.map((column) => (
            <Col xs={12} sm={8} key={column.key}>
              <Checkbox value={column.key}>{column.label}</Checkbox>
            </Col>
          ))}
        </Row>
      </Checkbox.Group>
    </Modal>
  );
};

export default ExportColumnsModal;
