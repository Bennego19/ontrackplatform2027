import { ObjectId } from 'mongodb';
import db from '../db/conn.mjs';

const collection = async () => (await db()).collection('announcements');
export async function list() { return (await collection()).find({}).sort({ postedAt: -1 }).toArray(); }
export async function get(id) { return (await collection()).findOne({ _id: new ObjectId(id) }); }
export async function create(values, author) {
  const result = await (await collection()).insertOne({ ...values, postedAt: new Date(), author });
  return result.insertedId;
}
export async function update(id, values) {
  const result = await (await collection()).updateOne({ _id: new ObjectId(id) }, { $set: { ...values, updatedAt: new Date() } });
  return result.matchedCount > 0;
}
export async function remove(id) {
  const result = await (await collection()).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}
