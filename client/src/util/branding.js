export const BRANDING_UPDATE_EVENT = "weekmate:branding-updated";
export const DEFAULT_FAVICON_PATH = "/favicon.svg";

export const getCompanyLogoStorageKey = (companySlug) =>
  `companyLogoUrl-${companySlug}`;

export const getCompanyFaviconStorageKey = (companySlug) =>
  `companyFavIcoUrl-${companySlug}`;

export const getCompanyTitleStorageKey = (companySlug) => `title-${companySlug}`;

export const getStoredBranding = (companySlug) => ({
  logoPath: companySlug
    ? localStorage.getItem(getCompanyLogoStorageKey(companySlug)) || ""
    : "",
  faviconPath: companySlug
    ? localStorage.getItem(getCompanyFaviconStorageKey(companySlug)) || ""
    : "",
  title: companySlug
    ? localStorage.getItem(getCompanyTitleStorageKey(companySlug)) || ""
    : "",
});

export const getPublicAssetUrl = (assetPath) =>
  assetPath ? `${process.env.REACT_APP_API_URL}/public/${assetPath}` : "";

export const withCacheBuster = (url, version) => {
  if (!url) return "";

  const separator = url.includes("?") ? "&" : "?";
  return version ? `${url}${separator}v=${version}` : url;
};

export const persistBranding = ({
  companySlug,
  logoPath = "",
  faviconPath = "",
  title = "",
}) => {
  if (!companySlug) return;

  localStorage.setItem(getCompanyLogoStorageKey(companySlug), logoPath || "");
  localStorage.setItem(
    getCompanyFaviconStorageKey(companySlug),
    faviconPath || ""
  );

  if (title) {
    localStorage.setItem("title", title);
    localStorage.setItem(getCompanyTitleStorageKey(companySlug), title);
  }
};

export const dispatchBrandingUpdate = (detail) => {
  window.dispatchEvent(new CustomEvent(BRANDING_UPDATE_EVENT, { detail }));
};
