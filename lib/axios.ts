import axios from "axios";
import Cookies from "js-cookie";

export const axiosClient = axios.create({
  baseURL: "https://api.novelpeak.online/api",
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
      Cookies.remove("token", { path: "/" });
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosClient;