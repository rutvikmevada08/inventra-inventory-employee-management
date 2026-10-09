import axios from 'axios';

const TOKEN_KEY = 'sim_token';

// The token is the only thing kept in the browser. There are no keys or secrets in the frontend.
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// An expired or revoked session anywhere in the app sends the user back to the login page.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLogin = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLogin) {
      tokenStore.clear();
      onUnauthorized();
    }
    return Promise.reject(err);
  }
);

// Field-level messages from the API, e.g. { name: 'Vendor name is required' }.
export const fieldErrors = (err) => err.response?.data?.errors || {};

export function errorMessage(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}

export default api;
