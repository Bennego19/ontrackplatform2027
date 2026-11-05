import { ObjectId } from 'mongodb';
import * as service from '../services/events.mjs';

const fields = ['name', 'description', 'date', 'type', 'link'];
const validId = id => typeof id === 'string' && ObjectId.isValid(id);

function validate(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const values = {};
  for (const field of fields) {
    if (partial && body[field] === undefined) continue;
    if (typeof body[field] !== 'string' || !body[field].trim()) return null;
    values[field] = body[field].trim();
  }
  if (!Object.keys(values).length) return null;
  if (values.link) {
    try {
      if (!['http:', 'https:'].includes(new URL(values.link).protocol)) return null;
    } catch { return null; }
  }
  return values;
}

export async function list(req, res) {
  try { res.json(await service.list()); }
  catch { res.status(500).json({ error: 'Failed to fetch events' }); }
}

export async function create(req, res) {
  const values = validate(req.body);
  if (!values) return res.status(400).json({ message: 'All event fields and a valid HTTP or HTTPS link are required' });
  try {
    const insertedId = await service.create(values);
    res.status(201).json({ acknowledged: true, insertedId });
  } catch { res.status(500).json({ error: 'Failed to create event' }); }
}

export async function update(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  const values = validate(req.body, true);
  if (!values) return res.status(400).json({ message: 'Invalid event fields' });
  try {
    if (!await service.update(req.params.id, values)) return res.status(404).json({ message: 'Event not found' });
    res.json({ acknowledged: true, matchedCount: 1 });
  } catch { res.status(500).json({ error: 'Failed to update event' }); }
}

export async function remove(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  try {
    if (!await service.remove(req.params.id)) return res.status(404).json({ message: 'Event not found' });
    res.json({ acknowledged: true, deletedCount: 1 });
  } catch { res.status(500).json({ error: 'Failed to delete event' }); }
}
