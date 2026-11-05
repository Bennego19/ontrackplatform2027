import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import StudentAssignment from './studentassignment';

vi.mock('axios', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../services/authMiddleware', () => ({ tokenManager: { getToken: () => 'admin-token' } }));

test('assigns a student only after programme and track are selected', async () => {
  axios.get.mockResolvedValue({ data: [{ _id: 'student-1', name: 'Test', surname: 'Student', accessAllowed: 'granted' }, { _id: 'student-2', name: 'Inactive', surname: 'Student', accessAllowed: 'denied', isActive: false }] });
  axios.patch.mockResolvedValue({ data: {} });
  const { container } = render(<StudentAssignment />);
  await screen.findByRole('option', { name: 'Test Student' });
  expect(screen.queryByRole('option', { name: 'Inactive Student' })).not.toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledWith('/api/onboardstudents/', { headers: { Authorization: 'Bearer admin-token' } });
  const [student, programme, track] = container.querySelectorAll('select');
  const button = screen.getByRole('button', { name: 'Assign Student' });
  fireEvent.change(student, { target: { value: 'student-1' } });
  expect(button).toBeDisabled();
  fireEvent.change(programme, { target: { value: 'Graduate Program' } });
  expect(button).toBeDisabled();
  fireEvent.change(track, { target: { value: 'Web Development' } });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith('/api/onboardstudents/student-1', { program: 'Graduate Program', track: 'Web Development' }, expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }) })));
  expect(await screen.findByText(/Student successfully assigned/)).toBeInTheDocument();
});
