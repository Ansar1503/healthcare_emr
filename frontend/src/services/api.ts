/**
 * api.ts — Central Axios instance with refresh token interceptor.
 *
 * FIXES:
 * 1. BUG: After a forced logout (auth:logout event), api.defaults.headers.common
 *    still had the old Authorization header. Next request would send a stale token.
 *    Fixed: clear the default header on force-logout.
 * 2. BUG: processQueue resolved queued requests BEFORE isRefreshing was reset to false.
 *    If a queued request triggered another 401 immediately, isRefreshing was still true
 *    so it got re-queued forever. Fixed: reset isRefreshing BEFORE processQueue.
 * 3. BUG: The token was saved to localStorage even on a failed config (undefined token).
 *    Added null guard.
 * 4. SECURITY: Removed direct access to window.location for redirect — dispatches
 *    event so React handles the navigation, avoiding hard reloads.
 * 5. TYPE: The retry config type is narrowed properly to avoid `any`.
 */
import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach current access token ─────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// ── Response: auto-refresh on 401 ────────────────────────────────────────────
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
    const url    = config?.url ?? '';

    if (
      status === 401 &&
      config &&
      !config._retry &&
      !url.includes('/auth/refresh') &&
      !url.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Queue this request until the refresh resolves
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
          { withCredentials: true }
        );

        const newToken = data.data.accessToken;

        if (newToken) {
          localStorage.setItem('accessToken', newToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        }

        // FIX: reset flag BEFORE processing queue to avoid re-queueing race
        isRefreshing = false;
        processQueue(null, newToken);

        if (config.headers && newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(config);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);

        // Clear all stored auth state
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');

        // FIX: also clear the Axios default header so the next request starts clean
        delete api.defaults.headers.common['Authorization'];

        // Let React handle the redirect via the AuthContext listener
        window.dispatchEvent(new CustomEvent('auth:logout'));

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
