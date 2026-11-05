// ======================
// REFACTORED: ontrackapp/src/services/apiService.js
// ======================

import axios from 'axios';
import { tokenManager } from './authMiddleware';

// Create axios instance with default configuration
// Note: No baseURL set - using relative URLs which work with proxy in dev
export const apiClient = axios.create({
  timeout: 70000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - adds auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add request ID for tracking
    const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    config.headers['X-Request-ID'] = requestId;
    config.metadata = { startTime: Date.now(), requestId };
    
    // Add authorization token
    const token = tokenManager.getToken();
    try {
      const base = new URL(config.baseURL || '/', window.location.origin);
      const url = new URL(config.url, base);
      if (token && url.origin === window.location.origin && (url.pathname === '/api' || url.pathname.startsWith('/api/')) && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch { /* Do not attach credentials to an invalid URL. */ }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handles expired sessions without logging request data.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      tokenManager.clearAuth();
      window.location.href = '/login?session=expired';
    }
    
    return Promise.reject(error);
  }
);

// API service with retry logic
export const fetchWithRetry = async (url, options = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await apiClient.get(url, {
        ...options,
        timeout: 70000,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.data;
    } catch (error) {
      if (i === retries - 1 || axios.isCancel(error) || options.signal?.aborted || (error.response && error.response.status < 500)) throw error;
      // Exponential backoff: wait 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

// Retry wrapper for axios requests
export const axiosWithRetry = async (axiosConfig, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await apiClient(axiosConfig);
      return response.data;
    } catch (error) {
      if (i === retries - 1 || axios.isCancel(error) || axiosConfig.signal?.aborted) throw error;
      // Only retry on network errors or 5xx server errors
      if (!error.response || error.response.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
};

export default apiClient;
