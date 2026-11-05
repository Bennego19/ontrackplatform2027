import { ObjectId } from 'mongodb';
import db from '../db/conn.mjs';

const events = async () => (await db()).collection('events');

export async function list() {
  return (await events()).find({}).toArray();
}

export async function create(fields) {
  const result = await (await events()).insertOne({ ...fields, createdAt: new Date() });
  return result.insertedId;
}

export async function update(id, fields) {
  const result = await (await events()).updateOne({ _id: new ObjectId(id) }, { $set: { ...fields, updatedAt: new Date() } });
  return result.matchedCount > 0;
}

export async function remove(id) {
  const result = await (await events()).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}
