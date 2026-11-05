import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HelpRequests from './HelpRequests';
import { authAPI } from '../services/authMiddleware';
import { useDashboardApi } from '../hooks/useApi';

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('../hooks/useApi', () => ({
  useDashboardApi: vi.fn(() => ({ data: [], loading: false, error: null, refetch: mocks.refresh })),
}));
vi.mock('../services/authMiddleware', () => ({
  authAPI: { verifyToken: vi.fn() },
  tokenManager: { getToken: () => 'local-test-token', removeToken: vi.fn(), setToken: vi.fn() },
}));
vi.mock('./adminlogin', () => ({ default: () => <div>Administrator sign-in required</div> }));

beforeEach(() => useDashboardApi.mockClear());

test('a student cannot load administrator help requests', async () => {
  authAPI.verifyToken.mockResolvedValue({ success: true, user: { role: 'student' } });
  render(<MemoryRouter><HelpRequests /></MemoryRouter>);
  expect(await screen.findByText('Administrator sign-in required')).toBeInTheDocument();
  expect(useDashboardApi).not.toHaveBeenCalledWith('/help-requests/admin');
});

test('an administrator loads help requests and refreshes them every minute', async () => {
  const intervals = vi.spyOn(globalThis, 'setInterval');
  mocks.refresh.mockClear();
  authAPI.verifyToken.mockResolvedValue({ success: true, user: { role: 'admin' } });
  try {
    render(<MemoryRouter><HelpRequests /></MemoryRouter>);
    expect((await screen.findAllByText('Help Requests Management')).length).toBeGreaterThan(0);
    expect(useDashboardApi).toHaveBeenCalledWith('/help-requests/admin');
    const scheduledRefresh = intervals.mock.calls.find(([, milliseconds]) => milliseconds === 60000);
    expect(scheduledRefresh).toBeDefined();
    act(() => scheduledRefresh[0]());
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  } finally {
    intervals.mockRestore();
  }
});
