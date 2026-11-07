import { ObjectId } from 'mongodb';
import * as service from '../services/cohorts.mjs';

const validId = id => typeof id === 'string' && ObjectId.isValid(id);

export async function list(req, res) {
  try { res.json(await service.list()); }
  catch { res.status(500).json({ error: 'Failed to fetch cohorts' }); }
}
export async function total(req, res) {
  try { res.json({ total: await service.total(), message: 'Total cohorts retrieved successfully' }); }
  catch { res.status(500).json({ error: 'Failed to fetch total cohorts' }); }
}
export async function create(req, res) {
  try { res.json(await service.create(req.body)); }
  catch { res.status(500).json({ error: 'Failed to create cohort' }); }
}
export async function update(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  try { res.json(await service.update(req.params.id, req.body)); }
  catch { res.status(500).json({ error: 'Failed to update cohort' }); }
}
export async function remove(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  try { res.json(await service.remove(req.params.id)); }
  catch { res.status(500).json({ error: 'Failed to delete cohort' }); }
}
