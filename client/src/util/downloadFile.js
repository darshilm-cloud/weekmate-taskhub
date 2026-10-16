/**
 * Save a file from a URL to disk (instead of opening it in a new tab).
 *
 * The `download` attribute on a plain link is ignored for cross-origin URLs (the API is on another
 * origin than the web app), so the file is fetched as a blob and saved from an object URL.
 * If that fails (CORS / network), it falls back to opening the URL so the user still gets the file.
 */
export const downloadFileFromUrl = async (url, fileName = "file") => {
  if (!url) return false;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const objectUrl = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return true;
  } catch (error) {
    window.open(url, "_blank", "noopener,noreferrer");
    return false;
  }
};

/** File name for a saved attachment record ({ name, file_type } - the extension is stored separately in some records). */
export const attachmentFileName = (file) => {
  const name = file?.name || file?.file_name || "file";
  if (/\.[A-Za-z0-9]{1,8}$/.test(name)) return name;
  const type = String(file?.file_type || file?.type || "");
  return type.startsWith(".") ? `${name}${type}` : name;
};
