import React, { useCallback, useState } from "react";
import { Modal, Form, Input } from "antd";
import {
  ClockCircleOutlined,
  FolderOutlined,
  SearchOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { debounce } from "lodash";
import "./ProjectListModal.css";

const ProjectListModal = ({
  projectDetails,
  recentList,
  isModalOpen,
  handleCancel,
  addVisitedData,
  setIsModalOpen,
  form,
  getProjectListing,
}) => {
  const companySlug  = localStorage.getItem("companyDomain");
  const [isSearching, setIsSearching] = useState(true);

  const onSearch = useCallback(
    debounce((value) => {
      if (value.trim()) getProjectListing(value);
    }, 500),
    []
  );

  const handleInputChange = (e) => {
    const { value } = e.target;
    if (value.trim() !== "") setIsSearching(false);
    onSearch(value);
  };

  const formattedTitle = (title) =>
    title?.replace(/(?:^|\s)([a-z])/g, (m, g) => m.charAt(0) + g.toUpperCase());

  return (
    <Modal
      footer={false}
      open={isModalOpen}
      width={640}
      closable={false}
      onCancel={handleCancel}
      className="plm-modal"
      styles={{ body: { padding: 0 } }}
    >
      {/* ── Search bar ───────────────────────────────────────── */}
      <div className="plm-search-wrap">
        <Form form={form}>
          <Input
            prefix={<SearchOutlined className="plm-search-icon" />}
            onChange={handleInputChange}
            placeholder="Search projects…"
            variant="borderless"
            className="plm-search-input"
            autoFocus
            allowClear
          />
        </Form>
      </div>

      {/* ── Results ──────────────────────────────────────────── */}
      <div className="plm-body">

        {/* Recents */}
        {recentList?.length > 0 && isSearching && (
          <div className="plm-section">
            <div className="plm-section-header">
              <ClockCircleOutlined className="plm-section-icon" />
              <span>Recents</span>
              <span className="plm-count">{recentList.length}</span>
            </div>
            <div className="plm-list">
              {recentList.map((item) => (
                <Link
                  key={item.project_id}
                  to={`/${companySlug}/project/app/${item.project_id}?tab=${item?.defaultTab?.name}`}
                  className="plm-item"
                  onClick={() => { setIsModalOpen(false); form.resetFields(); }}
                >
                  <span className="plm-item-icon">
                    <ClockCircleOutlined />
                  </span>
                  <span className="plm-item-title">
                    {formattedTitle(item?.project?.title)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        <div className="plm-section">
          <div className="plm-section-header">
            <FolderOutlined className="plm-section-icon" />
            <span>Projects</span>
            {projectDetails?.length > 0 && (
              <span className="plm-count">{projectDetails.length}</span>
            )}
          </div>

          {projectDetails?.length > 0 ? (
            <div className="plm-list">
              {projectDetails.map((item) => (
                <Link
                  key={item._id}
                  to={`/${companySlug}/project/app/${item._id}?tab=Tasks`}
                  className="plm-item"
                  onClick={() => {
                    setIsSearching(true);
                    addVisitedData(item._id);
                    setIsModalOpen(false);
                    form.resetFields();
                  }}
                >
                  <span className="plm-item-icon">
                    <ProjectOutlined />
                  </span>
                  <span className="plm-item-title">
                    {formattedTitle(item?.title)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="plm-empty">
              <FolderOutlined className="plm-empty-icon" />
              <p>No projects found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer hint ──────────────────────────────────────── */}
      <div className="plm-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>Enter</kbd> open</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </Modal>
  );
};

export default ProjectListModal;
