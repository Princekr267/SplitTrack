import axios from 'axios';

const rawBaseURL = (import.meta.env.VITE_API_URL || '/api').trim();
const cleanBaseURL = rawBaseURL.replace(/\/+$/, '');
const baseURL = cleanBaseURL.endsWith('/api') ? cleanBaseURL : `${cleanBaseURL}/api`;

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach Bearer token for cross-domain environments (e.g. Vercel)
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('splitorbit_token') || localStorage.getItem('splittrack_token'))
    : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'An unexpected error occurred';
    const code = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
    const details = error.response?.data?.error?.details || null;

    const customError = new Error(message);
    customError.status = error.response?.status;
    customError.code = code;
    customError.details = details;

    return Promise.reject(customError);
  }
);

export default api;
