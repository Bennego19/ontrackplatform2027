import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import multer from 'multer';

const allowed = new Set(['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.ppt', '.pptx', '.xls', '.xlsx']);

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, fieldSize: 64 * 1024, fields: 32, files: 1, parts: 34 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(allowed.has(extension) ? null : new Error('Unsupported file type'), allowed.has(extension));
  }
}).single('document');

export function parseDocument(req, res, next) {
  parser(req, res, error => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File exceeds 10 MB' });
    if (['LIMIT_FIELD_VALUE', 'LIMIT_FIELD_COUNT', 'LIMIT_FILE_COUNT', 'LIMIT_PART_COUNT'].includes(error.code)) {
      return res.status(413).json({ error: 'Upload form exceeds allowed limits' });
    }
    return res.status(400).json({ error: 'Unsupported or invalid file' });
  });
}

const bucket = database => new GridFSBucket(database, { bucketName: 'uploads' });

export async function store(database, file) {
  const fileName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180) || 'document';
  const output = bucket(database).openUploadStream(fileName);
  await pipeline(Readable.from(file.buffer), output);
  return { fileId: output.id, fileName, fileSize: file.size, relativePath: `/api/files/${output.id}` };
}

export async function remove(database, document) {
  if (!document?.fileId || !ObjectId.isValid(document.fileId)) return;
  await bucket(database).delete(new ObjectId(document.fileId));
}

export function open(database, id) {
  return bucket(database).openDownloadStream(new ObjectId(id));
}
