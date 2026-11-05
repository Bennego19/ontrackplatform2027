import express from "express";




import { adminLoginLimit } from '../middleware/authRateLimit.mjs';
import { adminLogin } from '../controllers/auth.mjs';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use((req,res,next) =>{
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
    next();
});

// GET / - Basic info endpoint
router.get("/", (req, res) => {
  res.json({
    message: "OnTrack Connect Authentication API",
    version: "1.0.0",
    endpoints: {
      "POST /admin-login": "Admin login",
      "POST /verify": "Verify JWT token",
      "GET /": "API information"
    },
    timestamp: new Date().toISOString()
  });
});

// Admin login route
router.post("/admin-login", adminLoginLimit, adminLogin);

// General login route (could be for mentors or other users)
// This legacy route does not enforce student accessAllowed; use dedicated login routes.
router.post('/login', (req, res) => res.status(404).json({ message: 'Route not found' }));
// Verify against the current account record, including access revocation.
router.post("/verify", authenticateToken, (req, res) => {
  const user = req.dbUser;
  const role = req.userType === 'admins' ? (user.role || 'admin') : req.userType === 'mentors' ? 'mentor' : 'student';
  res.json({ success: true, user: { id: user._id.toString(), username: user.username, role, name: user.name } });
});
export default router;
