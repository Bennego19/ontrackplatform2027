import express from 'express';
import https from "https";
import cors from 'cors';
import dotenv from 'dotenv';
import mentorstudentassignment from './routes/mentorstudentassignment.mjs';
import onboardstudents from './routes/onboardstudents.mjs';
import onboardmentors from './routes/onboardmentors.mjs';
import programs from './routes/programs.mjs';
import tracks from './routes/tracks.mjs';
import assessments from './routes/assessments.mjs';
import resources from './routes/resources.mjs';
import events from './routes/events.mjs';
import mentordashboard from './routes/mentordashboard.mjs';
import cohorts from './routes/cohorts.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { getDatabase, getConnectionStatus, initializeDatabase, closeDatabase } from './db/conn.mjs';
import { allowedCorsOrigins } from './utils/corsOrigins.mjs';
import { logError } from './utils/logError.mjs';
import { authenticateAdmin } from './middleware/auth.js';
import { makeApiLimiters } from './middleware/apiRateLimit.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32 || process.env.JWT_SECRET === 'ontrack-connect-jwt-secret-key-2024')) {
  throw new Error('Production requires a unique JWT_SECRET of at least 32 bytes');
}
if (process.env.NODE_ENV === 'production' && !process.env.DB_NAME?.trim()) {
  console.error('Production requires an explicit DB_NAME');
  throw new Error('Production requires an explicit DB_NAME');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Add connection status tracking
let serverStatus = 'STOPPED';

app.use((req, res, next) => {
  req.requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  console.log(`[${req.requestId}] ${req.method}`, {
    user: req.headers.authorization ? 'authenticated' : 'anonymous',
    timestamp: new Date().toISOString()
  });
  
  const originalSend = res.json;
  res.json = function(data) {
    console.log(`[${req.requestId}] Response:`, {
      statusCode: res.statusCode,
      success: res.statusCode < 400
    });
    return originalSend.call(this, data);
  };
  
  next();
});

// CORS Configuration - UPDATED for Render compatibility
const allowedOrigins = allowedCorsOrigins();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.warn('CORS blocked a request from an unapproved origin');
      return callback(new Error('CORS policy: origin not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID']
}));

// Body parsing middleware
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Security middleware
app.use(mongoSanitize());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(helmet.frameguard({
  action: "deny",
}));

// Serve frontend admin login as landing page if available
const frontendDir = path.join(__dirname, '..', 'frontend html');
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
  app.get('/', (req, res) => {
    res.sendFile(path.join(frontendDir, 'adminlogin.html'));
  });
  console.log('🌐 Frontend directory found and mounted');
} else {
  console.log('⚠️ Frontend directory not found');
}

// Import additional routes
import studentassignment from './routes/studentassignment.js';
import auth from './routes/auth.js';
import user from './routes/user.mjs';
import addassignment from './routes/addassignment.mjs';
import mentorship from './routes/mentorship.mjs';
import internship from './routes/internship.mjs';
import skillsdevelopment from './routes/skillsdevelopment.js';
import modules from './routes/modules.mjs';
import projects from './routes/projects.mjs';
import announcements from './routes/announcements.mjs';
import accesscontrol from './routes/accesscontrol.mjs';
import adminlogin from './routes/adminlogin.mjs';
import addtask from './routes/addtask.mjs';
import helpRequests from './routes/help-requests.mjs';
import files from './routes/files.mjs';
import passwordReset from './routes/passwordReset.mjs';
import { routePolicy } from './middleware/routePolicy.mjs';

// API responses can include account and student data; prevent intermediary caching.
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// Mount the routes with logging
app.use('/api', ...makeApiLimiters());
const routes = [
  { path: '/api/onboardstudents', router: onboardstudents, name: 'Onboard Students' },
  { path: '/api/onboardmentors', router: onboardmentors, name: 'Onboard Mentors' },
  { path: '/api/mentorstudentassignment', router: mentorstudentassignment, name: 'Mentor Student Assignment' },
  { path: '/api/mentordashboard', router: mentordashboard, name: 'Mentor Dashboard' },
  { path: '/api/programs', router: programs, name: 'Programs' },
  { path: '/api/tracks', router: tracks, name: 'Tracks' },
  { path: '/api/assessments', router: assessments, name: 'Assessments' },
  { path: '/api/resources', router: resources, name: 'Resources' },
  { path: '/api/events', router: events, name: 'Events' },
  { path: '/api/cohorts', router: cohorts, name: 'Cohorts' },
  { path: '/api/studentassignment', router: studentassignment, name: 'Student Assignment' },
  { path: '/api/auth', router: auth, name: 'Auth' },
  { path: '/api/adminlogin', router: adminlogin, name: 'Admin Login' },
  { path: '/api/user', router: user, name: 'User' },
  { path: '/api/addassignment', router: addassignment, name: 'Add Assignment' },
  { path: '/api/accesscontrol', router: accesscontrol, name: 'Access Control' },
  { path: '/api/mentorship', router: mentorship, name: 'Mentorship' },
  { path: '/api/internship', router: internship, name: 'Internship' },
  { path: '/api/skillsdevelopment', router: skillsdevelopment, name: 'Skills Development' },
  { path: '/api/modules', router: modules, name: 'Modules' },
  { path: '/api/projects', router: projects, name: 'Projects' },
  { path: '/api/announcements', router: announcements, name: 'Announcements' },
  { path: '/api/addtask', router: addtask, name: 'Add Task' },
  { path: '/api/help-requests', router: helpRequests, name: 'Help Requests' },
  { path: '/api/files', router: files, name: 'Files' },
  { path: '/api/password-reset', router: passwordReset, name: 'Password Reset' }
];

// Mount all routes with logging
routes.forEach(route => {
  app.use(route.path, routePolicy(route.path), route.router);
  console.log(`✅ Route mounted: ${route.path} (${route.name})`);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'OnTrack Connect Backend API',
    version: '1.0.0',
    status: 'operational',
    service: 'Ontrack Connect Platform',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      status: 'GET /api/status',
      test: 'GET /api/test',
      welcome: 'GET /api/welcome',
      docs: 'See /api/health for service status'
    }
  });
});

// Test route with connection status
app.get('/api/test', (req, res) => res.status(404).json({ error: 'Route not found' }));

// Simple test endpoint for Render
app.get('/api/test-simple', (req, res) => res.status(404).json({ error: 'Route not found' }));

// Welcome route with logging
app.get('/api/welcome', (req, res) => {
  res.json({ message: 'Welcome to the API Service!' });
});

// Process liveness is separate from the database readiness check.
app.get('/api/health', (req, res) => res.json({ status: 'healthy' }));

// Status endpoint
app.get('/api/ready', async (req, res) => {
  try {
    await getDatabase();
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not_ready' });
  }
});

app.get('/api/status', authenticateAdmin, (req, res) => {
  const connStatus = getConnectionStatus();
  res.json({
    server: {
      status: serverStatus,
      port: PORT,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    database: {
      status: connStatus.connected ? 'CONNECTED' : 'DISCONNECTED',
      name: connStatus.databaseName || 'Not connected'
    },
    routes: routes.length,
    environment: process.env.NODE_ENV || 'development'
  });
});


// 404 handler - AFTER all routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'GET  /api/health',
      'GET  /api/status',
      'GET  /api/test',
      'GET  /api/test-simple',
      'GET  /api/welcome',
    ],
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logError('Server error:', err);
  
  // Handle CORS errors
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ error: 'CORS Error' });
  }
  
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Update the startServer function:
const startServer = async () => {
  try {
    console.log('🚀 Starting OnTrack Connect Server...');
    console.log('='.repeat(50));
    
    // Initialize database FIRST
    console.log('🔌 Initializing database connection...');
    const dbInitialized = await initializeDatabase();
    
    if (!dbInitialized) {
      console.warn('⚠️ Database initialization failed, but continuing...');
    } else {
      console.log('✅ Database initialized successfully');
    }
    
    // Listen on all network interfaces (0.0.0.0) for Render compatibility
    const server = app.listen(PORT, '0.0.0.0', () => {
      serverStatus = 'RUNNING';
      
      console.log('='.repeat(50));
      console.log(`✅ Server is running on port: ${PORT}`);
      console.log(`🌐 Listening on: 0.0.0.0 (all interfaces)`);
      console.log('='.repeat(50));
      
      // Setup database monitor AFTER server starts
      setupDatabaseMonitor();
      
      console.log(`🎉 OnTrack Connect Server started successfully at ${new Date().toLocaleTimeString()}`);
    });
    
    // Add the setupDatabaseMonitor function
    const setupDatabaseMonitor = () => {
      // Monitor database connection every 60 seconds
      const monitorInterval = setInterval(async () => {
        try {
          const status = getConnectionStatus();
          console.log(`📊 Database Status: ${status.connected ? 'Connected' : 'Disconnected'} - ${new Date().toLocaleTimeString()}`);
          
          // If not connected, try to reconnect
          if (!status.connected) {
            console.log('🔄 Attempting to reconnect to database...');
            try {
              await initializeDatabase();
              console.log('✅ Database reconnected');
            } catch (reconnectError) {
              logError('Database reconnection failed:', reconnectError);
            }
          }
        } catch (error) {
          logError('Database monitor error:', error);
        }
      }, 60000); // Every 60 seconds
      
      // Store interval ID for cleanup
      server._dbMonitorInterval = monitorInterval;
    };
    
    // Handle server errors
    server.on('error', (error) => {
      serverStatus = 'ERROR';
      logError('Server error:', error);
      
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Try a different port.`);
        process.exit(1);
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🔴 Received SIGINT. Shutting down gracefully...');
      serverStatus = 'STOPPING';
      
      // Clear database monitor interval
      if (server._dbMonitorInterval) {
        clearInterval(server._dbMonitorInterval);
      }
      
      server.close(async () => {
        // Close database connection
        await closeDatabase();
        console.log('✅ Server shut down successfully');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🔴 Received SIGTERM. Shutting down gracefully...');
      serverStatus = 'STOPPING';
      
      // Clear database monitor interval
      if (server._dbMonitorInterval) {
        clearInterval(server._dbMonitorInterval);
      }
      
      server.close(async () => {
        // Close database connection
        await closeDatabase();
        console.log('✅ Server shut down successfully');
        process.exit(0);
      });
    });
    
    return server;
    
  } catch (error) {
    logError('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
