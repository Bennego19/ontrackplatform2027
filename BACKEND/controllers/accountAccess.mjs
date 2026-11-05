import { ObjectId } from 'mongodb';
import { setAccountAccess } from '../services/accountAccess.mjs';
import { logError } from '../utils/logError.mjs';

export const changeAccess = (type, deactivate = false) => async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  const active = deactivate ? false : req.body?.active;
  if (typeof active !== 'boolean') return res.status(400).json({ message: 'An active status is required' });
  try {
    if (!await setAccountAccess(type, req.params.id, active)) return res.status(404).json({ message: 'Account not found' });
    res.json({ message: active ? 'Account activated' : 'Account deactivated', active });
  } catch (error) {
    logError('Account access update failed:', error);
    res.status(500).json({ message: 'Unable to update account access' });
  }
};
