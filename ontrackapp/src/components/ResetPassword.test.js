import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword from './ResetPassword';

test('removes the reset token from the address bar and submits matching passwords', async () => {
  const originalFetch = window.fetch;
  const token = 'A'.repeat(43);
  window.history.replaceState(null, '', `/reset-password#${token}`);
  window.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'Password updated. You can now sign in.' }) });
  try {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    expect(window.location.hash).toBe('');
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'a-secure-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'a-secure-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    await waitFor(() => expect(screen.getByText('Password updated. You can now sign in.')).toBeInTheDocument());
    const [url, options] = window.fetch.mock.calls[0];
    expect(url).toBe('/api/password-reset/redeem');
    expect(JSON.parse(options.body)).toEqual({ token, password: 'a-secure-password' });
  } finally {
    window.fetch = originalFetch;
    window.history.replaceState(null, '', '/');
  }
});
