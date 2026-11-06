import axios from 'axios';

const TOKEN_KEY = 'medicare_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthAttempt) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('medicare:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export const getApiError = (error) => {
  if (error?.code === 'ECONNABORTED') {
    return 'The request timed out. Please check your connection and try again.';
  }
  if (!error?.response) {
    return 'Unable to reach the server. Make sure the backend is running.';
  }
  return (
    error.response.data?.message ||
    error.response.data?.errors?.[0]?.message ||
    'Something went wrong. Please try again.'
  );
};

export { TOKEN_KEY };
export default api;
