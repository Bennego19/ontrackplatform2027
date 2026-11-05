import React, { useCallback, useEffect, useState } from 'react';
import './CreateAssessment.css';
import { studentTracks } from '../config/studentTracks';

const emptyForm = { assessmentname: '', assessmenttype: '', dateadded: '', datedue: '', program: '', track: '', document: null };

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}

export default function CreateAssessment() {
  const [form, setForm] = useState(emptyForm);
  const [assessments, setAssessments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try { setAssessments(await api('/api/assessments')); }
    catch (error) { setMessage(`Unable to load assessments: ${error.message}`); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFileKey(key => key + 1);
  };

  const save = async event => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => { if (value !== null) payload.append(key, value); });
      await api(editingId ? `/api/assessments/${editingId}` : '/api/assessments', {
        method: editingId ? 'PATCH' : 'POST', body: payload
      });
      reset();
      await load();
      setMessage(editingId ? 'Assessment updated.' : 'Assessment created.');
    } catch (error) { setMessage(`Unable to save assessment: ${error.message}`); }
    finally { setBusy(false); }
  };

  const edit = assessment => {
    setEditingId(assessment._id);
    setForm({ ...emptyForm, ...Object.fromEntries(Object.keys(emptyForm).filter(key => key !== 'document').map(key => [key, assessment[key] || ''])) });
    setFileKey(key => key + 1);
    setMessage('');
  };

  const remove = async id => {
    if (!window.confirm('Delete this assessment?')) return;
    setBusy(true);
    try {
      await api(`/api/assessments/${id}`, { method: 'DELETE' });
      if (editingId === id) reset();
      await load();
      setMessage('Assessment deleted.');
    } catch (error) { setMessage(`Unable to delete assessment: ${error.message}`); }
    finally { setBusy(false); }
  };

  const onChange = event => {
    const { name, value, files } = event.target;
    setForm(previous => ({ ...previous, [name]: name === 'document' ? files[0] || null : value }));
  };

  return <main>
    <h1>Manage Assessments</h1>
    {message && <p role="status">{message}</p>}
    <h2>{editingId ? 'Edit assessment' : 'Create assessment'}</h2>
    <form onSubmit={save}>
      <label>Assessment name <input name="assessmentname" value={form.assessmentname} onChange={onChange} required /></label>
      <label>Type <select name="assessmenttype" value={form.assessmenttype} onChange={onChange} required>
        <option value="">Select type</option><option value="task">Task</option><option value="assignment">Assignment</option><option value="project">Project</option><option value="module">Module</option>
      </select></label>
      <label>Date added <input type="date" name="dateadded" value={form.dateadded} onChange={onChange} required /></label>
      <label>Date due <input type="date" name="datedue" value={form.datedue} onChange={onChange} required /></label>
      <label>Program <select name="program" value={form.program} onChange={onChange} required>
        <option value="">Select program</option><option>Mentorship Program</option><option>Internship Program</option><option>Skill Development Program</option><option>Graduate Program</option>
      </select></label>
      <label>Track <select name="track" value={form.track} onChange={onChange} required>
        <option value="">Select track</option>{studentTracks.map(track => <option key={track} value={track}>{track}</option>)}
      </select></label>
      <label>Document <input key={fileKey} type="file" name="document" accept=".pdf,.doc,.docx,.txt" onChange={onChange} /></label>
      <button disabled={busy} type="submit">{editingId ? 'Save changes' : 'Create assessment'}</button>
      {editingId && <button disabled={busy} type="button" onClick={reset}>Cancel</button>}
    </form>
    <h2>Assessments</h2>
    <button disabled={busy} type="button" onClick={load}>Refresh</button>
    {assessments.length === 0 ? <p>No assessments found.</p> : <table>
      <thead><tr><th>Name</th><th>Type</th><th>Due</th><th>Program</th><th>Track</th><th>Actions</th></tr></thead>
      <tbody>{assessments.map(item => <tr key={item._id}>
        <td>{item.assessmentname}</td><td>{item.assessmenttype}</td><td>{item.datedue}</td><td>{item.program}</td><td>{item.track}</td>
        <td><button disabled={busy} type="button" onClick={() => edit(item)}>Edit</button> <button disabled={busy} type="button" onClick={() => remove(item._id)}>Delete</button></td>
      </tr>)}</tbody>
    </table>}
  </main>;
}
