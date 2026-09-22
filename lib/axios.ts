import axios from "axios";
import Cookies from "js-cookie";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://deno-oak-api.yepyaeaung13.deno.net");
export const isOakApi = new Set([
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "https://deno-oak-api.yepyaeaung13.deno.net",
]).has(new URL(apiBaseUrl).origin);

export const axiosClient = axios.create({
  baseURL: apiBaseUrl,

  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get("accessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

axiosClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      Cookies.remove("auth", { path: "/" });
      Cookies.remove("accessToken", { path: "/" });
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
