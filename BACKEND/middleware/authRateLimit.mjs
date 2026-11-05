import { rateLimit } from 'express-rate-limit';
import { MongoRateLimitStore } from './mongoRateLimitStore.mjs';

// Proxy/client IP configuration must be verified in the deployment environment.
const loginLimiter = prefix => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  store: new MongoRateLimitStore(prefix),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' }
});

export const adminLoginLimit = loginLimiter('admin-login');
export const studentLoginLimit = loginLimiter('student-login');
export const mentorLoginLimit = loginLimiter('mentor-login');
export const resetLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  store: new MongoRateLimitStore('reset'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' }
});
