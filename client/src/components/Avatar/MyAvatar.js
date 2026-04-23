import React, { useMemo, useState, useEffect } from "react";
import { Tooltip, Avatar } from "antd";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";
import "./MyAvatar.css";

function getInitials(name) {
  const cleaned = String(name || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!cleaned) return "?";
  const parts = cleaned.split(" ").filter(Boolean);
  const filtered = parts.filter(
    (part) => !["mr.", "miss.", "mrs.", "ms."].includes(part.toLowerCase())
  );
  const useParts = filtered.length ? filtered : parts;
  return useParts
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
}

function buildAvatarCandidates(rawSrc, apiBaseUrl) {
  if (!rawSrc) return [];
  const raw = String(rawSrc).trim();
  if (!raw) return [];
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return [raw];

  const apiBase = String(apiBaseUrl || "").replace(/\/$/, "");
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  const candidates = [];

  // If it already looks like a served path, try API base + that path.
  if (apiBase) {
    if (normalized.startsWith("/public/") || normalized.startsWith("/uploads/") || normalized.startsWith("/files/")) {
      candidates.push(`${apiBase}${normalized}`);
    } else {
      // Default for this app: `/public/<path>`
      candidates.push(`${apiBase}/public${normalized}`);
    }
  } else {
    // Without an API base, at least avoid SPA routing by using absolute-ish `/public/...`
    if (normalized.startsWith("/public/")) candidates.push(normalized);
    else candidates.push(`/public${normalized}`);
  }

  // HRMS fallback: many user images are stored there as thumbnail filenames.
  const isPlainFilename = !raw.includes("/") && !raw.includes("\\");
  if (isPlainFilename) {
    candidates.push(`${Service.HRMS_Base_URL}/uploads/thumbnail_emp_images/${raw}`);
  }

  // If raw already includes the HRMS uploads path, try it directly on HRMS.
  if (raw.includes("uploads/thumbnail_emp_images")) {
    const hrmsPath = raw.startsWith("/") ? raw : `/${raw}`;
    candidates.push(`${Service.HRMS_Base_URL}${hrmsPath}`);
  }

  // De-dupe while preserving order.
  return candidates.filter((url, idx) => candidates.indexOf(url) === idx);
}

const MyAvatar = ({ userName, full_name, src, alt }) => {
  const displayName = userName || full_name || alt || "";
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  const localBase = process.env.REACT_APP_API_URL || Service.Server_Base_URL || "";

  const candidates = useMemo(() => buildAvatarCandidates(src, localBase), [src, localBase]);

  const avatarSrc = candidates[candidateIndex] || "";
  const hasImage = !!avatarSrc;

  useEffect(() => {
    setCandidateIndex(0);
  }, [src]);

  return (
    <Tooltip title={removeTitle(displayName)}>
      <Avatar
        className="weekmate-avatar"
        src={avatarSrc || undefined}
        alt={displayName}
        style={{
          backgroundColor: hasImage ? "" : "#7C4DFF",
          color: "#FFFFFF",
          fontWeight: 700,
        }}
        onError={() => {
          const hasNext = candidateIndex + 1 < candidates.length;
          if (hasNext) {
            setCandidateIndex((i) => i + 1);
            // Prevent Avatar from falling back while we try the next candidate URL.
            return false;
          }
          // Allow Avatar to fall back to children (initials).
          return true;
        }}
      >
        {initials}
      </Avatar>
    </Tooltip>
  );
};

export default MyAvatar;
