import React, { useCallback, useEffect, useState } from "react";
import { Popover, Spin } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import Service from "../../service";
import { getSharedSso } from "../../util/ssoCookie";

// Connected-products button + product logos — the SAME assets used in the Registration
// welcome email (weekmateregistration/server/template/email-assets/*.svg). Mirrored into every
// WeekMate product so the feature looks identical across HRMS / Payroll / CRM / TaskHub / Econnect.
import FrameIcon from "./connectedProductLogos/frame.svg";
import HrmsLogo from "./connectedProductLogos/hrms.svg";
import CrmLogo from "./connectedProductLogos/crm.svg";
import TaskHubLogo from "./connectedProductLogos/taskhub.svg";
import EconnectLogo from "./connectedProductLogos/econnect.svg";
import PayrollLogo from "./connectedProductLogos/payroll.svg";

const PRODUCT_LOGO_MAP = {
  "hrms": HrmsLogo,
  "e-hrms": HrmsLogo,
  "ehrms": HrmsLogo,
  "crm": CrmLogo,
  "ecrm": CrmLogo,
  "e-crm": CrmLogo,
  "taskhub": TaskHubLogo,
  "task hub": TaskHubLogo,
  "etaskhub": TaskHubLogo,
  "e-task hub": TaskHubLogo,
  "econnect": EconnectLogo,
  "e-connect": EconnectLogo,
  "payroll": PayrollLogo,
  "pay roll": PayrollLogo,
  "pms": PayrollLogo,
};

function getProductLogo(productName) {
  if (!productName || typeof productName !== "string") return null;
  const key = productName.trim().toLowerCase().replace(/\s+/g, " ");
  return PRODUCT_LOGO_MAP[key] || PRODUCT_LOGO_MAP[key.replace(/\s/g, "")] || null;
}

/**
 * "Connected products" launcher.
 *
 * Shows a popover of the OTHER WeekMate products this company has connected (driven by the
 * Registration product selection). Clicking a tile opens that product's /signin with the
 * shared cross-product SSO token appended, logging the user straight in (session sharing).
 *
 * The button is hidden entirely when the company has no other connected products (e.g. only
 * TaskHub selected) or when Registration is unreachable.
 */
const popoverContentStyle = {
  padding: "12px 16px",
  minWidth: "360px",
  maxWidth: "440px",
  background: "#ffffff",
  borderRadius: "14px",
};

const gridContainerStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  justifyContent: "flex-start",
  alignItems: "stretch",
};

const cardStyle = {
  padding: "10px 8px",
  borderRadius: "10px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(7, 56, 92, 0.15)",
  background: "#E8F4FC",
  cursor: "pointer",
  minHeight: "92px",
  minWidth: "84px",
  textDecoration: "none",
  color: "inherit",
};

const cardDisabledStyle = { ...cardStyle, cursor: "default", opacity: 0.7 };

// Dark navy rounded badge that holds the (light-blue) product glyph — same treatment as the
// welcome email so the glyphs read clearly against a solid background.
const iconBadgeStyle = {
  width: "48px",
  height: "48px",
  minWidth: "48px",
  minHeight: "48px",
  background: "#003052",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "6px",
  overflow: "hidden",
  flexShrink: 0,
};

const productImgStyle = {
  width: "30px",
  height: "30px",
  objectFit: "contain",
  objectPosition: "center",
  display: "block",
};

const labelStyle = {
  fontSize: "12px",
  color: "#24323f",
  textAlign: "center",
  fontWeight: 500,
  lineHeight: 1.3,
};

const triggerStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "51px",
  height: "51px",
  cursor: "pointer",
};

const LinkedProductsLauncher = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLinkedProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.linkedProducts,
      });
      const data = response?.data?.data;
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount so the button can be hidden when there are no connected products.
  useEffect(() => {
    fetchLinkedProducts();
  }, [fetchLinkedProducts]);

  const handleOpenChange = useCallback(
    (open) => {
      if (open) fetchLinkedProducts();
    },
    [fetchLinkedProducts]
  );

  // Cross-product SSO token (signed with the shared secret) — TaskHub stores it in the
  // shared `wm_shared_token` cookie. The target product verifies THIS token and matches
  // the user by email, not TaskHub's own access token.
  const ssoToken = getSharedSso() || "";

  const content = (
    <div style={popoverContentStyle}>
      <div style={gridContainerStyle}>
        {loading ? (
          <div style={{ width: "100%", padding: "24px", textAlign: "center" }}>
            <Spin />
          </div>
        ) : list.length === 0 ? (
          <div
            style={{
              width: "100%",
              padding: "12px",
              textAlign: "center",
              color: "#666",
              fontSize: "13px",
            }}
          >
            No connected products for this company.
          </div>
        ) : (
          list.map((product) => {
            const href = product.signin_url
              ? `${product.signin_url}${
                  product.signin_url.includes("?") ? "&" : "?"
                }token=${encodeURIComponent(ssoToken)}`
              : null;
            const label = product.product_name || product.product_slug || "Product";
            const logo = getProductLogo(label);
            const key = product.product_slug || product.product_name || label;

            const cardContent = (
              <>
                <span style={iconBadgeStyle}>
                  {logo ? (
                    <img src={logo} alt="" style={productImgStyle} />
                  ) : (
                    <AppstoreOutlined style={{ fontSize: "22px", color: "#00B4D8", display: "block" }} />
                  )}
                </span>
                <span style={labelStyle}>{label}</span>
              </>
            );

            return (
              <div key={key} style={{ minWidth: "84px", flex: "1 1 0" }}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" style={cardStyle}>
                    {cardContent}
                  </a>
                ) : (
                  <div style={cardDisabledStyle}>{cardContent}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // No connected products → render nothing (no launcher button).
  if (list.length === 0) return null;

  return (
    <Popover
      placement="bottomRight"
      trigger="click"
      content={content}
      title={<span style={{ color: "#24323f", fontWeight: 600 }}>Connected products</span>}
      onOpenChange={handleOpenChange}
    >
      <a
        onClick={(e) => e.preventDefault()}
        className="connected-products-btn"
        aria-label="Connected products"
        style={triggerStyle}
      >
        <img src={FrameIcon} alt="Connected products" style={{ width: "51px", height: "51px" }} />
      </a>
    </Popover>
  );
};

export default LinkedProductsLauncher;
