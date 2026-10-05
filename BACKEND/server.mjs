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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');

// Create directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Uploads directory created');
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Add connection status tracking
let dbConnectionStatus = 'DISCONNECTED';
let serverStatus = 'STOPPED';

// Function to check database connection
const checkDatabaseConnection = async () => {
  try {
    const dbInstance = await getDatabase(); // Corrected: use getDatabase
    if (dbInstance) {
      // Try to ping the database
      const adminDb = dbInstance.admin();
      const pingResult = await adminDb.ping();
      
      if (pingResult && pingResult.ok === 1) {
        dbConnectionStatus = 'CONNECTED';
        console.log('✅ Database connection: CONNECTED');
        console.log(`📊 Database name: ${dbInstance.databaseName}`);
        
        // List collections
        const collections = await dbInstance.listCollections().toArray();
        console.log(`📁 Collections found: ${collections.length}`);
        collections.forEach(col => {
          console.log(`   - ${col.name}`);
        });
        
        return true;
      }
    }
  } catch (error) {
    dbConnectionStatus = 'ERROR';
    console.error('❌ Database connection error:', error.message);
    return false;
  }
  return false;
};

app.use((req, res, next) => {
  req.requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  console.log(`[${req.requestId}] ${req.method} ${req.originalUrl}`, {
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
const allowedOrigins = [
  'https://platform.ontrackconnect.co.za',
  'https://platformontrackconnect.co.za',
  'https://ontrackplatform2026-5.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:5173',
  'http://localhost:8080'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.warn('CORS blocked origin:', origin);
      return callback(new Error(`CORS policy: ${origin} not allowed`), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Security middleware
app.use(mongoSanitize());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(helmet.frameguard({
  action: "deny",
}));

app.use('/uploads', express.static('uploads'));

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

// Mount the routes with logging
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
  { path: '/api/help-requests', router: helpRequests, name: 'Help Requests' }
];

// Mount all routes with logging
routes.forEach(route => {
  app.use(route.path, route.router);
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
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is working!',
    status: 'OK',
    database: dbConnectionStatus,
    server: serverStatus,
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint for Render
app.get('/api/test-simple', (req, res) => {
  res.json({ 
    message: 'Backend API is working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      status: 'GET /api/status',
      test: 'GET /api/test',
      welcome: 'GET /api/welcome'
    }
  });
});

// Welcome route with logging
app.get('/api/welcome', (req, res) => {
  console.log(`📥 Request received: ${req.method} ${req.path} from ${req.headers.origin}`);
  res.json({ 
    message: 'Welcome to the API Service!',
    status: {
      server: 'Running',
      database: dbConnectionStatus,
      port: PORT
    },
    serverTime: new Date().toISOString(),
    endpoints: routes.map(r => r.path)
  });
});

// Health check endpoint with detailed status
app.get('/api/health', async (req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  
  res.json({
    status: dbHealthy ? 'HEALTHY' : 'UNHEALTHY',
    server: serverStatus,
    database: dbConnectionStatus,
    databaseHealthy: dbHealthy,
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    node: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  const connStatus = getConnectionStatus();
  res.json({
    server: {
      status: serverStatus,
      port: PORT,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    database: {
      status: dbConnectionStatus,
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
    path: req.originalUrl,
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
  console.error('🚨 Server Error:', err.stack);
  
  // Handle CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({ 
      error: 'CORS Error',
      message: err.message,
      allowedOrigins: allowedOrigins
    });
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
              console.error('❌ Database reconnection failed:', reconnectError.message);
            }
          }
        } catch (error) {
          console.error(`❌ Database monitor error: ${error.message}`);
        }
      }, 60000); // Every 60 seconds
      
      // Store interval ID for cleanup
      server._dbMonitorInterval = monitorInterval;
    };
    
    // Handle server errors
    server.on('error', (error) => {
      serverStatus = 'ERROR';
      console.error('❌ Server error:', error);
      
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
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();