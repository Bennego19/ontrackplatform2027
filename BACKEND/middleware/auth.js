import { logError } from '../utils/logError.mjs';
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
            let dbUser;
            let userType;
            const accountType = decoded.role === 'mentor' ? 'mentors'
                : ['admin', 'superadmin'].includes(decoded.role) ? 'admins'
                : (!decoded.role || decoded.role === 'student') ? 'students' : null;
            if (!accountType) return res.status(403).json({ message: 'Invalid account role' });
            for (const type of [accountType]) {
                dbUser = await database.collection(type).findOne({ _id: userIdObj })
                    || await database.collection(type).findOne({ _id: decoded.id });
                if (dbUser) { userType = type; break; }
            }

            if (!dbUser) {
                return res.status(404).json({ message: "User not found" });
            }
            if ((userType === 'students' && dbUser.accessAllowed !== 'granted') || dbUser.isActive === false || (userType === 'mentors' && dbUser.accessAllowed === 'denied')) {
                return res.status(403).json({ message: 'Account access denied', accessDenied: true });
            }
            if (userType === 'admins' && (dbUser.role || 'admin') !== decoded.role) {
                return res.status(403).json({ message: 'Session expired', accessDenied: true });
            }
            if ((decoded.tokenVersion || 0) !== (dbUser.tokenVersion || 0)) {
                return res.status(403).json({ message: 'Session expired', accessDenied: true });
            }

            // Attach both decoded token and db user record for downstream handlers
            req.user = decoded; // token payload
            req.dbUser = dbUser; // database record (student/mentor/admin)
            req.userType = userType;
            next();
        } catch (error) {
            logError("Auth error:", error);
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
    
    if (!decoded || !decoded.id || !['admin', 'superadmin'].includes(decoded.role) || !ObjectId.isValid(decoded.id)) {
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
    if (admin.isActive === false || (admin.role || 'admin') !== decoded.role) {
      return res.status(403).json({ message: "Admin account is inactive" });
    }
    if ((decoded.tokenVersion || 0) !== (admin.tokenVersion || 0)) {
      return res.status(403).json({ message: 'Session expired' });
    }

    req.admin = decoded;
    req.adminUser = admin;
    next();
  } catch (error) {
    logError("Admin authentication error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid admin token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Admin token expired" });
    }

    res.status(500).json({ message: "Admin authentication failed" });
  }
};
