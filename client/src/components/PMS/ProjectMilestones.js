import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, Progress, Spin, Tag, Tooltip, message } from "antd";
import { CheckCircleOutlined, CheckOutlined, CloseOutlined, CloudSyncOutlined, DeleteOutlined, PlusOutlined, RollbackOutlined, SendOutlined } from "@ant-design/icons";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import Service from "../../service";
import { can, getRoles } from "../../util/hasPermission";
import NoDataFoundIcon from "../common/NoDataFoundIcon";
import "./ProjectMilestones.css";

const { TextArea } = Input;

const STATUS_COLOR = {
  "Not Started": "default",
  "In Progress": "processing",
  Submitted: "warning",
  Approved: "success",
  "Rework Required": "error",
};
const SYNC_META = {
  pending: { color: "processing", label: "CRM sync pending" },
  synced: { color: "success", label: "Synced to CRM" },
  failed: { color: "error", label: "CRM sync failed" },
};

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => (d ? dayjs(d).format("DD MMM YYYY") : "-");
const apiErrorMessage = (res, fallback) => res?.data?.message || fallback;

/**
 * Milestones tab of a project: weight / value / status, Team Manager submits with evidence,
 * Project Manager approves or returns for rework. An approval is pushed to the CRM (invoice trigger);
 * the CRM sync state is shown per milestone.
 */
function ProjectMilestones() {
  const { projectId } = useParams();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [submitFor, setSubmitFor] = useState(null);
  const [reviewFor, setReviewFor] = useState(null);
  const [detailFor, setDetailFor] = useState(null);
  const [busy, setBusy] = useState(false);

  // Only the project's Team Manager submits (Admin exempt); a project without a Team Manager falls back to the edit permissions.
  const canSubmit = getRoles(["Admin"]) || !!meta.isTeamManager || (meta.hasTeamManager === false && can(["project_edit", "projects_manage", "tasks_manage"]));
  const canApprove = can(["projects_manage"]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.getMilestones, body: { project_id: projectId } });
    if (res?.data?.status) {
      setRows(res.data.data || []);
      setMeta(res.data.metadata || {});
    } else {
      message.error(apiErrorMessage(res, "Unable to load milestones"));
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const approvedValue = useMemo(() => rows.filter((m) => m.status === "Approved").reduce((s, m) => s + (m.value || 0), 0), [rows]);
  const approvedWeight = useMemo(() => rows.filter((m) => m.status === "Approved").reduce((s, m) => s + (m.weight || 0), 0), [rows]);

  const act = async (api, id, body, okMsg) => {
    setBusy(true);
    const res = await Service.makeAPICall({ methodName: Service.postMethod, api_url: api, params: id, body });
    setBusy(false);
    if (res?.data?.status) {
      message.success(okMsg || res.data.message);
      await load();
      return true;
    }
    if (!res?.data?.permissionDenied) message.error(apiErrorMessage(res, "Action failed"));
    return false;
  };

  const stepsFor = (r) => {
    const st = r.status;
    const rework = st === "Rework Required";
    const idx = st === "Approved" ? 3 : st === "Submitted" ? 1 : 0;
    return [
      { label: "Pending", sub: rework ? "Reworking" : "", state: idx > 0 ? "done" : rework ? "warn" : "active" },
      { label: "Submitted", sub: r.submittedAt ? fmtDate(r.submittedAt) : "", state: idx > 1 || st === "Approved" ? "done" : st === "Submitted" ? "active" : "todo" },
      { label: rework ? "Rejected" : "Approved", sub: st === "Approved" ? fmtDate(r.approvedAt) : "", state: st === "Approved" ? "done" : rework ? "error" : "todo" },
    ];
  };

  const nextAction = (r) => {
    if (r.status === "Approved") return r.crmSyncStatus === "failed" ? "Approved. CRM sync failed; retry the sync." : "Complete. Approved by the Project Manager.";
    if (r.status === "Submitted") return canApprove ? "Waiting on you: review the evidence and approve or reject." : "Waiting on the Project Manager to approve or reject.";
    if (r.status === "Rework Required") return canSubmit ? "Rejected by the Project Manager. Fix the points and resubmit." : "Rejected; waiting for the Team Manager to resubmit.";
    return canSubmit ? "Next: Team Manager submits with evidence." : "Waiting on the Team Manager to submit with evidence.";
  };

  const renderSync = (r) => {
    if (r.status !== "Approved" || !r.crmSyncStatus || r.crmSyncStatus === "none") return <span className="pms-ms-muted">Not applicable</span>;
    const m = SYNC_META[r.crmSyncStatus] || SYNC_META.pending;
    let tip = "";
    if (r.crmSyncStatus === "failed") tip = `Reason: ${r.crmSyncError || "unknown"}${r.crmSyncAttempts ? ` (after ${r.crmSyncAttempts} attempt${r.crmSyncAttempts === 1 ? "" : "s"})` : ""}`;
    else if (r.crmSyncStatus === "pending") tip = r.crmSyncError ? `Retrying. Last error: ${r.crmSyncError}` : "Sending to the CRM";
    else if (r.crmSyncedAt) tip = `Synced ${dayjs(r.crmSyncedAt).format("DD MMM YYYY HH:mm")}`;
    return (
      <Tooltip title={tip} overlayStyle={{ maxWidth: 420 }}>
        <Tag color={m.color} style={{ margin: 0 }}>{m.label}</Tag>
      </Tooltip>
    );
  };

  const overdue = (r) => r.dueDate && r.status !== "Approved" && dayjs(r.dueDate).isBefore(dayjs(), "day");

  return (
    <div className="pms-milestones">
      <div className="pms-ms-header">
        <div>
          <h3 className="pms-ms-title">Milestones</h3>
          <div className="pms-ms-sub">Pending, submitted by the Team Manager, then approved or rejected by the Project Manager. Approval raises the invoice request in the CRM.</div>
        </div>
      </div>

      <div className="pms-ms-summary">
        <div className="pms-ms-kpi">
          <div className="pms-ms-summary-label">Project code</div>
          <div className="pms-ms-summary-value">{meta?.project?.projectCode || "-"}</div>
        </div>
        <div className="pms-ms-kpi">
          <div className="pms-ms-summary-label">Project value</div>
          <div className="pms-ms-summary-value">{inr(meta?.project?.projectValue)}</div>
        </div>
        <div className="pms-ms-kpi">
          <div className="pms-ms-summary-label">Approved milestones</div>
          <div className="pms-ms-summary-value">{meta?.approved || 0} / {meta?.total || rows.length || 0}</div>
        </div>
        <div className="pms-ms-kpi">
          <div className="pms-ms-summary-label">Approved value</div>
          <div className="pms-ms-summary-value">{inr(approvedValue)}</div>
        </div>
        <div className="pms-ms-progress">
          <div className="pms-ms-summary-label">Delivery progress</div>
          <Progress percent={Math.round(approvedWeight)} size="small" />
        </div>
      </div>

      {loading && !rows.length ? (
        <div className="pms-ms-state"><Spin /></div>
      ) : !rows.length ? (
        <div className="pms-ms-state"><NoDataFoundIcon message="No milestones defined for this project" compact /></div>
      ) : (
        <div className="pms-ms-list">
          {rows.map((r) => (
            <div className={`pms-ms-card pms-ms-card-${String(r.status).replace(/\s+/g, "-").toLowerCase()}`} key={r._id}>
              <div className="pms-ms-card-head">
                <Tag color="blue" style={{ margin: 0 }}>{r.key}</Tag>
                <a className="pms-ms-card-title" title={r.title} onClick={() => setDetailFor(r)}>{r.title}</a>
                <Tag color={STATUS_COLOR[r.status]} style={{ margin: 0 }}>{r.status}</Tag>
              </div>
              <div className="pms-ms-card-grid">
                <div><div className="pms-ms-summary-label">Weight</div><div className="pms-ms-num">{r.weight ?? 0}%</div></div>
                <div><div className="pms-ms-summary-label">Value</div><div className="pms-ms-num">{inr(r.value)}</div></div>
                <div>
                  <div className="pms-ms-summary-label">Billing on approval</div>
                  {r.billingPercent > 0 ? (
                    <div className="pms-ms-num">{r.billingPercent}% <span className="pms-ms-sub">({inr(r.billingAmount)} + GST)</span></div>
                  ) : <div className="pms-ms-muted">No invoice</div>}
                </div>
                <div>
                  <div className="pms-ms-summary-label">Due date</div>
                  <div className={overdue(r) ? "pms-ms-num pms-ms-overdue" : "pms-ms-num"}>{fmtDate(r.dueDate)}{overdue(r) ? " (overdue)" : ""}</div>
                </div>
                <div><div className="pms-ms-summary-label">CRM sync</div>{renderSync(r)}</div>
              </div>
              <div className="pms-ms-stepper">
                {stepsFor(r).map((st, i) => (
                  <div className={`pms-ms-step pms-ms-step-${st.state}`} key={st.label}>
                    <span className="pms-ms-step-dot">{st.state === "done" ? <CheckOutlined /> : st.state === "error" ? <CloseOutlined /> : i + 1}</span>
                    <span className="pms-ms-step-text">
                      <span className="pms-ms-step-label">{st.label}</span>
                      {st.sub ? <span className="pms-ms-sub">{st.sub}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pms-ms-card-foot">
                <span className="pms-ms-next">{nextAction(r)}</span>
                <div className="pms-ms-actions">
                  <Button size="small" onClick={() => setDetailFor(r)}>Timeline & evidence</Button>
                  {canSubmit && ["Not Started", "In Progress", "Rework Required"].includes(r.status) && (
                    <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => setSubmitFor(r)}>
                      {r.status === "Rework Required" ? "Resubmit" : "Submit for review"}
                    </Button>
                  )}
                  {canApprove && r.status === "Submitted" && (
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => setReviewFor(r)}>
                      Review: approve / reject
                    </Button>
                  )}
                  {r.status === "Approved" && r.crmSyncStatus === "failed" && canApprove && (
                    <Button size="small" icon={<CloudSyncOutlined />} loading={busy} onClick={() => act(Service.resyncMilestone, r._id, {}, "CRM sync queued")}>
                      Retry CRM sync
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SubmitModal
        milestone={submitFor}
        busy={busy}
        onCancel={() => setSubmitFor(null)}
        onSubmit={async (body) => {
          if (await act(Service.submitMilestone, submitFor._id, body, "Milestone submitted for review")) setSubmitFor(null);
        }}
      />
      <ReviewModal
        milestone={reviewFor}
        busy={busy}
        onCancel={() => setReviewFor(null)}
        onApprove={async (note) => {
          if (await act(Service.approveMilestone, reviewFor._id, { note }, "Milestone approved; invoice request is being sent to the CRM")) setReviewFor(null);
        }}
        onReturn={async (reviewNote) => {
          if (await act(Service.rejectMilestone, reviewFor._id, { reviewNote }, "Milestone returned for rework")) setReviewFor(null);
        }}
      />
      <DetailModal milestone={detailFor} onClose={() => setDetailFor(null)} />
    </div>
  );
}

function EvidenceLinks({ evidence }) {
  if (!evidence?.length) return <span className="pms-ms-muted">No evidence attached</span>;
  return (
    <ul className="pms-ms-evidence">
      {evidence.map((e, i) => (
        <li key={i}>
          <a href={/^https?:/i.test(e.url) ? e.url : `${(process.env.REACT_APP_API_URL || "").replace(/\/$/, "")}/${String(e.url || "").replace(/^\//, "")}`} target="_blank" rel="noopener noreferrer">
            {e.name || e.url}
          </a>
        </li>
      ))}
    </ul>
  );
}

function SubmitModal({ milestone, busy, onCancel, onSubmit }) {
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState([{ name: "", url: "" }]);
  useEffect(() => {
    if (milestone) {
      setNote("");
      setEvidence(milestone.evidence?.length ? milestone.evidence.map((e) => ({ name: e.name, url: e.url })) : [{ name: "", url: "" }]);
    }
  }, [milestone]);
  const clean = evidence.filter((e) => e.url.trim());
  const setRow = (i, patch) => setEvidence((list) => list.map((e, k) => (k === i ? { ...e, ...patch } : e)));
  return (
    <Modal
      open={!!milestone}
      title={milestone ? `Submit ${milestone.key}: ${milestone.title}` : ""}
      onCancel={onCancel}
      okText="Submit for review"
      onOk={() => onSubmit({ note, evidence: clean.map((e) => ({ name: e.name || e.url, url: e.url.trim() })) })}
      okButtonProps={{ disabled: !clean.length, loading: busy }}
      destroyOnClose
    >
      {milestone?.status === "Rework Required" && (
        <div className="pms-ms-rework">
          <strong>Returned by the Project Manager:</strong> {milestone.reviewNote || "-"}
        </div>
      )}
      <div className="pms-ms-field-label">Evidence (links to documents, demos, Figma, test reports)</div>
      {evidence.map((e, i) => (
        <div className="pms-ms-evidence-row" key={i}>
          <Input placeholder="Name" value={e.name} onChange={(ev) => setRow(i, { name: ev.target.value })} />
          <Input placeholder="https://..." value={e.url} onChange={(ev) => setRow(i, { url: ev.target.value })} />
          <Button icon={<DeleteOutlined />} disabled={evidence.length === 1} onClick={() => setEvidence((l) => l.filter((_, k) => k !== i))} />
        </div>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => setEvidence((l) => [...l, { name: "", url: "" }])}>
        Add evidence
      </Button>
      <div className="pms-ms-field-label" style={{ marginTop: 16 }}>Note for the reviewer</div>
      <TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was delivered, anything the reviewer should check" />
    </Modal>
  );
}

function ReviewModal({ milestone, busy, onCancel, onApprove, onReturn }) {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (milestone) setNote("");
  }, [milestone]);
  return (
    <Modal
      open={!!milestone}
      title={milestone ? `Review ${milestone.key}: ${milestone.title}` : ""}
      onCancel={onCancel}
      destroyOnClose
      footer={[
        <Button key="c" onClick={onCancel}>Cancel</Button>,
        <Button key="r" danger icon={<RollbackOutlined />} loading={busy} disabled={!note.trim()} onClick={() => onReturn(note.trim())}>
          Reject (return for rework)
        </Button>,
        <Button key="a" type="primary" icon={<CheckCircleOutlined />} loading={busy} onClick={() => onApprove(note.trim())}>
          Approve
        </Button>,
      ]}
    >
      {milestone && (
        <>
          <p className="pms-ms-sub">Submitted {fmtDate(milestone.submittedAt)}{milestone.billingPercent > 0 ? ` | approving raises a ${milestone.billingPercent}% invoice request (${inr(milestone.billingAmount)} + GST) in the CRM` : ""}</p>
          <div className="pms-ms-field-label">Submission note</div>
          <p>{milestone.submitNote || "-"}</p>
          <div className="pms-ms-field-label">Evidence</div>
          <EvidenceLinks evidence={milestone.evidence} />
          <div className="pms-ms-field-label" style={{ marginTop: 16 }}>Review note (required when rejecting)</div>
          <TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </>
      )}
    </Modal>
  );
}

function DetailModal({ milestone, onClose }) {
  return (
    <Modal open={!!milestone} title={milestone ? `${milestone.key}: ${milestone.title}` : ""} onCancel={onClose} footer={null} destroyOnClose>
      {milestone && (
        <>
          {milestone.description ? <p>{milestone.description}</p> : null}
          <div className="pms-ms-field-label">Evidence</div>
          <EvidenceLinks evidence={milestone.evidence} />
          {milestone.reviewNote ? (
            <>
              <div className="pms-ms-field-label" style={{ marginTop: 12 }}>Review note</div>
              <p>{milestone.reviewNote}</p>
            </>
          ) : null}
          <div className="pms-ms-field-label" style={{ marginTop: 12 }}>History</div>
          <ul className="pms-ms-history">
            {!(milestone.history || []).length && <li className="pms-ms-muted">No activity yet</li>}
            {(milestone.history || []).map((h, i) => (
              <li key={i}>
                <Tag>{h.action}</Tag> {h.at ? dayjs(h.at).format("DD MMM YYYY HH:mm") : ""} {h.note ? `- ${h.note}` : ""}
              </li>
            ))}
          </ul>
          {milestone.reworkCount > 0 && <p className="pms-ms-sub">Returned for rework {milestone.reworkCount} time(s)</p>}
        </>
      )}
    </Modal>
  );
}

export default ProjectMilestones;
