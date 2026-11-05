// Run once against an explicitly selected database. Supply the password through stdin.
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import { stderr } from 'node:process';
import { readPassword } from './utils/readPassword.mjs';

const uri = process.env.ATLAS_URI;
const databaseName = process.env.DB_NAME;
const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
if (!uri || !databaseName || !username || !name) {
  stderr.write('Set ATLAS_URI, DB_NAME, BOOTSTRAP_ADMIN_USERNAME, and BOOTSTRAP_ADMIN_NAME.\n');
  process.exit(1);
}
if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
  stderr.write('Username must be 3–20 letters, digits, underscores or hyphens.\n');
  process.exit(1);
}

let client;
let lockCollection;
let locked = false;
let created = false;
try {
  const password = await readPassword('Initial administrator password: ');
  if (!password.trim() || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Password must be at least 12 characters and at most 72 UTF-8 bytes');
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const database = client.db(databaseName);
  lockCollection = database.collection('_bootstrap');
  await lockCollection.insertOne({ _id: 'initial-admin', createdAt: new Date() });
  locked = true;
  if (await database.collection('admins').countDocuments({}, { limit: 1 })) throw new Error('An administrator already exists; bootstrap is not available');
  const hash = await bcrypt.hash(password, 12);
  await database.collection('admins').insertOne({ username, name, role: 'admin', password: hash, isActive: true, createdAt: new Date() });
  created = true;
  console.log(`Initial administrator created in database ${databaseName}.`);
} catch (error) {
  // Do not print database errors: connection strings can contain credentials.
  stderr.write(error?.code === 11000 ? 'Administrator bootstrap has already run or is locked.\n' : `Administrator bootstrap failed${locked && !created ? ': verify that no administrator exists and retry' : ''}.\n`);
  process.exitCode = 1;
} finally {
  // Keep the marker after success so concurrent or repeated attempts fail closed.
  if (locked && !created) await lockCollection.deleteOne({ _id: 'initial-admin' }).catch(() => {});
  if (client) await client.close();
}
