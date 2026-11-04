import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Empty, Progress, Skeleton, Table, Tag, Tooltip } from "antd";
import { ExportOutlined, ReloadOutlined, TeamOutlined, WalletOutlined } from "@ant-design/icons";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import Service from "../../service";
import "./ProjectBusiness.css";

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
// Defensive: format bare 5+ digit amounts in free text exactly like the tiles (server already does this).
const money = (text) => String(text || "").replace(/(?<![\w.,\u20B9-])(\d{5,9})(?![\w,.-]*\d)/g, (m) => inr(m));
const isoDates = (t) => (typeof t === "string" ? t.replace(/\b(\d{4}-\d{2}-\d{2})(?:T[\d:.]+Z?)?\b/g, (m, d) => dayjs(d).format("DD MMM YYYY")) : t);
const fmtDate = (d) => (d ? dayjs(d).format("DD MMM YYYY") : "-");

const INVOICE_STATUS = {
  paid: { color: "success", label: "Paid" },
  confirmed: { color: "processing", label: "Confirmed" },
  partial_payment: { color: "warning", label: "Part paid" },
  overdue: { color: "error", label: "Overdue" },
  draft: { color: "default", label: "Draft" },
};
const statusTag = (m) => {
  if (m.invoiceStatus) {
    const s = INVOICE_STATUS[m.invoiceStatus] || { color: "default", label: m.invoiceStatus };
    return <Tag color={s.color}>{s.label}</Tag>;
  }
  if (m.milestoneStatus === "Approved") return <Tag color="gold">Approved, not billed</Tag>;
  return <Tag>Not invoiced</Tag>;
};

function Stat({ label, value, tone, hint }) {
  return (
    <div className={`pms-biz-stat${tone ? ` pms-biz-stat--${tone}` : ""}`}>
      <div className="pms-biz-stat-label">{label}</div>
      <div className="pms-biz-stat-value">{value}</div>
      {hint ? <div className="pms-biz-sub">{hint}</div> : null}
    </div>
  );
}

function Billing({ billing, projectCode }) {
  if (!projectCode) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Not linked to a CRM deal" />;
  }
  if (!billing?.available) {
    return <Alert type="info" showIcon message="CRM billing is not available right now" description={billing?.reason} />;
  }
  const pct = (a, b) => (b ? Math.min(100, Math.round(((Number(a) || 0) / Number(b)) * 100)) : 0);
  const columns = [
    {
      title: "Milestone",
      key: "m",
      width: 300,
      render: (_, m) => (
        <div className="pms-biz-ellipsis" title={`${m.key} ${m.title}`}>
          <strong>{m.key}</strong> {m.title}
        </div>
      ),
    },
    { title: "Billing %", dataIndex: "billingPercent", width: 100, align: "right", render: (v) => (v ? `${v}%` : "-") },
    { title: "Invoice no.", dataIndex: "invoiceNo", width: 160, render: (v) => v || <span className="pms-biz-muted">Not raised</span> },
    { title: "Status", key: "s", width: 170, render: (_, m) => statusTag(m) },
    { title: "Amount (excl. GST)", dataIndex: "amount", width: 160, align: "right", render: (v) => <span className="pms-biz-num">{v ? inr(v) : "-"}</span> },
    { title: "Due date", dataIndex: "dueDate", width: 130, render: fmtDate },
  ];
  return (
    <>
      <div className="pms-biz-stats">
        <Stat label="Project value" value={inr(billing.value)} />
        <Stat label="Invoiced" value={inr(billing.invoiced)} hint={`${pct(billing.invoiced, billing.value)}% of value`} />
        <Stat label="Received" value={inr(billing.received)} tone="good" hint={`${pct(billing.received, billing.invoiced)}% of invoiced`} />
        <Stat label="Outstanding" value={inr(billing.outstanding)} tone={billing.outstanding ? "warn" : undefined} />
        <Stat label="Overdue" value={inr(billing.overdue)} tone={billing.overdue ? "bad" : undefined} />
      </div>
      <div className="pms-biz-progress">
        <Tooltip title="Invoiced vs project value">
          <Progress percent={pct(billing.received, billing.value)} success={{ percent: pct(billing.received, billing.value) }} strokeColor="#91caff" format={() => `Received ${pct(billing.received, billing.value)}% of project value`} />
        </Tooltip>
      </div>
      <div className="pms-biz-sub pms-biz-note">Invoiced and received include GST; milestone amounts are before GST.</div>
      {billing.nextAction && (
        <Alert className="pms-biz-next" type={billing.overdue ? "error" : "info"} showIcon message={<><strong>Next action:</strong> {isoDates(money(billing.nextAction))}</>} />
      )}
      <Table size="small" rowKey="key" columns={columns} dataSource={billing.milestones} pagination={false} sticky scroll={{ x: 1020 }} locale={{ emptyText: "No milestones with billing yet" }} />
    </>
  );
}

function Team({ team }) {
  if (!team?.available) {
    return <Alert type="info" showIcon message="Team availability is not available right now" description={team?.reason} />;
  }
  if (!team.members.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No assignees on this project" />;
  const columns = [
    { title: "Member", dataIndex: "name", width: 260, render: (v, m) => (<><strong>{v}</strong><div className="pms-biz-sub">{m.email}</div></>) },
    { title: "Designation", dataIndex: "designation", width: 180, render: (v, m) => v || (m.inHrms ? "-" : <span className="pms-biz-muted">Not in HRMS</span>) },
    {
      title: "Top skills",
      width: 300,
      dataIndex: "skills",
      render: (s) => (s?.length ? s.map((x) => <Tag key={x.skill} title={x.level}>{x.skill}</Tag>) : <span className="pms-biz-muted">-</span>),
    },
    {
      title: "Approved leave (next 30 days)",
      dataIndex: "leaves",
      render: (l) =>
        l?.length ? (
          l.map((x, i) => (
            <Tag key={i} color="orange">
              {fmtDate(x.from)}{dayjs(x.from).isSame(x.to, "day") ? "" : ` - ${fmtDate(x.to)}`} ({x.days}d)
            </Tag>
          ))
        ) : (
          <span className="pms-biz-muted">Available</span>
        ),
    },
  ];
  return <Table size="small" rowKey="email" columns={columns} dataSource={team.members} pagination={false} sticky scroll={{ x: 960 }} />;
}

const sibling = (port, envKey) => process.env[envKey] || (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) ? `http://localhost:${port}` : null);

/** Business tab: CRM billing + HRMS availability for the project, fetched server-side (cached 30s). */
function ProjectBusiness() {
  const { projectId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await Service.makeAPICall({ methodName: Service.getMethod, api_url: Service.getLinkedBusiness + projectId });
    if (res?.data?.status) setData(res.data.data);
    else setError(res?.data?.message || "Unable to load linked business data");
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <div className="pms-business"><section className="pms-biz-card"><Skeleton active paragraph={{ rows: 5 }} /></section></div>;
  if (error && !data) return <div className="pms-business"><Alert type="error" showIcon message={error} /></div>;

  const hrmsUrl = sibling(5202, "REACT_APP_HRMS_URL");
  const payrollUrl = sibling(5205, "REACT_APP_PAYROLL_URL");

  return (
    <div className="pms-business">
      <div className="pms-biz-links">
        <span className="pms-biz-sub">Linked products</span>
        {data?.crmLink && <Button size="small" icon={<WalletOutlined />} href={data.crmLink} target="_blank" rel="noopener noreferrer">CRM billing</Button>}
        {hrmsUrl && <Button size="small" icon={<TeamOutlined />} href={hrmsUrl} target="_blank" rel="noopener noreferrer">HRMS</Button>}
        {payrollUrl && <Button size="small" icon={<WalletOutlined />} href={payrollUrl} target="_blank" rel="noopener noreferrer">Payroll</Button>}
      </div>
      <section className="pms-biz-card">
        <div className="pms-biz-head">
          <h3>Customer billing (CRM)</h3>
          <div className="pms-biz-head-actions">
            {data?.billing?.customer && <span className="pms-biz-sub">{data.billing.customer}</span>}
            {data?.projectCode && <Tag>{data.projectCode}</Tag>}
            <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
            {data?.crmLink && (
              <Button size="small" type="primary" icon={<ExportOutlined />} href={data.crmLink} target="_blank" rel="noopener noreferrer">
                Open in CRM
              </Button>
            )}
          </div>
        </div>
        <Billing billing={data?.billing} projectCode={data?.projectCode} />
      </section>
      <section className="pms-biz-card">
        <div className="pms-biz-head">
          <h3>Team availability (HRMS)</h3>
        </div>
        <Team team={data?.team} />
      </section>
    </div>
  );
}

export default ProjectBusiness;
