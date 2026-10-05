import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ExpressBrute from "express-brute";
const router = express.Router();
var store = new ExpressBrute.MemoryStore();
var bruteforce = new ExpressBrute(store);
// Get all mentors with their assigned students
router.get("/",bruteforce.prevent, async (req, res) => {
    const database = await db();
    let collection = database.collection("mentors");
    let results = await collection.find({}).toArray();
    res.status(200).json(results);
});

// Get a specific mentor with their students
router.get("/:id",bruteforce.prevent, async (req, res) => {
    try {
        const database = await db();
        let collection = database.collection("mentors");
        let query = { _id: new ObjectId(req.params.id) };
        let result = await collection.findOne(query);
        
        if (!result) {
            return res.status(404).json({ message: "Mentor not found" });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mentor signup
router.post("/signup",bruteforce.prevent, async(req, res) => {
    try {
        const database = await db();
        let collection = database.collection("mentors");
        
        // Check if mentor already exists
        const existingMentor = await collection.findOne({ 
            $or: [{ username: req.body.username }, { email: req.body.email }] 
        });

        if (existingMentor) {
            return res.status(409).json({ message: "Mentor with this username or email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        let newDocument = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            cellnumber: req.body.cellnumber,
            cohort: req.body.cohort,
            track: req.body.track,
            username: req.body.username,
            password: hashedPassword,
            program: req.body.program,
            students: [], // Initialize empty students array
            maxStudents: req.body.maxStudents || 5, // Default max students
            createdAt: new Date()
        };

        let result = await collection.insertOne(newDocument);
        
        res.status(201).json({
            message: "Mentor created successfully",
            mentorId: result.insertedId
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Assign student to mentor
router.post("/:mentorId/assign-student",bruteforce.prevent, async (req, res) => {
    try {
        const mentorId = new ObjectId(req.params.mentorId);
        const { studentId, studentName, studentEmail, studentCohort } = req.body;

        // Validate required fields
        if (!studentId || !studentName) {
            return res.status(400).json({ 
                message: "Student ID and name are required" 
            });
        }

        const database = await db();
        const mentorsCollection = database.collection("mentors");
        
        // Check if mentor exists
        const mentor = await mentorsCollection.findOne({ _id: mentorId });
        if (!mentor) {
            return res.status(404).json({ message: "Mentor not found" });
        }

        // Check if mentor has reached maximum students
        if (mentor.students && mentor.students.length >= (mentor.maxStudents || 5)) {
            return res.status(400).json({ 
                message: "Mentor has reached maximum student capacity" 
            });
        }

        // Check if student is already assigned to this mentor
        if (mentor.students && mentor.students.some(s => s.studentId === studentId)) {
            return res.status(400).json({ 
                message: "Student is already assigned to this mentor" 
            });
        }

        const studentData = {
            studentId: studentId,
            studentName: studentName,
            studentEmail: studentEmail || "",
            studentCohort: studentCohort || "",
            assignedAt: new Date(),
            status: "active"
        };

        // Add student to mentor's students array
        const result = await mentorsCollection.updateOne(
            { _id: mentorId },
            { 
                $push: { students: studentData },
                $set: { updatedAt: new Date() }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({ message: "Failed to assign student" });
        }

        res.status(200).json({
            message: "Student assigned to mentor successfully",
            student: studentData
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Remove student from mentor
router.delete("/:mentorId/students/:studentId",bruteforce.prevent, async (req, res) => {
    try {
        const mentorId = new ObjectId(req.params.mentorId);
        const studentId = req.params.studentId;

        const database = await db();
        const mentorsCollection = database.collection("mentors");
        
        const result = await mentorsCollection.updateOne(
            { _id: mentorId },
            { 
                $pull: { students: { studentId: studentId } },
                $set: { updatedAt: new Date() }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ 
                message: "Student not found or already removed" 
            });
        }

        res.status(200).json({
            message: "Student removed from mentor successfully"
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all students for a specific mentor
router.get("/:mentorId/students", async (req, res) => {
    try {
        const mentorId = new ObjectId(req.params.mentorId);
        
        const database = await db();
        const mentorsCollection = database.collection("mentors");
        const mentor = await mentorsCollection.findOne(
            { _id: mentorId },
            { projection: { students: 1, firstname: 1, lastname: 1 } }
        );

        if (!mentor) {
            return res.status(404).json({ message: "Mentor not found" });
        }

        res.status(200).json({
            mentor: `${mentor.firstname} ${mentor.lastname}`,
            students: mentor.students || []
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update mentor information
router.patch("/:id",bruteforce.prevent,  async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const updates = {
            $set: {
                ...req.body,
                updatedAt: new Date()
            }
        };

        const database = await db();
        let collection = database.collection("mentors");
        let result = await collection.updateOne(query, updates);
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Mentor not found" });
        }

        res.status(200).json({
            message: "Mentor updated successfully",
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete mentor
router.delete("/:id",bruteforce.prevent, async(req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const database = await db();
        const collection = database.collection("mentors");
        let result = await collection.deleteOne(query);

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Mentor not found" });
        }

        res.status(200).json({
            message: "Mentor deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;