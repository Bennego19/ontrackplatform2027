import { logError } from '../utils/logError.mjs';
// routes/programs.mjs
import express from "express";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const router = express.Router();

router.use((req,res,next) =>{
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
    next();
});

router.use((req,res,next) =>{
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
    next();
});

// GET /api/programs - Get all available programs
router.get("/", async (req, res) => {
  try {
    // Return predefined programs as they are static
    const programs = [
      { _id: "1", name: "Mentorship Program" },
      { _id: "2", name: "Internship Program" },
      { _id: "3", name: "Skill Development Program" },
      { _id: "4", name: "Graduate Program" }
    ];

    res.status(200).json(programs);
  } catch (error) {
    logError("Error fetching programs:", error);
    res.status(500).json({
      error: "Failed to fetch programs"
    });
  }
});

export default router;
