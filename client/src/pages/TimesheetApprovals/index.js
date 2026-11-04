import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Button, Card, DatePicker, Input, Modal, Select, Steps, Table, Tag, Tooltip, message } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, SearchOutlined, SendOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Service from "../../service";
import { can } from "../../util/hasPermission";
import PageHeader from "../../components/common/PageHeader";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import "./TimesheetApprovals.css";

dayjs.extend(utc);
const STATUS_COLOR = { Draft: "default", Submitted: "warning", Approved: "success", Rejected: "error" };
const STATUS_LABEL = { Draft: "Draft", Submitted: "Awaiting approval", Approved: "Approved", Rejected: "Rejected" };
const initials = (n) => String(n || "?").split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
const fmtH = (h) => `${Number(h || 0).toFixed(1)} h`;
const subH = (r) => (r.submittedMinutes ? r.submittedMinutes / 60 : null);
const periodOf = (m) => ({ periodStart: m.startOf("month").format("YYYY-MM-DD"), periodEnd: m.endOf("month").format("YYYY-MM-DD") });

/**
 * Project-wise timesheet approvals: employees submit a month of hours per project, the Project Manager
 * (timesheet manage permission) approves or rejects with a note. Reached from My Logged Time / Timesheet Report.
 */
function TimesheetApprovals() {
  const [month, setMonth] = useState(null);
  const [status, setStatus] = useState(undefined);
  const [project, setProject] = useState(undefined);
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [unsubmittedMinutes, setUnsubmittedMinutes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [employee, setEmployee] = useState(undefined);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitProject, setSubmitProject] = useState(undefined);
  const [submitMonth, setSubmitMonth] = useState(dayjs());

  const manager = canManage || can(["timesheet_manage"]);

  useEffect(() => {
    (async () => {
      const res = await Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.getProjectListForSearch, body: { isSearch: true, includeMetrics: false, limit: 200 } });
      if (res?.data?.status) setProjects(res.data.data || []);
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const body = { ...(month ? periodOf(month) : {}), ...(status ? { status } : {}), ...(project ? { project } : {}), limit: 500 };
    const res = await Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.timesheetSubmissionList, body });
    if (res?.data?.status) {
      setRows(res.data.data || []);
      setCanManage(!!res.data.metadata?.canManage);
      setUnsubmittedMinutes(Number(res.data.metadata?.unsubmittedMinutes) || 0);
    } else {
      message.error(res?.data?.message || "Unable to load timesheets");
    }
    setLoading(false);
  }, [month, status, project]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelected([]);
  }, [month, status, project, employee, search]);

  const employees = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => r.employee?._id && m.set(r.employee._id, r.employee.full_name));
    return [...m].map(([value, label]) => ({ value, label }));
  }, [rows]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!employee || r.employee?._id === employee) &&
        (!q || `${r.employee?.full_name} ${r.employee?.email} ${r.project?.title} ${r.project?.projectCode}`.toLowerCase().includes(q))
    );
  }, [rows, employee, search]);

  const stats = useMemo(() => {
    const t = { Submitted: [0, 0], Approved: [0, 0], Rejected: [0, 0], Draft: [0, 0] };
    shown.forEach((r) => {
      if (t[r.status]) {
        t[r.status][0] += 1;
        t[r.status][1] += Number(r.loggedHours) || 0;
      }
    });
    // Logged-but-unsubmitted hours are Draft too (one extra entry when there are any).
    if (unsubmittedMinutes > 0 && (!status || status === "Draft")) {
      t.Draft[0] += 1;
      t.Draft[1] += unsubmittedMinutes / 60;
    }
    return t;
  }, [shown, unsubmittedMinutes, status]);

  const bulkApprove = async () => {
    setBulkBusy(true);
    let ok = 0;
    for (const id of selected) {
      const res = await Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.timesheetSubmissionApprove, body: { id } });
      if (res?.data?.status) ok += 1;
    }
    setBulkBusy(false);
    setSelected([]);
    if (ok) message.success(`${ok} timesheet${ok > 1 ? "s" : ""} approved`);
    if (ok < selected.length) message.error(`${selected.length - ok} could not be approved`);
    load();
  };

  const call = async (api, body, okMsg) => {
    const res = await Service.makeAPICall({ methodName: Service.postMethod, api_url: api, body });
    if (res?.data?.status) {
      message.success(okMsg);
      await load();
      return true;
    }
    if (!res?.data?.permissionDenied) message.error(res?.data?.message || "Action failed");
    return false;
  };

  const columns = [
    {
      title: "Employee",
      dataIndex: "employee",
      width: 190,
      render: (e) => (
        <div className="pms-ts-person">
          <Avatar size={32} src={e?.emp_img || undefined} className="pms-ts-avatar">{initials(e?.full_name)}</Avatar>
          <div className="pms-ts-person-text">
            <div className="pms-ts-ellipsis" title={e?.full_name}>{e?.full_name || "-"}</div>
            <div className="pms-ts-sub pms-ts-ellipsis" title={e?.email}>{e?.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Project",
      dataIndex: "project",
      width: 180,
      render: (p) => (
        <div>
          <div className="pms-ts-ellipsis" title={p?.title}>{p?.title || "-"}</div>
          {p?.projectCode ? <div className="pms-ts-sub">{p.projectCode}</div> : null}
        </div>
      ),
    },
    { title: "Period", key: "period", width: 130, render: (_, r) => `${dayjs.utc(r.periodStart).format("DD MMM")} - ${dayjs.utc(r.periodEnd).format("DD MMM")}` },
    { title: "Logged hrs", dataIndex: "loggedHours", width: 90, align: "right", render: (h) => <span className="pms-ts-num">{fmtH(h)}</span> },
    {
      title: "Submitted hrs",
      key: "sub",
      width: 110,
      align: "right",
      render: (_, r) => {
        const h = subH(r);
        if (h == null) return <span className="pms-ts-sub">-</span>;
        const drift = Math.abs(h - (Number(r.loggedHours) || 0)) > 0.05;
        return (
          <Tooltip title={drift ? "Hours changed since submission" : undefined}>
            <span className={`pms-ts-num${drift ? " pms-ts-drift" : ""}`}>{fmtH(h)}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 190,
      render: (s, r) => (
        <div>
          <Tag color={STATUS_COLOR[s]} className="pms-ts-tag">{STATUS_LABEL[s] || s}</Tag>
          {r.reviewedBy ? <div className="pms-ts-sub pms-ts-ellipsis">by {r.reviewedBy.full_name}</div> : null}
          {r.reviewNote || r.note ? <Tooltip title={r.reviewNote || r.note}><div className="pms-ts-sub pms-ts-ellipsis pms-ts-note">Note: {r.reviewNote || r.note}</div></Tooltip> : null}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 210,
      fixed: "right",
      render: (_, r) =>
        manager && r.status === "Submitted" ? (
          <div className="pms-ts-actions">
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={busyId === r._id}
              onClick={async () => {
                setBusyId(r._id);
                await call(Service.timesheetSubmissionApprove, { id: r._id }, "Timesheet approved");
                setBusyId(null);
              }}
            >
              Approve
            </Button>
            <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => { setRejectFor(r); setRejectNote(""); }}>
              Reject
            </Button>
          </div>
        ) : (
          <span className="pms-ts-sub">{r.status === "Submitted" ? "Waiting for the Project Manager" : "-"}</span>
        ),
    },
  ];

  const tiles = [
    ["Submitted", "Awaiting approval", "warn"],
    ["Approved", "Approved", "good"],
    ["Rejected", "Rejected", "bad"],
    ["Draft", "Draft", ""],
  ];

  return (
    <div className="ant-project-task pms-timesheet-approvals">
      <PageHeader title="Timesheet Approvals">
        <Button type="primary" icon={<SendOutlined />} onClick={() => setSubmitOpen(true)}>
          Submit my timesheet
        </Button>
      </PageHeader>
      <Card className="pms-ts-flow">
        <Steps
          size="small"
          current={-1}
          items={[
            { title: "Employee submits", description: "Hours logged per project, per month" },
            { title: "Project Manager reviews", description: "Approve or reject with a note" },
            { title: "Approved", description: "Locked for payroll and billing" },
          ]}
        />
      </Card>
      <div className="pms-ts-tiles">
        {tiles.map(([k, label, tone]) => (
          <button key={k} type="button" className={`pms-ts-tile ${tone ? `pms-ts-tile--${tone}` : ""} ${status === k ? "is-active" : ""}`} onClick={() => setStatus(status === k ? undefined : k)}>
            <span className="pms-ts-tile-label">{label}</span>
            <span className="pms-ts-tile-value">{stats[k][0]}</span>
            <span className="pms-ts-sub">{fmtH(stats[k][1])} logged</span>
          </button>
        ))}
      </div>
      <Card>
        <div className="pms-ts-filters">
          <Input allowClear prefix={<SearchOutlined />} placeholder="Search employee or project" style={{ width: 240 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          <DatePicker picker="month" allowClear value={month} onChange={setMonth} style={{ width: 160 }} />
          <Select allowClear placeholder="Status" style={{ width: 170 }} value={status} onChange={setStatus} options={Object.keys(STATUS_COLOR).map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
          <Select allowClear showSearch optionFilterProp="label" placeholder="Employee" style={{ width: 200 }} value={employee} onChange={setEmployee} options={employees} />
          <Select
            allowClear
            showSearch
            placeholder="Project"
            style={{ width: 240 }}
            value={project}
            onChange={setProject}
            options={projects.map((p) => ({ value: p._id, label: p.title }))}
          />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
        </div>
        {manager && selected.length > 0 && (
          <div className="pms-ts-bulk">
            <strong>{selected.length} selected</strong>
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} loading={bulkBusy} onClick={bulkApprove}>Approve selected</Button>
            <Button size="small" onClick={() => setSelected([])}>Clear</Button>
          </div>
        )}
        <Table
          rowKey="_id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={shown}
          sticky
          rowSelection={manager ? { selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: (r) => ({ disabled: r.status !== "Submitted" }) } : undefined}
          pagination={{ pageSize: 20, hideOnSinglePage: true, showTotal: (t) => `${t} timesheets` }}
          scroll={{ x: 1130 }}
          locale={{ emptyText: <NoDataFoundIcon message="No timesheet submissions for this selection" compact /> }}
        />
      </Card>

      <Modal
        open={!!rejectFor}
        title="Reject timesheet"
        okText="Reject"
        okButtonProps={{ danger: true, disabled: !rejectNote.trim() }}
        onCancel={() => setRejectFor(null)}
        onOk={async () => {
          if (await call(Service.timesheetSubmissionReject, { id: rejectFor._id, reviewNote: rejectNote.trim() }, "Timesheet rejected")) setRejectFor(null);
        }}
        destroyOnClose
      >
        <p>{rejectFor ? `${rejectFor.employee?.full_name} - ${rejectFor.project?.title}` : ""}</p>
        <Input.TextArea rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Reason (required); the employee sees this note" />
      </Modal>

      <Modal
        open={submitOpen}
        title="Submit my timesheet"
        width={640}
        okText="Submit for approval"
        okButtonProps={{ disabled: !submitProject || !submitMonth }}
        onCancel={() => setSubmitOpen(false)}
        onOk={async () => {
          if (await call(Service.timesheetSubmissionSubmit, { project: submitProject, ...periodOf(submitMonth) }, "Timesheet submitted")) setSubmitOpen(false);
        }}
        destroyOnClose
      >
        <div className="pms-ts-form">
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Project"
            value={submitProject}
            onChange={setSubmitProject}
            style={{ width: "100%", minWidth: 360 }}
            dropdownMatchSelectWidth={false}
            popupClassName="pms-ts-project-dd"
            dropdownStyle={{ minWidth: 420 }}
            options={projects.map((p) => ({ value: p._id, label: <Tooltip title={p.title} placement="right"><span>{p.title}</span></Tooltip>, text: p.title }))}
            filterOption={(input, opt) => String(opt?.text || "").toLowerCase().includes(input.toLowerCase())}
          />
          <DatePicker picker="month" allowClear={false} value={submitMonth} onChange={setSubmitMonth} />
        </div>
        <p className="pms-ts-sub">Submits the hours you logged on this project in the selected month for approval by the Project Manager.</p>
      </Modal>
    </div>
  );
}

export default TimesheetApprovals;
