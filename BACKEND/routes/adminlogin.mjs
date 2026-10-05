import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ExpressBrute from "express-brute";

const router = express.Router();

router.use((req,res,next) =>{
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
    next();
});

// GET / - Basic info endpoint
router.get("/", (req, res) => { // security security problem
  res.json({
    message: "OnTrack Connect Admin Management API",
    version: "1.0.0",
    endpoints: {
      "GET /admins": "Get all admins",
      "GET /admins/:id": "Get single admin",
      "POST /admins": "Create new admin",
      "POST /adminlogin": "Admin login",
      "POST /create-test-admin": "Create test admin",
      "POST /create-sample-admins": "Create sample admins",
      "POST /bulk-create-admins": "Bulk create admins",
      "GET /check-admin/:username": "Check if user is admin",
      "GET /debug-db": "Database debug info",
      "GET /": "API information"
    },
    timestamp: new Date().toISOString()
  });
});

var store = new ExpressBrute.MemoryStore();
var bruteforce = new ExpressBrute(store);

const JWT_SECRET = process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024';

router.get("/debug-passwords", async (req, res) => {
  try {
    const database = await db();
    const collection = database.collection("admins");
    const admins = await collection.find({}).toArray();
    
    // Security fix: Don't show passwords
    const adminsWithPasswords = admins.map(admin => ({
      username: admin.username,
      role: admin.role,
      _id: admin._id,
      hasPassword: !!admin.password
    }));
    
    res.json({
      warning: "⚠️ SECURITY NOTICE: Passwords are hidden for security.",
      admins: adminsWithPasswords
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      role: user.role || 'admin'
    },
    JWT_SECRET,
    { expiresIn: 86400 } // 24 hours in seconds
  );
};

// =============== TEST/DEBUG ROUTES ===============

// Test route to see if router is working
router.get("/test", (req, res) => {
  res.json({
    message: "Auth router is working!",
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    path: req.path,
    timestamp: new Date().toISOString(),
    routes: [
      "POST /adminlogin",
      "POST /admins (create admin)",
      "GET /admins (get all admins)",
      "GET /admins/:id (get single admin)",
      "POST /create-test-admin (quick test)"
    ]
  });
});

// =============== ADMIN CREATION ROUTES ===============

// POST route to create a new admin
router.post("/admins", async (req, res) => {
  try {
    console.log("Creating new admin request:", req.body);
    
    const { username, password, name, email, role } = req.body;
    
    // Basic validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }
    
    const database = await db();
    const collection = database.collection("admins");
    
    // Check if username already exists
    const existingAdmin = await collection.findOne({ username: username.trim() });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Username already exists"
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin document
    const newAdmin = {
      username: username.trim(),
      password: hashedPassword, // Securely hashed
      name: name || username,
      email: email || `${username}@ontrack.com`,
      role: role || "admin",
      createdAt: new Date(),
      lastLogin: null,
      isActive: true
    };
    
    const result = await collection.insertOne(newAdmin);
    
    // Remove password from response
    const { password: _, ...adminWithoutPassword } = newAdmin;
    
    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        ...adminWithoutPassword,
        _id: result.insertedId
      }
    });
    
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create admin",
      error: error.message
    });
  }
});

// Quick test route to create a test admin
router.post("/create-test-admin", async (req, res) => {
  try {
    const database = await db();
    const collection = database.collection("admins");
    
    // Check if test admin already exists
    const existingAdmin = await collection.findOne({ username: "testadmin" });
    if (existingAdmin) {
      return res.json({
        success: true,
        message: "Test admin already exists",
        admin: {
          username: existingAdmin.username,
          id: existingAdmin._id
        }
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("test123", salt);

    // Create test admin
    const testAdmin = {
      username: "testadmin",
      password: hashedPassword,
      name: "Test Administrator",
      email: "test@ontrack.com",
      role: "admin",
      createdAt: new Date(),
      lastLogin: null,
      isActive: true
    };
    
    const result = await collection.insertOne(testAdmin);
    
    res.json({
      success: true,
      message: "Test admin created successfully",
      admin: {
        username: testAdmin.username,
        id: result.insertedId
      },
      note: "Use username: testadmin, password: test123 to login"
    });
    
  } catch (error) {
    console.error("Error creating test admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create test admin",
      error: error.message
    });
  }
});

// Quick route to add multiple sample admins
router.post("/create-sample-admins", async (req, res) => {
  try {
    const database = await db();
    const collection = database.collection("admins");
    
    const sampleAdmins = [
      {
        username: "admin",
        password: "admin123",
        name: "System Administrator",
        role: "superadmin"
      },
      {
        username: "manager",
        password: "manager456",
        name: "Content Manager",
        role: "admin"
      },
      {
        username: "support",
        password: "support789",
        name: "Support Staff",
        role: "support"
      }
    ];
    
    const results = [];
    
    for (const adminData of sampleAdmins) {
      // Check if admin already exists
      const existing = await collection.findOne({ username: adminData.username });
      
      if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminData.password, salt);

        const newAdmin = {
          ...adminData,
          password: hashedPassword,
          email: `${adminData.username}@ontrack.com`,
          createdAt: new Date(),
          lastLogin: null,
          isActive: true
        };
        
        const result = await collection.insertOne(newAdmin);
        results.push({
          username: adminData.username,
          id: result.insertedId,
          status: "created"
        });
      } else {
        results.push({
          username: adminData.username,
          status: "already exists"
        });
      }
    }
    
    res.json({
      success: true,
      message: "Sample admins processed",
      results: results
    });
    
  } catch (error) {
    console.error("Error creating sample admins:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create sample admins",
      error: error.message
    });
  }
});

// =============== GET ROUTES ===============

// GET all admins
router.get("/admins", async (req, res) => {
  try {
    console.log("Fetching all admins request received");
    
    const database = await db();
    const collection = database.collection("admins");
    
    // Get query parameters
    const { page, limit, search, role } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      filter.role = role;
    }
    
    // Get counts
    const totalCount = await collection.countDocuments(filter);
    
    // Fetch admins
    const admins = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();
    
    // Remove passwords
    const sanitizedAdmins = admins.map(admin => {
      const { password, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    });
    
    res.json({
      success: true,
      message: "Admins retrieved successfully",
      data: sanitizedAdmins,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admins",
      error: error.message
    });
  }
});

// GET single admin by ID
router.get("/admins/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID format"
      });
    }
    
    const database = await db();
    const collection = database.collection("admins");
    const admin = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }
    
    // Remove password
    const { password, ...adminWithoutPassword } = admin;
    
    res.json({
      success: true,
      message: "Admin retrieved successfully",
      data: adminWithoutPassword
    });
    
  } catch (error) {
    console.error("Error fetching admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin",
      error: error.message
    });
  }
});

// =============== ADMIN LOGIN ROUTE ===============

// Admin login route
router.post("/adminlogin", bruteforce.prevent, async (req, res) => {
  console.log("Admin login attempt received:", {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { username, password } = req.body;

    console.log("Parsed admin credentials:", { username, password });

    const database = await db(); 

    if (!username || !password) {
      console.log("Missing admin credentials");
      return res.status(400).json({
        message: "Username and password are required"
      });
    }

    const collection = database.collection("admins");

    // Find admin by username
    const admin = await collection.findOne({
      username: username?.trim()
    });

    console.log("Admin found:", admin ? "Yes" : "No");

    if (!admin) {
      console.log("No admin found with this username");
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // Password check (supports migration from plain text to bcrypt)
    let isMatch = false;
    const isHash = admin.password && (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$'));

    if (isHash) {
      isMatch = await bcrypt.compare(password, admin.password);
    } else {
      // Legacy plain text check
      if (password === admin.password) {
        isMatch = true;
        // Migrate to hash automatically
        console.log(`Migrating admin ${username} to hashed password`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await collection.updateOne({ _id: admin._id }, { $set: { password: hashedPassword } });
      }
    }

    if (!isMatch) {
      console.log("Invalid admin password");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role || 'admin'
      },
      JWT_SECRET,
      { expiresIn: 86400 }
    );

    console.log("Admin login successful, token generated");

    // Update last login
    await collection.updateOne(
      { _id: admin._id },
      { $set: { lastLogin: new Date() } }
    );

    res.json({
      success: true,
      message: "Admin login successful",
      token,
      user: {
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role,
        name: admin.name
      }
    });

  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      message: "Internal server error during admin login"
    });
  }
});

// =============== HELPER ROUTES ===============

// Check if username is admin
router.get("/check-admin/:username", async (req, res) => {
  try {
    const { username } = req.params;
    
    const database = await db();
    const collection = database.collection("admins");
    const admin = await collection.findOne({
      username: username?.trim()
    });
    
    res.json({
      isAdmin: !!admin,
      username: username,
      exists: !!admin,
      role: admin?.role || null
    });
    
  } catch (error) {
    console.error("Error checking admin:", error);
    res.status(500).json({
      error: "Failed to check admin status"
    });
  }
});

// Database debug route
router.get("/debug-db", async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    let admins = [];
    if (collectionNames.includes("admins")) {
      admins = await db.collection("admins").find({}).toArray();
    }
    
    res.json({
      database: db.databaseName,
      collections: collectionNames,
      adminsCount: admins.length,
      admins: admins.map(admin => ({
        _id: admin._id,
        username: admin.username,
        role: admin.role,
        hasPassword: !!admin.password
      }))
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Verify token route (returns user info when token is valid)
// Note: This exposes a simple verification endpoint for frontend checks.
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No authorization header' });
    }

    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : authHeader;

    const decoded = jwt.verify(token, JWT_SECRET);

    const database = await db();
    const admin = await database.collection("admins").findOne({ _id: new ObjectId(decoded.id) });

    if (!admin) {
      return res.status(401).json({ success: false, message: 'User not found or invalid token' });
    }

    // Return minimal user info
    return res.json({
      success: true,
      user: {
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role,
        name: admin.name
      }
    });
  } catch (err) {
    console.error('Token verify error:', err && err.message ? err.message : err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

// Add POST support for verify to handle different frontend implementations
router.post('/verify', async (req, res) => {
  try {
    let token = req.body.token;
    
    // If not in body, check header
    if (!token) {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (authHeader) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const database = await db();
    const admin = await database.collection("admins").findOne({ _id: new ObjectId(decoded.id) });

    if (!admin) {
      return res.status(401).json({ success: false, message: 'User not found or invalid token' });
    }

    return res.json({
      success: true,
      user: {
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role,
        name: admin.name
      }
    });
  } catch (err) {
    console.error('Token verify error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

// POST bulk create admins
router.post("/bulk-create-admins", async (req, res) => {
  try {
    const admins = req.body;
    
    if (!Array.isArray(admins) || admins.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Admins array is required"
      });
    }
    
    const database = await db();
    const collection = database.collection("admins");
    const results = [];
    const errors = [];
    
    for (const adminData of admins) {
      try {
        // Validate required fields
        if (!adminData.username || !adminData.password) {
          errors.push({
            admin: adminData.username || 'Unknown',
            error: "Missing username or password"
          });
          continue;
        }
        
        // Check if admin already exists
        const existingAdmin = await collection.findOne({ 
          username: adminData.username.trim().toLowerCase() 
        });
        
        if (existingAdmin) {
          results.push({
            username: adminData.username,
            status: "already exists",
            _id: existingAdmin._id
          });
          continue;
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminData.password, salt);

        // Create new admin
        const newAdmin = {
          username: adminData.username.trim(),
          password: hashedPassword,
          name: adminData.name || adminData.username,
          email: adminData.email || `${adminData.username}@ontrack.com`,
          role: adminData.role || "admin",
          createdAt: new Date(),
          lastLogin: null,
          isActive: true
        };
        
        const result = await collection.insertOne(newAdmin);
        
        results.push({
          username: adminData.username,
          status: "created",
          _id: result.insertedId,
          role: newAdmin.role
        });
        
      } catch (error) {
        errors.push({
          admin: adminData.username || 'Unknown',
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Processed ${admins.length} admins`,
      results: results,
      errors: errors,
      summary: {
        total: admins.length,
        created: results.filter(r => r.status === "created").length,
        existing: results.filter(r => r.status === "already exists").length,
        failed: errors.length
      }
    });
    
  } catch (error) {
    console.error("Error in bulk create:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk create admins",
      error: error.message
    });
  }
});

export default router;