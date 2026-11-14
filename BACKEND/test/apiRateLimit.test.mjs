import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { MemoryStore } from 'express-rate-limit';
import { makeApiLimiters } from '../middleware/apiRateLimit.mjs';

test('API limits distinguish verified accounts, constrain writes, and ignore spoofed headers', async () => {
  const app = express();
  app.use('/api', ...makeApiLimiters({ generalStore: new MemoryStore(), writeStore: new MemoryStore(), generalLimit: 3, writeLimit: 2 }));
  app.use('/api', (req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const secret = process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024';
  const token = id => jwt.sign({ id, role: 'student' }, secret);
  const first = token('000000000000000000000001');
  const second = token('000000000000000000000002');
  const call = (path, options = {}) => fetch(base + path, options);
  try {
    const auth = { Authorization: `Bearer ${first}` };
    assert.equal((await call('/resource', { method: 'POST', headers: auth })).status, 200);
    assert.equal((await call('/resource', { method: 'POST', headers: auth })).status, 200);
    assert.equal((await call('/resource', { method: 'POST', headers: auth })).status, 429);
    assert.equal((await call('/resource', { headers: { Authorization: `Bearer ${second}` } })).status, 200);
    for (let i = 0; i < 3; i++) assert.equal((await call('/resource', { headers: { 'X-Forwarded-For': `203.0.113.${i + 1}` } })).status, 200);
    assert.equal((await call('/resource', { headers: { 'X-Forwarded-For': '203.0.113.50', Authorization: 'Bearer invalid' } })).status, 429);
    for (let i = 0; i < 5; i++) assert.equal((await call('/health')).status, 200);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
