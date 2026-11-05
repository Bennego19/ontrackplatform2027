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

// Get user-specific tasks based on program and track
router.get("/my-tasks", authenticateToken, async (req, res) => {
  try {
    const tasksCollection = await (await db()).collection("assesments");
    const tasks = await tasksCollection.find(contentVisibility(req.dbUser)).toArray();

    res.json(tasks);
  } catch (error) {
    logError("Error fetching user tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// GET all tasks with optional filtering
router.get("/", authenticateAdmin, async (req, res) => {
    try {
        let collection = await (await db()).collection("assesments");
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
        logError("Error fetching tasks:", error);
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
});

// POST create new task
router.post("/", authenticateAdmin, async (req, res) => {
    try {
        // Validate required fields are not blank
        const requiredFields = ['taskname', 'tasktype', 'dateadded', 'datedue', 'track', 'program'];
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
            taskname: req.body.taskname.trim(),
            tasktype: req.body.tasktype.trim(),
            dateadded: req.body.dateadded.trim(),
            datedue: req.body.datedue.trim(),
            track: req.body.track.trim(),
            program: req.body.program.trim(),
            description: req.body.description ? req.body.description.trim() : '',
            createdAt: new Date()
        };

        let collection = await (await db()).collection("assesments");
        let result = await collection.insertOne(newDocument);

        res.status(201).json({
            message: "Task created successfully",
            id: result.insertedId,
            document: newDocument
        });
    } catch (error) {
        logError("Error creating task:", error);
        res.status(500).json({ error: "Failed to create task" });
    }
});

// PUT update task
router.put("/:id", authenticateAdmin, async (req, res) => {
    try {
        const id = req.params.id;

        // Validate required fields are not blank
        const requiredFields = ['taskname', 'tasktype', 'dateadded', 'datedue', 'track', 'program'];
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
            taskname: req.body.taskname.trim(),
            tasktype: req.body.tasktype.trim(),
            dateadded: req.body.dateadded.trim(),
            datedue: req.body.datedue.trim(),
            track: req.body.track.trim(),
            program: req.body.program.trim(),
            description: req.body.description ? req.body.description.trim() : '',
            updatedAt: new Date()
        };

        let collection = await (await db()).collection("assesments");
        let result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateDocument }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({
            message: "Task updated successfully",
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        logError("Error updating task:", error);
        res.status(500).json({ error: "Failed to update task" });
    }
});

// DELETE task
router.delete("/:id", authenticateAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        let collection = await (await db()).collection("assesments");

        let result = await collection.deleteOne({ _id: new ObjectId(id) });

        res.status(200).json({
            message: "Task deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        logError("Error deleting task:", error);
        res.status(500).json({ error: "Failed to delete task" });
    }
});

// GET total tasks count
router.get("/total", authenticateAdmin, async (req, res) => {
    try {
        let collection = await (await db()).collection("assesments");
        let total = await collection.countDocuments();
        res.status(200).json({ total });
    } catch (error) {
        logError("Error fetching total tasks:", error);
        res.status(500).json({ error: "Failed to fetch total tasks" });
    }
});

export default router;
