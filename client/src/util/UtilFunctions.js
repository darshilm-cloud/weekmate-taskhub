export default class UtilFunctions {
  static formatLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text?.replace(urlRegex, function (url) {
      return `<a href="${url}" rel="noopener noreferrer" target="_blank">${url}</a>`;
    });
  }
  static revertLinks(text) {
    const anchorRegex =
      /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/g;
    return text?.replace(anchorRegex, function (match, quote, url, linkText) {
      return url; // Only return the URL without the anchor tag
    });
  }

  static generateAvatarFromName(name, width = "40px", height = "40px") {
    const initials = name
      ?.trim()
      ?.split(/\s+/)
      ?.filter(
        (part) =>
          part !== "" &&
          !["mr.", "miss.", "mrs.", "ms.", "Mr."].includes(part?.toLowerCase())
      )
      ?.map((part) => part.charAt(0))
      ?.join("")
      ?.toUpperCase();
    const avatarStyle = {
      backgroundColor: "#7C4DFF",
      color: "#FFFFFF",
      fontSize: "10px",
    };

    return (
      <div
        style={{
          ...avatarStyle,
          width: width,
          height: height,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {initials}
      </div>
    );
  }
}
