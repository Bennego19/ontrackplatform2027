import { countsByTrack } from '../services/mentorMetrics.mjs';

export async function mentorsByTrack(req, res) {
  try {
    res.json({ mentorsByTrack: await countsByTrack() });
  } catch {
    res.status(500).json({ error: 'Failed to fetch mentors by track' });
  }
}
