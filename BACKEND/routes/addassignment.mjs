import { logError } from '../utils/logError.mjs';
import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import { contentVisibility } from '../utils/contentVisibility.mjs';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use((req,res,next) =>{
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
    next();
});

// Get user-specific assignments based on program and track
router.get("/my-assignments", authenticateToken, async (req, res) => {
  try {
    const assignmentsCollection = (await db()).collection("assessments");
    const assignments = await assignmentsCollection.find(contentVisibility(req.dbUser)).toArray();

    res.json(assignments);
  } catch (error) {
    logError("Error fetching user assignments:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// GET all assignments with optional filtering
router.get("/", authenticateAdmin, async (req, res) => {
    try {
        let collection = (await db()).collection("assessments");
        let query = {};

        if (req.query.program) {
            query.program = req.query.program;
        }
        if (req.query.track) {
            query.track = req.query.track;
        }

        let results = await collection.find(query).toArray();
        res.status(200).json(results);
    } catch (error) {
        logError("Error fetching assignments:", error);
        res.status(500).json({ error: "Failed to fetch assignments" });
    }
});

// POST create new assignment
router.post("/", authenticateAdmin, async (req, res) => {
    try {
        // Validate required fields are not blank
        const requiredFields = ['assignmentname', 'assignmenttype', 'dateadded', 'datedue', 'track', 'program'];
        const validationErrors = [];

        requiredFields.forEach(field => {
            if (req.body[field] === undefined || req.body[field] === null ||
                (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
                validationErrors.push(`${field} cannot be blank`);
            }
        });

        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationErrors
            });
        }

        let newDocument = {
            assignmentname: req.body.assignmentname.trim(),
            assignmenttype: req.body.assignmenttype.trim(),
            dateadded: req.body.dateadded.trim(),
            datedue: req.body.datedue.trim(),
            track: req.body.track.trim(),
            program: req.body.program.trim(),
            description: req.body.description ? req.body.description.trim() : '',
            createdAt: new Date()
        };

        let collection = (await db()).collection("assessments");
        let result = await collection.insertOne(newDocument);

        res.status(201).json({
            message: "Assignment created successfully",
            id: result.insertedId,
            document: newDocument
        });
    } catch (error) {
        logError("Error creating assignment:", error);
        res.status(500).json({ error: "Failed to create assignment" });
    }
});

// PUT update assignment
router.put("/:id", authenticateAdmin, async (req, res) => {
    try {
        const id = req.params.id;

        // Validate required fields are not blank
        const requiredFields = ['assignmentname', 'assignmenttype', 'dateadded', 'datedue', 'track', 'program'];
        const validationErrors = [];

        requiredFields.forEach(field => {
            if (req.body[field] === undefined || req.body[field] === null ||
                (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
                validationErrors.push(`${field} cannot be blank`);
            }
        });

        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationErrors
            });
        }

        let updateDocument = {
            assignmentname: req.body.assignmentname.trim(),
            assignmenttype: req.body.assignmenttype.trim(),
            dateadded: req.body.dateadded.trim(),
            datedue: req.body.datedue.trim(),
            track: req.body.track.trim(),
            program: req.body.program.trim(),
            description: req.body.description ? req.body.description.trim() : '',
            updatedAt: new Date()
        };

        let collection = (await db()).collection("assessments");
        let result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateDocument }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Assignment not found" });
        }

        res.status(200).json({
            message: "Assignment updated successfully",
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        logError("Error updating assignment:", error);
        res.status(500).json({ error: "Failed to update assignment" });
    }
});

// DELETE assignment
router.delete("/:id", authenticateAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        let collection = (await db()).collection("assessments");

        let result = await collection.deleteOne({ _id: new ObjectId(id) });

        res.status(200).json({
            message: "Assignment deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        logError("Error deleting assignment:", error);
        res.status(500).json({ error: "Failed to delete assignment" });
    }
});

// GET total assignments count
router.get("/total", authenticateAdmin, async (req, res) => {
    try {
        let collection = (await db()).collection("assessments");
        let total = await collection.countDocuments();
        res.status(200).json({ total });
    } catch (error) {
        logError("Error fetching total assignments:", error);
        res.status(500).json({ error: "Failed to fetch total assignments" });
    }
});

export default router;
