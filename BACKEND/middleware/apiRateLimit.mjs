import jwt from 'jsonwebtoken';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { MongoRateLimitStore } from './mongoRateLimitStore.mjs';

// Only a verified token can select an account bucket. Invalid or absent tokens
// share an IP bucket; forwarded headers are not trusted without proxy setup.
export function apiClientKey(req) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
  if (match) {
    try {
      const token = jwt.verify(match[1], process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024', { algorithms: ['HS256'] });
      if (typeof token.id === 'string' && /^[0-9a-f]{24}$/i.test(token.id) && ['student', 'mentor', 'admin', 'superadmin'].includes(token.role)) {
        return `account:${token.role}:${token.id.toLowerCase()}`;
      }
    } catch { /* Unverified tokens must never select an account bucket. */ }
  }
  return `ip:${ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown')}`;
}

export function makeApiLimiters({ generalStore, writeStore, generalLimit = 600, writeLimit = 180 } = {}) {
  const common = {
    windowMs: 60 * 1000, keyGenerator: apiClientKey, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { message: 'Too many requests. Please try again later.' },
    skip: req => req.method === 'OPTIONS' || ['/health', '/ready'].includes(req.path)
  };
  return [
    rateLimit({ ...common, limit: generalLimit, store: generalStore || new MongoRateLimitStore('api') }),
    rateLimit({ ...common, limit: writeLimit, store: writeStore || new MongoRateLimitStore('api-write'),
      skip: req => common.skip(req) || ['GET', 'HEAD'].includes(req.method) })
  ];
}
