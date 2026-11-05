import { logError } from '../utils/logError.mjs';
import express from 'express';
import db from '../db/conn.mjs';
import { ObjectId } from 'mongodb';
import { exactCaseInsensitive } from '../utils/exactMatch.mjs';

const router = express.Router();

// List all projects (optional query params: program, track)
router.get('/', async (req, res) => {
  try {
    const { program, track } = req.query;
    const query = {};
    if (program) query.program = { $regex: exactCaseInsensitive(program) };
    if (track) query.track = { $regex: exactCaseInsensitive(track) };
    const projects = await (await db()).collection('projects').find(query).toArray();
    res.json(projects);
  } catch (err) {
    logError('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create a project
router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    payload.createdAt = new Date();
    const result = await (await db()).collection('projects').insertOne(payload);
    res.status(201).json({ message: 'Project created', id: result.insertedId });
  } catch (err) {
    logError('Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update a project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });
    const update = { ...req.body, updatedAt: new Date() };
    await (await db()).collection('projects').updateOne({ _id: new ObjectId(id) }, { $set: update });
    res.json({ message: 'Project updated' });
  } catch (err) {
    logError('Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete a project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });
    await (await db()).collection('projects').deleteOne({ _id: new ObjectId(id) });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    logError('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
