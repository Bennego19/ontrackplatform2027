import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

// Import after explicitly disabling the database URI, so this test cannot
// reach a developer's configured database.
process.env.ATLAS_URI = '';
const { default: cohorts } = await import('../routes/cohorts.mjs');

test('cohort routes respond to invalid IDs and database failures', async () => {
  const app = express();
  app.use(express.json());
  app.use('/cohorts', cohorts);
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const base = `http://127.0.0.1:${server.address().port}/cohorts`;
  const request = async (path, method = 'GET') => {
    const response = await fetch(base + path, {
      method, signal: AbortSignal.timeout(3000),
      headers: { 'content-type': 'application/json' },
      ...(method === 'POST' || method === 'PATCH' ? { body: '{}' } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    assert.equal((await request('/not-an-id', 'PATCH')).status, 400);
    assert.equal((await request('/not-an-id', 'DELETE')).status, 400);
    for (const [path, method] of [['', 'GET'], ['/total', 'GET'], ['/createcohort', 'POST'],
      ['/507f1f77bcf86cd799439011', 'PATCH'], ['/507f1f77bcf86cd799439011', 'DELETE']]) {
      const response = await request(path, method);
      assert.equal(response.status, 500);
      assert.match(response.body.error, /^Failed to /);
    }
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
