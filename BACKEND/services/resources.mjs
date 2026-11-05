import { ObjectId } from 'mongodb';
import db from '../db/conn.mjs';
import { contentVisibility } from '../utils/contentVisibility.mjs';
import * as files from './fileStorage.mjs';

export async function list(userType, user) {
  const query = userType === 'admins' ? {} : contentVisibility(user);
  return (await db()).collection('resources').find(query).toArray();
}

export async function create(fields, file) {
  const database = await db();
  let uploaded;
  try {
    const document = { ...fields, createdAt: new Date() };
    if (file) document.document = uploaded = await files.store(database, file);
    const result = await database.collection('resources').insertOne(document);
    return { ...document, _id: result.insertedId };
  } catch (error) {
    if (uploaded) await files.remove(database, uploaded).catch(() => {});
    throw error;
  }
}

export async function update(id, fields, file) {
  const database = await db();
  const collection = database.collection('resources');
  const query = { _id: new ObjectId(id) };
  const existing = await collection.findOne(query);
  if (!existing) return false;
  let uploaded;
  try {
    const updates = { ...fields, updatedAt: new Date() };
    if (file) updates.document = uploaded = await files.store(database, file);
    const result = await collection.updateOne(query, { $set: updates });
    if (!result.matchedCount) {
      if (uploaded) await files.remove(database, uploaded).catch(() => {});
      return false;
    }
    if (uploaded && existing.document) await files.remove(database, existing.document).catch(() => console.error('Failed to remove replaced file'));
    return true;
  } catch (error) {
    if (uploaded) await files.remove(database, uploaded).catch(() => {});
    throw error;
  }
}

export async function remove(id) {
  const database = await db();
  const collection = database.collection('resources');
  const query = { _id: new ObjectId(id) };
  const resource = await collection.findOne(query);
  if (!resource) return false;
  const result = await collection.deleteOne(query);
  if (!result.deletedCount) return false;
  if (resource.document) await files.remove(database, resource.document).catch(() => console.error('Failed to remove deleted file'));
  return true;
}
