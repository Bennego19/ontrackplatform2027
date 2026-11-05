// Unique indexes prevent duplicate account identities even under concurrent requests.
export async function ensureIndexes(database) {
  const presentString = field => ({ [field]: { $type: 'string' } });
  for (const name of ['students', 'mentors', 'admins']) {
    const collection = database.collection(name);
    await collection.createIndex({ username: 1 }, { unique: true, partialFilterExpression: presentString('username') });
    await collection.createIndex({ email: 1 }, { unique: true, partialFilterExpression: presentString('email') });
    if (name !== 'admins') {
      await collection.createIndex({ passwordResetHash: 1 }, { unique: true, partialFilterExpression: presentString('passwordResetHash') });
    }
  }
  await database.collection('mentor_assignments').createIndex({ mentorId: 1, studentId: 1 }, { unique: true });
  await database.collection('rate_limits').createIndex({ resetTime: 1 }, { expireAfterSeconds: 0 });
}
