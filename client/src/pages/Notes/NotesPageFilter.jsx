import React, { useMemo, useState } from "react";
import { Button, Popover, Checkbox, Input, Badge, Divider } from "antd";
import { FilterOutlined, SearchOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";
import { removeTitle } from "../../util/nameFilter";
import { displayNoteAccent } from "./noteAccent";

export const EMPTY_NOTE_FILTERS = {
  projects: [],
  created_by: [],
  subscribers: [],
  colors: [],
  range: null, // [dayjs, dayjs] | null
};

export const countNoteFilters = (f) =>
  (f.projects.length ? 1 : 0) +
  (f.created_by.length ? 1 : 0) +
  (f.subscribers.length ? 1 : 0) +
  (f.colors.length ? 1 : 0) +
  (f.range?.[0] || f.range?.[1] ? 1 : 0);

// value + label for the colour swatches (matches the accent palette used on the note cards)
const COLOR_OPTIONS = [
  { value: "#e0f7fa", label: "Default" },
  { value: "#2563eb", label: "Blue" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#0b3a5b", label: "Navy" },
  { value: "#16a34a", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#dc2626", label: "Red" },
  { value: "#64748b", label: "Slate" },
];

const FACETS = [
  { key: "projects", label: "Project" },
  { key: "created_by", label: "Created By" },
  { key: "subscribers", label: "Subscribers" },
  { key: "colors", label: "Colour" },
];

function NotesPageFilter({ value, onApply, projects = [], users = [], extraColors = [], onOpen }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [facet, setFacet] = useState("projects");
  const [facetSearch, setFacetSearch] = useState("");

  const activeCount = countNoteFilters({ ...value, range: null });

  const handleOpenChange = (visible) => {
    if (visible) {
      setDraft(value);
      setFacetSearch("");
      onOpen?.();
    }
    setOpen(visible);
  };

  const toggle = (key, id) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id],
    }));

  const listFor = useMemo(() => {
    const q = facetSearch.trim().toLowerCase();
    const src =
      facet === "projects"
        ? projects.map((p) => ({ id: p._id, name: p.title }))
        : users.map((u) => ({ id: u._id, name: removeTitle(u.full_name || "") }));
    return src
      .filter((i) => i.name && (!q || i.name.toLowerCase().includes(q)))
      .sort((a, b) => {
        const aSel = draft[facet]?.includes(a.id) ? 0 : 1;
        const bSel = draft[facet]?.includes(b.id) ? 0 : 1;
        return aSel - bSel || a.name.localeCompare(b.name);
      });
  }, [facet, facetSearch, projects, users, draft]);

  // preset swatches + any other colour already used by the loaded notes
  const colorOptions = useMemo(() => {
    const known = new Set(COLOR_OPTIONS.map((c) => c.value.toLowerCase()));
    const extra = [...new Set(extraColors.filter(Boolean))]
      .filter((c) => !known.has(String(c).toLowerCase()))
      .map((c) => ({ value: c, label: c.toUpperCase() }));
    return [...COLOR_OPTIONS, ...extra];
  }, [extraColors]);

  const facetActive = (key) => draft[key].length > 0;

  const renderBody = () => {
    if (facet === "colors") {
      return (
        <div className="filter-options">
          {colorOptions.map((c) => (
            <div
              key={c.value}
              className={`assignee-item ${draft.colors.includes(c.value) ? "selected" : ""}`}
            >
              <Checkbox checked={draft.colors.includes(c.value)} onChange={() => toggle("colors", c.value)} />
              <span
                style={{ width: 12, height: 12, borderRadius: 3, background: displayNoteAccent(c.value), display: "inline-block", border: "1px solid #d1d5db" }}
              />
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <>
        <div className="notes-facet-search">
          <Input
            prefix={<SearchOutlined />}
            placeholder={`Search ${FACETS.find((f) => f.key === facet).label.toLowerCase()}...`}
            value={facetSearch}
            onChange={(e) => setFacetSearch(e.target.value)}
            allowClear
          />
        </div>
        <div className="filter-options">
          {listFor.length === 0 && <div style={{ color: "#94a3b8", padding: 8 }}>No results</div>}
          {listFor.map((item) => (
            <div key={item.id} className={`assignee-item ${draft[facet].includes(item.id) ? "selected" : ""}`}>
              <Checkbox checked={draft[facet].includes(item.id)} onChange={() => toggle(facet, item.id)} />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  const apply = () => {
    onApply({ ...draft, range: value.range });
    setOpen(false);
  };

  const reset = () => {
    const cleared = { ...EMPTY_NOTE_FILTERS, range: value.range };
    setDraft(cleared);
    onApply(cleared);
    setOpen(false);
  };

  const content = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Filters</h4>
          {countNoteFilters({ ...draft, range: null }) > 0 && (
            <Button size="small" type="text" className="delete-btn" onClick={reset}>
              Reset All
            </Button>
          )}
        </div>
        <Divider style={{ margin: "8px 0" }} />
        {FACETS.map((f) => (
          <div
            key={f.key}
            onClick={() => {
              setFacet(f.key);
              setFacetSearch("");
            }}
            className={`filter-menu-item ${facet === f.key ? "active" : ""}`}
          >
            <span>{f.label}</span>
            {facetActive(f.key) && <Badge size="small" color="#1890ff" />}
          </div>
        ))}
      </div>
      <div className="filter-content">
        <div className="filter-content-inner">
          <h4 className="filter-title">Filter by {FACETS.find((f) => f.key === facet).label}</h4>
          {renderBody()}
          <div className="filter-actions">
            <Button size="small" className="filter-btn" onClick={apply}>
              Apply Filter
            </Button>
            <Button size="small" className="delete-btn" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
      overlayStyle={{ maxWidth: "none" }}
    >
      <Button className={`notes-toolbar-filter-btn${activeCount ? " is-active" : ""}`}>
        Filter
      </Button>
    </Popover>
  );
}

export default NotesPageFilter;
