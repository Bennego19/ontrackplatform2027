import express from 'express';
import * as cohorts from '../controllers/cohorts.mjs';

// Administrator access is enforced by routePolicy in both server entry points.
const router = express.Router();
router.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  next();
});
router.get('/', cohorts.list);
router.get('/total', cohorts.total);
router.post('/createcohort', cohorts.create);
router.patch('/:id', cohorts.update);
router.delete('/:id', cohorts.remove);
export default router;
