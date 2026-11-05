import { ObjectId } from 'mongodb';
import db from '../db/conn.mjs';

export async function setAccountAccess(type, id, active) {
  if (!['students', 'mentors'].includes(type)) throw new Error('Unsupported account type');
  const collection = (await db()).collection(type);
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: { isActive: active, accessAllowed: active ? 'granted' : 'denied' },
      $inc: { tokenVersion: 1 },
      $unset: { passwordResetHash: '', passwordResetExpiresAt: '' }
    }
  );
  return result.matchedCount > 0;
}
