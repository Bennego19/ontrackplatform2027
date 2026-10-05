import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import db from "../db/conn.mjs";

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Access token required" });
    }

    const JWT_SECRET = process.env.JWT_SECRET || "ontrack-connect-jwt-secret-key-2024";

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }

        try {
            // Handle both ObjectId and string formats for user ID
            let userIdObj;
            try {
                userIdObj = new ObjectId(decoded.id);
            } catch (error) {
                userIdObj = decoded.id;
            }

            const database = await db();
            // Try to find the user in students, mentors, or admins
            let dbUser = await database.collection("students").findOne({ _id: userIdObj })
                || await database.collection("students").findOne({ _id: decoded.id })
                || await database.collection("mentors").findOne({ _id: userIdObj })
                || await database.collection("mentors").findOne({ _id: decoded.id })
                || await database.collection("admins").findOne({ _id: userIdObj })
                || await database.collection("admins").findOne({ _id: decoded.id });

            if (!dbUser) {
                return res.status(404).json({ message: "User not found" });
            }

            // Attach both decoded token and db user record for downstream handlers
            req.user = decoded; // token payload
            req.dbUser = dbUser; // database record (student/mentor/admin)
            next();
        } catch (error) {
            console.error("Auth error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
};


// Optional: Role-based middleware
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.dbUser) {
            return res.status(401).json({ message: "Authentication required" });
        }

        if (!roles.includes(req.dbUser.role)) {
            return res.status(403).json({ message: "Insufficient permissions" });
        }

        next();
    };
};

export const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Admin access token required" });
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024';

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded || !decoded.id) {
        return res.status(403).json({ message: "Invalid token payload" });
    }
    
    // Verify admin exists in database - THIS IS THE KEY CHECK
    const database = await db();
    const adminCollection = database.collection("admins");
    const admin = await adminCollection.findOne({ _id: new ObjectId(decoded.id) });

    if (!admin) {
      return res.status(403).json({ message: "Admin access required - user not found in admin collection" });
    }

    // Optional: Check if admin is active
    if (admin.isActive === false) {
      return res.status(403).json({ message: "Admin account is inactive" });
    }

    req.admin = decoded;
    req.adminUser = admin;
    next();
  } catch (error) {
    console.error("Admin authentication error:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid admin token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Admin token expired" });
    }

    res.status(500).json({
      message: "Admin authentication failed",
      error: error.message
    });
  }
};