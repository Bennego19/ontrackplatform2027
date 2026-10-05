// middleware/dbMiddleware.mjs
import { getDatabase } from '../db/conn.mjs';

let dbInstance = null;

export const ensureDatabase = async (req, res, next) => {
  try {
    if (!dbInstance) {
      dbInstance = await getDatabase();
      // Ping to ensure connection is alive
      await dbInstance.command({ ping: 1 });
    }
    
    req.db = dbInstance;
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    
    // Attempt reconnection
    try {
      dbInstance = await getDatabase();
      req.db = dbInstance;
      next();
    } catch (retryError) {
      res.status(503).json({ 
        error: 'Database temporarily unavailable',
        message: 'Please try again in a moment'
      });
    }
  }
};