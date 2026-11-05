import { logError } from '../utils/logError.mjs';
import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import { participantLogin } from '../controllers/auth.mjs';
import { mentorsByTrack } from '../controllers/mentorMetrics.mjs';
import { mentorLoginLimit } from '../middleware/authRateLimit.mjs';
import { authenticateAdmin } from '../middleware/auth.js';
 // Add this import
const router = express.Router();


router.get("/", authenticateAdmin, async (req, res) => {
  res.setHeader('X-Frame-Options', 'DENY');
  try {
    const database = await db();
    let collection = database.collection("mentors");
    let results = await collection.find({}, { projection: { password: 0, passwordResetHash: 0, passwordResetExpiresAt: 0, tokenVersion: 0 } }).toArray();
    res.status(200).send(results);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch Mentors"
    });
  }
});

// Create mentor (you might want to protect this too)
router.post("/onboardmentor", authenticateAdmin, async(req, res) => {
  try {
    const { name, surname, email, cellnumber, username, password } = req.body;

    // Validate required fields
    if (![name, surname, email, cellnumber, username, password].every(value => typeof value === 'string' && value.trim()) || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        message: "All fields (name, surname, email, cellnumber, username, password) are required"
      });
    }

    const database = await db();
    const collection = database.collection("mentors");

    const newDocument = {
      name: name.trim(),
      surname: surname.trim(),
      email: email.trim().toLowerCase(),
      cellnumber: cellnumber.trim(),
      username: username.trim(),
      password: await bcrypt.hash(password, 12),
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
    if (error.code === 11000) return res.status(409).json({ message: 'Username or email already exists' });
    logError("Error creating mentor:", error);
    res.status(500).json({
      message: "Internal server error during mentor creation"
    });
  }
});

// Update mentor - PROTECTED
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { name, surname, email, cellnumber, username, password } = req.body;
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });

    // Validate required fields
    if (![name, surname, email, cellnumber, username].every(value => typeof value === 'string' && value.trim()) || (password && (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72))) {
      return res.status(400).json({
        message: "All fields (name, surname, email, cellnumber, username, password) are required"
      });
    }

    const query = { _id: new ObjectId(req.params.id) };
    const updates = {
      $set: {
        name: name.trim(),
        surname: surname.trim(),
        email: email.trim().toLowerCase(),
        cellnumber: cellnumber.trim(),
        username: username.trim(),
        ...(password ? { password: await bcrypt.hash(password, 12) } : {})
      },
      ...(password ? { $inc: { tokenVersion: 1 }, $unset: { passwordResetHash: '', passwordResetExpiresAt: '' } } : {})
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
    if (error.code === 11000) return res.status(409).json({ message: 'Username or email already exists' });
    logError("Error updating mentor:", error);
    res.status(500).json({
      message: "Internal server error during mentor update"
    });
  }
});

// Delete mentor - PROTECTED
router.delete("/:id", authenticateAdmin, async(req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  try {
    const database = await db();
    const result = await database.collection("mentors").deleteOne({ _id: new ObjectId(req.params.id) });
    if (!result.deletedCount) return res.status(404).json({ message: 'Mentor not found' });
    res.status(200).send(result);
  } catch (error) {
    logError('Error deleting mentor:', error);
    res.status(500).json({ message: 'Failed to delete mentor' });
  }
});

// GET total mentors - PUBLIC (for dashboard)
router.get("/total-mentors", authenticateAdmin, async (req, res) => {
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
    logError("Error fetching total mentors:", error);
    res.status(500).json({
      error: "Failed to fetch total mentors count"
    });
  }
});

// Count distinct active mentors by the tracks of their assigned students.
router.get('/mentors-by-track', authenticateAdmin, mentorsByTrack);

// Mentor login shares the authentication controller and service.
router.post('/login', mentorLoginLimit, participantLogin('mentor'));

export default router;
