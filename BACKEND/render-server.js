// render-server.js - Optimized for Render
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
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
import db from './db/conn.mjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable if you need external scripts
  crossOriginEmbedderPolicy: false
}));

// CORS configuration for Render
const allowedOrigins = [
  'https://platform.ontrackconnect.co.za',
  'https://platformontrackconnect.co.za',
  'https://ontrackplatform2026-5.onrender.com', // Your Vercel frontend
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173'
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

// Security - prevent NoSQL injection
app.use(mongoSanitize());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Uploads directory created');
}
app.use('/uploads', express.static('uploads'));

// Mount routes
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

routes.forEach(route => {
  app.use(route.path, route.router);
});

// Health check endpoint (REQUIRED for Render)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'Ontrack Connect Backend',
    timestamp: new Date().toISOString(),
    node: process.version,
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend API is working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      adminLogin: 'POST /api/adminlogin/adminlogin',
      health: 'GET /api/health',
      getAdmins: 'GET /api/adminlogin/admins'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'OnTrack Connect Backend API',
    version: '1.0.0',
    status: 'operational',
    documentation: 'See /api/health for service status'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    availableRoutes: [
      'GET  /api/health',
      'GET  /api/test',
      'POST /api/adminlogin/adminlogin',
      'GET  /api/adminlogin/admins'
    ]
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

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  // Check database connection on startup
  try {
    await db();
    console.log('✅ Database connection initialized');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }

  console.log(`
  🚀 OnTrack Backend Server Started
  📡 Port: ${PORT}
  🌐 Environment: ${process.env.NODE_ENV || 'development'}
  ⏰ Time: ${new Date().toISOString()}
  📊 Health Check: http://localhost:${PORT}/api/health
  `);
});