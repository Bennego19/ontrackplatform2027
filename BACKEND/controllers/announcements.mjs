import { ObjectId } from 'mongodb';
import * as service from '../services/announcements.mjs';

const validId = id => typeof id === 'string' && ObjectId.isValid(id);
const normalize = ({ _id, title, message, postedAt, author }) => ({
  id: _id, title, message, postedAt, author: author || null
});

function validate(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const values = {};
  for (const [field, limit] of [['title', 200], ['message', 10000]]) {
    if (partial && body[field] === undefined) continue;
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].length > limit) return null;
    values[field] = body[field].trim();
  }
  return Object.keys(values).length ? values : null;
}

export async function list(req, res) {
  try { res.json((await service.list()).map(normalize)); }
  catch { res.status(500).json({ error: 'Failed to fetch announcements' }); }
}

export async function get(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const item = await service.get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Announcement not found' });
    res.json(normalize(item));
  } catch { res.status(500).json({ error: 'Failed to fetch announcement' }); }
}

export async function create(req, res) {
  const values = validate(req.body);
  if (!values) return res.status(400).json({ error: 'A valid title and message are required' });
  try {
    const id = await service.create(values, req.adminUser?.username || null);
    res.status(201).json({ message: 'Announcement created', id });
  } catch { res.status(500).json({ error: 'Failed to create announcement' }); }
}

export async function update(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const values = validate(req.body, true);
  if (!values) return res.status(400).json({ error: 'A valid title or message is required' });
  try {
    if (!await service.update(req.params.id, values)) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ message: 'Announcement updated' });
  } catch { res.status(500).json({ error: 'Failed to update announcement' }); }
}

export async function remove(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    if (!await service.remove(req.params.id)) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ message: 'Announcement deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete announcement' }); }
}
