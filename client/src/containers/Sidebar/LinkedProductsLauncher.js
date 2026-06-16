import React, { useCallback, useEffect, useState } from "react";
import { Popover, Spin } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import Service from "../../service";
import { getSharedSso } from "../../util/ssoCookie";

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
  minWidth: "320px",
  maxWidth: "420px",
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
  borderRadius: "8px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(7, 56, 92, 0.15)",
  background: "#E8F4FC",
  cursor: "pointer",
  minHeight: "64px",
  minWidth: "84px",
  textDecoration: "none",
  color: "inherit",
};

const labelStyle = {
  fontSize: "12px",
  color: "#24323f",
  textAlign: "center",
  fontWeight: 500,
  marginTop: "6px",
  lineHeight: 1.3,
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
            const key = product.product_slug || product.product_name || label;
            const tile = (
              <>
                <AppstoreOutlined style={{ fontSize: "22px", color: "#03497a" }} />
                <span style={labelStyle}>{label}</span>
              </>
            );
            return (
              <div key={key} style={{ minWidth: "84px" }}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" style={cardStyle}>
                    {tile}
                  </a>
                ) : (
                  <div style={{ ...cardStyle, cursor: "default", opacity: 0.7 }}>{tile}</div>
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
        style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
      >
        <div className="search-pms">
          <AppstoreOutlined style={{ fontSize: "18px" }} />
        </div>
      </a>
    </Popover>
  );
};

export default LinkedProductsLauncher;
