import express from 'express';
import * as dashboard from '../controllers/mentorDashboard.mjs';
import { parseDocument } from '../services/fileStorage.mjs';

// routePolicy requires an active mentor before mounting this router.
const router = express.Router();
router.get('/assigned-students', dashboard.assignedStudents);
router.get('/profile', dashboard.getProfile);
router.put('/profile', dashboard.updateProfile);
for (const type of ['tasks', 'assignments', 'projects']) {
  router.get(`/${type}`, dashboard.list(type));
  router.post(`/${type}`, dashboard.create(type));
  router.put(`/${type}/:id`, dashboard.update(type));
  router.delete(`/${type}/:id`, dashboard.remove(type));
}
router.get('/resources', dashboard.list('resources'));
router.post('/resources', parseDocument, dashboard.createResource);
router.delete('/resources/:id', dashboard.deleteResource);
export default router;
