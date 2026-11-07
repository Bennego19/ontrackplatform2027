import { ObjectId } from 'mongodb';
import db from '../db/conn.mjs';

const collection = async () => (await db()).collection('help_requests');
const toResponse = ({ _id, ...item }) => ({ id: _id, ...item });
const owner = (userId, accountType) => ({ 'createdBy.id': userId, 'createdBy.accountType': accountType });

export async function listAll() {
  const results = await (await collection()).find({}).sort({ createdAt: -1 }).toArray();
  return results.map(toResponse);
}

export async function listOwn(userId, accountType) {
  const results = await (await collection()).find(owner(userId, accountType)).sort({ createdAt: -1 }).toArray();
  return results.map(toResponse);
}

export async function create(input, user, accountType) {
  const now = new Date();
  const doc = {
    topic: input.topic.trim(), area: input.area.trim(), description: input.description.trim(),
    availability: input.availability?.trim() || null, contactPreference: input.contactPreference?.trim() || null,
    status: 'open', helpfulCount: 0,
    createdBy: { id: user._id.toString(), accountType, username: user.username, name: user.name || user.username, email: user.email },
    createdAt: now, updatedAt: now
  };
  const result = await (await collection()).insertOne(doc);
  return { id: result.insertedId, ...doc };
}

export async function getOwn(id, userId, accountType) {
  const item = await (await collection()).findOne({ _id: new ObjectId(id), ...owner(userId, accountType) });
  return item ? toResponse(item) : null;
}

export async function updateAsAdmin(id, values) {
  const result = await (await collection()).updateOne(
    { _id: new ObjectId(id) }, { $set: { ...values, updatedAt: new Date() } }
  );
  return result.matchedCount > 0;
}

export async function updateOwn(id, userId, accountType, { status, markHelpful }) {
  const update = { $set: { updatedAt: new Date(), ...(status !== undefined ? { status } : {}) } };
  if (markHelpful === true) update.$inc = { helpfulCount: 1 };
  const result = await (await collection()).updateOne({ _id: new ObjectId(id), ...owner(userId, accountType) }, update);
  return result.matchedCount > 0;
}

export async function deleteOwn(id, userId, accountType) {
  const result = await (await collection()).deleteOne({ _id: new ObjectId(id), ...owner(userId, accountType) });
  return result.deletedCount > 0;
}
