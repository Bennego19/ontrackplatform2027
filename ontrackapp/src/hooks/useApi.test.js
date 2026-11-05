import { act, renderHook, waitFor } from '@testing-library/react';
import { useDashboardApi } from './useApi';
import { axiosWithRetry } from '../services/apiService';

vi.mock('../services/apiService', () => ({ axiosWithRetry: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  axiosWithRetry.mockReset();
});

test('private dashboard responses stay in memory and refetch retrieves fresh data', async () => {
  axiosWithRetry.mockResolvedValueOnce([{ topic: 'Private request' }]).mockResolvedValueOnce([{ topic: 'Updated request' }]);
  const { result, rerender } = renderHook(({ endpoint }) => useDashboardApi(endpoint), { initialProps: { endpoint: '/help-requests/admin' } });
  await waitFor(() => expect(result.current.data?.[0].topic).toBe('Private request'));
  expect(localStorage.getItem('dashboardCache')).toBeNull();

  act(() => result.current.refetch());
  await waitFor(() => expect(result.current.data?.[0].topic).toBe('Updated request'));
  expect(axiosWithRetry).toHaveBeenCalledTimes(2);
  expect(localStorage.getItem('dashboardCache')).toBeNull();

  rerender({ endpoint: null });
  expect(result.current.data).toBeNull();

  axiosWithRetry.mockReturnValueOnce(new Promise(() => {}));
  rerender({ endpoint: '/help-requests/admin' });
  expect(result.current.data).toBeNull();
});
