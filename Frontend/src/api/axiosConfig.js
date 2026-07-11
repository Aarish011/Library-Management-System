import axios from 'axios';
import { getUserFriendlyError } from '../utils/errorMessages';

function resolveApiUrl() {
  const configuredUrl =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

  if (typeof window === 'undefined') {
    return configuredUrl || 'http://localhost:5000/api';
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (configuredUrl && (isLocalhost || !configuredUrl.includes('localhost'))) {
    return configuredUrl;
  }

  return `${window.location.protocol}//${hostname}:5000/api`;
}

const API_URL = resolveApiUrl();
let sessionExpiryHandled = false;

function isPublicAuthRequest(requestUrl) {
  return [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
  ].some((path) => requestUrl.includes(path));
}

function clearStoredSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

console.log('API base URL:', API_URL);

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const authHeader = error.config?.headers?.Authorization;
    const currentToken = localStorage.getItem('token');
    const requestToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (status === 401 && !isPublicAuthRequest(requestUrl)) {
      console.warn(
        'Unauthorized API response:',
        requestUrl,
        error.response?.data
      );

      const isLoginPage = window.location.pathname === '/login';
      const tokenStillMatchesRequest =
        requestToken && currentToken === requestToken;

      if ((tokenStillMatchesRequest || currentToken) && !sessionExpiryHandled) {
        sessionExpiryHandled = true;
        clearStoredSession();
        window.dispatchEvent(new Event('bookshelf:session-expired'));
      }

      if (!isLoginPage && sessionExpiryHandled) {
        window.location.replace('/login');
      }
    }

    const friendlyMessage = getUserFriendlyError(error);
    if (error.response) {
      error.response.data = {
        ...(typeof error.response.data === 'object'
          ? error.response.data
          : {}),
        message: friendlyMessage,
      };
    }
    error.message = friendlyMessage;

    return Promise.reject(error);
  }
);

export default axiosInstance;
