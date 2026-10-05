import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middleware/auth.js";
import ExpressBrute from "express-brute";

const router = express.Router();
const store = new ExpressBrute.MemoryStore();
const bruteforce = new ExpressBrute(store);

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024';
const PATTERNS = {
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  FULL_NAME: /^[a-zA-Z\s'-]{2,50}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  CELL_NUMBER: /^[0-9]{10}$/,
  PASSWORD: /^.{6,}$/ // Reduced complexity for now
};

// ==================== MIDDLEWARE ====================

// Security headers
router.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  next();
});

// Admin authentication
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Admin access token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const adminCollection = await db.collection("admins");
    const admin = await adminCollection.findOne({ _id: new ObjectId(decoded.id) });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    req.admin = decoded;
    req.adminUser = admin;
    next();
  } catch (error) {
    console.error("Admin authentication error:", error.message);
    
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid admin token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Admin token expired" });
    }
    
    res.status(500).json({
      message: "Admin authentication failed",
      error: error.message
    });
  }
};

// Input sanitization
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input
    .trim()
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "");
};

// Student creation validation
const validateSignupInput = (req, res, next) => {
  const fields = ['name', 'surname', 'email', 'cellnumber', 'program', 'track', 'username', 'password'];
  const sanitizedData = {};
  
  // Sanitize all fields
  fields.forEach(field => {
    req.body[field] = sanitizeInput(req.body[field]);
    sanitizedData[field] = req.body[field];
  });
  
  // Check required fields
  const missingFields = fields.filter(field => !sanitizedData[field]);
  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(', ')}`
    });
  }
  
  // Validate each field
  const validationErrors = [];
  
  const validations = [
    { field: 'username', pattern: PATTERNS.USERNAME, message: 'Must be 3-20 characters, alphanumeric, underscores, and hyphens only' },
    { field: 'name', pattern: PATTERNS.FULL_NAME, message: 'Must be 2-50 characters, letters, spaces, hyphens, and apostrophes only' },
    { field: 'surname', pattern: PATTERNS.FULL_NAME, message: 'Must be 2-50 characters, letters, spaces, hyphens, and apostrophes only' },
    { field: 'email', pattern: PATTERNS.EMAIL, message: 'Must be a valid email address format' },
    { field: 'cellnumber', pattern: PATTERNS.CELL_NUMBER, message: 'Must be a valid 10-digit phone number' },
    { field: 'password', pattern: PATTERNS.PASSWORD, message: 'Must be at least 6 characters' }
  ];
  
  validations.forEach(({ field, pattern, message }) => {
    if (!pattern.test(sanitizedData[field])) {
      validationErrors.push({ field, message });
    }
  });
  
  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Validation failed",
      errors: validationErrors
    });
  }
  
  next();
};

// ==================== HELPER FUNCTIONS ====================

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      program: user.program,
      track: user.track
    },
    JWT_SECRET,
    { expiresIn: 86400 }
  );
};

const getCurrentSemester = (registrationDate) => {
  if (!registrationDate) return "Not specified";
  const date = new Date(registrationDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                     "July", "August", "September", "October", "November", "December"];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

const getRegistrationMonth = (registrationDate) => {
  if (!registrationDate) return "Not specified";
  const date = new Date(registrationDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                     "July", "August", "September", "October", "November", "December"];
  return monthNames[date.getMonth()];
};

// Database collection helper
const getCollection = (collectionName) => db.collection(collectionName);

// ==================== CRUD OPERATIONS ====================

// CREATE student
router.post("/onboardstudent", authenticateAdmin, validateSignupInput, async (req, res) => {
  try {
    console.log("Creating student with data:", req.body);
    const collection = await getCollection("students");
    const { name, surname, email, cellnumber, program, track, username, password } = req.body;

    // Check for existing user
    const existingUser = await collection.findOne({
      $or: [
        { email: email.trim() },
        { username: username.trim() }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User with this email or username already exists"
      });
    }

    const newUser = {
      name: name.trim(),
      surname: surname.trim(),
      email: email.trim(),
      cellnumber: cellnumber.trim(),
      program: program.trim(),
      track: track.trim(),
      username: username.trim(),
      password: password.trim(),
      accessAllowed: "granted",
      createdAt: new Date(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null
    };

    const result = await collection.insertOne(newUser);
    console.log("Student created successfully with ID:", result.insertedId);

    return res.status(201).json({
      success: true,
      message: "Student registered successfully.",
      userId: result.insertedId,
      user: {
        name: newUser.name,
        surname: newUser.surname,
        email: newUser.email,
        cellnumber: newUser.cellnumber,
        program: newUser.program,
        track: newUser.track,
        username: newUser.username,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error("Create student error:", error);
    res.status(500).json({
      message: "Internal server error during registration",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// READ all students
router.get("/", async (req, res) => {
  try {
    const collection = await getCollection("students");
    const results = await collection.find({}).toArray();
    res.status(200).json(results);
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// UPDATE student
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const collection = await getCollection("students");
    const query = { _id: new ObjectId(req.params.id) };
    
    const updates = {
      $set: {
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        cellnumber: req.body.cellnumber,
        program: req.body.program,
        track: req.body.track,
        accessAllowed: req.body.accessAllowed
      }
    };

    const result = await collection.updateOne(query, updates);
    res.status(200).json(result);
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ error: "Failed to update student" });
  }
});

// DELETE student
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const collection = await getCollection("students");
    const query = { _id: new ObjectId(req.params.id) };
    const result = await collection.deleteOne(query);
    res.status(200).json(result);
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

// ==================== AUTHENTICATION ====================

router.post("/login", bruteforce.prevent, async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt for username:", username);

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required"
      });
    }

    const collection = await getCollection("students");
    const user = await collection.findOne({ username: username.trim() });

    if (!user) {
      console.log("User not found:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (password !== user.password) {
      console.log("Password mismatch for user:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.accessAllowed !== "granted") {
      console.log("Access not granted for user:", username);
      return res.status(403).json({
        message: "Access denied. Please contact support.",
        accessDenied: true
      });
    }

    const token = generateToken(user);
    console.log("Login successful for user:", username);

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
        name: user.name,
        surname: user.surname,
        email: user.email,
        program: user.program,
        track: user.track,
        username: user.username
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error during login"
    });
  }
});

// ==================== USER PROFILE & RESOURCES ====================

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const collection = await getCollection("students");
    const user = await collection.findOne(
      { _id: req.user._id },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.currentSemester = getCurrentSemester(user.createdAt);
    user.registrationMonth = getRegistrationMonth(user.createdAt);

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Generic function to get user-specific content
const getUserSpecificContent = async (collectionName, req) => {
  const collection = await getCollection(collectionName);
  const userProgram = req.user.program;
  const userTrack = req.user.track;

  return await collection.find({
    $or: [
      { program: userProgram },
      { track: userTrack },
      { isGeneral: true }
    ]
  }).toArray();
};

router.get("/my-resources", authenticateToken, async (req, res) => {
  try {
    const resources = await getUserSpecificContent("resources", req);
    res.json(resources);
  } catch (error) {
    console.error("Get resources error:", error);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

router.get("/my-assignments", authenticateToken, async (req, res) => {
  try {
    const assignments = await getUserSpecificContent("assignments", req);
    res.json(assignments);
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

router.get("/my-tasks", authenticateToken, async (req, res) => {
  try {
    const tasks = await getUserSpecificContent("tasks", req);
    res.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.get("/my-projects", authenticateToken, async (req, res) => {
  try {
    const projects = await getUserSpecificContent("projects", req);
    res.json(projects);
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// ==================== STATISTICS & DASHBOARD ====================

// Basic counts
router.get('/total-students', async (req, res) => {
  try {
    const collection = await getCollection("students");
    const total = await collection.countDocuments({});
    res.json({ total });
  } catch (error) {
    console.error("Get total students error:", error);
    res.status(500).json({ error: "Failed to fetch total students" });
  }
});

router.get("/total-by-program/:programName", async (req, res) => {
  try {
    const { programName } = req.params;
    const collection = await getCollection("students");
    
    const total = await collection.countDocuments({
      program: { $regex: new RegExp(`^${programName}$`, 'i') }
    });

    res.json({
      program: programName,
      total,
      message: `Total students in ${programName} program retrieved successfully`
    });
  } catch (error) {
    console.error("Get total by program error:", error);
    res.status(500).json({ error: "Failed to fetch students count by program" });
  }
});

router.get("/total-by-track/:trackName", async (req, res) => {
  try {
    const { trackName } = req.params;
    const collection = await getCollection("students");
    
    const total = await collection.countDocuments({
      track: { $regex: new RegExp(`^${trackName}$`, 'i') }
    });
    
    res.json({
      track: trackName,
      total,
      message: `Total students in ${trackName} track retrieved successfully`
    });
  } catch (error) {
    console.error("Get total by track error:", error);
    res.status(500).json({ error: "Failed to fetch students count by track" });
  }
});

// Dashboard statistics
const getProgramTotals = async (programs) => {
  const collection = await getCollection("students");
  const totals = {};
  
  for (const program of programs) {
    const count = await collection.countDocuments({ program });
    totals[program] = count;
  }
  
  return totals;
};

router.get("/totals-by-programs", async (req, res) => {
  try {
    const dashboardPrograms = [
      "Mentorship Program",
      "Internship Program",
      "Skill Development Program",
      "Graduate Program"
    ];
    
    const totals = await getProgramTotals(dashboardPrograms);
    
    res.json({
      totals,
      message: "Dashboard program totals retrieved successfully"
    });
  } catch (error) {
    console.error("Get program totals error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard program totals" });
  }
});

router.get("/totals-by-tracks", async (req, res) => {
  try {
    const collection = await getCollection("students");
    const allTracks = await collection.distinct("track");
    const validTracks = allTracks.filter(t => t && typeof t === 'string');
    
    const totals = {};
    
    for (const track of validTracks) {
      const count = await collection.countDocuments({ track });
      
      // Normalize track names
      let normalizedTrack = track.trim().toLowerCase();
      if (normalizedTrack.includes('web')) {
        normalizedTrack = "Web Development";
      } else if (normalizedTrack.includes('java') && !normalizedTrack.includes('script')) {
        normalizedTrack = "Java Programming";
      } else if (normalizedTrack.includes('c#') || normalizedTrack.includes('csharp')) {
        normalizedTrack = "C# Programming";
      } else if (normalizedTrack.includes('python')) {
        normalizedTrack = "Python Programming";
      } else if (normalizedTrack.includes('robotics')) {
        normalizedTrack = "Robotics";
      } else if (normalizedTrack.includes('compukids')) {
        normalizedTrack = "Compukids";
      } else if (normalizedTrack.includes('computeens')) {
        normalizedTrack = "CompuTeens";
      } else if (normalizedTrack.includes('digital') && normalizedTrack.includes('entrepreneurship')) {
        normalizedTrack = "Digital Entrepreneurship";
      } else {
        normalizedTrack = track.trim(); // Keep original if no match
      }
      
      totals[normalizedTrack] = (totals[normalizedTrack] || 0) + count;
    }
    
    // Count students with no track
    const noTrackCount = await collection.countDocuments({
      $or: [
        { track: null },
        { track: { $exists: false } },
        { track: "" }
      ]
    });
    
    if (noTrackCount > 0) {
      totals["No Track Assigned"] = noTrackCount;
    }
    
    res.json({
      totals,
      message: "Track totals retrieved successfully"
    });
  } catch (error) {
    console.error("Get track totals error:", error);
    res.status(500).json({ error: "Failed to fetch track totals" });
  }
});

// Predefined statistics
router.get("/totals-by-predefined-programs", async (req, res) => {
  try {
    const predefinedPrograms = [
      "Mentorship Program",
      "Internship Program",
      "Skill Development Program",
      "Graduate Program"
    ];
    
    const totals = await getProgramTotals(predefinedPrograms);
    
    res.json({
      totals,
      message: "Predefined program totals retrieved successfully"
    });
  } catch (error) {
    console.error("Get predefined programs error:", error);
    res.status(500).json({ error: "Failed to fetch predefined program totals" });
  }
});

router.get("/totals-by-predefined-tracks", async (req, res) => {
  try {
    const collection = await getCollection("students");
    const predefinedTracks = [
      "Web Development",
      "Java Programming",
      "C# Programming",
      "Python Programming",
      "Robotics",
      "Compukids",
      "CompuTeens",
      "Digital Entrepreneurship"
    ];
    
    const totals = {};
    
    for (const track of predefinedTracks) {
      const count = await collection.countDocuments({ track });
      totals[track] = count;
    }
    
    res.json({
      totals,
      message: "Predefined track totals retrieved successfully"
    });
  } catch (error) {
    console.error("Get predefined tracks error:", error);
    res.status(500).json({ error: "Failed to fetch predefined track totals" });
  }
});

// Detailed breakdown
router.get("/detailed-breakdown", async (req, res) => {
  try {
    const collection = await getCollection("students");
    const allStudents = await collection.find({}, {
      projection: { program: 1, track: 1 }
    }).toArray();
    
    const breakdown = {};
    
    allStudents.forEach(student => {
      const program = student.program && typeof student.program === 'string' 
        ? student.program.trim() 
        : "No Program Assigned";
      
      const track = student.track && typeof student.track === 'string' 
        ? student.track.trim() 
        : "No Track Assigned";
      
      if (!breakdown[program]) {
        breakdown[program] = {
          program,
          tracks: {},
          total: 0
        };
      }
      
      if (!breakdown[program].tracks[track]) {
        breakdown[program].tracks[track] = 0;
      }
      
      breakdown[program].tracks[track]++;
      breakdown[program].total++;
    });
    
    const result = Object.values(breakdown).map(programData => ({
      program: programData.program,
      tracks: Object.entries(programData.tracks).map(([track, count]) => ({
        track,
        count
      })),
      total: programData.total
    })).sort((a, b) => a.program.localeCompare(b.program));
    
    res.json({
      breakdown: result,
      message: "Detailed breakdown retrieved successfully"
    });
  } catch (error) {
    console.error("Get detailed breakdown error:", error);
    res.status(500).json({ error: "Failed to fetch detailed breakdown" });
  }
});

// Summary statistics
router.get("/summary-statistics", async (req, res) => {
  try {
    const collection = await getCollection("students");
    
    const [
      totalStudents,
      programDistribution,
      trackDistribution,
      recentSignups
    ] = await Promise.all([
      collection.countDocuments({}),
      collection.aggregate([
        { 
          $match: { 
            $or: [
              { program: { $exists: true, $ne: null, $ne: "" } },
              { program: { $exists: false } }
            ]
          } 
        },
        { 
          $group: { 
            _id: { 
              $cond: {
                if: { $and: [{ $ne: ["$program", null] }, { $ne: ["$program", ""] }] },
                then: "$program",
                else: "No Program Assigned"
              }
            }, 
            count: { $sum: 1 } 
          } 
        },
        { $project: { program: "$_id", count: 1, _id: 0 } },
        { $sort: { count: -1 } }
      ]).toArray(),
      collection.aggregate([
        { 
          $match: { 
            $or: [
              { track: { $exists: true, $ne: null, $ne: "" } },
              { track: { $exists: false } }
            ]
          } 
        },
        { 
          $group: { 
            _id: { 
              $cond: {
                if: { $and: [{ $ne: ["$track", null] }, { $ne: ["$track", ""] }] },
                then: "$track",
                else: "No Track Assigned"
              }
            }, 
            count: { $sum: 1 } 
          } 
        },
        { $project: { track: "$_id", count: 1, _id: 0 } },
        { $sort: { count: -1 } }
      ]).toArray(),
      (() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return collection.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
      })()
    ]);
    
    res.json({
      summary: {
        totalStudents,
        recentSignupsLast30Days: recentSignups,
        programDistribution,
        trackDistribution
      },
      message: "Summary statistics retrieved successfully"
    });
  } catch (error) {
    console.error("Get summary statistics error:", error);
    res.status(500).json({ error: "Failed to fetch summary statistics" });
  }
});

// Missing data stats
router.get("/missing-data-stats", async (req, res) => {
  try {
    const collection = await getCollection("students");
    
    const [noProgramCount, noTrackCount, noProgramOrTrackCount] = await Promise.all([
      collection.countDocuments({
        $or: [
          { program: null },
          { program: { $exists: false } },
          { program: "" }
        ]
      }),
      collection.countDocuments({
        $or: [
          { track: null },
          { track: { $exists: false } },
          { track: "" }
        ]
      }),
      collection.countDocuments({
        $and: [
          { $or: [{ program: null }, { program: { $exists: false } }, { program: "" }] },
          { $or: [{ track: null }, { track: { $exists: false } }, { track: "" }] }
        ]
      })
    ]);
    
    res.json({
      missingData: {
        noProgram: noProgramCount,
        noTrack: noTrackCount,
        noProgramOrTrack: noProgramOrTrackCount
      },
      message: "Missing data statistics retrieved successfully"
    });
  } catch (error) {
    console.error("Get missing data stats error:", error);
    res.status(500).json({ error: "Failed to fetch missing data statistics" });
  }
});

// Program-specific distributions
const getProgramTracksDistribution = async (programName) => {
  const collection = await getCollection("students");
  
  const tracks = await collection.aggregate([
    {
      $match: {
        program: { $regex: new RegExp(`^${programName}$`, "i") },
        track: { $exists: true, $ne: null, $ne: "" }
      }
    },
    {
      $group: {
        _id: "$track",
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        track: "$_id",
        count: 1,
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]).toArray();
  
  const result = {};
  tracks.forEach(item => {
    result[item.track] = item.count;
  });
  
  return result;
};

router.get("/mentorship-tracks-distribution", async (req, res) => {
  try {
    const tracks = await getProgramTracksDistribution("Mentorship Program");
    
    res.json({
      tracks,
      message: "Mentorship tracks distribution retrieved successfully"
    });
  } catch (error) {
    console.error("Get mentorship tracks error:", error);
    res.status(500).json({ error: "Failed to fetch mentorship tracks distribution" });
  }
});

router.get("/internship-tracks-distribution", async (req, res) => {
  try {
    const tracks = await getProgramTracksDistribution("Internship Program");
    
    res.json({
      tracks,
      message: "Internship tracks distribution retrieved successfully"
    });
  } catch (error) {
    console.error("Get internship tracks error:", error);
    res.status(500).json({ error: "Failed to fetch internship tracks distribution" });
  }
});

// ==================== DEBUG ENDPOINTS ====================

router.get("/debug-user/:username", async (req, res) => {
  try {
    const collection = await getCollection("students");
    const user = await collection.findOne({ username: req.params.username });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      username: user.username,
      program: user.program,
      track: user.track,
      programType: typeof user.program,
      trackType: typeof user.track,
      programLength: user.program?.length,
      trackLength: user.track?.length,
      programTrimmed: user.program?.trim(),
      trackTrimmed: user.track?.trim()
    });
  } catch (error) {
    console.error("Debug user error:", error);
    res.status(500).json({ error: "Debug failed" });
  }
});

router.get("/debug-programs", async (req, res) => {
  try {
    const collection = await getCollection("students");
    const allPrograms = await collection.distinct("program");
    const sampleStudents = await collection.find({}, { 
      projection: { program: 1, username: 1 } 
    }).limit(10).toArray();
    
    res.json({
      allPrograms,
      sampleStudents,
      message: "Debug programs retrieved successfully"
    });
  } catch (error) {
    console.error("Debug programs error:", error);
    res.status(500).json({ error: "Debug programs failed" });
  }
});

// Test authentication endpoint
router.get("/test-auth", authenticateAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Admin authentication successful",
      admin: req.admin
    });
  } catch (error) {
    console.error("Test auth error:", error);
    res.status(500).json({ error: "Test auth failed" });
  }
});

// Test student creation endpoint (without admin auth for debugging)
router.post("/test-create-student", validateSignupInput, async (req, res) => {
  try {
    console.log("Test creating student with data:", req.body);
    const collection = await getCollection("students");
    const { name, surname, email, cellnumber, program, track, username, password } = req.body;

    // Check for existing user
    const existingUser = await collection.findOne({
      $or: [
        { email: email.trim() },
        { username: username.trim() }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User with this email or username already exists"
      });
    }

    const newUser = {
      name: name.trim(),
      surname: surname.trim(),
      email: email.trim(),
      cellnumber: cellnumber.trim(),
      program: program.trim(),
      track: track.trim(),
      username: username.trim(),
      password: password.trim(),
      accessAllowed: "granted",
      createdAt: new Date(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null
    };

    const result = await collection.insertOne(newUser);
    console.log("Test student created successfully with ID:", result.insertedId);

    return res.status(201).json({
      success: true,
      message: "Test student registered successfully.",
      userId: result.insertedId,
      user: {
        name: newUser.name,
        surname: newUser.surname,
        email: newUser.email,
        cellnumber: newUser.cellnumber,
        program: newUser.program,
        track: newUser.track,
        username: newUser.username,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error("Test create student error:", error);
    res.status(500).json({
      message: "Internal server error during test registration",
      error: error.message
    });
  }
});

export default router;