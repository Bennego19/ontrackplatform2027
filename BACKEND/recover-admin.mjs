// Offline recovery requires direct database access; the password is read from stdin.
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import { stderr } from 'node:process';
import { readPassword } from './utils/readPassword.mjs';

const { ATLAS_URI: uri, DB_NAME: databaseName, RECOVER_ADMIN_USERNAME: rawUsername } = process.env;
const username = rawUsername?.trim();
if (!uri || !databaseName || !username) {
  stderr.write('Set ATLAS_URI, DB_NAME and RECOVER_ADMIN_USERNAME.\n');
  process.exit(1);
}

let client;
try {
  const password = await readPassword('New administrator password: ');
  if (!password.trim() || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Invalid password');
  const hash = await bcrypt.hash(password, 12);
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const result = await client.db(databaseName).collection('admins').updateOne(
    { username, isActive: { $ne: false } }, { $set: { password: hash }, $inc: { tokenVersion: 1 } }
  );
  if (!result.matchedCount) throw new Error('Account not found or inactive');
  console.log('Administrator password updated; previous sessions are invalidated.');
} catch {
  stderr.write('Administrator recovery failed; check the target database, active account, and password requirements.\n');
  process.exitCode = 1;
} finally {
  if (client) await client.close();
}
