/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarOutlined,
  FileTextOutlined,
  LinkOutlined,
  StarOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useParams, useHistory } from "react-router-dom";
import { useDispatch } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import moment from "moment";
import Service from "../../service";
import "../Complaints/ComplaintDetails.css";

const ReviewDetailsForm = () => {
  const { id } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const companySlug = localStorage.getItem("companyDomain");

  const [reviewData, setReviewData] = useState(null);

  const getReviewById = useCallback(async (reviewId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getReviewList,
        body: { _id: reviewId },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) setReviewData(response.data.data);
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  }, [dispatch]);

  useEffect(() => {
    if (id) getReviewById(id);
  }, [id, getReviewById]);

  return (
    <div className="cad-page">

      {/* Header */}
      <div className="cad-info-card" style={{ "--accent": "#16a34a" }}>
        <div className="cad-info-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
          <StarOutlined />
        </div>
        <div className="cad-info-body" style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <h1 className="cad-info-title" style={{ marginBottom: 0 }}>Review Details</h1>
            <button
              className="cad-btn"
              onClick={() => history.push(`/${companySlug}/positive-review`)}
            >
              <ArrowLeftOutlined /> Back to Reviews
            </button>
          </div>
          <div className="cad-info-fields" style={{ marginTop: 16 }}>
            <div className="cad-info-field">
              <div className="cad-info-label"><FileTextOutlined /> Project</div>
              <div className="cad-info-value">{reviewData?.project?.title || "—"}</div>
            </div>
            <div className="cad-info-field">
              <div className="cad-info-label"><UserOutlined /> Client</div>
              <div className="cad-info-value">{reviewData?.client_name || "—"}</div>
            </div>
            <div className="cad-info-field">
              <div className="cad-info-label"><UserOutlined /> Project Manager</div>
              <div className="cad-info-value">{reviewData?.manager?.full_name || "—"}</div>
            </div>
            <div className="cad-info-field">
              <div className="cad-info-label"><UserOutlined /> Account Manager</div>
              <div className="cad-info-value">{reviewData?.acc_manager?.full_name || "—"}</div>
            </div>
            <div className="cad-info-field">
              <div className="cad-info-label"><CalendarOutlined /> Date</div>
              <div className="cad-info-value">
                {reviewData?.createdAt
                  ? moment(reviewData.createdAt).format("DD-MM-YYYY")
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Details */}
      <div className="cad-section">
        <div className="cad-section-header">
          <div className="cad-section-title">
            <span className="cad-section-icon"><StarOutlined /></span>
            Feedback Information
          </div>
        </div>
        <div className="cad-section-body">
          <div className="cad-status-view">
            <div className="cad-status-field">
              <div className="cad-field-label">Feedback Type</div>
              <div className="cad-field-value">
                <span className={`cad-status-badge ${reviewData?.feedback_type === "Clutch Review" ? "resolved" : "open"}`}>
                  {reviewData?.feedback_type || "—"}
                </span>
              </div>
            </div>
            <div className="cad-status-field">
              <div className="cad-field-label">NDA Signed</div>
              <div className="cad-field-value">
                {reviewData?.client_nda_sign ? (
                  <span style={{ color: "#16a34a", fontWeight: 600 }}><CheckCircleOutlined /> Yes</span>
                ) : (
                  <span style={{ color: "#dc2626", fontWeight: 600 }}><CloseCircleOutlined /> No</span>
                )}
              </div>
            </div>
            {reviewData?.review_url && (
              <div className="cad-status-field">
                <div className="cad-field-label"><LinkOutlined /> Review URL</div>
                <div className="cad-field-value">
                  <a href={reviewData.review_url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", wordBreak: "break-all" }}>
                    {reviewData.review_url}
                  </a>
                </div>
              </div>
            )}
            <div className="cad-status-field" style={{ gridColumn: "1 / -1" }}>
              <div className="cad-field-label">Feedback</div>
              <div
                className="cad-field-value"
                style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: reviewData?.feedback || "—" }}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ReviewDetailsForm;
