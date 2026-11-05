import express from 'express';
import { authenticateAdmin, authenticateToken } from '../middleware/auth.js';
import * as helpRequests from '../controllers/helpRequests.mjs';

const router = express.Router();

// Named administrator routes must be registered before /:id.
router.get('/admin', authenticateAdmin, helpRequests.listAll);
router.put('/approve', authenticateAdmin, helpRequests.approve);
router.put('/reject', authenticateAdmin, helpRequests.reject);
router.put('/resolve', authenticateAdmin, helpRequests.resolve);
router.put('/admin/:id', authenticateAdmin, helpRequests.updateAsAdmin);

router.use(authenticateToken);
router.get('/', helpRequests.listOwn);
router.post('/', helpRequests.create);
router.get('/:id', helpRequests.getOwn);
router.put('/:id', helpRequests.updateOwn);
router.delete('/:id', helpRequests.deleteOwn);

export default router;
