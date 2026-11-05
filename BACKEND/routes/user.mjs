import express from 'express';

// The legacy user API allowed plaintext passwords and exposed account records.
// Use the dedicated student, mentor and administrator routes instead.
const router = express.Router();
router.use((req, res) => res.status(404).json({ message: 'Route not found' }));
export default router;
