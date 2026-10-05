import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import ExpressBrute from "express-brute";

const router = express.Router();
var store = new ExpressBrute.MemoryStore();
var bruteforce = new ExpressBrute(store);

const JWT_SECRET = process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// GET all assignments (Admin/Mentor view)
router.get("/all", bruteforce.prevent, async (req, res) => {
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
    console.error("Error fetching assignments:", error);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
});

// Create assignments (Bulk)
router.post("/student", bruteforce.prevent, async (req, res) => {
  try {
    const { mentorIds, studentIds } = req.body;

    if (!mentorIds || !studentIds || !Array.isArray(mentorIds) || !Array.isArray(studentIds)) {
      return res.status(400).json({ error: "Invalid input. mentorIds and studentIds must be arrays." });
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
          results.errors.push({ mentorId, studentId, error: err.message });
        }
      }
    }

    res.status(200).json({ 
      message: "Assignment process completed", 
      results 
    });

  } catch (error) {
    console.error("Error creating assignments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete assignment
router.delete("/student/:id", bruteforce.prevent, async (req, res) => {
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
    console.error("Error deleting assignment:", error);
    res.status(500).json({ message: "Failed to delete assignment" });
  }
});

// Get active count (for dashboard)
router.get("/active-count", bruteforce.prevent, async (req, res) => {
  try {
    const database = await db();
    const collection = database.collection("mentor_assignments");
    const count = await collection.countDocuments({ status: "active" });
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error fetching active count:", error);
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

// Get student's mentor (for user dashboard)
router.get("/student", authenticateToken, async (req, res) => {
  try {
    const studentId = new ObjectId(req.user.id);
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
    console.error("Error fetching student mentor:", error);
    res.status(500).json({ error: "Failed to fetch mentor" });
  }
});

export default router;