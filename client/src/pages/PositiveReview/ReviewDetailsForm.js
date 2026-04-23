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
  ProjectOutlined,
  TeamOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { useParams, useHistory } from "react-router-dom";
import { useDispatch } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import moment from "moment";
import Service from "../../service";
import { Row, Col, Button } from "antd";
import "./PositiveReview.css";

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

  const typeBadgeClass = (type = "") => {
    if (!type) return "default";
    const t = type.toLowerCase();
    if (t.includes("clutch")) return "clutch";
    if (t.includes("video")) return "video";
    if (t.includes("text")) return "text";
    if (t.includes("feedback")) return "feedback";
    if (t.includes("zoho")) return "zoho";
    return "default";
  };

  return (
    <div className="prf-page">
      {/* Page Header */}
      <div className="prf-header">
        <div className="prf-header-text">
          <div className="prf-header-icon">
            <StarOutlined />
          </div>
          <div>
            <h2 className="prf-title">Review Details</h2>
            <p className="prf-subtitle">Comprehensive overview of client feedback and project info</p>
          </div>
        </div>
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          className="add-btn"
          onClick={() => history.push(`/${companySlug}/positive-review`)}
        >
          Back
        </Button>
      </div>

      {/* Details Card */}
      <div className="prf-card">
        <div className="prf-form">
          {/* Section: Project Information */}
          <div className="prf-section">
            <div className="prf-section-title">
              <ProjectOutlined /> Project Information
            </div>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <div className="pr-drawer-field">
                  <div className="pr-drawer-label">Project</div>
                  <div className="pr-drawer-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileTextOutlined style={{ color: '#0b3a5b' }} />
                    {reviewData?.project?.title || "—"}
                  </div>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div className="pr-drawer-field">
                  <div className="pr-drawer-label">Client Name</div>
                  <div className="pr-drawer-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserOutlined style={{ color: '#0b3a5b' }} />
                    {reviewData?.client_name || "—"}
                  </div>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="pr-drawer-field">
                  <div className="pr-drawer-label">Project Manager</div>
                  <div className="pr-drawer-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserOutlined style={{ color: '#0b3a5b' }} />
                    {reviewData?.manager?.full_name || "—"}
                  </div>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="pr-drawer-field">
                  <div className="pr-drawer-label">Account Manager</div>
                  <div className="pr-drawer-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TeamOutlined style={{ color: '#0b3a5b' }} />
                    {reviewData?.acc_manager?.full_name || "—"}
                  </div>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="pr-drawer-field">
                  <div className="pr-drawer-label">Submission Date</div>
                  <div className="pr-drawer-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarOutlined style={{ color: '#0b3a5b' }} />
                    {reviewData?.createdAt
                      ? moment(reviewData.createdAt).format("DD-MM-YYYY")
                      : "—"}
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          <div className="prf-divider" />

          {/* Section: Feedback Details */}
          <div className="prf-section">
            <div className="prf-section-title">
              <MessageOutlined /> Feedback Details
            </div>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <div className="pr-drawer-field">
                  <div className="pr-drawer-label">Feedback Type</div>
                  <div className="pr-drawer-value">
                    <span className={`pr-type-badge ${typeBadgeClass(reviewData?.feedback_type)}`}>
                      {reviewData?.feedback_type || "—"}
                    </span>
                  </div>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div className="pr-drawer-field">
                  <div className="pr-drawer-label">NDA Signed</div>
                  <div className="pr-drawer-value">
                    {reviewData?.client_nda_sign ? (
                      <span className="pr-nda-yes"><CheckCircleOutlined /> YES</span>
                    ) : (
                      <span className="pr-nda-no"><CloseCircleOutlined /> NO</span>
                    )}
                  </div>
                </div>
              </Col>
              {reviewData?.review_url && (
                <Col xs={24}>
                  <div className="pr-drawer-field">
                    <div className="pr-drawer-label">Review URL</div>
                    <div className="pr-drawer-value">
                      <a
                        href={reviewData.review_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2563eb", display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <LinkOutlined /> {reviewData.review_url}
                      </a>
                    </div>
                  </div>
                </Col>
              )}
              <Col xs={24}>
                <div className="pr-drawer-label" style={{ marginBottom: 12 }}>Feedback Content</div>
                <div
                  className="pr-feedback-content"
                  style={{ minHeight: '120px' }}
                  dangerouslySetInnerHTML={{ __html: reviewData?.feedback || "—" }}
                />
              </Col>
            </Row>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewDetailsForm;
