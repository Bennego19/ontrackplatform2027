// Run only against a disposable local MongoDB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

test('deactivation revokes sessions while retaining related records', async () => {
  assert.match(process.env.ATLAS_URI || '', /^mongodb:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?(?:\/[^?]*)?(?:\?.*)?$/i);
  const client = new MongoClient(process.env.ATLAS_URI);
  await client.connect();
  const databaseName = `ontrack_access_test_${Date.now()}_${process.pid}`;
  const database = client.db(databaseName);
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const secret = 'local-access-test-secret-longer-than-32-bytes';
  const env = { ...process.env, DB_NAME: databaseName, PORT: String(port), NODE_ENV: 'production', JWT_SECRET: secret };
  const server = spawn(process.execPath, ['render-server.js'], { cwd: process.cwd(), env, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  const call = async (url, method = 'GET', body, token) => {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  try {
    for (let i = 0; i < 100; i++) {
      try { if ((await call('/api/ready')).status === 200) break; } catch {}
      if (server.exitCode !== null || i === 99) throw new Error('Test server did not start');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const password = 'local-access-test-password';
    const hash = await bcrypt.hash(password, 12);
    const admin = await database.collection('admins').insertOne({ username: 'accessadmin', role: 'admin', isActive: true, password: hash });
    const student = await database.collection('students').insertOne({ username: 'accessstudent', name: 'Student', program: 'Test', track: 'Test', isActive: true, accessAllowed: 'granted', password: hash });
    const mentor = await database.collection('mentors').insertOne({ username: 'accessmentor', name: 'Mentor', isActive: true, accessAllowed: 'granted', password: hash });
    const token = (id, role) => jwt.sign({ id: id.toString(), role, tokenVersion: 0 }, secret, { expiresIn: '1h' });
    const adminToken = token(admin.insertedId, 'admin');
    const studentToken = token(student.insertedId, 'student');
    const mentorToken = token(mentor.insertedId, 'mentor');
    await database.collection('mentor_assignments').insertOne({ mentorId: mentor.insertedId, studentId: student.insertedId, status: 'active' });
    const help = await call('/api/help-requests', 'POST', { topic: 'Help', area: 'Course', description: 'Retain this' }, studentToken);
    assert.equal(help.status, 201);
    const form = new FormData();
    for (const [key, value] of Object.entries({ title: 'Mentor guide', description: 'Keep this', type: 'document' })) form.append(key, value);
    form.append('document', new Blob(['retained file']), 'guide.txt');
    const uploadResponse = await fetch(`${base}/api/mentordashboard/resources`, { method: 'POST', headers: { Authorization: `Bearer ${mentorToken}` }, body: form });
    assert.equal(uploadResponse.status, 201);
    const resource = await uploadResponse.json();
    assert.equal((await call('/api/mentorstudentassignment/active-count', 'GET', undefined, adminToken)).body.count, 1);
    const reset = await call(`/api/password-reset/issue/${student.insertedId}`, 'POST', {}, adminToken);
    assert.equal(reset.status, 200);
    assert.equal((await call(`/api/onboardstudents/${student.insertedId}/access`, 'PATCH', { active: false }, studentToken)).status, 403);
    assert.equal((await call(`/api/onboardstudents/${student.insertedId}/access`, 'PATCH', { active: 'false' }, adminToken)).status, 400);
    assert.equal((await call(`/api/onboardstudents/${student.insertedId}/access`, 'PATCH', { active: false }, adminToken)).status, 200);
    assert.equal((await call('/api/onboardstudents/profile', 'GET', undefined, studentToken)).status, 403);
    assert.equal((await call('/api/onboardstudents/login', 'POST', { username: 'accessstudent', password })).status, 403);
    assert.equal((await call('/api/password-reset/redeem', 'POST', { token: reset.body.token, password })).status, 400);
    assert.equal((await call(`/api/password-reset/issue/${student.insertedId}`, 'POST', {}, adminToken)).status, 404);
    assert.equal((await call('/api/mentorstudentassignment/active-count', 'GET', undefined, adminToken)).body.count, 0);
    assert.equal((await call('/api/mentordashboard/assigned-students', 'GET', undefined, mentorToken)).body.length, 0);
    const inactiveStudentAssignment = await call('/api/mentorstudentassignment/student', 'POST', { mentorIds: [mentor.insertedId], studentIds: [student.insertedId] }, adminToken);
    assert.equal(inactiveStudentAssignment.body.results.errors.length, 1);
    assert.equal(await database.collection('mentor_assignments').countDocuments({ studentId: student.insertedId }), 1);
    assert.equal(await database.collection('help_requests').countDocuments({ 'createdBy.id': student.insertedId.toString() }), 1);
    assert.equal(await database.collection('uploads.files').countDocuments(), 1);
    assert.equal((await call(`/api/onboardstudents/${student.insertedId}/access`, 'PATCH', { active: true }, adminToken)).status, 200);
    assert.equal((await call('/api/onboardstudents/profile', 'GET', undefined, studentToken)).status, 403);
    let newStudent = await call('/api/onboardstudents/login', 'POST', { username: 'accessstudent', password });
    assert.equal(newStudent.status, 200);
    assert.equal((await call('/api/help-requests', 'GET', undefined, newStudent.body.token)).body.length, 1);
    assert.equal((await call('/api/mentorstudentassignment/active-count', 'GET', undefined, adminToken)).body.count, 1);
    const secondReset = await call(`/api/password-reset/issue/${student.insertedId}`, 'POST', {}, adminToken);
    assert.equal((await call(`/api/onboardstudents/${student.insertedId}`, 'PATCH', { accessAllowed: 'denied' }, adminToken)).status, 200);
    assert.equal((await call(`/api/onboardstudents/${student.insertedId}`, 'PATCH', { accessAllowed: 'granted' }, adminToken)).status, 200);
    assert.equal((await call('/api/password-reset/redeem', 'POST', { token: secondReset.body.token, password })).status, 400);
    assert.equal((await call('/api/onboardstudents/profile', 'GET', undefined, newStudent.body.token)).status, 403);
    newStudent = await call('/api/onboardstudents/login', 'POST', { username: 'accessstudent', password });
    assert.equal(newStudent.status, 200);
    assert.equal((await call(`/api/onboardmentors/${mentor.insertedId}/access`, 'PATCH', { active: false }, adminToken)).status, 200);
    assert.equal((await call('/api/mentordashboard/profile', 'GET', undefined, mentorToken)).status, 403);
    assert.equal((await call('/api/mentorstudentassignment/active-count', 'GET', undefined, adminToken)).body.count, 0);
    assert.equal((await call('/api/mentorstudentassignment/student', 'GET', undefined, newStudent.body.token)).body.assignments.length, 0);
    const inactiveMentorAssignment = await call('/api/mentorstudentassignment/student', 'POST', { mentorIds: [mentor.insertedId], studentIds: [student.insertedId] }, adminToken);
    assert.equal(inactiveMentorAssignment.body.results.errors.length, 1);
    const retainedFile = await fetch(base + resource.document.relativePath, { headers: { Authorization: `Bearer ${newStudent.body.token}` } });
    assert.equal(await retainedFile.text(), 'retained file');
    assert.equal(await database.collection('mentor_resources').countDocuments({ mentorId: mentor.insertedId.toString() }), 1);
    assert.equal((await call(`/api/onboardmentors/${mentor.insertedId}/access`, 'PATCH', { active: true }, adminToken)).status, 200);
    assert.equal((await call('/api/mentordashboard/profile', 'GET', undefined, mentorToken)).status, 403);
    assert.equal((await call('/api/onboardmentors/login', 'POST', { username: 'accessmentor', password })).status, 200);
    assert.equal((await call('/api/mentorstudentassignment/active-count', 'GET', undefined, adminToken)).body.count, 1);
    assert.equal((await call('/api/mentorstudentassignment/student', 'GET', undefined, newStudent.body.token)).body.assignments.length, 1);
    assert.equal((await call(`/api/onboardmentors/${mentor.insertedId}`, 'DELETE', undefined, adminToken)).status, 200);
    assert.equal((await call(`/api/onboardstudents/${student.insertedId}`, 'DELETE', undefined, adminToken)).status, 200);
    assert.equal(await database.collection('students').countDocuments({ _id: student.insertedId }), 1);
    assert.equal(await database.collection('mentors').countDocuments({ _id: mentor.insertedId }), 1);
    assert.equal(await database.collection('mentor_assignments').countDocuments({ studentId: student.insertedId }), 1);
  } finally {
    server.kill();
    await database.dropDatabase();
    await client.close();
  }
});
