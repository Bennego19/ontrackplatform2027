import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

vi.mock('./components/mentordashboard', () => ({ default: () => <div>Mentor dashboard content</div> }));
vi.mock('./components/userdashboard', () => ({ default: () => <div>Student dashboard content</div> }));
vi.mock('./components/HelpRequests', () => ({ default: () => <div>Private help requests</div> }));

test('shows the sign-in page at the root route', () => {
  render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
  expect(screen.getByText('OnTrack Connect')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Admin Login' })).toBeInTheDocument();
});

test('the mentor dashboard accepts a verified mentor account', async () => {
  global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ success: true, user: { role: 'mentor' } }) });
  render(<MemoryRouter initialEntries={['/mentordashboard']}><App /></MemoryRouter>);
  expect(await screen.findByText('Mentor dashboard content')).toBeInTheDocument();
  delete global.fetch;
});

test('clears legacy dashboard caches and redirects students away from admin help requests', async () => {
  localStorage.setItem('dashboardCache', JSON.stringify({ secret: 'private request' }));
  localStorage.setItem('publicApiCache', JSON.stringify({ secret: 'old dashboard data' }));
  global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ success: true, user: { role: 'student' } }) });
  try {
    render(<MemoryRouter initialEntries={['/help-requests']}><App /></MemoryRouter>);
    expect(await screen.findByText('Student dashboard content')).toBeInTheDocument();
    expect(screen.queryByText('Private help requests')).not.toBeInTheDocument();
    expect(localStorage.getItem('dashboardCache')).toBeNull();
    expect(localStorage.getItem('publicApiCache')).toBeNull();
  } finally {
    delete global.fetch;
  }
});
