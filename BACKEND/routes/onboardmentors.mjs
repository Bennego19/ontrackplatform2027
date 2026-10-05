import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ExpressBrute from "express-brute";
 // Add this import
var store = new ExpressBrute.MemoryStore();
var bruteforce = new ExpressBrute(store);
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024';

// Add authentication middleware (SAME as in onboardstudents.mjs)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// GET all mentors - PUBLIC for mentor assignment page
router.get("/", async (req, res) => {
  res.setHeader('X-Frame-Options', 'DENY');
  try {
    const database = await db();
    let collection = database.collection("mentors");
    let results = await collection.find({}).toArray();
    res.status(200).send(results);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch Mentors"
    });
  }
});

// Create mentor (you might want to protect this too)
router.post("/onboardmentor",bruteforce.prevent, async(req, res) => {
  try {
    const { name, surname, email, cellnumber, username, password } = req.body;

    // Validate required fields
    if (!name || !surname || !email || !cellnumber || !username || !password) {
      return res.status(400).json({
        message: "All fields (name, surname, email, cellnumber, username, password) are required"
      });
    }

    const database = await db();
    const collection = database.collection("mentors");

    const newDocument = {
      name: name.trim(),
      surname: surname.trim(),
      email: email.trim(),
      cellnumber: cellnumber.trim(),
      username: username.trim(),
      password: password.trim(), // Change to hashedPassword when using bcrypt
      createdAt: new Date(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null,
    };

    let result = await collection.insertOne(newDocument);
    res.status(201).json({ // Changed from 204 to 201 for created
      success: true,
      message: "Mentor created successfully",
      mentorId: result.insertedId
    });
  } catch (error) {
    console.error("Error creating mentor:", error);
    res.status(500).json({
      message: "Internal server error during mentor creation"
    });
  }
});

// Update mentor - PROTECTED
router.patch("/:id",bruteforce.prevent, authenticateToken, async (req, res) => {
  try {
    const { name, surname, email, cellnumber, username, password } = req.body;

    // Validate required fields
    if (!name || !surname || !email || !cellnumber || !username || !password) {
      return res.status(400).json({
        message: "All fields (name, surname, email, cellnumber, username, password) are required"
      });
    }

    const query = { _id: new ObjectId(req.params.id) };
    const updates = {
      $set: {
        name: name.trim(),
        surname: surname.trim(),
        email: email.trim(),
        cellnumber: cellnumber.trim(),
        username: username.trim(),
        password: password.trim()
      },
    };

    const database = await db();
    const collection = database.collection("mentors");
    let result = await collection.updateOne(query, updates);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Mentor not found" });
    }

    res.status(200).json({
      success: true,
      message: "Mentor updated successfully",
      result
    });
  } catch (error) {
    console.error("Error updating mentor:", error);
    res.status(500).json({
      message: "Internal server error during mentor update"
    });
  }
});

// Delete mentor - PROTECTED
router.delete("/:id",bruteforce.prevent, authenticateToken, async(req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const database = await db();
  const collection = database.collection("mentors");
  let result = await collection.deleteOne(query);
  res.status(200).send(result);
});

// GET total mentors - PUBLIC (for dashboard)
router.get("/total-mentors",bruteforce.prevent, async (req, res) => {
  res.setHeader('X-Frame-Options', 'DENY');
  try {
    const database = await db();
    let collection = database.collection("mentors");
    const totalMentors = await collection.countDocuments({});

    res.status(200).json({
      total: totalMentors,
      message: "Total mentors retrieved successfully"
    });
  } catch (error) {
    console.error("Error fetching total mentors:", error);
    res.status(500).json({
      error: "Failed to fetch total mentors count"
    });
  }
});

// GET mentors by track - PUBLIC (for dashboard)
router.get("/mentors-by-track",bruteforce.prevent, async (req, res) => {
  res.setHeader('X-Frame-Options', 'DENY');
  try {
    // Try to get from mentor_assignments collection first
    try {
      const database = await db();
      const assignmentsCollection = database.collection("mentor_assignments");

      // Get all active assignments
      const assignments = await assignmentsCollection.find({ status: "active" }).toArray();

      // Count mentors by track
      const mentorsByTrack = {};
      assignments.forEach(assignment => {
        const track = assignment.track;
        if (!mentorsByTrack[track]) {
          mentorsByTrack[track] = 0;
        }
        mentorsByTrack[track] += 1;
      });

      // If we have data from assignments, return it
      if (Object.keys(mentorsByTrack).length > 0) {
        return res.status(200).json({
          mentorsByTrack: mentorsByTrack,
          message: "Mentors by track retrieved successfully"
        });
      }
    } catch (assignmentsError) {
      console.log("No mentor_assignments collection found, trying fallback");
    }

    // Fallback: Try to get from mentors collection with track field
    try {
      const database = await db();
      const mentorsCollection = database.collection("mentors");

      // Check if mentors have a track field
      const mentorsWithTracks = await mentorsCollection.find({
        track: { $exists: true, $ne: null, $ne: "" }
      }).toArray();

      if (mentorsWithTracks.length > 0) {
        const mentorsByTrack = {};
        mentorsWithTracks.forEach(mentor => {
          const track = mentor.track.trim();
          if (!mentorsByTrack[track]) {
            mentorsByTrack[track] = 0;
          }
          mentorsByTrack[track] += 1;
        });

        return res.status(200).json({
          mentorsByTrack: mentorsByTrack,
          message: "Mentors by track retrieved from mentors collection"
        });
      }
    } catch (mentorsError) {
      console.log("Error querying mentors collection:", mentorsError.message);
    }

    // Final fallback: Distribute mentors evenly across common tracks
    const database = await db();
    const totalMentors = await database.collection("mentors").countDocuments({});
    if (totalMentors > 0) {
      const commonTracks = ["Web Development", "Java Programming", "C# Programming", "Python Programming"];
      const mentorsPerTrack = Math.max(1, Math.floor(totalMentors / commonTracks.length));

      const mentorsByTrack = {};
      commonTracks.forEach(track => {
        mentorsByTrack[track] = mentorsPerTrack;
      });

      return res.status(200).json({
        mentorsByTrack: mentorsByTrack,
        message: "Mentors distributed across common tracks (estimated)"
      });
    }

    // Ultimate fallback: Return empty data
    res.status(200).json({
      mentorsByTrack: {},
      message: "No mentor track data available"
    });

  } catch (error) {
    console.error("Error fetching mentors by track:", error);
    res.status(500).json({
      error: "Failed to fetch mentors by track"
    });
  }
});

// ADD THIS: Login route for mentors (similar to students)
router.post("/login",bruteforce.prevent, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required"
      });
    }

    const database = await db();
    const collection = database.collection("mentors");
    const mentor = await collection.findOne({ username: username.trim() });

    if (!mentor) {
      return res.status(401).json({
        message: "Invalid username or password"
      });
    }

    // For now, using plain text comparison. Replace with bcrypt later:
    const isValidPassword = password === mentor.password;

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Invalid username or password"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: mentor._id, 
        username: mentor.username,
        email: mentor.email,
        role: 'mentor' // Add role for authorization
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    await collection.updateOne(
      { _id: mentor._id },
      { $set: { lastLogin: new Date() } }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      mentor: {
        id: mentor._id,
        name: mentor.name,
        surname: mentor.surname,
        email: mentor.email,
        username: mentor.username
      }
    });

  } catch (error) {
    console.error("Mentor login error:", error);
    res.status(500).json({
      message: "Internal server error during login"
    });
  }
});

export default router;