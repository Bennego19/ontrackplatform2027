import test from 'node:test';
import assert from 'node:assert/strict';
import { logError } from '../utils/logError.mjs';
import { logRouteError } from '../utils/errorlogger.mjs';

test('logging an error never records credentials, personal data, or a stack', () => {
  const original = console.error;
  const entries = [];
  console.error = (...args) => entries.push(args);
  try {
    const error = new Error('user@example.test password=private-value');
    error.name = 'MongoServerError';
    error.code = 11000;
    error.keyValue = { email: 'user@example.test' };
    logError('Database operation failed:', error);
    assert.deepEqual(entries, [['Database operation failed:', { type: 'MongoServerError', code: 11000 }]]);
    assert.doesNotMatch(JSON.stringify(entries), /user@example\.test|private-value|stack|keyValue/);

    logError('External error:', { name: 'private-value', code: 'private-value', message: 'private-value' });
    assert.deepEqual(entries[1], ['External error:', { type: 'Error' }]);
  } finally {
    console.error = original;
  }
});

test('legacy route logger omits request data in production', () => {
  const original = console.error;
  const previousEnvironment = process.env.NODE_ENV;
  const entries = [];
  console.error = (...args) => entries.push(args);
  process.env.NODE_ENV = 'production';
  try {
    const error = new Error('secret-password');
    logRouteError('/student/private-id', error, {
      originalUrl: '/student/private-id?token=secret-token',
      user: { id: 'private-id' }
    });
    assert.deepEqual(entries, [['Route operation failed:', { type: 'Error' }]]);
    assert.doesNotMatch(JSON.stringify(entries), /private-id|secret-password|secret-token/);
  } finally {
    console.error = original;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});
