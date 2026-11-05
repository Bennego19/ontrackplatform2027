import { loginAdmin as authenticateAdmin, loginParticipant } from '../services/auth.mjs';

export async function adminLogin(req, res) {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  try {
    const result = await authenticateAdmin(username, password);
    if (!result) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ success: true, message: 'Admin login successful', ...result });
  } catch {
    res.status(500).json({ message: 'Internal server error during admin login' });
  }
}

export const participantLogin = type => async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  try {
    const result = await loginParticipant(type, username, password);
    if (result.status !== 200) return res.status(result.status).json({ message: result.message, ...(result.accessDenied ? { accessDenied: true } : {}) });
    return res.json({ success: true, message: 'Login successful', token: result.token, [type === 'student' ? 'user' : 'mentor']: result.profile });
  } catch {
    return res.status(500).json({ message: 'Internal server error during login' });
  }
};
