import { ObjectId } from 'mongodb';
import db from '../db/conn.mjs';
import * as files from './fileStorage.mjs';

const collection = async name => (await db()).collection(name);
const contentCollections = {
  tasks: 'mentor_tasks',
  assignments: 'mentor_assignment_content',
  projects: 'mentor_projects',
  resources: 'mentor_resources'
};
const toResponse = ({ _id, ...item }) => ({ id: _id.toString(), ...item });

export async function profile(mentorId) {
  const user = await (await collection('mentors')).findOne(
    { _id: new ObjectId(mentorId) },
    { projection: { name: 1, surname: 1, username: 1, email: 1, specialization: 1, bio: 1 } }
  );
  return user ? toResponse(user) : null;
}

export async function updateProfile(mentorId, fields) {
  const mentors = await collection('mentors');
  const result = await mentors.updateOne({ _id: new ObjectId(mentorId) }, { $set: { ...fields, updatedAt: new Date() } });
  return result.matchedCount ? profile(mentorId) : null;
}

export async function assignedStudents(mentorId) {
  const database = await db();
  const assignments = await database.collection('mentor_assignments').find({ mentorId: new ObjectId(mentorId), status: 'active' }).toArray();
  const students = await database.collection('students').find(
    { _id: { $in: assignments.map(item => item.studentId) } },
    { projection: { name: 1, surname: 1, email: 1, program: 1, track: 1 } }
  ).toArray();
  return students.map(student => ({
    id: student._id.toString(), studentId: student._id.toString(),
    name: `${student.name || ''} ${student.surname || ''}`.trim() || 'Unknown Student',
    email: student.email || '', program: student.program || 'Not specified',
    track: student.track || 'Not specified', progress: null, status: 'active'
  }));
}

export async function isAssigned(mentorId, studentId) {
  if (!ObjectId.isValid(studentId)) return false;
  return !!await (await collection('mentor_assignments')).findOne({
    mentorId: new ObjectId(mentorId), studentId: new ObjectId(studentId), status: 'active'
  });
}

export async function list(type, mentorId) {
  return (await (await collection(contentCollections[type])).find({ mentorId }).toArray()).map(toResponse);
}

export async function create(type, mentorId, fields) {
  const doc = { ...fields, mentorId, createdAt: new Date(), updatedAt: new Date() };
  const result = await (await collection(contentCollections[type])).insertOne(doc);
  return toResponse({ ...doc, _id: result.insertedId });
}

export async function update(type, mentorId, id, fields) {
  const filter = { _id: new ObjectId(id), mentorId };
  const docs = await collection(contentCollections[type]);
  const result = await docs.updateOne(filter, { $set: { ...fields, updatedAt: new Date() } });
  if (!result.matchedCount) return null;
  return toResponse(await docs.findOne(filter));
}

export async function remove(type, mentorId, id) {
  const result = await (await collection(contentCollections[type])).deleteOne({ _id: new ObjectId(id), mentorId });
  return result.deletedCount > 0;
}

export async function createResource(mentorId, fields, file) {
  const database = await db();
  const document = await files.store(database, file);
  try {
    const doc = { ...fields, document, mentorId, createdAt: new Date(), updatedAt: new Date() };
    const result = await database.collection(contentCollections.resources).insertOne(doc);
    return toResponse({ ...doc, _id: result.insertedId });
  } catch (error) {
    await files.remove(database, document).catch(() => {});
    throw error;
  }
}

export async function deleteResource(mentorId, id) {
  const database = await db();
  const resources = database.collection(contentCollections.resources);
  const filter = { _id: new ObjectId(id), mentorId };
  const resource = await resources.findOne(filter);
  if (!resource) return false;
  const result = await resources.deleteOne(filter);
  if (!result.deletedCount) return false;
  await files.remove(database, resource.document).catch(() => console.error('Failed to remove deleted file'));
  return true;
}
