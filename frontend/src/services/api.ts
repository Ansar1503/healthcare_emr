import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else if (token) prom.resolve(token);
  });
  failedQueue = [];
};

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    const axiosError = error as {
      response?: { status?: number };
      config?: RetryableConfig;
    };

    const status = axiosError.response?.status;
    const config = axiosError.config as RetryableConfig | undefined;
    const url = config?.url ?? "";

    if (
      status === 401 &&
      config &&
      !config._retry &&
      !url.includes("/auth/refresh") &&
      !url.includes("/auth/login")
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (config.headers) config.headers.Authorization = `Bearer ${token}`;
          return api(config);
        });
      }

      config._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = data.data.accessToken;

        if (newToken) {
          localStorage.setItem("accessToken", newToken);
          api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        }

        isRefreshing = false;
        processQueue(null, newToken);

        if (config.headers && newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(config);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);

        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        delete api.defaults.headers.common["Authorization"];

        window.dispatchEvent(new CustomEvent("auth:logout"));

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
