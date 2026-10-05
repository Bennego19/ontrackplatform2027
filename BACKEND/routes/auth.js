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
router.get("/", (req, res) => {
  res.json({
    message: "OnTrack Connect Authentication API",
    version: "1.0.0",
    endpoints: {
      "POST /admin-login": "Admin login",
      "POST /login": "General user login",
      "POST /verify": "Verify JWT token",
      "GET /": "API information"
    },
    timestamp: new Date().toISOString()
  });
});

var store = new ExpressBrute.MemoryStore();
var bruteforce = new ExpressBrute(store);

const generateToken = (user) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024';

  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: 86400 } // 24 hours in seconds
  );
};

// Admin login route
router.post("/admin-login", bruteforce.prevent, async (req, res) => {
  console.log("Admin login attempt received:", {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { username, password } = req.body;

    console.log("Parsed admin credentials:", { username, password });

    if (!username || !password) {
      console.log("Missing admin credentials");
      return res.status(400).json({
        message: "Username and password are required"
      });
    }

    const database = await db();
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

    // Secure password check using bcrypt
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log("Invalid admin password");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(admin);

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
        role: admin.role || "admin",
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

// General login route (could be for mentors or other users)
router.post("/login", bruteforce.prevent, async (req, res) => {
  console.log("General login attempt received:", {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required"
      });
    }

    const database = await db();
    // Try to find user in mentors collection first
    let collection = database.collection("students");
    let user = await collection.findOne({
      username: username?.trim()
    });

    let userType = "mentor";

    // If not found in mentors, try admins
    if (!user) {
      collection = database.collection("admins");
      user = await collection.findOne({
        username: username?.trim()
      });
      userType = "admin";
    }

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // Secure password check using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    // Update last login
    await collection.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role || userType,
        name: user.name,
        type: userType
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error during login"
    });
  }
});

// Verify token endpoint
router.post("/verify", bruteforce.prevent, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024';

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      const database = await db();
      // Find user in any collection
      let user = await database.collection("admins").findOne({ _id: new ObjectId(decoded.id) });
      if (!user) {
        user = await database.collection("mentors").findOne({ _id: new ObjectId(decoded.id) });
      }
      if (!user) {
        user = await database.collection("students").findOne({ _id: new ObjectId(decoded.id) });
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          role: user.role,
          name: user.name
        }
      });
    });

  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
