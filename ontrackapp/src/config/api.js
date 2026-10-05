// ======================
// REFACTORED: ontrackapp/src/config/api.js
// ======================

// API Configuration for OnTrack Connect
// This file centralizes all API configuration

const getApiBaseUrl = () => {
  // In development: use proxy (relative URLs)
  // In production: use environment variable or fallback to production URL
  if (process.env.NODE_ENV === 'development') {
    return ''; // Use proxy - relative URLs will be proxied to backend
  }
  
  // Production - use environment variable or fallback
  return process.env.REACT_APP_API_URL || 'https://api.ontrackconnect.co.za';
};

const getUploadsUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return ''; // Use proxy - relative URLs will be proxied
  }
  
  return process.env.REACT_APP_UPLOADS_URL || 'https://api.ontrackconnect.co.za/uploads';
};

const config = {
  // API URLs - use relative paths in development (proxied)
  // Use absolute URLs in production
  api: {
    baseURL: getApiBaseUrl(),
    uploadsURL: getUploadsUrl(),
    
    // Helper to build full URL when needed
    buildUrl: (endpoint) => {
      const base = config.api.baseURL;
      if (!base) return endpoint; // Development: return relative URL
      const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return `${cleanBase}${cleanEndpoint}`;
    }
  },
  
  // Environment info
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Frontend URL for CORS and redirects
  frontend: process.env.NODE_ENV === 'development'
    ? 'http://localhost:3001'
    : (process.env.REACT_APP_FRONTEND_URL || 'https://platform.ontrackconnect.co.za'),
    
  // Backend URL for direct calls (production only)
  backend: process.env.NODE_ENV === 'development'
    ? 'http://localhost:3001'
    : (process.env.REACT_APP_API_URL || 'https://api.ontrackconnect.co.za')
};

// Development logging
if (config.isDevelopment) {
  console.log('🌐 API Configuration:');
  console.log('   Mode: Development (using proxy)');
  console.log('   API Base URL: (relative - proxied to backend)');
  console.log('   Backend: http://localhost:3001');
  console.log('   Frontend: http://localhost:3001');
  console.log('   Example endpoint: /api/onboardstudents');
}

// Production logging (limited)
if (config.isProduction) {
  console.log('🌐 API Configuration: Production Mode');
  console.log('   API Base URL:', config.api.baseURL);
}

export default config;
