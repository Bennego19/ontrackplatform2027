import express from 'express';
import * as events from '../controllers/events.mjs';

// Authentication and administrator-only writes are enforced by routePolicy
// when this router is mounted by either server entry point.
const router = express.Router();
router.get('/', events.list);
router.post('/', events.create);
router.patch('/:id', events.update);
router.delete('/:id', events.remove);
export default router;
