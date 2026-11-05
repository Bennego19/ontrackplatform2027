import db from '../db/conn.mjs';

export async function countsByTrack() {
  const database = await db();
  const assigned = await database.collection('mentor_assignments').aggregate([
    { $match: { status: 'active' } },
    { $lookup: { from: 'mentors', localField: 'mentorId', foreignField: '_id', as: 'mentor' } },
    { $unwind: '$mentor' },
    { $match: { 'mentor.isActive': { $ne: false }, 'mentor.accessAllowed': { $ne: 'denied' } } },
    { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
    { $match: { 'student.isActive': { $ne: false }, 'student.accessAllowed': 'granted', 'student.track': { $type: 'string', $ne: '' } } },
    { $group: { _id: { track: '$student.track', mentorId: '$mentorId' } } },
    { $group: { _id: '$_id.track', count: { $sum: 1 } } }
  ]).toArray();
  return Object.fromEntries(assigned.map(row => [row._id, row.count]));
}
