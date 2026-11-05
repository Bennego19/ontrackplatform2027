import axios from 'axios';
import { installApiAuthentication } from './apiAuthentication';
import { apiClient } from './apiService';

test('adds tokens only to same-origin API requests and preserves explicit authorization', async () => {
  const originalFetch = window.fetch;
  const fakeFetch = vi.fn().mockResolvedValue({ ok: true });
  window.fetch = fakeFetch;
  localStorage.setItem('authToken', 'local-test-token');
  installApiAuthentication();
  try {
    await window.fetch('/api/events');
    expect(fakeFetch.mock.calls[0][1].headers.get('authorization')).toBe('Bearer local-test-token');
    await window.fetch('https://other.example/api/events');
    expect(fakeFetch.mock.calls[1][1].headers).toBeUndefined();
    await window.fetch('/api/events', { headers: { Authorization: 'Bearer explicit' } });
    expect(fakeFetch.mock.calls[2][1].headers.get('authorization')).toBe('Bearer explicit');

    let captured;
    await axios.get('/api/events', { adapter: async config => { captured = config; return { data: {}, status: 200, statusText: 'OK', headers: {}, config }; } });
    expect(captured.headers.Authorization).toBe('Bearer local-test-token');
    await axios.get('https://other.example/api/events', { adapter: async config => { captured = config; return { data: {}, status: 200, statusText: 'OK', headers: {}, config }; } });
    expect(captured.headers.Authorization).toBeUndefined();
    await apiClient.get('https://other.example/api/events', { adapter: async config => { captured = config; return { data: {}, status: 200, statusText: 'OK', headers: {}, config }; } });
    expect(captured.headers.Authorization).toBeUndefined();
  } finally {
    localStorage.removeItem('authToken');
    window.fetch = originalFetch;
    axios.interceptors.request.clear();
  }
});
