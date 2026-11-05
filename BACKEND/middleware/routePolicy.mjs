import { authenticateAdmin, authenticateToken } from './auth.js';

// Content reads require an account; changes require an administrator.
const contentRoutes = new Set([
  '/api/programs', '/api/tracks', '/api/assessments', '/api/resources',
  '/api/events', '/api/modules', '/api/announcements'
]);
// These older management APIs return unscoped records, including student
// assignments. Student learning views use the scoped assessments endpoints.
const managementRoutes = new Set([
  '/api/cohorts', '/api/mentorship', '/api/internship', '/api/skillsdevelopment', '/api/projects'
]);
const selfProtectedRoutes = new Set([
  '/api/onboardstudents', '/api/onboardmentors', '/api/mentorstudentassignment',
  '/api/auth', '/api/adminlogin', '/api/user', '/api/addassignment',
  '/api/accesscontrol', '/api/addtask', '/api/help-requests', '/api/files', '/api/password-reset'
]);

export function routePolicy(path) {
  if (path === '/api/studentassignment') return authenticateAdmin;
  if (managementRoutes.has(path)) return authenticateAdmin;
  if (path === '/api/mentordashboard') {
    return [authenticateToken, (req, res, next) => {
      if (req.userType !== 'mentors') return res.status(403).json({ message: 'Mentor access required' });
      next();
    }];
  }
  if (contentRoutes.has(path)) {
    return (req, res, next) => {
      if (path === '/api/assessments' && req.path === '/debug-database-contents') {
        return res.status(404).json({ message: 'Route not found' });
      }
      return (req.method === 'GET' || req.method === 'HEAD' ? authenticateToken : authenticateAdmin)(req, res, next);
    };
  }
  if (selfProtectedRoutes.has(path)) return (req, res, next) => next();
  // New route families must declare a policy before they can be used.
  return (req, res) => res.status(403).json({ message: 'Route policy not configured' });
}
