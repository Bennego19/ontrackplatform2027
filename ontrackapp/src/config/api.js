// Browser requests use the frontend origin; the deployment proxy forwards /api.
const config = {
  api: {
    baseURL: '',
    uploadsURL: '/api/files',
    buildUrl: endpoint => endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  },
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  frontend: typeof window === 'undefined' ? '' : window.location.origin,
  backend: ''
};

export default config;
