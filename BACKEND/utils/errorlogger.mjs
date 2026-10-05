export const logRouteError = (routeName, error, req) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    route: routeName,
    requestId: req?.requestId,
    method: req?.method,
    url: req?.originalUrl,
    userId: req?.user?.id,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    database: {
      connected: !!global.dbInstance,
      name: global.dbInstance?.databaseName
    }
  };
  
  console.error('🚨 ROUTE ERROR:', JSON.stringify(errorLog, null, 2));
  
  // Also log to file in production
  if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    fs.appendFileSync(
      'errors.log',
      JSON.stringify(errorLog) + '\n'
    );
  }
};