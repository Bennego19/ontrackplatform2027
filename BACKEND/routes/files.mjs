import express from 'express';
import { ObjectId } from 'mongodb';
import db from '../db/conn.mjs';
import { authenticateToken } from '../middleware/auth.js';
import { contentVisibility } from '../utils/contentVisibility.mjs';
import * as storage from '../services/fileStorage.mjs';

const router = express.Router();
router.get('/:id', authenticateToken, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const database = await db();
    const fileId = new ObjectId(req.params.id);
    const access = req.userType === 'admins' ? {} : contentVisibility(req.dbUser);
    const query = { 'document.fileId': fileId, ...access };
    let record = await database.collection('assessments').findOne(query, { projection: { document: 1 } })
      || await database.collection('resources').findOne(query, { projection: { document: 1 } });
    if (!record) {
      const mentorResource = await database.collection('mentor_resources').findOne({ 'document.fileId': fileId });
      if (mentorResource && (req.userType === 'admins' ||
          (req.userType === 'mentors' && mentorResource.mentorId === req.dbUser._id.toString()))) {
        record = mentorResource;
      } else if (mentorResource && req.userType === 'students' && ObjectId.isValid(mentorResource.mentorId)) {
        const assignment = await database.collection('mentor_assignments').findOne({
          mentorId: new ObjectId(mentorResource.mentorId), studentId: new ObjectId(req.dbUser._id), status: 'active'
        });
        if (assignment) record = mentorResource;
      }
    }
    if (!record) return res.status(404).json({ error: 'File not found' });
    const metadata = await database.collection('uploads.files').findOne({ _id: fileId });
    if (!metadata) return res.status(404).json({ error: 'File not found' });
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${record.document.fileName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const stream = storage.open(database, fileId);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  } catch {
    if (!res.headersSent) res.status(500).json({ error: 'Unable to download file' });
  }
});
export default router;
