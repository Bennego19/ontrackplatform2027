import { createHash, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import db from '../db/conn.mjs';

const digest = token => createHash('sha256').update(token).digest('hex');

export async function issue(accountType, accountId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const collection = (await db()).collection(accountType);
  const active = accountType === 'students' ? { accessAllowed: 'granted' } : { accessAllowed: { $ne: 'denied' } };
  const result = await collection.updateOne({ _id: new ObjectId(accountId), isActive: { $ne: false }, ...active }, { $set: { passwordResetHash: digest(token), passwordResetExpiresAt: expiresAt } });
  return result.matchedCount ? { token, expiresAt } : null;
}

export async function redeem(token, password) {
  const hash = await bcrypt.hash(password, 12);
  const database = await db();
  for (const accountType of ['students', 'mentors']) {
    const result = await database.collection(accountType).updateOne(
      { passwordResetHash: digest(token), passwordResetExpiresAt: { $gt: new Date() } },
      { $set: { password: hash }, $unset: { passwordResetHash: '', passwordResetExpiresAt: '' }, $inc: { tokenVersion: 1 } }
    );
    if (result.modifiedCount === 1) return true;
  }
  return false;
}
