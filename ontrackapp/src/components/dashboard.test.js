import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './dashboard';
import { authAPI, tokenManager } from '../services/authMiddleware';
import { useDashboardApi } from '../hooks/useApi';

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('../hooks/useApi', () => ({
  useDashboardApi: vi.fn(() => ({ data: null, loading: false, error: null, refetch: mocks.refresh })),
  usePublicApi: vi.fn(() => ({ data: null, loading: false, error: null, refetch: mocks.refresh })),
}));
vi.mock('../services/authMiddleware', () => ({
  authAPI: { verifyToken: vi.fn() },
  tokenManager: { getToken: vi.fn(), removeToken: vi.fn() },
}));
vi.mock('react-chartjs-2', () => ({ Pie: () => null, Bar: () => null }));

test('a verified superadministrator can see and load the admin dashboard', async () => {
  const intervals = vi.spyOn(globalThis, 'setInterval');
  mocks.refresh.mockClear();
  tokenManager.getToken.mockReturnValue('local-test-token');
  authAPI.verifyToken.mockResolvedValue({ success: true, user: { role: 'superadmin', name: 'Test Admin' } });
  try {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument();
    expect(useDashboardApi).toHaveBeenCalledWith('/onboardstudents/total-students');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(mocks.refresh).toHaveBeenCalledTimes(11);
    const scheduledRefresh = intervals.mock.calls.find(([, milliseconds]) => milliseconds === 60000);
    expect(scheduledRefresh).toBeDefined();
    act(() => scheduledRefresh[0]());
    expect(mocks.refresh).toHaveBeenCalledTimes(22);
  } finally {
    intervals.mockRestore();
  }
});
