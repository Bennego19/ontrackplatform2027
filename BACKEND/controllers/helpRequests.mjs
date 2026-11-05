import { ObjectId } from 'mongodb';
import * as service from '../services/helpRequests.mjs';

const validId = id => typeof id === 'string' && ObjectId.isValid(id);
const errorResponse = res => res.status(500).json({ error: 'Unable to process help request' });
const notFound = res => res.status(404).json({ error: 'Help request not found' });

export async function listAll(req, res) {
  try { res.json(await service.listAll()); }
  catch { errorResponse(res); }
}

export async function listOwn(req, res) {
  try { res.json(await service.listOwn(req.dbUser._id.toString(), req.userType)); }
  catch { errorResponse(res); }
}

export async function create(req, res) {
  const { topic, area, description, availability, contactPreference } = req.body || {};
  if (![topic, area, description].every(value => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ error: 'Topic, area, and description are required' });
  }
  if ((availability !== undefined && typeof availability !== 'string') || (contactPreference !== undefined && typeof contactPreference !== 'string')) {
    return res.status(400).json({ error: 'Invalid request details' });
  }
  try {
    const helpRequest = await service.create({ topic, area, description, availability, contactPreference }, req.dbUser, req.userType);
    res.status(201).json({ message: 'Help request created', id: helpRequest.id, helpRequest });
  } catch { errorResponse(res); }
}

export async function getOwn(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const item = await service.getOwn(req.params.id, req.dbUser._id.toString(), req.userType);
    if (!item) return notFound(res);
    res.json(item);
  } catch { errorResponse(res); }
}

async function adminUpdate(res, id, values) {
  if (!validId(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    if (!await service.updateAsAdmin(id, values)) return notFound(res);
    res.json({ message: 'Help request updated' });
  } catch { errorResponse(res); }
}

export const approve = (req, res) => adminUpdate(res, req.body?.id, { status: 'approved' });
export const reject = (req, res) => adminUpdate(res, req.body?.id, { status: 'rejected' });
export const resolve = (req, res) => adminUpdate(res, req.body?.id, { status: 'resolved' });

export function updateAsAdmin(req, res) {
  const { status, adminNote } = req.body || {};
  if (status !== undefined && !['open', 'approved', 'rejected', 'resolved', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (adminNote !== undefined && typeof adminNote !== 'string') return res.status(400).json({ error: 'Invalid note' });
  const updates = {};
  if (status !== undefined) updates.status = status;
  if (adminNote !== undefined) updates.adminNote = adminNote;
  return adminUpdate(res, req.params.id, updates);
}

export async function updateOwn(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const { status, markHelpful } = req.body || {};
  if (status !== undefined && !['open', 'resolved', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (markHelpful !== undefined && typeof markHelpful !== 'boolean') return res.status(400).json({ error: 'Invalid helpful value' });
  try {
    if (!await service.updateOwn(req.params.id, req.dbUser._id.toString(), req.userType, { status, markHelpful })) return notFound(res);
    res.json({ message: 'Help request updated' });
  } catch { errorResponse(res); }
}

export async function deleteOwn(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    if (!await service.deleteOwn(req.params.id, req.dbUser._id.toString(), req.userType)) return notFound(res);
    res.json({ message: 'Help request deleted' });
  } catch { errorResponse(res); }
}
