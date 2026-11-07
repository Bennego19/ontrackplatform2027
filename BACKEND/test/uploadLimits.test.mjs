import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { parseDocument } from '../services/fileStorage.mjs';

test('upload forms reject oversized fields and excessive field counts', async () => {
  const app = express();
  app.post('/upload', parseDocument, (req, res) => res.json({ fields: Object.keys(req.body).length, size: req.file?.size }));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const url = `http://127.0.0.1:${server.address().port}/upload`;
  const send = form => fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(3000) });
  try {
    const normal = new FormData();
    normal.append('title', 'Example');
    normal.append('document', new Blob(['safe preview data'], { type: 'text/plain' }), 'example.txt');
    const accepted = await send(normal);
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).size, 17);

    const large = new FormData();
    large.append('description', 'a'.repeat(64 * 1024 + 1));
    assert.equal((await send(large)).status, 413);

    const many = new FormData();
    for (let i = 0; i < 33; i++) many.append(`field${i}`, 'x');
    assert.equal((await send(many)).status, 413);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
