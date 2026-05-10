import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { useAuthStore } from '../stores/auth.js';
import { router } from '../router/index.js';

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let refreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function enqueueRetry(originalRequest: RetryableRequest): Promise<unknown> {
  return new Promise((resolve) => {
    refreshQueue.push((token: string) => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      resolve(api(originalRequest));
    });
  });
}

async function refreshTokenAndRetry(
  originalRequest: RetryableRequest,
  originalError: unknown,
): Promise<unknown> {
  originalRequest._retry = true;
  refreshing = true;
  try {
    const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
    const newToken: string = data.data.accessToken;
    useAuthStore().setAccessToken(newToken);
    refreshQueue.forEach((cb) => cb(newToken));
    refreshQueue = [];
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return api(originalRequest);
  } catch {
    useAuthStore().clear();
    refreshQueue = [];
    router.push('/login');
    return Promise.reject(originalError);
  } finally {
    refreshing = false;
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const authStore = useAuthStore();
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const originalRequest = error.config as RetryableRequest | undefined;
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (refreshing) return enqueueRetry(originalRequest);
      return refreshTokenAndRetry(originalRequest, error);
    }

    return Promise.reject(error);
  },
);

export { api };
