import express from "express";
import getDatabase from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { authenticateToken } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}-${safeName}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

// Middleware to inject DB into req object
router.use(async (req, res, next) => {
    try {
        req.db = await getDatabase();
        next();
    } catch (error) {
        res.status(503).json({ error: "Database connection unavailable" });
    }
});

// GET all resources
router.get("/", authenticateToken, async (req, res) => {
    try {
        const results = await req.db.collection("resources").find({}).toArray();
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch resources" });
    }
});

// Create a new resource (Handles file upload)
router.post("/", authenticateToken, upload.single("document"), async (req, res) => {
    try {
        const newDocument = {
            name: req.body.name,
            description: req.body.description,
            program: req.body.program,
            track: req.body.track,
            websiteLink: req.body.websiteLink || null,
            createdAt: new Date()
        };

        if (req.file) {
            newDocument.document = {
                fileName: req.file.originalname,
                filePath: req.file.path,
                relativePath: `/uploads/${req.file.filename}`,
                mimeType: req.file.mimetype
            };
        }

        const result = await req.db.collection("resources").insertOne(newDocument);
        res.status(201).json({ ...newDocument, _id: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: "Failed to create resource" });
    }
});

// Update resource
router.patch("/:id", authenticateToken, upload.single("document"), async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
        
        const query = { _id: new ObjectId(req.params.id) };
        const existing = await req.db.collection("resources").findOne(query);
        
        if (!existing) return res.status(404).json({ error: "Resource not found" });

        const updates = {
            $set: {
                name: req.body.name,
                description: req.body.description,
                program: req.body.program,
                track: req.body.track,
                websiteLink: req.body.websiteLink,
                updatedAt: new Date()
            }
        };

        if (req.file) {
            // Delete old file if it exists
            if (existing.document?.filePath && fs.existsSync(existing.document.filePath)) {
                fs.unlinkSync(existing.document.filePath);
            }
            updates.$set.document = {
                fileName: req.file.originalname,
                filePath: req.file.path,
                relativePath: `/uploads/${req.file.filename}`,
                mimeType: req.file.mimetype
            };
        }

        await req.db.collection("resources").updateOne(query, updates);
        res.status(200).json({ message: "Update successful" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update resource" });
    }
});

// Delete resource
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
        
        const query = { _id: new ObjectId(req.params.id) };
        const resource = await req.db.collection("resources").findOne(query);

        if (resource?.document?.filePath && fs.existsSync(resource.document.filePath)) {
            fs.unlinkSync(resource.document.filePath);
        }

        await req.db.collection("resources").deleteOne(query);
        res.status(200).json({ message: "Resource deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete resource" });
    }
});

export default router;