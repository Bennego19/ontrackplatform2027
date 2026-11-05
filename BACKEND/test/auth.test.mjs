import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import { verifyPassword } from '../services/auth.mjs';

test('unknown or malformed accounts still run a bcrypt comparison', async t => {
  const compare = t.mock.method(bcrypt, 'compare', async () => true);
  assert.equal(await verifyPassword('guess', undefined), false);
  assert.equal(await verifyPassword('guess', 'invalid-hash'), false);
  assert.equal(compare.mock.callCount(), 2);
  for (const call of compare.mock.calls) {
    assert.equal(call.arguments[0], 'guess');
    assert.match(call.arguments[1], /^\$2b\$12\$/);
  }
});
