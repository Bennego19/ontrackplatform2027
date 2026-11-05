import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ManageMentors from './onboardmentor';

vi.mock('axios', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../services/authMiddleware', () => ({ tokenManager: { getToken: () => 'admin-token' } }));

test('mentor access can be deactivated and restored while retaining the record', async () => {
  axios.get.mockResolvedValue({ data: [{ _id: 'mentor-1', name: 'Test', surname: 'Mentor', username: 'mentor', isActive: true }] });
  axios.patch.mockResolvedValue({ data: {} });
  render(<ManageMentors />);
  fireEvent.click(screen.getByRole('button', { name: 'Manage Access' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith('/api/onboardmentors/mentor-1/access', { active: false }, expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }) })));
  expect(screen.getByText('Inactive')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Activate' }));
  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith('/api/onboardmentors/mentor-1/access', { active: true }, expect.any(Object)));
  expect(screen.getByText('Active')).toBeInTheDocument();
});
