import express from 'express';
import * as announcements from '../controllers/announcements.mjs';

// The shared route policy requires an account for reads and an admin for writes.
const router = express.Router();
router.get('/', announcements.list);
router.get('/:id', announcements.get);
router.post('/', announcements.create);
router.put('/:id', announcements.update);
router.delete('/:id', announcements.remove);
export default router;
