import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';

// Legacy admin login and debug endpoints are retired. The active login is
// /api/auth/admin-login; admin accounts are provisioned using the CLI.
const router = express.Router();
router.use(['/debug-passwords', '/test', '/create-test-admin', '/create-sample-admins', '/check-admin', '/debug-db', '/adminlogin', '/verify'], (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});
router.use(authenticateAdmin, (req, res) => res.status(404).json({ message: 'Route not found' }));
export default router;
