import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

for (const entry of ['render-server.js', 'server.mjs', 'index.mjs']) {
  test(`${entry} refuses to start in production without a database name`, async () => {
    const child = spawn(process.execPath, [entry], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'production', DB_NAME: '', ATLAS_URI: '', JWT_SECRET: 'local-test-secret-that-is-longer-than-32-bytes' },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000
    });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    const code = await new Promise(resolve => child.on('close', resolve));
    assert.notEqual(code, 0);
    assert.match(output, /Production requires an explicit DB_NAME/);
  });
}
