import { logError } from '../utils/logError.mjs';
import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import { participantLogin } from '../controllers/auth.mjs';
import { authenticateToken, authenticateAdmin } from "../middleware/auth.js";
import { studentLoginLimit } from '../middleware/authRateLimit.mjs';
import bcrypt from "bcrypt";
import { exactCaseInsensitive } from '../utils/exactMatch.mjs';
import { contentVisibility } from '../utils/contentVisibility.mjs';

const router = express.Router();

// Constants
const PATTERNS = {
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  FULL_NAME: /^[a-zA-Z\s'-]{2,50}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  CELL_NUMBER: /^[0-9]{10}$/,
  PASSWORD: /^(?=.*\S).{12,}$/s
};

// ==================== MIDDLEWARE ====================

// Security headers
router.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  next();
});

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
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ message: 'Invalid registration details' });
  }
  if (typeof req.body?.password === 'string' && Buffer.byteLength(req.body.password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Password must not exceed 72 UTF-8 bytes' });
  }
  const fields = ['name', 'surname', 'email', 'cellnumber', 'program', 'track', 'username', 'password'];
  const sanitizedData = {};
  if (fields.some(field => typeof req.body[field] !== 'string')) {
    return res.status(400).json({ message: 'Registration fields must be text' });
  }
  
  // Sanitize all fields
  fields.forEach(field => {
    if (field !== 'password') req.body[field] = sanitizeInput(req.body[field]);
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
    { field: 'password', pattern: PATTERNS.PASSWORD, message: 'Must be at least 12 characters' }
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

const getRegistrationMonth = (registrationDate) => {
  if (!registrationDate) return "Not specified";
  const date = new Date(registrationDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                     "July", "August", "September", "October", "November", "December"];
  return monthNames[date.getMonth()];
};

// Database collection helper
const getCollection = async (collectionName) => (await db()).collection(collectionName);

// ==================== CRUD OPERATIONS ====================

// CREATE student
router.post("/onboardstudent", authenticateAdmin, validateSignupInput, async (req, res) => {
  try {
    const collection = await getCollection("students");
    const { name, surname, email, cellnumber, program, track, username, password } = req.body;

    // Check for existing user
    const existingUser = await collection.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
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
      email: email.trim().toLowerCase(),
      cellnumber: cellnumber.trim(),
      program: program.trim(),
      track: track.trim(),
      username: username.trim(),
      password: await bcrypt.hash(password, 12),
      accessAllowed: "granted",
      createdAt: new Date(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null
    };

    const result = await collection.insertOne(newUser);

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
    if (error.code === 11000) return res.status(409).json({ message: 'Username or email already exists' });
    logError("Create student error:", error);
    res.status(500).json({
      message: "Internal server error during registration",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// READ all students
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const collection = await getCollection("students");
    const results = await collection.find({}, { projection: { password: 0, passwordResetHash: 0, passwordResetExpiresAt: 0, tokenVersion: 0 } }).toArray();
    res.status(200).json(results);
  } catch (error) {
    logError("Get students error:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// UPDATE student
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    const allowed = ['name', 'surname', 'email', 'cellnumber', 'program', 'track', 'accessAllowed'];
    const fields = {};
    for (const field of allowed) {
      if (req.body[field] === undefined) continue;
      if (typeof req.body[field] !== 'string' || !req.body[field].trim()) return res.status(400).json({ message: `Invalid ${field}` });
      fields[field] = field === 'email' ? req.body[field].trim().toLowerCase() : req.body[field].trim();
    }
    if (!Object.keys(fields).length || (fields.accessAllowed && !['granted', 'denied'].includes(fields.accessAllowed))) {
      return res.status(400).json({ message: 'Invalid student update' });
    }
    const collection = await getCollection("students");
    const query = { _id: new ObjectId(req.params.id) };
    // Make changing access and revoking sessions one atomic database operation.
    // Literal expressions prevent field values beginning with $ being evaluated.
    const updates = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { $literal: value }]));
    if (fields.accessAllowed !== undefined) {
      updates.tokenVersion = { $cond: [
        { $ne: ['$accessAllowed', { $literal: fields.accessAllowed }] },
        { $add: [{ $ifNull: ['$tokenVersion', 0] }, 1] },
        { $ifNull: ['$tokenVersion', 0] }
      ] };
    }
    const result = await collection.updateOne(query, [{ $set: updates }]);
    if (!result.matchedCount) return res.status(404).json({ message: 'Student not found' });
    res.status(200).json(result);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Username or email already exists' });
    logError("Update student error:", error);
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
    logError("Delete student error:", error);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

// ==================== AUTHENTICATION ====================

router.post("/login", studentLoginLimit, participantLogin('student'));

// ==================== USER PROFILE & RESOURCES ====================

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'students') return res.status(403).json({ message: 'Student access required' });
    const collection = await getCollection("students");
    const user = await collection.findOne(
      { _id: req.dbUser._id },
      { projection: { password: 0, passwordResetHash: 0, passwordResetExpiresAt: 0, tokenVersion: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.currentSemester = user.semester || 'Not specified';
    user.registrationMonth = getRegistrationMonth(user.createdAt);

    res.json(user);
  } catch (error) {
    logError("Get profile error:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Generic function to get user-specific content
const getUserSpecificContent = async (collectionName, req) => {
  const collection = await getCollection(collectionName);
  return await collection.find(contentVisibility(req.dbUser)).toArray();
};

router.get("/my-resources", authenticateToken, async (req, res) => {
  try {
    const resources = await getUserSpecificContent("resources", req);
    res.json(resources);
  } catch (error) {
    logError("Get resources error:", error);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

router.get("/my-assignments", authenticateToken, async (req, res) => {
  try {
    const assignments = await getUserSpecificContent("assignments", req);
    res.json(assignments);
  } catch (error) {
    logError("Get assignments error:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

router.get("/my-tasks", authenticateToken, async (req, res) => {
  try {
    const tasks = await getUserSpecificContent("tasks", req);
    res.json(tasks);
  } catch (error) {
    logError("Get tasks error:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.get("/my-projects", authenticateToken, async (req, res) => {
  try {
    const projects = await getUserSpecificContent("projects", req);
    res.json(projects);
  } catch (error) {
    logError("Get projects error:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// ==================== STATISTICS & DASHBOARD ====================

// Basic counts
router.get('/total-students', authenticateAdmin, async (req, res) => {
  try {
    const collection = await getCollection("students");
    const total = await collection.countDocuments({});
    res.json({ total });
  } catch (error) {
    logError("Get total students error:", error);
    res.status(500).json({ error: "Failed to fetch total students" });
  }
});

router.get("/total-by-program/:programName", authenticateAdmin, async (req, res) => {
  try {
    const { programName } = req.params;
    const collection = await getCollection("students");
    
    const total = await collection.countDocuments({
      program: { $regex: exactCaseInsensitive(programName) }
    });

    res.json({
      program: programName,
      total,
      message: `Total students in ${programName} program retrieved successfully`
    });
  } catch (error) {
    logError("Get total by program error:", error);
    res.status(500).json({ error: "Failed to fetch students count by program" });
  }
});

router.get("/total-by-track/:trackName", authenticateAdmin, async (req, res) => {
  try {
    const { trackName } = req.params;
    const collection = await getCollection("students");
    
    const total = await collection.countDocuments({
      track: { $regex: exactCaseInsensitive(trackName) }
    });
    
    res.json({
      track: trackName,
      total,
      message: `Total students in ${trackName} track retrieved successfully`
    });
  } catch (error) {
    logError("Get total by track error:", error);
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

router.get("/totals-by-programs", authenticateAdmin, async (req, res) => {
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
    logError("Get program totals error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard program totals" });
  }
});

router.get("/totals-by-tracks", authenticateAdmin, async (req, res) => {
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
    logError("Get track totals error:", error);
    res.status(500).json({ error: "Failed to fetch track totals" });
  }
});

// Predefined statistics
router.get("/totals-by-predefined-programs", authenticateAdmin, async (req, res) => {
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
    logError("Get predefined programs error:", error);
    res.status(500).json({ error: "Failed to fetch predefined program totals" });
  }
});

router.get("/totals-by-predefined-tracks", authenticateAdmin, async (req, res) => {
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
    logError("Get predefined tracks error:", error);
    res.status(500).json({ error: "Failed to fetch predefined track totals" });
  }
});

// Detailed breakdown
router.get("/detailed-breakdown", authenticateAdmin, async (req, res) => {
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
    logError("Get detailed breakdown error:", error);
    res.status(500).json({ error: "Failed to fetch detailed breakdown" });
  }
});

// Summary statistics
router.get("/summary-statistics", authenticateAdmin, async (req, res) => {
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
    logError("Get summary statistics error:", error);
    res.status(500).json({ error: "Failed to fetch summary statistics" });
  }
});

// Missing data stats
router.get("/missing-data-stats", authenticateAdmin, async (req, res) => {
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
    logError("Get missing data stats error:", error);
    res.status(500).json({ error: "Failed to fetch missing data statistics" });
  }
});

// Program-specific distributions
const getProgramTracksDistribution = async (programName) => {
  const collection = await getCollection("students");
  
  const tracks = await collection.aggregate([
    {
      $match: {
        program: { $regex: exactCaseInsensitive(programName) },
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

router.get("/mentorship-tracks-distribution", authenticateAdmin, async (req, res) => {
  try {
    const tracks = await getProgramTracksDistribution("Mentorship Program");
    
    res.json({
      tracks,
      message: "Mentorship tracks distribution retrieved successfully"
    });
  } catch (error) {
    logError("Get mentorship tracks error:", error);
    res.status(500).json({ error: "Failed to fetch mentorship tracks distribution" });
  }
});

router.get("/internship-tracks-distribution", authenticateAdmin, async (req, res) => {
  try {
    const tracks = await getProgramTracksDistribution("Internship Program");
    
    res.json({
      tracks,
      message: "Internship tracks distribution retrieved successfully"
    });
  } catch (error) {
    logError("Get internship tracks error:", error);
    res.status(500).json({ error: "Failed to fetch internship tracks distribution" });
  }
});

// ==================== DEBUG ENDPOINTS ====================

router.use(['/debug-user', '/debug-programs', '/test-auth', '/test-create-student'], (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default router;
