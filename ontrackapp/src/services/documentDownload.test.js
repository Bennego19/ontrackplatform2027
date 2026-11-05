import { downloadDocument } from './documentDownload';

test('downloads a same-origin API file without sending the token to external URLs', async () => {
  const originalFetch = window.fetch;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.useFakeTimers();
  localStorage.setItem('authToken', 'local-test-token');
  window.fetch = vi.fn().mockResolvedValue({
    ok: true, headers: new Headers({ 'content-disposition': 'attachment; filename="guide.txt"' }),
    blob: async () => new Blob(['hello'])
  });
  URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
  URL.revokeObjectURL = vi.fn();
  try {
    await expect(downloadDocument('https://other.example/api/files/507f1f77bcf86cd799439011')).rejects.toThrow('Invalid document link');
    expect(window.fetch).not.toHaveBeenCalled();
    await downloadDocument('/api/files/507f1f77bcf86cd799439011');
    expect(window.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer local-test-token');
    expect(click).toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  } finally {
    localStorage.removeItem('authToken');
    window.fetch = originalFetch;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    click.mockRestore();
    vi.useRealTimers();
  }
});
