import express from 'express';
import { authenticateAdmin, authenticateToken } from '../middleware/auth.js';
import { parseDocument } from '../services/fileStorage.mjs';
import * as resources from '../controllers/resources.mjs';

const router = express.Router();
router.get('/', authenticateToken, resources.list);
router.post('/', authenticateAdmin, parseDocument, resources.create);
router.patch('/:id', authenticateAdmin, parseDocument, resources.update);
router.delete('/:id', authenticateAdmin, resources.remove);
export default router;
