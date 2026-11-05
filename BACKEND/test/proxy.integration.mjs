// Requires a built frontend and a disposable local MongoDB; never use production.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendDir = path.resolve(backendDir, '..', 'ontrackapp');
const localMongo = /^mongodb:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?(?:\/[^?]*)?(?:\?.*)?$/i;

async function reservePort(port = 0) {
  const socket = createServer();
  await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(port, '127.0.0.1', resolve); });
  const chosen = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return chosen;
}

test('frontend proxy reaches login and preserves programme and track access', async () => {
  assert.match(process.env.ATLAS_URI || '', localMongo, 'ATLAS_URI must be a local disposable MongoDB');
  // The local Vite proxy points to port 3000; never replace another service.
  await reservePort(3000);
  const frontendPort = await reservePort();
  const databaseName = `ontrack_proxy_test_${Date.now()}_${process.pid}`;
  const client = new MongoClient(process.env.ATLAS_URI);
  await client.connect();
  const database = client.db(databaseName);
  let backend;
  let frontend;
  try {
    const password = 'local-proxy-test-password';
    await database.collection('admins').insertOne({ username: 'proxyadmin', name: 'Test Admin', role: 'admin', password: await bcrypt.hash(password, 12), isActive: true });
    const common = { ...process.env, DB_NAME: databaseName, NODE_ENV: 'production', JWT_SECRET: 'local-proxy-test-secret-longer-than-32-bytes' };
    backend = spawn(process.execPath, ['render-server.js'], { cwd: backendDir, env: { ...common, PORT: '3000' }, stdio: 'ignore' });
    frontend = spawn(process.execPath, [path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'], { cwd: frontendDir, stdio: 'ignore' });
    const base = `http://127.0.0.1:${frontendPort}`;
    let health;
    for (let i = 0; i < 100; i++) {
      try { health = await fetch(`${base}/api/health`); if (health.ok) break; } catch {}
      if (backend.exitCode !== null || frontend.exitCode !== null || i === 99) throw new Error('Local proxy test servers did not start');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(health.status, 200);
    const call = async (url, method, body, token) => {
      const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const admin = await call('/api/auth/admin-login', 'POST', { username: 'proxyadmin', password });
    assert.equal(admin.status, 200);
    const students = [
      { username: 'proxyone', email: 'one@example.test', program: 'Mentorship Program', track: 'Web Development' },
      { username: 'proxytwo', email: 'two@example.test', program: 'Mentorship Program', track: 'Python Programming' },
      { username: 'proxythree', email: 'three@example.test', program: 'Graduate Program', track: 'Web Development' }
    ];
    for (const student of students) {
      const created = await call('/api/onboardstudents/onboardstudent', 'POST', { ...student, name: 'Local', surname: 'Student', cellnumber: '0123456789', password }, admin.body.token);
      assert.equal(created.status, 201);
    }
    const resourceForm = new FormData();
    for (const [key, value] of Object.entries({ name: 'Scoped resource', description: 'Local test', program: 'Mentorship Program', track: 'Web Development', websiteLink: 'https://example.test/guide' })) resourceForm.append(key, value);
    resourceForm.append('document', new Blob(['local proxy document']), 'guide.txt');
    const resourceResponse = await fetch(`${base}/api/resources`, { method: 'POST', headers: { Authorization: `Bearer ${admin.body.token}` }, body: resourceForm });
    assert.equal(resourceResponse.status, 201);
    const resource = await resourceResponse.json();
    const first = await call('/api/onboardstudents/login', 'POST', { username: students[0].username, password });
    const second = await call('/api/onboardstudents/login', 'POST', { username: students[1].username, password });
    const third = await call('/api/onboardstudents/login', 'POST', { username: students[2].username, password });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 200);
    const firstResources = await call('/api/resources', 'GET', null, first.body.token);
    const secondResources = await call('/api/resources', 'GET', null, second.body.token);
    const thirdResources = await call('/api/resources', 'GET', null, third.body.token);
    assert.equal(firstResources.body.some(item => item._id === resource._id), true);
    assert.equal(secondResources.body.some(item => item._id === resource._id), false);
    assert.equal(thirdResources.body.some(item => item._id === resource._id), false);
    const firstDashboardResources = await call('/api/assessments/resources', 'GET', null, first.body.token);
    const secondDashboardResources = await call('/api/assessments/resources', 'GET', null, second.body.token);
    const thirdDashboardResources = await call('/api/assessments/resources', 'GET', null, third.body.token);
    const dashboardResource = firstDashboardResources.body.find(item => item._id === resource._id);
    assert.equal(dashboardResource.assessmentname, 'Scoped resource');
    assert.equal(dashboardResource.websiteLink, 'https://example.test/guide');
    assert.equal(dashboardResource.documentLink, resource.document.relativePath);
    assert.equal(secondDashboardResources.body.some(item => item._id === resource._id), false);
    assert.equal(thirdDashboardResources.body.some(item => item._id === resource._id), false);
    const download = token => fetch(base + resource.document.relativePath, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(await (await download(first.body.token)).text(), 'local proxy document');
    assert.equal((await download(second.body.token)).status, 404);
    assert.equal((await download(third.body.token)).status, 404);
  } finally {
    if (frontend) frontend.kill();
    if (backend) backend.kill();
    await database.dropDatabase();
    await client.close();
  }
});
