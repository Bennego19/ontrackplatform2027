// conn.mjs - IMPROVED VERSION
// MongoDB connection manager with dual export patterns

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.ATLAS_URI || "";
const dbName = process.env.DB_NAME || "ontrack";

// Connection state
let client = null;
let dbInstance = null;
let isConnecting = false;
let connectionPromise = null;

/**
 * Establish MongoDB connection
 * @returns {Promise<Db>} MongoDB database instance
 */
const connectToDatabase = async () => {
  if (!connectionString) {
    throw new Error("ATLAS_URI environment variable is not set");
  }

  console.log('🔌 Connecting to MongoDB...');
  
  client = new MongoClient(connectionString, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
  });

  try {
    await client.connect();
    console.log('✅ MongoDB connected successfully');

    dbInstance = client.db(dbName);
    console.log(`📊 Database: ${dbInstance.databaseName}`);
    
    // Test connection with a ping
    await dbInstance.command({ ping: 1 });
    console.log('✅ Database ping successful');
    
    return dbInstance;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Clean up on failure
    dbInstance = null;
    if (client) {
      await client.close().catch(console.error);
      client = null;
    }
    throw error;
  }
};

/**
 * Get database instance with connection pooling and caching
 * @returns {Promise<Db>} Connected database instance
 */
export const getDatabase = async () => {
  // Return existing connection if valid
  if (dbInstance && client) {
    try {
      await dbInstance.command({ ping: 1 });
      return dbInstance;
    } catch (pingError) {
      console.log('⚠️ Connection test failed, reconnecting...');
      dbInstance = null;
      client = null;
    }
  }

  // Prevent multiple simultaneous connection attempts
  if (!connectionPromise) {
    connectionPromise = connectToDatabase()
      .finally(() => {
        connectionPromise = null;
      });
  }

  return connectionPromise;
};


/**
 * Initialize database connection at app startup
 * Call this in your main server file
 */
export const initializeDatabase = async () => {
  try {
    await getDatabase();
    console.log('🚀 Database initialized and ready');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    return false;
  }
};

/**
 * Close database connection gracefully
 */
export const closeDatabase = async () => {
  if (client) {
    try {
      await client.close();
      console.log('👋 MongoDB connection closed gracefully');
    } catch (error) {
      console.error('Error closing database:', error.message);
    } finally {
      client = null;
      dbInstance = null;
    }
  }
};

/**
 * Get connection status
 */
export const getConnectionStatus = () => ({
  connected: !!dbInstance,
  databaseName: dbInstance?.databaseName || null,
  client: client ? 'Connected' : 'Disconnected',
  timestamp: new Date().toISOString()
});

// Default export: the async getDatabase function
export default getDatabase;

// ============================================================================
// USAGE EXAMPLES FOR YOUR ROUTES
// ============================================================================

// Pattern 1: Async per-request (for routes)
/*
  // In your route file (onboardmentors.mjs):
  import getDatabase from './conn.mjs';
  
  router.get('/total-mentors', async (req, res) => {
    try {
      const db = await getDatabase();
      const collection = db.collection('mentors');
      const total = await collection.countDocuments();
      res.json({ total });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
*/

// Pattern 2: Pre-initialized (for server startup)
/*
  // In server.mjs:
  import { initializeDatabase, getDbSync } from './conn.mjs';
  
  // Initialize at startup
  await initializeDatabase();
  
  // Make available to routes via app.locals
  app.locals.db = getDbSync();
  
  // In routes:
  router.get('/total', async (req, res) => {
    const db = req.app.locals.db;
    // Use db directly...
  });
*/

// Pattern 3: Middleware approach
/*
  // middleware/dbMiddleware.mjs:
  import getDatabase from './conn.mjs';
  
  export const dbMiddleware = async (req, res, next) => {
    try {
      req.db = await getDatabase();
      next();
    } catch (error) {
      res.status(503).json({ error: 'Database unavailable' });
    }
  };
  
  // In routes:
  router.use(dbMiddleware);
  router.get('/data', async (req, res) => {
    const collection = req.db.collection('data');
    // ...
  });
*/

// Graceful shutdown handlers
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, async () => {
    console.log(`\n${signal} received. Closing database connection...`);
    await closeDatabase();
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  closeDatabase().finally(() => process.exit(1));
});