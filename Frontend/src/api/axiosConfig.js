import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

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

    if (status === 401) {
      console.warn('Unauthorized API response:', requestUrl, error.response?.data);

      const isAuthCheck = requestUrl.includes('/auth/me');
      const isLoginPage = window.location.pathname === '/login';
      const tokenStillMatchesRequest = requestToken && currentToken === requestToken;

      if (isAuthCheck && tokenStillMatchesRequest && !isLoginPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
