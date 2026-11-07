import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AssignMentor from './mentorassignment';

vi.mock('../services/authMiddleware', () => ({ tokenManager: { getToken: () => 'admin-token' } }));
afterEach(() => vi.unstubAllGlobals());

test('loads active mentors and students from canonical authenticated API paths', async () => {
  const fetchMock = vi.fn(async url => {
    const data = url === '/api/onboardmentors' ? [{ _id: 'mentor-1', name: 'Preview', surname: 'Mentor', isActive: true }] :
      url === '/api/onboardstudents' ? [{ _id: 'student-1', name: 'Preview', surname: 'Student', accessAllowed: 'granted' }] :
      url === '/api/mentorstudentassignment/all' ? { assignments: [] } : null;
    return { ok: data !== null, json: async () => data };
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<AssignMentor />);
  await screen.findByRole('option', { name: /Preview Mentor/ });
  await screen.findByRole('option', { name: /Preview Student/ });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/onboardmentors', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }) })));
  expect(fetchMock).toHaveBeenCalledWith('/api/onboardstudents', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }) }));
});
