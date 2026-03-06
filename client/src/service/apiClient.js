import axios from "axios";
import removeCookie from "../hooks/removeCookie";

const { REACT_APP_API_URL } = process.env;

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? REACT_APP_API_URL + "/v1"
    : `${REACT_APP_API_URL}/v1`;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    accept: "application/json",
    "content-type": "application/json",
  },
});

// Request interceptor — registered ONCE
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers["Access-Control-Allow-Origin"] = "*";
      config.headers["authorization"] = "Bearer " + accessToken;
      config.headers["platform"] = "web-admin";
    } else {
      config.headers["platform"] = "web-admin";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — registered ONCE
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      performLogout();
    }
    return Promise.reject(error);
  }
);

function performLogout() {
  localStorage.removeItem("user_data");
  localStorage.removeItem("is_reporting_manager");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("title");
  localStorage.removeItem("headerLogo");
  localStorage.removeItem("loginLogo");
  localStorage.removeItem("logoMode");
  localStorage.removeItem("favIcon");
  removeCookie("user_permission");
  removeCookie("pms_role_id");
  window.location = "/signin";
}

export { apiClient, BASE_URL, performLogout };
