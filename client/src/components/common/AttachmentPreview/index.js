import React, { useEffect, useMemo } from "react";
import { CloseOutlined } from "@ant-design/icons";
import { fileImageSelect } from "../../../util/FIleSelection";
import "./attachmentPreview.css";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];

const extensionOf = (name = "") => {
  const dot = String(name).lastIndexOf(".");
  return dot >= 0 ? String(name).slice(dot).toLowerCase() : "";
};

const formatSize = (bytes) => {
  const size = Number(bytes);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * One attachment chip: a small image thumbnail for pictures (file-type icon
 * otherwise), the file name and size, and an in-chip ✕ when removable.
 *
 * `file` is either a browser File (picked, not uploaded yet) or a saved
 * attachment ({ name, path, file_type }). Saved files open in a new tab;
 * pass `onRemove` to show the ✕ for files that can still be dropped.
 */
const AttachmentPreview = ({ file, onRemove }) => {
  const isLocalFile = typeof File !== "undefined" && file instanceof File;
  const extension = (file?.file_type || extensionOf(file?.name) || "").toLowerCase();
  const isImage = isLocalFile ? String(file.type || "").startsWith("image/") : IMAGE_EXTENSIONS.includes(extension);

  const localUrl = useMemo(
    () => (isLocalFile && isImage ? URL.createObjectURL(file) : null),
    [file, isLocalFile, isImage]
  );
  useEffect(() => () => {
    if (localUrl) URL.revokeObjectURL(localUrl);
  }, [localUrl]);

  const savedUrl = !isLocalFile && file?.path ? `${process.env.REACT_APP_API_URL}/public/${file.path}` : null;
  const imageUrl = localUrl || (isImage ? savedUrl : null);
  // Saved names come without the extension in some records.
  const displayName = file?.name && extensionOf(file.name) ? file.name : `${file?.name || "File"}${extension}`;

  const sizeLabel = formatSize(file?.size);
  const meta = [extension.replace(".", "").toUpperCase(), sizeLabel].filter(Boolean).join(" · ");

  const body = (
    <>
      <span className="attachment-preview-thumb">
        {imageUrl ? <img src={imageUrl} alt="" /> : fileImageSelect(extension, "20px")}
      </span>
      <span className="attachment-preview-text">
        <span className="attachment-preview-name" title={displayName}>{displayName}</span>
        {meta && <span className="attachment-preview-meta">{meta}</span>}
      </span>
    </>
  );

  return (
    <div className="attachment-preview">
      {savedUrl ? (
        <a className="attachment-preview-link" href={savedUrl} target="_blank" rel="noopener noreferrer">
          {body}
        </a>
      ) : (
        <div className="attachment-preview-link">{body}</div>
      )}
      {onRemove && (
        <button type="button" className="attachment-preview-remove" onClick={onRemove} aria-label={`Remove ${displayName}`}>
          <CloseOutlined />
        </button>
      )}
    </div>
  );
};

export default AttachmentPreview;
