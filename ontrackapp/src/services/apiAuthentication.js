import axios from 'axios';
import { tokenManager } from './authMiddleware';

// Existing screens use both fetch and axios. Attach credentials only to our
// same-origin API, and respect any Authorization header set by the caller.
function isLocalApi(url, base = window.location.origin) {
  try {
    const parsed = new URL(url, base);
    return parsed.origin === window.location.origin && (parsed.pathname === '/api' || parsed.pathname.startsWith('/api/'));
  } catch {
    return false;
  }
}

export function installApiAuthentication() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, options = {}) => {
    const url = typeof input === 'string' || input instanceof URL ? input.toString() : input.url;
    const token = tokenManager.getToken();
    if (!token || !isLocalApi(url)) return originalFetch(input, options);
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    return originalFetch(input, { ...options, headers });
  };

  axios.interceptors.request.use(config => {
    const token = tokenManager.getToken();
    if (token && isLocalApi(config.url, config.baseURL || window.location.origin)) {
      config.headers = config.headers || {};
      if (!config.headers.Authorization && !config.headers.authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });
}
