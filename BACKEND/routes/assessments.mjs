import { logError } from '../utils/logError.mjs';
import express from "express";
import getDatabase from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import { authenticateAdmin, authenticateToken } from "../middleware/auth.js";
import { exactCaseInsensitive } from '../utils/exactMatch.mjs';
import { contentVisibility as visibility } from '../utils/contentVisibility.mjs';
import * as files from '../services/fileStorage.mjs';

const router = express.Router();

/**
 * ROBUSTNESS MIDDLEWARE
 * This ensures that 'req.db' is available for every route below.
 */
router.use(async (req, res, next) => {
    try {
        req.db = await getDatabase();
        next();
    } catch (error) {
        logError("Database Injection Middleware Error:", error);
        res.status(503).json({ error: "Database connection unavailable" });
    }
});

// GET / - Basic info endpoint
router.get("/info", (req, res) => {
  res.json({
    message: "OnTrack Connect Assessments API",
    version: "1.0.0",
    endpoints: {
      "GET /": "Fetch assessments with filters",
      "GET /total": "Get total assessments count",
      "GET /totals-by-program": "Get assessment totals by program",
      "GET /totals-by-type": "Get assessment totals by type",
      "GET /tasks": "Get tasks (authenticated)",
      "POST /": "Create assessment (authenticated)",
    },
    timestamp: new Date().toISOString()
  });
});

/* ========================= HELPERS ========================= */

const userTypeQuery = (type, user) => ({
    assessmenttype: { $regex: new RegExp(`^${type}$`, "i") },
    ...visibility(user)
});
const assessmentFields = ['assessmentname', 'assessmenttype', 'program', 'track', 'dateadded', 'datedue'];

function validAssessmentFields(body, partial = false) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
    return assessmentFields.every(field => {
        if (partial && body[field] === undefined) return true;
        return typeof body[field] === 'string' && body[field].trim().length > 0 && body[field].length <= 1000;
    });
}

/* ========================= CRUD ========================= */

router.get("/", authenticateToken, async (req, res) => {
    try {
        const { program, track } = req.query;
        const query = {};

        if (program) query.program = { $regex: exactCaseInsensitive(program) };
        if (track) query.track = { $regex: exactCaseInsensitive(track) };
        if (req.userType !== 'admins') Object.assign(query, visibility(req.dbUser));

        const results = await req.db.collection("assessments").find(query).toArray();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch assessments" });
    }
});

router.post("/", authenticateToken, files.parseDocument, async (req, res) => {
    if (!validAssessmentFields(req.body)) return res.status(400).json({ message: 'All assessment fields must contain valid text' });
    let uploaded;
    try {
        const doc = {
            assessmentname: req.body.assessmentname.trim(),
            assessmenttype: req.body.assessmenttype.trim().toLowerCase(),
            program: req.body.program.trim(),
            track: req.body.track.trim(),
            dateadded: req.body.dateadded.trim(),
            datedue: req.body.datedue.trim(),
            createdAt: new Date()
        };

        if (req.file) {
            uploaded = await files.store(req.db, req.file);
            doc.document = uploaded;
        }

        const result = await req.db.collection("assessments").insertOne(doc);
        res.status(201).json({ message: "Assessment created", id: result.insertedId });
    } catch (error) {
        if (uploaded) await files.remove(req.db, uploaded).catch(() => {});
        res.status(500).json({ error: "Failed to create assessment" });
    }
});

router.patch("/:id", authenticateToken, files.parseDocument, async (req, res) => {
    if (!validAssessmentFields(req.body, true)) return res.status(400).json({ message: 'Invalid assessment fields' });
    let uploaded;
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const collection = req.db.collection("assessments");
        const current = await collection.findOne({ _id: new ObjectId(req.params.id) });

        if (!current) {
            return res.status(404).json({ error: "Assessment not found" });
        }

        const update = { updatedAt: new Date() };
        if (req.body.assessmentname !== undefined) update.assessmentname = req.body.assessmentname.trim();
        if (req.body.assessmenttype !== undefined) update.assessmenttype = req.body.assessmenttype?.toLowerCase().trim();
        if (req.body.program !== undefined) update.program = req.body.program.trim();
        if (req.body.track !== undefined) update.track = req.body.track.trim();
        if (req.body.dateadded !== undefined) update.dateadded = req.body.dateadded.trim();
        if (req.body.datedue !== undefined) update.datedue = req.body.datedue.trim();

        if (req.file) {
            uploaded = await files.store(req.db, req.file);
            update.document = uploaded;
        }

        await collection.updateOne({ _id: current._id }, { $set: update });
        if (uploaded && current.document) await files.remove(req.db, current.document).catch(() => console.error('Failed to remove replaced file'));
        res.json({ message: "Assessment updated" });
    } catch (error) {
        if (uploaded) await files.remove(req.db, uploaded).catch(() => {});
        res.status(500).json({ error: "Failed to update assessment" });
    }
});

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const collection = req.db.collection("assessments");
        const assessment = await collection.findOne({ _id: new ObjectId(req.params.id) });

        if (!assessment) {
            return res.status(404).json({ error: "Assessment not found" });
        }

        await collection.deleteOne({ _id: assessment._id });
        if (assessment.document) await files.remove(req.db, assessment.document).catch(() => console.error('Failed to remove deleted file'));
        res.json({ message: "Assessment deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete assessment" });
    }
});

/* ========================= USER QUERIES ========================= */

router.get("/tasks", authenticateToken, async (req, res) => {
  try {
    const tasks = await req.db.collection("assessments")
      .find(userTypeQuery("task", req.dbUser))
      .sort({ datedue: 1 })
      .toArray();

    const tasksWithLinks = tasks.map(task => ({
      ...task,
      documentLink: task.document?.relativePath || null,
      name: task.assessmentname || null,
      description: task.description || null
    }));

    res.json(tasksWithLinks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.get("/modules", authenticateToken, async (req, res) => {
  try {
    const results = await req.db.collection("assessments")
      .find(userTypeQuery("module", req.dbUser))
      .toArray();

    res.json(results.map(m => ({ ...m, documentLink: m.document?.relativePath || null })));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

router.get("/assignments", authenticateToken, async (req, res) => {
  try {
    const results = await req.db.collection("assessments")
      .find(userTypeQuery("assignment", req.dbUser))
      .toArray();
    res.json(results.map(m => ({ ...m, documentLink: m.document?.relativePath || null })));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

router.get("/projects", authenticateToken, async (req, res) => {
  try {
    const results = await req.db.collection("assessments")
      .find(userTypeQuery("project", req.dbUser))
      .toArray();
    res.json(results.map(m => ({ ...m, documentLink: m.document?.relativePath || null })));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.get("/resources", authenticateToken, async (req, res) => {
  try {
    const results = await req.db.collection("assessments")
      .find(userTypeQuery("resource", req.dbUser))
      .toArray();
    const managedResources = await req.db.collection('resources').find(visibility(req.dbUser)).toArray();
    let mentorResources = [];
    if (req.userType === 'students' && ObjectId.isValid(req.dbUser._id)) {
      const assignments = await req.db.collection('mentor_assignments').find({ studentId: new ObjectId(req.dbUser._id), status: 'active' }).toArray();
      const mentorIds = assignments.map(item => item.mentorId.toString());
      mentorResources = await req.db.collection('mentor_resources').find({ mentorId: { $in: mentorIds } }).toArray();
    }
    res.json([
      ...results.map(m => ({ ...m, documentLink: m.document?.relativePath || null })),
      ...managedResources.map(item => ({
        _id: item._id, assessmentname: item.name, description: item.description,
        program: item.program, track: item.track, websiteLink: item.websiteLink,
        createdAt: item.createdAt, documentLink: item.document?.relativePath || null
      })),
      ...mentorResources.map(item => ({ _id: item._id, assessmentname: item.title, description: item.description, createdAt: item.createdAt, documentLink: item.document?.relativePath || null }))
    ]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

router.get("/welcome", async (req, res) => {
    res.json({ message: "Welcome to the OnTrack Connect API Service!" });
});

/* ========================= DASHBOARD ENDPOINTS ========================= */

router.get("/total", authenticateAdmin, async (req, res) => {
  try {
    const total = await req.db.collection("assessments").countDocuments({});
    res.status(200).json({ total, message: "Total assessments retrieved successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch total assessments" });
  }
});

router.get("/totals-by-program", authenticateAdmin, async (req, res) => {
  try {
    const pipeline = [
      { $match: { program: { $exists: true, $ne: "" } } },
      { $group: { _id: "$program", count: { $sum: 1 } } },
      { $project: { program: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ];

    const results = await req.db.collection("assessments").aggregate(pipeline).toArray();
    const totals = {};
    results.forEach(item => totals[item.program] = item.count);

    res.status(200).json({ totals, message: "Assessment totals by program retrieved successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assessment totals by program" });
  }
});

router.get("/totals-by-type", authenticateAdmin, async (req, res) => {
  try {
    const pipeline = [
      { $match: { assessmenttype: { $exists: true, $ne: "" } } },
      { $group: { _id: "$assessmenttype", count: { $sum: 1 } } },
      { $project: { type: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ];

    const results = await req.db.collection("assessments").aggregate(pipeline).toArray();
    const totals = {};
    results.forEach(item => totals[item.type] = item.count);

    res.status(200).json({ totals, message: "Assessment totals by type retrieved successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assessment totals by type" });
  }
});

// Files are served by the authenticated /api/files route.

export default router;
