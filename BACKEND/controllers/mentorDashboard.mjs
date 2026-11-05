import { ObjectId } from 'mongodb';
import * as service from '../services/mentorDashboard.mjs';

const allowed = {
  tasks: ['title', 'description', 'dueDate', 'priority', 'assignedTo', 'status'],
  assignments: ['title', 'description', 'dueDate', 'maxScore', 'course', 'instructions'],
  projects: ['title', 'description', 'startDate', 'endDate', 'status']
};
const mentorId = req => req.dbUser._id.toString();
const validId = id => typeof id === 'string' && ObjectId.isValid(id);
const failed = res => res.status(500).json({ message: 'Unable to process mentor dashboard request' });

function validate(type, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) return null;
  const values = {};
  for (const field of allowed[type]) {
    if (body[field] === undefined) continue;
    if (field === 'maxScore') {
      if (typeof body[field] !== 'number' || !Number.isFinite(body[field]) || body[field] < 0 || body[field] > 10000) return null;
    } else if (typeof body[field] !== 'string' || body[field].length > 10000) return null;
    values[field] = body[field];
  }
  values.title = values.title.trim();
  return values;
}

export async function assignedStudents(req, res) {
  try { res.json(await service.assignedStudents(mentorId(req))); }
  catch { failed(res); }
}

export async function getProfile(req, res) {
  try {
    const profile = await service.profile(mentorId(req));
    if (!profile) return res.status(404).json({ message: 'Mentor not found' });
    res.json(profile);
  } catch { failed(res); }
}

export async function updateProfile(req, res) {
  const { name, email, specialization = '', bio = '' } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.length > 100 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 ||
      typeof specialization !== 'string' || specialization.length > 200 || typeof bio !== 'string' || bio.length > 2000) {
    return res.status(400).json({ message: 'Invalid profile details' });
  }
  try {
    const profile = await service.updateProfile(mentorId(req), { name: name.trim(), email: email.trim().toLowerCase(), specialization: specialization.trim(), bio: bio.trim() });
    if (!profile) return res.status(404).json({ message: 'Mentor not found' });
    res.json(profile);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email already exists' });
    failed(res);
  }
}

export const list = type => async (req, res) => {
  try { res.json(await service.list(type, mentorId(req))); }
  catch { failed(res); }
};

export const create = type => async (req, res) => {
  const fields = validate(type, req.body);
  if (!fields) return res.status(400).json({ message: 'Invalid details' });
  try {
    if (type === 'tasks' && fields.assignedTo && !await service.isAssigned(mentorId(req), fields.assignedTo)) return res.status(403).json({ message: 'Student is not assigned to this mentor' });
    res.status(201).json(await service.create(type, mentorId(req), fields));
  } catch { failed(res); }
};

export const update = type => async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  const fields = validate(type, req.body);
  if (!fields) return res.status(400).json({ message: 'Invalid details' });
  try {
    if (type === 'tasks' && fields.assignedTo && !await service.isAssigned(mentorId(req), fields.assignedTo)) return res.status(403).json({ message: 'Student is not assigned to this mentor' });
    const item = await service.update(type, mentorId(req), req.params.id, fields);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch { failed(res); }
};

export const remove = type => async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  try {
    if (!await service.remove(type, mentorId(req), req.params.id)) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch { failed(res); }
};

export async function createResource(req, res) {
  const { title, description, type, course } = req.body || {};
  if (!req.file || typeof title !== 'string' || !title.trim() || title.length > 200 ||
      typeof description !== 'string' || !description.trim() || description.length > 10000 ||
      !['document', 'presentation'].includes(type) || (course !== undefined && (typeof course !== 'string' || course.length > 200))) {
    return res.status(400).json({ message: 'A title, description, supported type and document are required' });
  }
  try { res.status(201).json(await service.createResource(mentorId(req), { title: title.trim(), description: description.trim(), type, course: course || '' }, req.file)); }
  catch { failed(res); }
}

export async function deleteResource(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  try {
    if (!await service.deleteResource(mentorId(req), req.params.id)) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch { failed(res); }
}
