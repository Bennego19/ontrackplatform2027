import { ObjectId } from 'mongodb';
import * as service from '../services/passwordReset.mjs';

const issueFor = accountType => async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid student ID' });
  try {
    const result = await service.issue(accountType, req.params.id);
    if (!result) return res.status(404).json({ message: 'Account not found' });
    res.json(result);
  } catch { res.status(500).json({ message: 'Unable to create reset link' }); }
};
export const issueStudent = issueFor('students');
export const issueMentor = issueFor('mentors');

export async function redeem(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token) || typeof password !== 'string' || !password.trim() || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Invalid link or password. Passwords must be at least 12 characters and at most 72 UTF-8 bytes.' });
  }
  try {
    if (!await service.redeem(token, password)) return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    res.json({ message: 'Password updated. You can now sign in.' });
  } catch { res.status(500).json({ message: 'Unable to reset password' }); }
}
