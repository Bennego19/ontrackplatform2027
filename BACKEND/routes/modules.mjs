import express from 'express';

// This obsolete API stored plaintext passwords in module records and exposed
// them to authenticated users. Learning modules use /api/assessments/modules.
const router = express.Router();
router.use((req, res) => res.status(404).json({ message: 'Route not found' }));
export default router;
