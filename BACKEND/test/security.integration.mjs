// Run against an isolated disposable MongoDB: ATLAS_URI=mongodb://127.0.0.1:PORT node --test test/security.integration.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

test('student credentials and privileged routes', async () => {
  assert.ok(process.env.ATLAS_URI, 'ATLAS_URI must point to a disposable MongoDB');
  assert.match(process.env.ATLAS_URI, /^mongodb:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?(?:\/[^?]*)?(?:\?.*)?$/i,
    'Integration tests only run against a local MongoDB without embedded credentials');
  const client = new MongoClient(process.env.ATLAS_URI);
  await client.connect();
  const dbName = `ontrack_security_test_${Date.now()}_${process.pid}`;
  const db = client.db(dbName);
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const env = { ...process.env, DB_NAME: dbName, PORT: String(port), NODE_ENV: 'production', JWT_SECRET: 'local-test-secret-that-is-longer-than-32-bytes', CORS_EXTRA_ORIGINS: 'https://preview.example.test' };
  const server = spawn(process.execPath, ['render-server.js'], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  server.stdout.on('data', data => { logs += data; });
  server.stderr.on('data', data => { logs += data; });
  const base = `http://127.0.0.1:${port}`;
  const request = async (path, options = {}) => {
    const response = await fetch(base + path, { ...options, headers: { 'content-type': 'application/json', ...options.headers } });
    return { status: response.status, body: await response.json() };
  };
  try {
    for (let i = 0; i < 100; i++) {
      try { if ((await request('/api/health')).status === 200) break; } catch {}
      if (server.exitCode !== null) throw new Error(`Server exited: ${logs}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      if (i === 99) throw new Error(`Server did not start: ${logs}`);
    }
    assert.deepEqual(await request('/api/ready'), { status: 200, body: { status: 'ready' } });
    assert.equal((await request('/api/health', { headers: { origin: 'https://platform.ontrackconnect.co.za' } })).status, 200);
    assert.equal((await request('/api/health', { headers: { origin: 'https://preview.example.test' } })).status, 200);
    assert.equal((await request('/api/health', { headers: { origin: 'http://localhost:3001' } })).status, 403);
    const rejectedOrigin = await request('/api/health', { headers: { origin: 'https://private-origin.example.test' } });
    assert.deepEqual(rejectedOrigin, { status: 403, body: { error: 'CORS Error' } });
    const adminPassword = 'local-admin-test-password';
    const bootstrap = async () => {
      const child = spawn(process.execPath, ['bootstrap-admin.mjs'], { cwd: process.cwd(), env: { ...env, BOOTSTRAP_ADMIN_USERNAME: 'securityadmin', BOOTSTRAP_ADMIN_NAME: 'Security Admin' }, stdio: ['pipe', 'pipe', 'pipe'] });
      let output = '';
      child.stdout.on('data', data => { output += data; });
      child.stderr.on('data', data => { output += data; });
      child.stdin.end(`${adminPassword}\n`);
      const code = await new Promise(resolve => child.on('close', resolve));
      assert.equal(output.includes(adminPassword), false);
      return code;
    };
    assert.equal(await bootstrap(), 0);
    assert.equal(await bootstrap(), 1);
    assert.equal(await db.collection('admins').countDocuments(), 1);
    const login = await request('/api/auth/admin-login', { method: 'POST', body: JSON.stringify({ username: 'securityadmin', password: adminPassword }) });
    assert.equal(login.status, 200);
    assert.deepEqual(Object.keys(jwt.decode(login.body.token)).sort(), ['exp', 'iat', 'id', 'role', 'tokenVersion']);
    const adminHeaders = { authorization: `Bearer ${login.body.token}` };
    const adminId = new ObjectId(login.body.user.id);
    await db.collection('admins').updateOne({ _id: adminId }, { $set: { role: 'superadmin' } });
    assert.equal((await request('/api/auth/verify', { method: 'POST', headers: adminHeaders, body: '{}' })).status, 403);
    assert.equal((await request('/api/programs', { headers: adminHeaders })).status, 403);
    await db.collection('admins').updateOne({ _id: adminId }, { $set: { role: 'admin' } });
    assert.equal((await request('/api/auth/verify', { method: 'POST', headers: adminHeaders, body: '{}' })).status, 200);
    for (let i = 0; i < 8; i++) {
      assert.equal((await request('/api/auth/verify', { method: 'POST', headers: adminHeaders, body: '{}' })).status, 200);
      assert.equal((await request('/api/programs', { headers: adminHeaders })).status, 200);
      assert.equal((await request('/api/auth/admin-login', { method: 'POST', body: JSON.stringify({ username: 'securityadmin', password: adminPassword }) })).status, 200);
    }
    assert.equal((await request('/api/auth/admin-login', { method: 'POST', body: JSON.stringify({ username: 'securityadmin', password: 'wrong-password' }) })).status, 401);
    assert.equal((await request('/api/onboardstudents')).status, 401);
    assert.equal((await request('/api/not-found/private-student@example.test')).status, 404);
    assert.equal((await request('/api/test')).status, 404);
    assert.equal((await request('/api/auth/admin-login', { method: 'POST', body: JSON.stringify({ data: 'x'.repeat(270000) }) })).status, 413);
    assert.equal((await request('/api/events')).status, 401);
    assert.equal((await request('/api/studentassignment')).status, 401);
    assert.equal((await request('/api/assessments/debug-database-contents')).status, 404);
    assert.equal((await request('/api/addtask/507f1f77bcf86cd799439011', { method: 'DELETE' })).status, 401);
    assert.equal((await request('/api/adminlogin/admins', { method: 'POST', body: '{}' })).status, 401);
    assert.equal((await request('/api/accesscontrol/create', { method: 'POST', body: '{}' })).status, 401);
    assert.equal((await request('/api/mentorstudentassignment/all')).status, 401);
    assert.equal((await request('/api/mentorstudentassignment/student', { method: 'POST', body: '{}' })).status, 401);
    assert.equal((await request('/api/addassignment/507f1f77bcf86cd799439011', { method: 'DELETE' })).status, 401);
    assert.equal((await request('/api/onboardstudents/test-create-student', { method: 'POST', body: '{}' })).status, 404);
    assert.equal((await request('/api/adminlogin/create-test-admin', { method: 'POST', body: '{}' })).status, 404);
    assert.equal((await request('/api/user/signup', { method: 'POST', body: '{}' })).status, 404);
    assert.equal((await request('/api/modules/signup', { method: 'POST', headers: adminHeaders, body: '{}' })).status, 404);
    const studentPassword = 'local-student-test-password';
    const data = { name: 'Test', surname: 'Student', email: 'student@example.test', cellnumber: '0123456789', program: 'Test', track: 'Test', username: 'teststudent', password: studentPassword };
    assert.equal((await request('/api/onboardstudents/onboardstudent', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ ...data, program: {} }) })).status, 400);
    assert.equal((await request('/api/onboardstudents/onboardstudent', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ ...data, password: ['not-a-password'] }) })).status, 400);
    const created = await request('/api/onboardstudents/onboardstudent', { method: 'POST', headers: adminHeaders, body: JSON.stringify(data) });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const duplicateData = { ...data, username: 'concurrent', email: 'CONCURRENT@example.test' };
    const duplicateResults = await Promise.all([1, 2].map(() => request('/api/onboardstudents/onboardstudent', { method: 'POST', headers: adminHeaders, body: JSON.stringify(duplicateData) })));
    assert.deepEqual(duplicateResults.map(result => result.status).sort(), [201, 409]);
    assert.equal(await db.collection('students').countDocuments({ username: 'concurrent' }), 1);
    assert.equal((await db.collection('students').findOne({ username: 'concurrent' })).email, 'concurrent@example.test');
    const student = await db.collection('students').findOne({ username: data.username });
    assert.notEqual(student.password, studentPassword);
    assert.equal(await bcrypt.compare(studentPassword, student.password), true);
    assert.equal((await request(`/api/onboardstudents/${student._id}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ track: 'Test', password: 'should-not-change' }) })).status, 200);
    const afterPartialUpdate = await db.collection('students').findOne({ _id: student._id });
    assert.equal(afterPartialUpdate.name, student.name);
    assert.equal(afterPartialUpdate.email, student.email);
    assert.equal(afterPartialUpdate.accessAllowed, 'granted');
    assert.equal(afterPartialUpdate.password, student.password);
    assert.equal((await request(`/api/onboardstudents/${student._id}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ password: 'unsafe' }) })).status, 400);
    assert.equal((await request('/api/studentassignment', { headers: adminHeaders })).status, 404);
    const studentLogin = await request('/api/onboardstudents/login', { method: 'POST', body: JSON.stringify({ username: data.username, password: studentPassword }) });
    assert.equal(studentLogin.status, 200);
    assert.deepEqual(Object.keys(jwt.decode(studentLogin.body.token)).sort(), ['exp', 'iat', 'id', 'role', 'tokenVersion']);
    await db.collection('students').updateOne({ _id: student._id }, { $set: { isActive: false } });
    assert.equal((await request('/api/onboardstudents/login', { method: 'POST', body: JSON.stringify({ username: data.username, password: studentPassword }) })).status, 403);
    await db.collection('students').updateOne({ _id: student._id }, { $set: { isActive: true } });
    const studentHeaders = { authorization: `Bearer ${studentLogin.body.token}` };
    const concurrentStudent = await db.collection('students').findOne({ username: 'concurrent' });
    const revocationLogin = await request('/api/onboardstudents/login', { method: 'POST', body: JSON.stringify({ username: 'concurrent', password: studentPassword }) });
    assert.equal(revocationLogin.status, 200);
    const revokedHeaders = { authorization: `Bearer ${revocationLogin.body.token}` };
    assert.equal((await request(`/api/onboardstudents/${concurrentStudent._id}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ name: '$student', accessAllowed: 'granted' }) })).status, 200);
    assert.equal((await db.collection('students').findOne({ _id: concurrentStudent._id })).name, '$student');
    assert.equal((await request('/api/onboardstudents/profile', { headers: revokedHeaders })).status, 200);
    assert.equal((await request(`/api/onboardstudents/${concurrentStudent._id}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ accessAllowed: 'denied' }) })).status, 200);
    assert.equal((await request('/api/onboardstudents/profile', { headers: revokedHeaders })).status, 403);
    assert.equal((await request(`/api/onboardstudents/${concurrentStudent._id}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ accessAllowed: 'granted' }) })).status, 200);
    assert.equal((await request('/api/onboardstudents/profile', { headers: revokedHeaders })).status, 403);
    assert.equal((await request('/api/onboardstudents/login', { method: 'POST', body: JSON.stringify({ username: 'concurrent', password: studentPassword }) })).status, 200);
    const tracks = await request('/api/tracks', { headers: studentHeaders });
    assert.equal(tracks.status, 200);
    assert.deepEqual(tracks.body.map(track => track.name), ['Web Development', 'Java Programming', 'C# Programming', 'Python Programming', 'Robotics', 'Compukids', 'CompuTeens', 'Digital Entrepreneurship']);
    for (const path of ['/api/assessments/total', '/api/assessments/totals-by-program', '/api/assessments/totals-by-type']) {
      assert.equal((await request(path, { headers: studentHeaders })).status, 403);
      assert.equal((await request(path, { headers: adminHeaders })).status, 200);
    }
    assert.equal((await request('/api/modules', { headers: studentHeaders })).status, 404);
    const studentProfile = await request('/api/onboardstudents/profile', { headers: studentHeaders });
    assert.equal(studentProfile.status, 200);
    assert.equal(studentProfile.body.username, data.username);
    assert.equal(Object.hasOwn(studentProfile.body, 'password'), false);
    assert.equal((await request('/api/onboardstudents/profile', { headers: adminHeaders })).status, 403);
    const second = await db.collection('students').insertOne({ username: 'otherstudent', accessAllowed: 'granted', role: 'admin' });
    const secondToken = jwt.sign({ id: second.insertedId.toString(), role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    const secondHeaders = { authorization: `Bearer ${secondToken}` };
    assert.equal((await request('/api/auth/verify', { method: 'POST', headers: secondHeaders, body: JSON.stringify({ token: secondToken }) })).body.user.role, 'student');
    await db.collection('assessments').insertOne({ assessmentname: 'Unscoped private item' });
    assert.equal((await request('/api/addassignment/my-assignments', { headers: secondHeaders })).body.some(item => item.assessmentname === 'Unscoped private item'), false);
    const collisionToken = jwt.sign({ id: login.body.user.id, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    await db.collection('students').insertOne({ _id: new ObjectId(login.body.user.id), username: 'idcollision', accessAllowed: 'granted' });
    assert.equal((await request('/api/onboardstudents/profile', { headers: { authorization: `Bearer ${collisionToken}` } })).body.username, 'idcollision');
    assert.equal((await request('/api/events', { method: 'POST', headers: { authorization: `Bearer ${collisionToken}` }, body: '{}' })).status, 403);
    await db.collection('students').deleteOne({ _id: new ObjectId(login.body.user.id) });
    assert.equal((await request('/api/events', { method: 'POST', headers: studentHeaders, body: '{}' })).status, 403);
    assert.equal((await request('/api/projects', { method: 'POST', headers: studentHeaders, body: '{}' })).status, 403);
    assert.equal((await request('/api/assessments', { method: 'POST', headers: studentHeaders, body: '{}' })).status, 403);
    assert.equal((await request('/api/studentassignment', { headers: studentHeaders })).status, 403);
    assert.equal((await request('/api/mentordashboard/assigned-students', { headers: studentHeaders })).status, 403);
    assert.equal((await request('/api/addtask/507f1f77bcf86cd799439011', { method: 'DELETE', headers: studentHeaders })).status, 403);
    assert.equal((await request('/api/events', { headers: studentHeaders })).status, 200);
    await db.collection('students').updateOne({ _id: second.insertedId }, { $set: { program: 'Test', track: 'Other' } });
    const assessmentForm = new FormData();
    for (const [key, value] of Object.entries({ assessmentname: 'Local task', assessmenttype: 'task', program: 'Test', track: 'Test', dateadded: '2026-01-01', datedue: '2026-01-02' })) assessmentForm.append(key, value);
    assessmentForm.append('document', new Blob(['first document']), 'guide.txt');
    const assessmentResponse = await fetch(`${base}/api/assessments`, { method: 'POST', headers: adminHeaders, body: assessmentForm });
    assert.equal(assessmentResponse.status, 201);
    const assessment = await assessmentResponse.json();
    const taskList = await request('/api/assessments/tasks', { headers: studentHeaders });
    const savedAssessment = taskList.body.find(item => item._id === assessment.id);
    assert.ok(savedAssessment);
    const filePath = savedAssessment.documentLink;
    // A general flag must not override an explicit programme and track.
    await db.collection('assessments').updateOne({ _id: new ObjectId(assessment.id) }, { $set: { isGeneral: true } });
    assert.equal((await request(filePath)).status, 401);
    assert.equal((await request(filePath, { headers: secondHeaders })).status, 404);
    assert.equal((await request('/api/assessments/tasks', { headers: secondHeaders })).body.some(item => item._id === assessment.id), false);
    await db.collection('students').updateOne({ _id: second.insertedId }, { $set: { program: 'Other', track: 'Test' } });
    assert.equal((await request(filePath, { headers: secondHeaders })).status, 404);
    await db.collection('students').updateOne({ _id: second.insertedId }, { $set: { program: 'Test', track: 'Other' } });
    const download = await fetch(base + filePath, { headers: studentHeaders });
    assert.equal(download.status, 200);
    assert.equal(download.headers.get('content-type'), 'application/octet-stream');
    assert.equal(await download.text(), 'first document');
    const secondSocket = createServer();
    await new Promise(resolve => secondSocket.listen(0, '127.0.0.1', resolve));
    const secondPort = secondSocket.address().port;
    await new Promise(resolve => secondSocket.close(resolve));
    const restartedServer = spawn(process.execPath, ['render-server.js'], { cwd: process.cwd(), env: { ...env, PORT: String(secondPort) }, stdio: 'ignore' });
    try {
      let restartedDownload;
      for (let i = 0; i < 100; i++) {
        try { restartedDownload = await fetch(`http://127.0.0.1:${secondPort}${filePath}`, { headers: studentHeaders }); break; } catch {}
        if (restartedServer.exitCode !== null) throw new Error('Second server exited');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.ok(restartedDownload, 'Second server did not start');
      assert.equal(restartedDownload.status, 200);
      assert.equal(await restartedDownload.text(), 'first document');
    } finally { restartedServer.kill(); }
    assert.equal((await request('/api/assessments', { headers: secondHeaders })).body.length, 0);
    const editAssessmentForm = new FormData();
    editAssessmentForm.append('assessmentname', 'Updated local task');
    editAssessmentForm.append('document', new Blob(['replacement']), 'replacement.txt');
    const assessmentUpdate = await fetch(`${base}/api/assessments/${assessment.id}`, { method: 'PATCH', headers: adminHeaders, body: editAssessmentForm });
    assert.equal(assessmentUpdate.status, 200);
    assert.equal((await request(filePath, { headers: studentHeaders })).status, 404);
    const updatedAssessment = (await request('/api/assessments/tasks', { headers: studentHeaders })).body.find(item => item._id === assessment.id);
    assert.equal(await (await fetch(base + updatedAssessment.documentLink, { headers: studentHeaders })).text(), 'replacement');
    const invalidFile = new FormData();
    invalidFile.append('document', new Blob(['not allowed']), 'page.html');
    assert.equal((await fetch(`${base}/api/assessments/${assessment.id}`, { method: 'PATCH', headers: adminHeaders, body: invalidFile })).status, 400);
    assert.equal((await request(`/api/assessments/${assessment.id}`, { method: 'DELETE', headers: adminHeaders })).status, 200);
    assert.equal((await request(updatedAssessment.documentLink, { headers: studentHeaders })).status, 404);
    assert.equal(await db.collection('uploads.files').countDocuments(), 0);
    const resourceForm = new FormData();
    for (const [key, value] of Object.entries({ name: 'Resource', description: 'Local resource', program: 'Test', track: 'Test' })) resourceForm.append(key, value);
    resourceForm.append('document', new Blob(['resource content']), 'resource.txt');
    const resourceResponse = await fetch(`${base}/api/resources`, { method: 'POST', headers: adminHeaders, body: resourceForm });
    assert.equal(resourceResponse.status, 201);
    const resource = await resourceResponse.json();
    assert.equal(await (await fetch(base + resource.document.relativePath, { headers: studentHeaders })).text(), 'resource content');
    assert.equal((await request(resource.document.relativePath, { headers: secondHeaders })).status, 404);
    assert.equal((await request(`/api/resources/${resource._id}`, { method: 'PATCH', headers: studentHeaders, body: JSON.stringify({ program: '' }) })).status, 403);
    const resourceEdit = new FormData();
    resourceEdit.append('name', 'Updated resource');
    assert.equal((await fetch(`${base}/api/resources/${resource._id}`, { method: 'PATCH', headers: adminHeaders, body: resourceEdit })).status, 200);
    const updatedResource = await db.collection('resources').findOne({ _id: new ObjectId(resource._id) });
    assert.equal(updatedResource.name, 'Updated resource');
    assert.equal(updatedResource.program, 'Test');
    assert.equal(updatedResource.track, 'Test');
    assert.equal(updatedResource.description, 'Local resource');
    assert.equal(updatedResource.document.fileId.toString(), resource.document.fileId);
    assert.equal((await request(`/api/resources/${resource._id}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ program: {} }) })).status, 400);
    assert.equal(await (await fetch(base + resource.document.relativePath, { headers: studentHeaders })).text(), 'resource content');
    assert.equal((await request(resource.document.relativePath, { headers: secondHeaders })).status, 404);
    assert.equal((await request('/api/resources', { headers: secondHeaders })).body.some(item => item._id === resource._id), false);
    assert.equal((await request(`/api/resources/${resource._id}`, { method: 'DELETE', headers: studentHeaders })).status, 403);
    assert.equal((await request('/api/resources', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ websiteLink: 'javascript:alert(1)' }) })).status, 400);
    const replacementForm = new FormData();
    replacementForm.append('document', new Blob(['replacement resource']), 'replacement.txt');
    assert.equal((await fetch(`${base}/api/resources/${resource._id}`, { method: 'PATCH', headers: adminHeaders, body: replacementForm })).status, 200);
    const replacementResource = await db.collection('resources').findOne({ _id: new ObjectId(resource._id) });
    assert.equal((await request(resource.document.relativePath, { headers: studentHeaders })).status, 404);
    assert.equal(await (await fetch(base + replacementResource.document.relativePath, { headers: studentHeaders })).text(), 'replacement resource');
    assert.equal((await request(replacementResource.document.relativePath, { headers: secondHeaders })).status, 404);
    assert.equal((await request(`/api/resources/${resource._id}`, { method: 'DELETE', headers: adminHeaders })).status, 200);
    assert.equal((await request(replacementResource.document.relativePath, { headers: studentHeaders })).status, 404);
    assert.equal((await request(`/api/resources/${resource._id}`, { method: 'DELETE', headers: adminHeaders })).status, 404);
    assert.equal((await request(`/api/resources/${resource._id}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ name: 'Missing' }) })).status, 404);
    assert.equal(await db.collection('uploads.files').countDocuments(), 0);
    const scoped = await db.collection('assessments').insertMany([
      { assessmentname: 'Programme only', assessmenttype: 'task', program: 'Test' },
      { assessmentname: 'Track only', assessmenttype: 'task', track: 'Other' },
      { assessmentname: 'General', assessmenttype: 'task', isGeneral: true },
      { assessmentname: 'Flagged but scoped', assessmenttype: 'task', isGeneral: true, program: 'Test', track: 'Test' },
      { assessmentname: 'Flagged other programme', assessmenttype: 'task', isGeneral: true, program: 'Other' },
      { assessmentname: 'Both required', assessmenttype: 'task', program: 'Test', track: 'Test' }
    ]);
    const visibleToOther = (await request('/api/assessments/tasks', { headers: secondHeaders })).body.map(item => item.assessmentname);
    assert.deepEqual(visibleToOther.sort(), ['General', 'Programme only', 'Track only']);
    await db.collection('assessments').deleteMany({ _id: { $in: Object.values(scoped.insertedIds) } });
    assert.equal((await request('/api/onboardstudents/total-students')).status, 401);
    assert.equal((await request('/api/onboardstudents/total-students', { headers: studentHeaders })).status, 403);
    assert.equal((await request('/api/onboardstudents/total-students', { headers: adminHeaders })).status, 200);
    const event = { name: 'Test event', description: 'An event', date: '2026-12-01', type: 'Online', link: 'https://example.test/' };
    assert.equal((await request('/api/events', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ ...event, link: 'javascript:alert(1)' }) })).status, 400);
    const eventCreated = await request('/api/events', { method: 'POST', headers: adminHeaders, body: JSON.stringify(event) });
    assert.equal(eventCreated.status, 201);
    assert.equal((await request(`/api/events/${eventCreated.body.insertedId}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ name: 'Updated event' }) })).status, 200);
    assert.equal((await request('/api/events', { headers: studentHeaders })).body[0].name, 'Updated event');
    assert.equal((await request(`/api/events/${eventCreated.body.insertedId}`, { method: 'DELETE', headers: adminHeaders })).status, 200);
    const announcementBody = { title: 'Local notice', message: 'First announcement' };
    assert.equal((await request('/api/announcements')).status, 401);
    assert.equal((await request('/api/announcements', { method: 'POST', headers: studentHeaders, body: JSON.stringify(announcementBody) })).status, 403);
    assert.equal((await request('/api/announcements', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ title: {}, message: 'Invalid' }) })).status, 400);
    const announcement = await request('/api/announcements', { method: 'POST', headers: adminHeaders, body: JSON.stringify(announcementBody) });
    assert.equal(announcement.status, 201);
    const visibleAnnouncement = await request(`/api/announcements/${announcement.body.id}`, { headers: studentHeaders });
    assert.equal(visibleAnnouncement.body.title, 'Local notice');
    assert.equal(visibleAnnouncement.body.author, 'securityadmin');
    assert.equal((await request(`/api/announcements/${announcement.body.id}`, { method: 'PUT', headers: studentHeaders, body: JSON.stringify({ title: 'Forbidden' }) })).status, 403);
    assert.equal((await request(`/api/announcements/${announcement.body.id}`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ title: 'Updated notice' }) })).status, 200);
    assert.equal((await request('/api/announcements', { headers: studentHeaders })).body[0].title, 'Updated notice');
    assert.equal((await request(`/api/announcements/${announcement.body.id}`, { method: 'DELETE', headers: adminHeaders })).status, 200);
    assert.equal((await request(`/api/announcements/${announcement.body.id}`, { headers: studentHeaders })).status, 404);
    await db.collection('projects').insertMany([{ program: 'a.*', title: 'literal' }, { program: 'abc', title: 'other' }]);
    for (const path of ['/api/cohorts', '/api/mentorship', '/api/internship', '/api/skillsdevelopment', '/api/projects']) {
      assert.equal((await request(path, { headers: studentHeaders })).status, 403);
    }
    const projectsByLiteral = await request('/api/projects?program=a.*', { headers: adminHeaders });
    assert.equal(projectsByLiteral.body.length, 1);
    assert.equal(projectsByLiteral.body[0].title, 'literal');
    assert.equal((await request('/api/help-requests')).status, 401);
    assert.equal((await request('/api/help-requests', { method: 'POST', headers: studentHeaders, body: '{}' })).status, 400);
    assert.equal((await request('/api/help-requests/not-an-id', { headers: studentHeaders })).status, 400);
    const help = await request('/api/help-requests', { method: 'POST', headers: studentHeaders, body: JSON.stringify({ topic: 'Need help', area: 'Course', description: 'Question' }) });
    assert.equal(help.status, 201, JSON.stringify(help.body));
    await db.collection('mentors').insertOne({ _id: student._id, username: 'collisionmentor', isActive: true });
    const collisionMentorToken = jwt.sign({ id: student._id.toString(), role: 'mentor' }, env.JWT_SECRET, { expiresIn: '1h' });
    const collisionMentorHeaders = { authorization: `Bearer ${collisionMentorToken}` };
    assert.equal((await request('/api/help-requests', { headers: collisionMentorHeaders })).body.length, 0);
    assert.equal((await request(`/api/help-requests/${help.body.id}`, { headers: collisionMentorHeaders })).status, 404);
    assert.equal((await request(`/api/help-requests/${help.body.id}`, { method: 'PUT', headers: collisionMentorHeaders, body: JSON.stringify({ status: 'closed' }) })).status, 404);
    assert.equal((await request(`/api/help-requests/${help.body.id}`, { method: 'DELETE', headers: collisionMentorHeaders })).status, 404);
    await db.collection('mentors').deleteOne({ _id: student._id });
    assert.equal((await request('/api/help-requests', { headers: studentHeaders })).body.length, 1);
    assert.equal((await request('/api/help-requests', { headers: secondHeaders })).body.length, 0);
    assert.equal((await request(`/api/help-requests/${help.body.id}`, { headers: secondHeaders })).status, 404);
    assert.equal((await request(`/api/help-requests/${help.body.id}`, { method: 'PUT', headers: secondHeaders, body: JSON.stringify({ status: 'closed' }) })).status, 404);
    assert.equal((await request(`/api/help-requests/${help.body.id}`, { method: 'DELETE', headers: secondHeaders })).status, 404);
    assert.equal((await request('/api/help-requests/admin', { headers: secondHeaders })).status, 403);
    assert.equal((await request('/api/help-requests/approve', { method: 'PUT', headers: secondHeaders, body: JSON.stringify({ id: help.body.id }) })).status, 403);
    assert.equal((await request('/api/help-requests/admin', { headers: adminHeaders })).body.length, 1);
    assert.equal((await request('/api/help-requests/approve', { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ id: 'invalid' }) })).status, 400);
    assert.equal((await request('/api/help-requests/approve', { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ id: help.body.id }) })).status, 200);
    assert.equal((await request(`/api/help-requests/${help.body.id}`, { headers: studentHeaders })).body.status, 'approved');
    assert.equal((await request(`/api/help-requests/${help.body.id}`, { method: 'PUT', headers: studentHeaders, body: JSON.stringify({ status: 'approved' }) })).status, 400);
    assert.equal((await request(`/api/help-requests/admin/${help.body.id}`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ status: 'open', adminNote: 'Review' }) })).status, 200);
    assert.equal((await request('/api/help-requests/reject', { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ id: help.body.id }) })).status, 200);
    assert.equal((await request('/api/help-requests/resolve', { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ id: help.body.id }) })).status, 200);
    assert.equal((await request(`/api/help-requests/${help.body.id}`, { method: 'PUT', headers: studentHeaders, body: JSON.stringify({ status: 'resolved' }) })).status, 200);
    assert.equal((await request(`/api/help-requests/${help.body.id}`, { method: 'DELETE', headers: studentHeaders })).status, 200);
    assert.equal((await request(`/api/help-requests/${help.body.id}`, { headers: studentHeaders })).status, 404);
    const mentorData = { name: 'Test', surname: 'Mentor', email: 'mentor@example.test', cellnumber: '0123456789', username: 'testmentor', password: 'mentor-test-password' };
    assert.equal((await request('/api/onboardmentors')).status, 401);
    assert.equal((await request('/api/onboardmentors/not-an-id', { method: 'DELETE', headers: adminHeaders })).status, 400);
    assert.equal((await request(`/api/onboardmentors/${new ObjectId()}`, { method: 'DELETE', headers: adminHeaders })).status, 404);
    const temporaryMentor = await db.collection('mentors').insertOne({ username: 'temporarymentor' });
    assert.equal((await request(`/api/onboardmentors/${temporaryMentor.insertedId}`, { method: 'DELETE', headers: studentHeaders })).status, 403);
    assert.equal((await request(`/api/onboardmentors/${temporaryMentor.insertedId}`, { method: 'DELETE', headers: adminHeaders })).status, 200);
    assert.equal(await db.collection('mentors').countDocuments({ _id: temporaryMentor.insertedId }), 0);
    assert.equal((await request('/api/onboardmentors/onboardmentor', { method: 'POST', headers: studentHeaders, body: JSON.stringify(mentorData) })).status, 403);
    const mentorCreate = await request('/api/onboardmentors/onboardmentor', { method: 'POST', headers: adminHeaders, body: JSON.stringify(mentorData) });
    assert.equal(mentorCreate.status, 201);
    const mentorRecord = await db.collection('mentors').findOne({ username: mentorData.username });
    assert.deepEqual((await request('/api/onboardmentors/mentors-by-track', { headers: adminHeaders })).body.mentorsByTrack, {});
    assert.notEqual(mentorRecord.password, mentorData.password);
    assert.equal(await bcrypt.compare(mentorData.password, mentorRecord.password), true);
    const mentors = await request('/api/onboardmentors', { headers: adminHeaders });
    assert.ok(mentors.body.every(item => !Object.hasOwn(item, 'password')));
    const mentorLogin = await request('/api/onboardmentors/login', { method: 'POST', body: JSON.stringify({ username: mentorData.username, password: mentorData.password }) });
    assert.equal(mentorLogin.status, 200);
    assert.deepEqual(Object.keys(jwt.decode(mentorLogin.body.token)).sort(), ['exp', 'iat', 'id', 'role', 'tokenVersion']);
    const mentorHeaders = { authorization: `Bearer ${mentorLogin.body.token}` };
    assert.equal((await request('/api/mentorstudentassignment/student', { headers: mentorHeaders })).status, 403);
    assert.equal((await request('/api/mentordashboard/assigned-students', { headers: mentorHeaders })).status, 200);
    const mentorProfile = await request('/api/mentordashboard/profile', { headers: mentorHeaders });
    assert.equal(mentorProfile.status, 200);
    assert.equal(Object.hasOwn(mentorProfile.body, 'password'), false);
    const updatedProfile = await request('/api/mentordashboard/profile', { method: 'PUT', headers: mentorHeaders, body: JSON.stringify({ name: 'Updated Mentor', email: 'updated@example.test', specialization: 'Web', bio: 'Mentor bio', password: 'should-not-change', role: 'admin' }) });
    assert.equal(updatedProfile.status, 200);
    assert.equal(updatedProfile.body.name, 'Updated Mentor');
    const mentorAfterProfile = await db.collection('mentors').findOne({ _id: mentorRecord._id });
    assert.equal(mentorAfterProfile.password, mentorRecord.password);
    assert.equal(mentorAfterProfile.role, undefined);
    await db.collection('mentors').insertOne({ username: 'other-email', email: 'reserved@example.test' });
    const duplicateProfile = await request('/api/mentordashboard/profile', { method: 'PUT', headers: mentorHeaders, body: JSON.stringify({ name: 'Updated Mentor', email: 'RESERVED@example.test' }) });
    assert.equal(duplicateProfile.status, 409);
    const updateMentor = await request(`/api/onboardmentors/${mentorCreate.body.mentorId}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ ...mentorData, password: '' }) });
    assert.equal(updateMentor.status, 200);
    assert.equal((await db.collection('mentors').findOne({ username: mentorData.username })).password, mentorRecord.password);
    assert.equal(logs.includes(mentorData.password), false);
    assert.equal(logs.includes('private-student@example.test'), false);
    assert.equal(logs.includes('private-origin.example.test'), false);
    assert.equal((await request('/api/mentorstudentassignment/all', { headers: studentHeaders })).status, 403);
    assert.equal((await request('/api/mentorstudentassignment/student', { method: 'POST', headers: studentHeaders, body: '{}' })).status, 403);
    assert.equal((await request('/api/addassignment/507f1f77bcf86cd799439011', { method: 'DELETE', headers: studentHeaders })).status, 403);
    const assignment = { assignmentname: 'Test', assignmenttype: 'Project', dateadded: '2026-01-01', datedue: '2026-01-02', track: 'Test', program: 'Test' };
    const assignmentCreated = await request('/api/addassignment', { method: 'POST', headers: adminHeaders, body: JSON.stringify(assignment) });
    assert.equal(assignmentCreated.status, 201, JSON.stringify(assignmentCreated.body));
    assert.equal((await request(`/api/addassignment/${assignmentCreated.body.id}`, { method: 'DELETE', headers: adminHeaders })).status, 200);
    const mentor = await db.collection('mentors').insertOne({ name: 'Test' });
    const tooMany = await request('/api/mentorstudentassignment/student', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ mentorIds: Array(21).fill(mentor.insertedId.toString()), studentIds: Array(50).fill(student._id.toString()) }) });
    assert.equal(tooMany.status, 400);
    assert.equal((await request('/api/mentorstudentassignment/student', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ mentorIds: [], studentIds: [student._id] }) })).status, 400);
    const linked = await request('/api/mentorstudentassignment/student', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ mentorIds: [mentor.insertedId], studentIds: [student._id] }) });
    assert.equal(linked.status, 200);
    assert.equal(linked.body.results.successful.length, 1);
    assert.equal((await request('/api/mentorstudentassignment/all', { headers: adminHeaders })).status, 200);
    const nonexistent = await request('/api/mentorstudentassignment/student', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ mentorIds: [mentorRecord._id], studentIds: [new ObjectId()] }) });
    assert.equal(nonexistent.body.results.errors.length, 1);
    const simultaneousLinks = await Promise.all([1, 2].map(() => request('/api/mentorstudentassignment/student', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ mentorIds: [mentorRecord._id], studentIds: [student._id] }) })));
    assert.deepEqual(simultaneousLinks.map(result => result.body.results.successful.length).sort(), [0, 1]);
    assert.equal(simultaneousLinks.reduce((total, result) => total + result.body.results.alreadyAssigned.length, 0), 1);
    const extraStudent = await db.collection('students').insertOne({ username: 'metricstudent', track: 'Test' });
    await db.collection('mentor_assignments').insertOne({ mentorId: mentorRecord._id, studentId: extraStudent.insertedId, status: 'active' });
    assert.equal((await request('/api/onboardmentors/mentors-by-track', { headers: adminHeaders })).body.mentorsByTrack.Test, 2);
    await db.collection('mentor_assignments').deleteOne({ mentorId: mentorRecord._id, studentId: extraStudent.insertedId });
    await db.collection('students').deleteOne({ _id: extraStudent.insertedId });
    const assigned = await request('/api/mentordashboard/assigned-students', { headers: mentorHeaders });
    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.length, 1);
    assert.equal(assigned.body[0].studentId, student._id.toString());
    assert.equal(Object.hasOwn(assigned.body[0], 'password'), false);
    const secondMentorToken = jwt.sign({ id: mentor.insertedId.toString(), role: 'mentor' }, env.JWT_SECRET, { expiresIn: '1h' });
    const secondMentorHeaders = { authorization: `Bearer ${secondMentorToken}` };
    const mentorResourceForm = new FormData();
    for (const [key, value] of Object.entries({ title: 'Mentor guide', description: 'Local guide', type: 'document', course: 'Test' })) mentorResourceForm.append(key, value);
    mentorResourceForm.append('document', new Blob(['mentor document']), 'guide.txt');
    const mentorResourceResponse = await fetch(`${base}/api/mentordashboard/resources`, { method: 'POST', headers: mentorHeaders, body: mentorResourceForm });
    assert.equal(mentorResourceResponse.status, 201);
    const mentorResource = await mentorResourceResponse.json();
    assert.equal((await request('/api/assessments/resources', { headers: studentHeaders })).body.some(item => item._id === mentorResource.id), true);
    assert.equal((await request('/api/assessments/resources', { headers: secondHeaders })).body.some(item => item._id === mentorResource.id), false);
    assert.equal(await (await fetch(base + mentorResource.document.relativePath, { headers: studentHeaders })).text(), 'mentor document');
    assert.equal((await request(mentorResource.document.relativePath, { headers: secondHeaders })).status, 404);
    assert.equal((await request(mentorResource.document.relativePath, { headers: secondMentorHeaders })).status, 404);
    assert.equal((await request(`/api/mentordashboard/resources/${mentorResource.id}`, { method: 'DELETE', headers: secondMentorHeaders })).status, 404);
    assert.equal((await request(`/api/mentordashboard/resources/${mentorResource.id}`, { method: 'DELETE', headers: mentorHeaders })).status, 200);
    assert.equal((await request(mentorResource.document.relativePath, { headers: studentHeaders })).status, 404);
    const taskInput = { title: 'Mentor task', assignedTo: student._id.toString(), mentorId: mentor.insertedId.toString(), status: 'pending' };
    const task = await request('/api/mentordashboard/tasks', { method: 'POST', headers: mentorHeaders, body: JSON.stringify(taskInput) });
    assert.equal(task.status, 201);
    assert.equal(task.body.mentorId, mentorRecord._id.toString());
    assert.equal((await request('/api/mentordashboard/tasks', { headers: secondMentorHeaders })).body.length, 0);
    assert.equal((await request(`/api/mentordashboard/tasks/${task.body.id}`, { method: 'PUT', headers: secondMentorHeaders, body: JSON.stringify({ title: 'Not yours' }) })).status, 404);
    assert.equal((await request(`/api/mentordashboard/tasks/${task.body.id}`, { method: 'DELETE', headers: secondMentorHeaders })).status, 404);
    assert.equal((await request('/api/mentordashboard/tasks', { method: 'POST', headers: mentorHeaders, body: JSON.stringify({ title: 'Unassigned', assignedTo: second.insertedId.toString() }) })).status, 403);
    assert.equal((await request(`/api/mentordashboard/tasks/${task.body.id}`, { method: 'PUT', headers: mentorHeaders, body: JSON.stringify({ ...taskInput, title: 'Updated task' }) })).body.title, 'Updated task');
    assert.equal((await request(`/api/mentordashboard/tasks/${task.body.id}`, { method: 'DELETE', headers: mentorHeaders })).status, 200);
    for (const type of ['assignments', 'projects']) {
      const createdItem = await request(`/api/mentordashboard/${type}`, { method: 'POST', headers: mentorHeaders, body: JSON.stringify({ title: `Mentor ${type}` }) });
      assert.equal(createdItem.status, 201);
      if (type === 'projects') {
        const managementProjects = await request('/api/projects', { headers: adminHeaders });
        assert.equal(managementProjects.body.some(item => item._id === createdItem.body.id), false);
      }
      assert.equal((await request(`/api/mentordashboard/${type}/${createdItem.body.id}`, { method: 'DELETE', headers: secondMentorHeaders })).status, 404);
      assert.equal((await request(`/api/mentordashboard/${type}/${createdItem.body.id}`, { method: 'DELETE', headers: mentorHeaders })).status, 200);
    }
    const resetSocket = createServer();
    await new Promise(resolve => resetSocket.listen(0, '127.0.0.1', resolve));
    const resetPort = resetSocket.address().port;
    await new Promise(resolve => resetSocket.close(resolve));
    const resetServer = spawn(process.execPath, ['render-server.js'], { cwd: process.cwd(), env: { ...env, PORT: String(resetPort) }, stdio: 'ignore' });
    const resetBase = `http://127.0.0.1:${resetPort}`;
    const resetRequest = async (path, options = {}) => {
      const response = await fetch(resetBase + path, { ...options, headers: { 'content-type': 'application/json', ...options.headers } });
      return { status: response.status, body: await response.json() };
    };
    try {
      for (let i = 0; i < 100; i++) {
        try { if ((await resetRequest('/api/ready')).status === 200) break; } catch {}
        if (resetServer.exitCode !== null || i === 99) throw new Error('Reset test server did not start');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const mentorReset = await resetRequest(`/api/password-reset/issue/mentor/${mentorRecord._id}`, { method: 'POST', headers: adminHeaders });
      assert.equal(mentorReset.status, 200);
      const mentorListing = await resetRequest('/api/onboardmentors', { headers: adminHeaders });
      assert.ok(mentorListing.body.every(item => !Object.hasOwn(item, 'passwordResetHash')));
      const newMentorPassword = 'replacement-mentor-password';
      assert.equal((await resetRequest('/api/password-reset/redeem', { method: 'POST', body: JSON.stringify({ token: mentorReset.body.token, password: newMentorPassword }) })).status, 200);
      assert.equal((await resetRequest('/api/mentordashboard/tasks', { headers: mentorHeaders })).status, 403);
      const currentMentorLogin = await resetRequest('/api/onboardmentors/login', { method: 'POST', body: JSON.stringify({ username: mentorData.username, password: newMentorPassword }) });
      assert.equal(currentMentorLogin.status, 200);
      const unusedReset = await resetRequest(`/api/password-reset/issue/mentor/${mentorRecord._id}`, { method: 'POST', headers: adminHeaders });
      const adminSetPassword = 'admin-set-mentor-password';
      assert.equal((await resetRequest(`/api/onboardmentors/${mentorRecord._id}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ ...mentorData, password: adminSetPassword }) })).status, 200);
      assert.equal((await resetRequest('/api/mentordashboard/profile', { headers: { authorization: `Bearer ${currentMentorLogin.body.token}` } })).status, 403);
      assert.equal((await resetRequest('/api/password-reset/redeem', { method: 'POST', body: JSON.stringify({ token: unusedReset.body.token, password: 'other-new-mentor-password' }) })).status, 400);
      assert.equal((await resetRequest('/api/onboardmentors/login', { method: 'POST', body: JSON.stringify({ username: mentorData.username, password: adminSetPassword }) })).status, 200);
      for (let i = 0; i < 10; i++) {
        const send = i % 2 ? request : resetRequest;
        assert.equal((await send('/api/onboardmentors/login', { method: 'POST', body: JSON.stringify({ username: 'unknown', password: 'invalid-password' }) })).status, 401);
      }
      assert.equal((await resetRequest('/api/onboardmentors/login', { method: 'POST', body: JSON.stringify({ username: 'unknown', password: 'invalid-password' }) })).status, 429);
      const counters = await db.collection('rate_limits').find({ _id: /^mentor-login:/ }).toArray();
      assert.equal(counters.length, 1);
      assert.equal(counters[0].totalHits, 11);
      assert.equal(counters[0]._id.includes('127.0.0.1'), false);
      await db.collection('rate_limits').updateOne({ _id: counters[0]._id }, { $set: { resetTime: new Date(0) } });
      assert.equal((await request('/api/onboardmentors/login', { method: 'POST', body: JSON.stringify({ username: 'unknown', password: 'invalid-password' }) })).status, 401);
    } finally { resetServer.kill(); }
    assert.equal((await request('/api/onboardstudents', { headers: { authorization: `Bearer ${studentLogin.body.token}` } })).status, 403);
    const listing = await request('/api/onboardstudents', { headers: adminHeaders });
    assert.equal(listing.status, 200);
    assert.ok(listing.body.every(item => !Object.hasOwn(item, 'password')));
    assert.equal((await request(`/api/password-reset/issue/${second.insertedId}`, { method: 'POST' })).status, 401);
    assert.equal((await request(`/api/password-reset/issue/${second.insertedId}`, { method: 'POST', headers: studentHeaders })).status, 403);
    const expiredReset = await request(`/api/password-reset/issue/${second.insertedId}`, { method: 'POST', headers: adminHeaders });
    assert.equal(expiredReset.status, 200);
    const storedReset = await db.collection('students').findOne({ _id: second.insertedId });
    assert.notEqual(storedReset.passwordResetHash, expiredReset.body.token);
    const listDuringReset = await request('/api/onboardstudents', { headers: adminHeaders });
    assert.ok(listDuringReset.body.every(item => !Object.hasOwn(item, 'passwordResetHash')));
    await db.collection('students').updateOne({ _id: second.insertedId }, { $set: { passwordResetExpiresAt: new Date(0) } });
    const newPassword = 'replacement-password-123';
    assert.equal((await request('/api/password-reset/redeem', { method: 'POST', body: JSON.stringify({ token: expiredReset.body.token, password: newPassword }) })).status, 400);
    const reset = await request(`/api/password-reset/issue/${second.insertedId}`, { method: 'POST', headers: adminHeaders });
    assert.equal(reset.status, 200);
    assert.equal((await request('/api/password-reset/redeem', { method: 'POST', body: JSON.stringify({ token: reset.body.token, password: newPassword }) })).status, 200);
    assert.equal((await request('/api/password-reset/redeem', { method: 'POST', body: JSON.stringify({ token: reset.body.token, password: newPassword }) })).status, 400);
    assert.equal((await request('/api/help-requests', { headers: secondHeaders })).status, 403);
    assert.equal((await request('/api/onboardstudents/login', { method: 'POST', body: JSON.stringify({ username: 'otherstudent', password: newPassword }) })).status, 200);
    assert.equal(logs.includes(reset.body.token), false);
    assert.equal(logs.includes(newPassword), false);
    await db.collection('students').updateOne({ _id: student._id }, { $set: { accessAllowed: 'denied' } });
    assert.equal((await request('/api/help-requests', { headers: studentHeaders })).status, 403);
    assert.equal((await request('/api/auth/verify', { method: 'POST', headers: studentHeaders, body: JSON.stringify({ token: studentLogin.body.token }) })).status, 403);
    assert.equal((await request('/api/onboardstudents/login', { method: 'POST', body: JSON.stringify({ username: data.username, password: studentPassword }) })).status, 403);
    assert.equal(logs.includes(adminPassword), false);
    assert.equal(logs.includes(studentPassword), false);
    const recoveredAdminPassword = 'recovered-admin-password';
    const recover = spawn(process.execPath, ['recover-admin.mjs'], { cwd: process.cwd(), env: { ...env, RECOVER_ADMIN_USERNAME: 'securityadmin' }, stdio: ['pipe', 'pipe', 'pipe'] });
    let recoverOutput = '';
    recover.stdout.on('data', data => { recoverOutput += data; });
    recover.stderr.on('data', data => { recoverOutput += data; });
    recover.stdin.end(`${recoveredAdminPassword}\n`);
    assert.equal(await new Promise(resolve => recover.on('close', resolve)), 0);
    assert.equal(recoverOutput.includes(recoveredAdminPassword), false);
    assert.equal((await request('/api/onboardstudents', { headers: adminHeaders })).status, 403);
    const recoveredAdmin = await db.collection('admins').findOne({ username: 'securityadmin' });
    assert.equal(await bcrypt.compare(recoveredAdminPassword, recoveredAdmin.password), true);
    const replacementAdminToken = jwt.sign({ id: recoveredAdmin._id.toString(), username: recoveredAdmin.username, role: 'admin', tokenVersion: recoveredAdmin.tokenVersion }, env.JWT_SECRET, { expiresIn: '1h' });
    assert.equal((await request('/api/onboardstudents', { headers: { authorization: `Bearer ${replacementAdminToken}` } })).status, 200);
    const recoverySocket = createServer();
    await new Promise(resolve => recoverySocket.listen(0, '127.0.0.1', resolve));
    const recoveryPort = recoverySocket.address().port;
    await new Promise(resolve => recoverySocket.close(resolve));
    const recoveryServer = spawn(process.execPath, ['render-server.js'], { cwd: process.cwd(), env: { ...env, PORT: String(recoveryPort) }, stdio: 'ignore' });
    try {
      let recoveredLogin;
      for (let i = 0; i < 100; i++) {
        try {
          recoveredLogin = await fetch(`http://127.0.0.1:${recoveryPort}/api/auth/admin-login`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'securityadmin', password: recoveredAdminPassword })
          });
          break;
        } catch {}
        if (recoveryServer.exitCode !== null || i === 99) throw new Error('Recovery test server did not start');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(recoveredLogin.status, 200);
    } finally { recoveryServer.kill(); }

    const alternateSocket = createServer();
    await new Promise(resolve => alternateSocket.listen(0, '127.0.0.1', resolve));
    const alternatePort = alternateSocket.address().port;
    await new Promise(resolve => alternateSocket.close(resolve));
    const alternate = spawn(process.execPath, ['server.mjs'], { cwd: process.cwd(), env: { ...env, PORT: String(alternatePort) }, stdio: ['ignore', 'pipe', 'pipe'] });
    let alternateLogs = '';
    alternate.stdout.on('data', data => { alternateLogs += data; });
    alternate.stderr.on('data', data => { alternateLogs += data; });
    try {
      const alternateBase = `http://127.0.0.1:${alternatePort}`;
      let response;
      for (let i = 0; i < 100; i++) {
        try { response = await fetch(`${alternateBase}/api/not-found/private-student@example.test?token=private-token`); break; } catch {}
        if (alternate.exitCode !== null || i === 99) throw new Error('Alternate test server did not start');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(response.status, 404);
      const corsResponse = await fetch(`${alternateBase}/api/welcome`, { headers: { origin: 'https://private-origin.example.test' } });
      assert.equal(corsResponse.status, 403);
      assert.deepEqual(await corsResponse.json(), { error: 'CORS Error' });
      assert.equal((await fetch(`${alternateBase}/api/welcome`)).status, 200);
      assert.deepEqual(await (await fetch(`${alternateBase}/api/health`)).json(), { status: 'healthy' });
      assert.equal((await fetch(`${alternateBase}/api/status`)).status, 401);
      assert.equal((await fetch(`${alternateBase}/api/status`, { headers: { Authorization: `Bearer ${replacementAdminToken}` } })).status, 200);
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.doesNotMatch(alternateLogs, /private-student@example\.test|private-token|private-origin\.example\.test/);
    } finally { alternate.kill(); }

    const entrySocket = createServer();
    await new Promise(resolve => entrySocket.listen(0, '127.0.0.1', resolve));
    const entryPort = entrySocket.address().port;
    await new Promise(resolve => entrySocket.close(resolve));
    const legacyEntry = spawn(process.execPath, ['index.mjs'], { cwd: process.cwd(), env: { ...env, PORT: String(entryPort) }, stdio: 'ignore' });
    try {
      let health;
      for (let i = 0; i < 100; i++) {
        try { health = await fetch(`http://127.0.0.1:${entryPort}/api/health`); break; } catch {}
        if (legacyEntry.exitCode !== null || i === 99) throw new Error('Legacy entry point did not start');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(health.status, 200);
    } finally { legacyEntry.kill(); }
  } finally {
    server.kill();
    await client.db(dbName).dropDatabase();
    await client.close();
  }
});

test('readiness fails closed when the database is not configured', async () => {
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const server = spawn(process.execPath, ['render-server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, ATLAS_URI: '', DB_NAME: 'ontrack_readiness_test', PORT: String(port), NODE_ENV: 'production', JWT_SECRET: 'local-test-secret-that-is-longer-than-32-bytes' },
    stdio: 'ignore'
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    let response;
    for (let i = 0; i < 100; i++) {
      try { response = await fetch(`${base}/api/ready`); break; } catch {}
      if (server.exitCode !== null) throw new Error('Server exited before readiness check');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(response, 'Server did not start');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: 'not_ready' });
    const login = await fetch(`${base}/api/auth/admin-login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'test', password: 'test-password' })
    });
    assert.equal(login.status, 503);
  } finally { server.kill(); }
});
