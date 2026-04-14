import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Form, Input, Spin } from "antd";
import {
  ClockCircleOutlined,
  FolderOutlined,
  SearchOutlined,
  ProjectOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Link, useHistory } from "react-router-dom";
import NoDataFoundIcon from "../common/NoDataFoundIcon";
import "./ProjectListModal.css";

const ProjectListModal = ({
  projectList,
  recentList,
  isProjectListLoading,
  isRecentListLoading,
  isModalOpen,
  handleCancel,
  addVisitedData,
  removeVisitedData,
  setIsModalOpen,
  form,
}) => {
  const companySlug  = localStorage.getItem("companyDomain");
  const [isSearching, setIsSearching] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const history = useHistory();
  const itemRefs = useRef([]);

  const handleInputChange = (e) => {
    const { value } = e.target;
    setSearchValue(value);
    setIsSearching(value.trim() === "");
  };

  const formattedTitle = (title) =>
    title?.replace(/(?:^|\s)([a-z])/g, (m, g) => m.charAt(0) + g.toUpperCase());

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return projectList || [];
    }
    return (projectList || []).filter((item) =>
      `${item?.title || ""}`.toLowerCase().includes(normalizedSearch)
    );
  }, [projectList, searchValue]);

  const sortedRecentList = useMemo(() => {
    const getVisitedTimestamp = (item) => {
      const rawValue =
        item?.visitedAt ||
        item?.lastVisitedAt ||
        item?.updatedAt ||
        item?.createdAt ||
        item?.visit_date;
      const timestamp = rawValue ? new Date(rawValue).getTime() : 0;
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };
    return [...(recentList || [])].sort(
      (a, b) => getVisitedTimestamp(b) - getVisitedTimestamp(a)
    );
  }, [recentList]);

  // Flat list of all navigable items in render order
  const allItems = useMemo(() => {
    const items = [];
    if (isSearching) {
      sortedRecentList.forEach((item) => {
        items.push({
          type: "recent",
          id: item._id || item.project_id,
          path: `/${companySlug}/project/app/${item.project_id}?tab=${item?.defaultTab?.name}`,
          projectId: item.project_id,
        });
      });
    }
    filteredProjects.forEach((item) => {
      items.push({
        type: "project",
        id: item._id,
        path: `/${companySlug}/project/app/${item._id}?tab=Tasks`,
        projectId: item._id,
      });
    });
    return items;
  }, [isSearching, sortedRecentList, filteredProjects, companySlug]);

  // Reset highlight when results change
  useEffect(() => {
    setSelectedIndex(-1);
    itemRefs.current = [];
  }, [allItems]);

  // Reset modal state on open
  useEffect(() => {
    if (isModalOpen) {
      setIsSearching(true);
      setSearchValue("");
      setSelectedIndex(-1);
      form.resetFields();
    }
  }, [form, isModalOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allItems.length) {
        const item = allItems[selectedIndex];
        addVisitedData(item.projectId);
        setIsSearching(true);
        setIsModalOpen(false);
        form.resetFields();
        history.push(item.path);
      }
    }
  };

  const openItem = (projectId) => {
    addVisitedData(projectId);
    setIsSearching(true);
    setIsModalOpen(false);
    form.resetFields();
  };

  // Index offset for projects section
  const projectOffset = isSearching ? sortedRecentList.length : 0;

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
            onKeyDown={handleKeyDown}
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
        {sortedRecentList?.length > 0 && isSearching && (
          <div className="plm-section">
            <div className="plm-section-header">
              <ClockCircleOutlined className="plm-section-icon" />
              <span>Recents</span>
              <span className="plm-count">{sortedRecentList.length}</span>
            </div>
            <div className="plm-list">
              {sortedRecentList.map((item, idx) => (
                <Link
                  key={item._id || item.project_id}
                  to={`/${companySlug}/project/app/${item.project_id}?tab=${item?.defaultTab?.name}`}
                  className={`plm-item${idx === selectedIndex ? " plm-item-active" : ""}`}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  onClick={() => openItem(item.project_id)}
                >
                  <span className="plm-item-icon">
                    <ClockCircleOutlined />
                  </span>
                  <span className="plm-item-title">
                    {formattedTitle(item?.project?.title)}
                  </span>
                  <button
                    type="button"
                    className="plm-item-remove"
                    aria-label={`Remove ${item?.project?.title || "project"} from recents`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeVisitedData(item._id);
                    }}
                  >
                    <CloseOutlined />
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {isSearching && isRecentListLoading && sortedRecentList?.length === 0 && (
          <div className="plm-section">
            <div className="plm-section-header">
              <ClockCircleOutlined className="plm-section-icon" />
              <span>Recents</span>
            </div>
            <div className="plm-empty">
              <Spin size="small" />
            </div>
          </div>
        )}

        {/* Projects */}
        <div className="plm-section">
          <div className="plm-section-header">
            <FolderOutlined className="plm-section-icon" />
            <span>Projects</span>
            {filteredProjects?.length > 0 && (
              <span className="plm-count">{filteredProjects.length}</span>
            )}
          </div>

          {filteredProjects?.length > 0 ? (
            <div className="plm-list">
              {filteredProjects.map((item, idx) => {
                const globalIdx = projectOffset + idx;
                return (
                  <Link
                    key={item._id}
                    to={`/${companySlug}/project/app/${item._id}?tab=Tasks`}
                    className={`plm-item${globalIdx === selectedIndex ? " plm-item-active" : ""}`}
                    ref={(el) => { itemRefs.current[globalIdx] = el; }}
                    onClick={() => openItem(item._id)}
                  >
                    <span className="plm-item-icon">
                      <ProjectOutlined />
                    </span>
                    <span className="plm-item-title">
                      {formattedTitle(item?.title)}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : isProjectListLoading ? (
            <div className="plm-empty">
              <Spin />
              <p>Loading projects...</p>
            </div>
          ) : (
            <div className="plm-empty">
              <NoDataFoundIcon />
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
