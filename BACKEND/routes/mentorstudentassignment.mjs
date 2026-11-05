import { logError } from '../utils/logError.mjs';
import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET all assignments (Admin/Mentor view)
router.get("/all", authenticateAdmin, async (req, res) => {
  try {
    const database = await db();
    const assignmentsCollection = database.collection("mentor_assignments");
    
    const assignments = await assignmentsCollection.aggregate([
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      {
        $unwind: { path: "$student", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: "mentors",
          localField: "mentorId",
          foreignField: "_id",
          as: "mentor"
        }
      },
      {
        $unwind: { path: "$mentor", preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          status: 1,
          student: {
            _id: "$student._id",
            name: "$student.name",
            surname: "$student.surname",
            email: "$student.email"
          },
          mentor: {
            _id: "$mentor._id",
            name: "$mentor.name",
            surname: "$mentor.surname",
            email: "$mentor.email"
          }
        }
      }
    ]).toArray();

    res.status(200).json({ assignments });
  } catch (error) {
    logError("Error fetching assignments:", error);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
});

// Create assignments (Bulk)
router.post("/student", authenticateAdmin, async (req, res) => {
  try {
    const { mentorIds, studentIds } = req.body;

    if (!mentorIds || !studentIds || !Array.isArray(mentorIds) || !Array.isArray(studentIds)) {
      return res.status(400).json({ error: "Invalid input. mentorIds and studentIds must be arrays." });
    }
    if (!mentorIds.length || !studentIds.length || mentorIds.length * studentIds.length > 1000) {
      return res.status(400).json({ error: 'Select at least one mentor and student, with no more than 1,000 assignments per request.' });
    }

    const database = await db();
    const assignmentsCollection = database.collection("mentor_assignments");

    const results = {
      successful: [],
      alreadyAssigned: [],
      errors: []
    };

    for (const mentorId of mentorIds) {
      for (const studentId of studentIds) {
        try {
          const mId = new ObjectId(mentorId);
          const sId = new ObjectId(studentId);

          const [mentor, student] = await Promise.all([
            database.collection('mentors').findOne({ _id: mId, isActive: { $ne: false }, accessAllowed: { $ne: 'denied' } }, { projection: { _id: 1 } }),
            database.collection('students').findOne({ _id: sId, isActive: { $ne: false }, accessAllowed: 'granted' }, { projection: { _id: 1 } })
          ]);
          if (!mentor || !student) {
            results.errors.push({ mentorId, studentId, error: 'Mentor or student is unavailable' });
            continue;
          }

          // Check if assignment exists
          const existing = await assignmentsCollection.findOne({
            mentorId: mId,
            studentId: sId
          });

          if (existing) {
            results.alreadyAssigned.push({ mentorId, studentId });
            continue;
          }

          // Create assignment
          const assignment = {
            mentorId: mId,
            studentId: sId,
            status: "active",
            createdAt: new Date()
          };

          const result = await assignmentsCollection.insertOne(assignment);
          results.successful.push({ _id: result.insertedId, mentorId, studentId });

        } catch (err) {
          if (err.code === 11000) results.alreadyAssigned.push({ mentorId, studentId });
          else results.errors.push({ mentorId, studentId, error: 'Unable to create assignment' });
        }
      }
    }

    res.status(200).json({ 
      message: "Assignment process completed", 
      results 
    });

  } catch (error) {
    logError("Error creating assignments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete assignment
router.delete("/student/:id", authenticateAdmin, async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const database = await db();
    const collection = database.collection("mentor_assignments");
    const result = await collection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    logError("Error deleting assignment:", error);
    res.status(500).json({ message: "Failed to delete assignment" });
  }
});

// Get active count (for dashboard)
router.get("/active-count", authenticateAdmin, async (req, res) => {
  try {
    const database = await db();
    const collection = database.collection("mentor_assignments");
    const result = await collection.aggregate([
      { $match: { status: 'active' } },
      { $lookup: { from: 'mentors', localField: 'mentorId', foreignField: '_id', as: 'mentor' } },
      { $unwind: '$mentor' },
      { $match: { 'mentor.isActive': { $ne: false }, 'mentor.accessAllowed': { $ne: 'denied' } } },
      { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $match: { 'student.isActive': { $ne: false }, 'student.accessAllowed': 'granted' } },
      { $count: 'count' }
    ]).toArray();
    const count = result[0]?.count || 0;
    res.status(200).json({ count });
  } catch (error) {
    logError("Error fetching active count:", error);
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

// Get student's mentor (for user dashboard)
router.get("/student", authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'students') return res.status(403).json({ error: 'Student access required' });
    const studentId = new ObjectId(req.dbUser._id);
    const database = await db();
    const collection = database.collection("mentor_assignments");
    
    const assignments = await collection.aggregate([
      { $match: { studentId: studentId, status: "active" } },
      {
        $lookup: {
          from: "mentors",
          localField: "mentorId",
          foreignField: "_id",
          as: "mentor"
        }
      },
      { $unwind: "$mentor" },
      { $match: { 'mentor.isActive': { $ne: false }, 'mentor.accessAllowed': { $ne: 'denied' } } },
      {
        $project: {
          "mentor.name": 1,
          "mentor.surname": 1,
          "mentor.email": 1
        }
      }
    ]).toArray();
    
    res.status(200).json({ assignments });
  } catch (error) {
    logError("Error fetching student mentor:", error);
    res.status(500).json({ error: "Failed to fetch mentor" });
  }
});

export default router;
