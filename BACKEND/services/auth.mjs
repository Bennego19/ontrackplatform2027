import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/conn.mjs';

// A fixed, non-account hash ensures unknown users still incur bcrypt's cost.
const dummyHash = '$2b$12$IM/j5TlAApy.hUZ58x3GweU8TQaNxVGVvPy/Eb1iXeWDZKB5zA7UW';
const bcryptHash = value => typeof value === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
export async function verifyPassword(password, hash) {
  const validHash = bcryptHash(hash);
  const matches = await bcrypt.compare(password, validHash ? hash : dummyHash);
  return validHash && matches;
}

export async function loginAdmin(username, password) {
  const collection = (await db()).collection('admins');
  const admin = await collection.findOne({ username: username.trim() });
  const matches = await verifyPassword(password, admin?.password);
  if (!admin || admin.isActive === false || !matches) {
    return null;
  }

  const token = jwt.sign(
    { id: admin._id.toString(), role: admin.role || 'admin', tokenVersion: admin.tokenVersion || 0 },
    process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024',
    { expiresIn: 86400 }
  );
  await collection.updateOne({ _id: admin._id }, { $set: { lastLogin: new Date() } });
  return { token, user: { id: admin._id.toString(), username: admin.username, role: admin.role || 'admin', name: admin.name } };
}

// Only these two account types are exposed through the shared login service.
export async function loginParticipant(type, username, password) {
  if (!['student', 'mentor'].includes(type)) throw new Error('Unsupported account type');
  const collection = (await db()).collection(type === 'student' ? 'students' : 'mentors');
  const account = await collection.findOne({ username: username.trim() });
  const matches = await verifyPassword(password, account?.password);
  if (!account || !matches) return { status: 401, message: 'Invalid credentials' };
  if (account.isActive === false || (type === 'student' ? account.accessAllowed !== 'granted' : account.accessAllowed === 'denied')) {
    return { status: 403, message: 'Account access denied', accessDenied: true };
  }
  const payload = {
    id: account._id.toString(), role: type, tokenVersion: account.tokenVersion || 0
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024', { expiresIn: 86400 });
  await collection.updateOne({ _id: account._id }, { $set: { lastLogin: new Date() } });
  const profile = { id: account._id.toString(), name: account.name, surname: account.surname, email: account.email, username: account.username };
  if (type === 'student') Object.assign(profile, { program: account.program, track: account.track });
  return { status: 200, token, profile };
}
