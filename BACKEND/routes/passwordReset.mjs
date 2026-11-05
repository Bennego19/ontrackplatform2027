import express from 'express';
import { resetLimit } from '../middleware/authRateLimit.mjs';
import { authenticateAdmin } from '../middleware/auth.js';
import * as reset from '../controllers/passwordReset.mjs';

const router = express.Router();
router.post('/issue/mentor/:id', authenticateAdmin, reset.issueMentor);
router.post('/issue/:id', authenticateAdmin, reset.issueStudent);
router.post('/redeem', resetLimit, reset.redeem);
export default router;
