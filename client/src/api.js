import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  timeout: 15000,
});

// Attach token from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('arizu_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// On 401/403 — clear session
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('arizu_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
