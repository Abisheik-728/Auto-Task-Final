import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8081/api";
const MAX_RETRIES = 2;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// JWT interceptor – attach token to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("auth_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – error handling & 401 redirect
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };

    // Auto-retry on network / 5xx errors
    if (
      config &&
      (!config._retryCount || config._retryCount < MAX_RETRIES) &&
      (!error.response || error.response.status >= 500)
    ) {
      config._retryCount = (config._retryCount || 0) + 1;
      await new Promise((r) => setTimeout(r, 1000 * config._retryCount!));
      return apiClient(config);
    }

    // 401 – clear token & redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    const message =
      (error.response?.data as any)?.message ||
      error.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

// Token helpers
export const setAuthToken = (token: string) => localStorage.setItem("auth_token", token);
export const clearAuthToken = () => localStorage.removeItem("auth_token");
export const getAuthToken = () => localStorage.getItem("auth_token");

export default apiClient;
