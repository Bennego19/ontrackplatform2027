// ======================
// REFACTORED: ontrackapp/src/setupProxy.js
// ======================

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only use proxy in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Setting up development proxy...');
    console.log('   API calls → http://localhost:3001/api');
    
    // Proxy /api requests to backend
    app.use(
      '/api',
      createProxyMiddleware({
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug',
        onProxyReq: (proxyReq, req, res) => {
          console.log(`🔄 Proxying: ${req.method} ${req.path} → http://localhost:3001${req.path}`);
        }
      })
    );
    
    // Proxy /uploads requests to backend (for file uploads)
    app.use(
      '/uploads',
      createProxyMiddleware({
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      })
    );
    
  } else {
    console.log('🌐 Production mode: Using direct API calls');
    console.log('   API: https://api.ontrackconnect.co.za/api');
  }
};
