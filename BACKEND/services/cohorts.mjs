import { ObjectId } from 'mongodb';
import db from '../db/conn.mjs';

const collection = async () => (await db()).collection('cohort');
const fields = ['cohortname', 'cohorttrack', 'cohortnumber', 'programname', 'startdate'];
const values = body => Object.fromEntries(fields.map(field => [field, body?.[field]]));

export async function list() { return (await collection()).find({}).toArray(); }
export async function total() { return (await collection()).countDocuments({}); }
export async function create(body) { return (await collection()).insertOne(values(body)); }
export async function update(id, body) {
  return (await collection()).updateOne({ _id: new ObjectId(id) }, { $set: values(body) });
}
export async function remove(id) { return (await collection()).deleteOne({ _id: new ObjectId(id) }); }
