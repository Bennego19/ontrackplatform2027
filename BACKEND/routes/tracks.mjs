import { logError } from '../utils/logError.mjs';
// routes/tracks.mjs
import express from "express";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const router = express.Router();

// GET /api/tracks - Get all available tracks
router.get("/", async (req, res) => {
  try {
    // Return predefined tracks as they are static
    const tracks = [
      { _id: "1", name: "Web Development" },
      { _id: "2", name: "Java Programming" },
      { _id: "3", name: "C# Programming" },
      { _id: "4", name: "Python Programming" },
      { _id: "5", name: "Robotics" },
      { _id: "6", name: "Compukids" },
      { _id: "7", name: "CompuTeens" },
      { _id: "8", name: "Digital Entrepreneurship" }
    ];

    res.status(200).json(tracks);
  } catch (error) {
    logError("Error fetching tracks:", error);
    res.status(500).json({
      error: "Failed to fetch tracks"
    });
  }
});

export default router;
