import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function ResetPassword() {
  const [token] = useState(() => window.location.hash.slice(1));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Keep the reset token in memory, not the address bar or subsequent navigation.
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  const submit = async event => {
    event.preventDefault();
    if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setMessage('Password must be at most 72 UTF-8 bytes.'); return; }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/password-reset/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }), cache: 'no-store'
      });
      const result = await response.json();
      setMessage(result.message || 'Unable to reset password.');
      if (response.ok) { setDone(true); setPassword(''); setConfirm(''); }
    } catch { setMessage('Unable to reset password. Please try again.'); }
    finally { setBusy(false); }
  };

  return <main className="signup-container"><div className="signup-wrapper"><div className="signup-card"><div className="signup-form-section">
    <h1>Reset password</h1>
    {message && <p role="status">{message}</p>}
    {!token ? <p>This reset link is missing or invalid. Ask your administrator for a new one.</p> : !done && <form onSubmit={submit}>
      <label>New password <input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={12} required /></label>
      <label>Confirm password <input type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} minLength={12} required /></label>
      <p>Use at least 12 characters.</p>
      <button type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
    </form>}
    <Link to="/">Return to sign in</Link>
  </div></div></div></main>;
}
