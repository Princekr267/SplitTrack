import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
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
