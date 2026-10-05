import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { tokenManager } from '../services/authMiddleware';

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  const loadNotices = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = tokenManager.getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await axios.get('/api/announcements', { headers });
      setNotices(resp.data || []);
    } catch (err) {
      console.error('Failed to load notices', err);
      const errorMsg = err.response?.data?.error || 'Failed to load notices';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotices(); }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Important Notices</h2>
      <p>Latest announcements from OnTrack Connect</p>
      <div style={{ marginTop: 12 }}>
        {loading && <div>Loading...</div>}
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {!loading && !error && notices.length === 0 && <div>No notices available.</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {notices.map(n => (
            <li key={n.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
              <div style={{ marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{n.title}</h3>
                <div style={{ fontSize: 12, color: '#666' }}>Date: {n.postedAt ? new Date(n.postedAt).toLocaleDateString() : ''}</div>
              </div>
              <div style={{ color: '#333', marginTop: 8 }}>{n.message ? (n.message.length > 300 ? n.message.slice(0,297) + '...' : n.message) : ''}</div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setSelected(n)}>View</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <div style={{ marginTop: 20, padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
          <h3>{selected.title}</h3>
          <div style={{ color: '#666', fontSize: 12 }}>{new Date(selected.postedAt).toLocaleString()}</div>
          <div style={{ marginTop: 10 }}>{selected.message}</div>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
