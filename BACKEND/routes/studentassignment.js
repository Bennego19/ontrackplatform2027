import express from 'express';

// The retired API exposed mentor password hashes and duplicated assignment
// management. The application uses the protected student and mentor routes.
const router = express.Router();
router.use((req, res) => res.status(404).json({ message: 'Route not found' }));
export default router;
