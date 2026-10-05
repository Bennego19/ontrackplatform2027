import express from "express";
import getDatabase from "../db/conn.mjs";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { ObjectId } from "mongodb";
import { authenticateToken } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

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
        console.error("Database Injection Middleware Error:", error);
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
    $or: [
        { program: user?.program },
        { track: user?.track },
        { isGeneral: true }
    ]
});

/* ========================= CRUD ========================= */

router.get("/", authenticateToken, async (req, res) => {
    try {
        const { program, track } = req.query;
        const query = {};

        if (program) query.program = { $regex: new RegExp(`^${program}$`, "i") };
        if (track) query.track = { $regex: new RegExp(`^${track}$`, "i") };

        const results = await req.db.collection("assessments").find(query).toArray();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch assessments" });
    }
});

router.post("/", authenticateToken, upload.single("document"), async (req, res) => {
    try {
        const doc = {
            assessmentname: req.body.assessmentname,
            assessmenttype: req.body.assessmenttype?.toLowerCase(),
            program: req.body.program,
            track: req.body.track,
            dateadded: req.body.dateadded,
            datedue: req.body.datedue,
            createdAt: new Date()
        };

        if (req.file) {
            doc.document = {
                fileName: req.file.originalname,
                storedFileName: req.file.filename,
                filePath: req.file.path,
                relativePath: `/uploads/${req.file.filename}`,
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                uploadedAt: new Date()
            };
        }

        const result = await req.db.collection("assessments").insertOne(doc);
        res.status(201).json({ message: "Assessment created", id: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: "Failed to create assessment" });
    }
});

router.patch("/:id", authenticateToken, upload.single("document"), async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const collection = req.db.collection("assessments");
        const current = await collection.findOne({ _id: new ObjectId(req.params.id) });

        if (!current) {
            return res.status(404).json({ error: "Assessment not found" });
        }

        const requiredFields = ['assessmentname', 'assessmenttype', 'program', 'track', 'dateadded', 'datedue'];
        const validationErrors = [];

        requiredFields.forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== null &&
                (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
                validationErrors.push(`${field} cannot be blank`);
            }
        });

        if (validationErrors.length > 0) {
            return res.status(400).json({ message: "Validation failed", errors: validationErrors });
        }

        if (req.file && current.document?.filePath && fs.existsSync(current.document.filePath)) {
            fs.unlinkSync(current.document.filePath);
        }

        const update = { updatedAt: new Date() };
        if (req.body.assessmentname !== undefined) update.assessmentname = req.body.assessmentname.trim();
        if (req.body.assessmenttype !== undefined) update.assessmenttype = req.body.assessmenttype?.toLowerCase().trim();
        if (req.body.program !== undefined) update.program = req.body.program.trim();
        if (req.body.track !== undefined) update.track = req.body.track.trim();
        if (req.body.dateadded !== undefined) update.dateadded = req.body.dateadded.trim();
        if (req.body.datedue !== undefined) update.datedue = req.body.datedue.trim();

        if (req.file) {
            update.document = {
                fileName: req.file.originalname,
                storedFileName: req.file.filename,
                filePath: req.file.path,
                relativePath: `/uploads/${req.file.filename}`,
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                uploadedAt: new Date()
            };
        }

        await collection.updateOne({ _id: current._id }, { $set: update });
        res.json({ message: "Assessment updated" });
    } catch (error) {
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

        if (assessment.document?.filePath && fs.existsSync(assessment.document.filePath)) {
            fs.unlinkSync(assessment.document.filePath);
        }

        await collection.deleteOne({ _id: assessment._id });
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
    res.json(results.map(m => ({ ...m, documentLink: m.document?.relativePath || null })));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

router.get("/welcome", async (req, res) => {
    res.json({ message: "Welcome to the OnTrack Connect API Service!" });
});

/* ========================= DASHBOARD ENDPOINTS ========================= */

router.get("/total", async (req, res) => {
  try {
    const total = await req.db.collection("assessments").countDocuments({});
    res.status(200).json({ total, message: "Total assessments retrieved successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch total assessments" });
  }
});

router.get("/totals-by-program", async (req, res) => {
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

router.get("/totals-by-type", async (req, res) => {
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

/* ========================= FILE DOWNLOAD ========================= */

router.get("/download/:id", async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const assessment = await req.db.collection("assessments").findOne({ _id: new ObjectId(req.params.id) });

        if (!assessment?.document || !fs.existsSync(assessment.document.filePath)) {
            return res.status(404).json({ error: "File not found" });
        }

        res.setHeader("Content-Type", assessment.document.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${assessment.document.fileName}"`);

        fs.createReadStream(assessment.document.filePath).pipe(res);
    } catch (error) {
        res.status(500).json({ error: "Failed to download file" });
    }
});

/* ========================= DEBUG / SEED ========================= */

router.get("/debug-database-contents", async (req, res) => {
    try {
        const docs = await req.db.collection("assessments").find({}).toArray();
        const byType = {};
        docs.forEach(d => {
            const t = d.assessmenttype || "unknown";
            byType[t] ??= [];
            byType[t].push({ id: d._id, name: d.assessmentname });
        });

        res.json({
            totalDocuments: docs.length,
            byType,
            programs: [...new Set(docs.map(d => d.program).filter(Boolean))],
        });
    } catch (error) {
        res.status(500).json({ error: "Debug failed" });
    }
});

router.delete("/admin/delete-all", authenticateToken, async (req, res) => {
    try {
        if (!req.dbUser.role?.includes("admin")) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const collection = req.db.collection("assessments");
        const assessments = await collection.find({}).toArray();

        assessments.forEach(assessment => {
            if (assessment.document?.filePath && fs.existsSync(assessment.document.filePath)) {
                fs.unlinkSync(assessment.document.filePath);
            }
        });

        const result = await collection.deleteMany({});
        res.json({ message: `Successfully deleted ${result.deletedCount} assessments` });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete all assessments" });
    }
});

export default router;