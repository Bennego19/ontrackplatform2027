import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { tokenManager } from '../services/authMiddleware';
import './AdminAnnouncements.css';

export default function AdminAnnouncements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('create'); // create | read | update | delete
  const [editValues, setEditValues] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState([]);

  const showMessage = (text, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(text);
      setTimeout(() => setSuccessMessage(''), 4000);
    } else {
      setErrors([{ field: 'general', message: text }]);
      setTimeout(() => setErrors([]), 4000);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const token = tokenManager.getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await axios.get('/api/announcements', { headers });
      setItems(resp.data || []);
    } catch (err) {
      console.error('Load failed', err);
      const errorMsg = err.response?.data?.error || 'Failed to load announcements';
      showMessage(errorMsg, 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e && e.preventDefault();
    const token = tokenManager.getToken();
    try {
      if (!title || !message) { showMessage('Title and message required', 'error'); return; }
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post('/api/announcements', { title, message }, { headers });
      setTitle(''); setMessage(''); load(); showMessage('Announcement created');
    } catch (err) {
      console.error('Save failed', err);
      const errorMsg = err.response?.data?.error || 'Save failed';
      showMessage(errorMsg, 'error');
    }
  };

  const handleStartEdit = (it) => {
    setActiveTab('update');
    setEditingId(it.id);
    setEditValues({ title: it.title, message: it.message });
  };

  const handleUpdateSave = async (id) => {
    const { title, message } = editValues;
    if (!title || !message) { showMessage('Title and message required', 'error'); return; }
    try {
      const token = tokenManager.getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`/api/announcements/${id}`, { title, message }, { headers });
      setEditingId(null);
      setEditValues({});
      setActiveTab('read');
      load();
      showMessage('Announcement updated');
    } catch (err) {
      console.error('Update failed', err);
      const errorMsg = err.response?.data?.error || 'Update failed';
      showMessage(errorMsg, 'error');
    }
  };

  const handleDeleteSubmit = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      const token = tokenManager.getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`/api/announcements/${id}`, { headers });
      showMessage('Announcement deleted');
      load();
    } catch (err) {
      console.error('Delete failed', err);
      const errorMsg = err.response?.data?.error || 'Delete failed';
      showMessage(errorMsg, 'error');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors([]);
    setSuccessMessage('');
    load();
  };

  return (
    <div className="manage-mentorship-container">
      <div className="manage-mentorship-card">
        <div className="manage-mentorship-header">
          <div className="header-icon">📢</div>
          <h1 className="manage-mentorship-title">Manage Announcements</h1>
          <p className="manage-mentorship-subtitle">Create and manage site-wide announcements</p>
        </div>

        {successMessage && <div className="success-message">{successMessage}</div>}
        {errors.some(e => e.field === 'general') && (
          <div className="error-message general-error">{errors.filter(e=>e.field==='general').map((err,idx)=>(<div key={idx}>{err.message}</div>))}</div>
        )}

        <div className="tab-container-mentorship">
          <div className="tabs-mentorship">
            <button className={`tab-mentorship ${activeTab === 'create' ? 'active' : ''}`} onClick={() => handleTabChange('create')}>Create</button>
            <button className={`tab-mentorship ${activeTab === 'read' ? 'active' : ''}`} onClick={() => handleTabChange('read')}>View</button>
            <button className={`tab-mentorship ${activeTab === 'update' ? 'active' : ''}`} onClick={() => handleTabChange('update')}>Update</button>
            <button className={`tab-mentorship ${activeTab === 'delete' ? 'active' : ''}`} onClick={() => handleTabChange('delete')}>Delete</button>
          </div>

          <div className="tab-content-mentorship">
            {activeTab === 'create' && (
              <div className="tab-pane-mentorship active">
                <div className="form-section">
                  <h3 className="section-title">Create New Announcement</h3>
                  <form onSubmit={save} className="mentorship-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input type="text" className="form-input" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Announcement title" required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Message *</label>
                        <textarea className="form-input" value={message} onChange={(e)=>setMessage(e.target.value)} rows={5} placeholder="Announcement message" required />
                      </div>
                    </div>
                    <div className="action-section">
                      <button type="submit" className="submit-button">Create Announcement</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'read' && (
              <div className="tab-pane-mentorship active">
                <div className="form-section">
                  <div className="section-header">
                    <h3 className="section-title">View Announcements</h3>
                    <button onClick={load} className="refresh-button">Refresh</button>
                  </div>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Message</th>
                          <th>Author</th>
                          <th>Posted At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                          {items.map(it => (
                            <tr key={it.id}>
                              <td>{it.title}</td>
                              <td>{it.message}</td>
                              <td>{it.author}</td>
                              <td>{new Date(it.postedAt).toLocaleString()}</td>
                              <td>
                                <button onClick={() => handleStartEdit(it)} className="update-btn">Edit</button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {items.length === 0 && (<div className="no-data-message">No announcements found.</div>)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'update' && (
              <div className="tab-pane-mentorship active">
                <div className="form-section">
                  <h3 className="section-title">Update Announcement</h3>
                  {editingId ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateSave(editingId); }} className="mentorship-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Title *</label>
                          <input type="text" className="form-input" value={editValues.title} onChange={(e) => setEditValues({...editValues, title: e.target.value})} placeholder="Announcement title" required />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Message *</label>
                          <textarea className="form-input" value={editValues.message} onChange={(e) => setEditValues({...editValues, message: e.target.value})} rows={5} placeholder="Announcement message" required />
                        </div>
                      </div>
                      <div className="action-section">
                        <button type="submit" className="submit-button">Save Changes</button>
                        <button type="button" onClick={() => { setEditingId(null); setEditValues({}); }} className="cancel-btn">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="no-data-message">Select an announcement from the 'View' tab to edit.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'delete' && (
              <div className="tab-pane-mentorship active">
                <div className="form-section">
                  <h3 className="section-title">Delete Announcement</h3>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Message</th>
                          <th>Author</th>
                          <th>Posted At</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                          {items.map(it => (
                            <tr key={it.id}>
                              <td>{it.title}</td>
                              <td>{it.message}</td>
                              <td>{it.author}</td>
                              <td>{new Date(it.postedAt).toLocaleString()}</td>
                              <td>
                                <button onClick={() => handleDeleteSubmit(it.id)} className="delete-btn">Delete</button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {items.length === 0 && (<div className="no-data-message">No announcements available for deletion.</div>)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}