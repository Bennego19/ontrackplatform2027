import { ObjectId } from 'mongodb';
import * as service from '../services/resources.mjs';

function validWebsiteLink(value) {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}

export async function list(req, res) {
  try { res.json(await service.list(req.userType, req.dbUser)); }
  catch { res.status(500).json({ error: 'Failed to fetch resources' }); }
}

export async function create(req, res) {
  if (!validWebsiteLink(req.body?.websiteLink)) return res.status(400).json({ error: 'Invalid website link' });
  try {
    const { name, description, program, track, websiteLink } = req.body || {};
    const result = await service.create({ name, description, program, track, websiteLink: websiteLink || null }, req.file);
    res.status(201).json(result);
  } catch { res.status(500).json({ error: 'Failed to create resource' }); }
}

export async function update(req, res) {
  if (!validWebsiteLink(req.body?.websiteLink)) return res.status(400).json({ error: 'Invalid website link' });
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const fields = {};
  for (const key of ['name', 'description', 'program', 'track']) {
    if (req.body?.[key] === undefined) continue;
    if (typeof req.body[key] !== 'string') return res.status(400).json({ error: `Invalid ${key}` });
    fields[key] = req.body[key];
  }
  if (req.body?.websiteLink !== undefined) fields.websiteLink = req.body.websiteLink || null;
  if (!Object.keys(fields).length && !req.file) return res.status(400).json({ error: 'No resource updates provided' });
  try {
    if (!await service.update(req.params.id, fields, req.file)) return res.status(404).json({ error: 'Resource not found' });
    res.json({ message: 'Update successful' });
  } catch { res.status(500).json({ error: 'Failed to update resource' }); }
}

export async function remove(req, res) {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    if (!await service.remove(req.params.id)) return res.status(404).json({ error: 'Resource not found' });
    res.json({ message: 'Resource deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete resource' }); }
}
