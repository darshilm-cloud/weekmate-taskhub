import React, { useState } from "react";
import { Button, message } from "antd";
import { DownloadOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { downloadFileFromUrl, attachmentFileName } from "../../../util/downloadFile";
import { DeleteActionIcon } from "../ActionIcons";
import DeleteConfirm from "../DeleteConfirm";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "mov", "m4v", "avi", "mkv"];

const extensionOf = (value = "") => {
  const parts = String(value || "").split("?")[0].split(".");
  return (parts.length > 1 ? parts.pop() : "").toLowerCase();
};

export const resolveAttachmentUrl = (file) => {
  const rawPath = file?.path || file?.file_path;
  if (!rawPath) return "";
  if (/^https?:\/\//i.test(String(rawPath))) return String(rawPath);
  const apiBase = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
  const normalized = String(rawPath).startsWith("/") ? String(rawPath) : `/${rawPath}`;
  const publicPath = normalized.startsWith("/public/") ? normalized : `/public${normalized}`;
  return `${apiBase}${publicPath}`;
};

export const getAttachmentKind = (file) => {
  const mime = String(file?.file_type || "").toLowerCase();
  const ext = extensionOf(file?.name || file?.file_name || file?.path || file?.file_path);
  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (mime.startsWith("video/") || VIDEO_EXTENSIONS.includes(ext)) return "video";
  return "document";
};

/**
 * One saved comment attachment, shown the same way in the Task, Bug and Notes modals:
 * a card with the file name and a download button (plus delete when `onDelete` is given),
 * an inline preview for images, and a play button for videos.
 */
const CommentAttachment = ({ file, onDelete }) => {
  const [playing, setPlaying] = useState(false);
  const name = file?.name || file?.file_name || "Attachment";
  const url = resolveAttachmentUrl(file);
  const kind = getAttachmentKind(file);

  const handleDownload = async () => {
    if (!url) return;
    const ok = await downloadFileFromUrl(url, attachmentFileName(file));
    if (ok === false) message.error("Download failed");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        border: "1px solid #e8e8e8",
        borderRadius: 8,
        padding: "6px 8px",
        background: "#fafafa",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          title={name}
          style={{ fontSize: 12, color: "#313131", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1 1 auto", minWidth: 0 }}
        >
          {name}
        </span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
          {kind === "video" && url && (
            <Button type="text" size="small" icon={<PlayCircleOutlined />} onClick={() => setPlaying((p) => !p)} />
          )}
          <Button type="text" size="small" icon={<DownloadOutlined />} title="Download" onClick={handleDownload} />
          {onDelete && (
            <DeleteConfirm title="Delete this attachment?" onConfirm={() => onDelete(file)}>
              <Button type="text" size="small" icon={<DeleteActionIcon />} title="Delete" />
            </DeleteConfirm>
          )}
        </div>
      </div>

      {kind === "image" && url && (
        <img
          src={url}
          alt={name}
          style={{ width: "100%", maxWidth: 260, borderRadius: 8, objectFit: "cover", border: "1px solid #dbe4f0" }}
        />
      )}

      {kind === "video" && url && playing && (
        <video
          src={url}
          controls
          style={{ width: "100%", maxWidth: 300, borderRadius: 8, border: "1px solid #dbe4f0", background: "#000" }}
        />
      )}
    </div>
  );
};

export default CommentAttachment;
