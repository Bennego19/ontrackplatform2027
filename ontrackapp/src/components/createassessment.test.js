import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateAssessment from './createassessment';

test('creates and then edits an assessment through the API', async () => {
  const saved = { _id: '123', assessmentname: 'First task', assessmenttype: 'task', dateadded: '2026-01-01', datedue: '2026-01-10', program: 'Mentorship Program', track: 'Web Development' };
  const originalFetch = window.fetch;
  window.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '123' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => [saved] })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Updated' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => [{ ...saved, assessmentname: 'Updated task' }] });
  try {
    render(<CreateAssessment />);
    await waitFor(() => expect(window.fetch).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Assessment name'), { target: { value: saved.assessmentname } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: saved.assessmenttype } });
    fireEvent.change(screen.getByLabelText('Date added'), { target: { value: saved.dateadded } });
    fireEvent.change(screen.getByLabelText('Date due'), { target: { value: saved.datedue } });
    fireEvent.change(screen.getByLabelText('Program'), { target: { value: saved.program } });
    fireEvent.change(screen.getByLabelText('Track'), { target: { value: saved.track } });
    fireEvent.click(screen.getByRole('button', { name: 'Create assessment' }));
    await screen.findByText('First task');
    expect(window.fetch.mock.calls[1][0]).toBe('/api/assessments');
    expect(window.fetch.mock.calls[1][1].body.get('assessmentname')).toBe('First task');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Assessment name'), { target: { value: 'Updated task' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Updated task');
    expect(window.fetch.mock.calls[3][0]).toBe('/api/assessments/123');
    expect(window.fetch.mock.calls[3][1].method).toBe('PATCH');
  } finally { window.fetch = originalFetch; }
});
