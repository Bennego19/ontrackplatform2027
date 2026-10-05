import express from "express";
import getDatabase from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import { authenticateToken } from "../middleware/auth.js";

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

// List public announcements (most recent first)
router.get("/", async (req, res) => {
  try {
    const announcements = await req.db.collection("announcements")
      .find({})
      .sort({ postedAt: -1 })
      .toArray();

    const normalized = announcements.map(a => ({
      id: a._id,
      title: a.title,
      message: a.message,
      postedAt: a.postedAt,
      author: a.author || null
    }));

    res.json(normalized);
  } catch (err) {
    console.error("Failed to fetch announcements:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Get single announcement
router.get("/:id", async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const a = await req.db.collection("announcements").findOne({ _id: new ObjectId(req.params.id) });
    if (!a) return res.status(404).json({ error: "Announcement not found" });
    res.json({ id: a._id, title: a.title, message: a.message, postedAt: a.postedAt, author: a.author || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch announcement" });
  }
});

// Create announcement (authenticated)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) return res.status(400).json({ error: "Title and message required" });

    const doc = {
      title,
      message,
      postedAt: new Date(),
      author: req.dbUser?.email || req.dbUser?.username || null
    };

    const result = await req.db.collection("announcements").insertOne(doc);
    res.status(201).json({ message: "Announcement created", id: result.insertedId });
  } catch (err) {
    console.error("Failed to create announcement:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// Update announcement (authenticated)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const { title, message } = req.body;
    const update = { updatedAt: new Date() };
    if (title !== undefined) update.title = title;
    if (message !== undefined) update.message = message;

    const result = await req.db.collection("announcements").updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
    if (result.matchedCount === 0) return res.status(404).json({ error: "Announcement not found" });
    res.json({ message: "Announcement updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

// Delete announcement (authenticated)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const result = await req.db.collection("announcements").deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Announcement not found" });
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

export default router;
