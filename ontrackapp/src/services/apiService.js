// ======================
// REFACTORED: ontrackapp/src/services/apiService.js
// ======================

import axios from 'axios';
import { tokenManager } from './authMiddleware';

// Create axios instance with default configuration
// Note: No baseURL set - using relative URLs which work with proxy in dev
export const apiClient = axios.create({
  timeout: 10000,
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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handles errors and logging
apiClient.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata?.startTime;
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
    return response;
  },
  (error) => {
    const duration = Date.now() - (error.config?.metadata?.startTime || Date.now());
    console.error(`❌ ${error.config?.method?.toUpperCase() || 'REQUEST'} ${error.config?.url || 'unknown'} - ${duration}ms`);
    
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
        timeout: 10000,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
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
      if (i === retries - 1) throw error;
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
