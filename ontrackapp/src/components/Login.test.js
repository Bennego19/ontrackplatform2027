import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from './Login';
import { mentorAuthAPI } from '../services/mentorAuthMiddleware';

vi.mock('../services/mentorAuthMiddleware', () => ({ mentorAuthAPI: { login: vi.fn() } }));

test('a mentor can sign in and reach the mentor dashboard', async () => {
  mentorAuthAPI.login.mockResolvedValue({ success: true, token: 'mentor-token', user: { username: 'mentor' } });
  render(<MemoryRouter initialEntries={['/']}><Routes><Route path="/" element={<Login />} /><Route path="/mentordashboard" element={<div>Mentor dashboard reached</div>} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Mentor Login' }));
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'mentor' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'strong password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login as Mentor' }));
  await waitFor(() => expect(screen.getByText('Mentor dashboard reached')).toBeInTheDocument());
  expect(mentorAuthAPI.login).toHaveBeenCalledWith('mentor', 'strong password');
  expect(localStorage.getItem('authToken')).toBe('mentor-token');
  localStorage.clear();
});
