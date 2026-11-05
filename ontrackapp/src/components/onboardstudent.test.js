import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ManageStudents from './onboardstudent';
import { tokenManager } from '../services/authMiddleware';

// Mock the authMiddleware
vi.mock('../services/authMiddleware', () => ({
  tokenManager: {
    getToken: vi.fn(() => 'mock-jwt-token'),
  },
  authAPI: {},
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('ManageStudents Component - Authentication Headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenManager.getToken.mockReturnValue('mock-jwt-token');
    // Mock successful fetch responses
    fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );
  });

  test('loadStudents includes Authorization header', async () => {
    render(<ManageStudents />);

    // Wait for the component to load and call loadStudents
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/onboardstudents', {
        headers: {
          'Authorization': 'Bearer mock-jwt-token',
          'Content-Type': 'application/json'
        }
      });
    });
  });

  test('handleCreateSubmit includes Authorization header', async () => {
    render(<ManageStudents />);

    // Fill out the form
    fireEvent.change(screen.getByPlaceholderText('Enter first name'), {
      target: { value: 'John' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter last name'), {
      target: { value: 'Doe' }
    });
    fireEvent.change(screen.getByPlaceholderText('student@example.com'), {
      target: { value: 'john.doe@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('0122342569'), {
      target: { value: '0123456789' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Username'), {
      target: { value: 'johndoe' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Password'), {
      target: { value: 'Password123!' }
    });

    // Select program and track
    fireEvent.change(screen.getByDisplayValue('-- Select Program --'), {
      target: { value: 'Mentorship Program' }
    });
    fireEvent.change(screen.getByDisplayValue('-- Select Track --'), {
      target: { value: 'Web Development' }
    });

    // Mock successful creation response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );

    // Click create button
    fireEvent.click(screen.getByText('➕ Create Student'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/onboardstudents/onboardstudent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: JSON.stringify({
          name: 'John',
          surname: 'Doe',
          email: 'john.doe@example.com',
          cellnumber: '0123456789',
          username: 'johndoe',
          password: 'Password123!',
          program: 'Mentorship Program',
          track: 'Web Development'
        })
      });
    });
  });

  test('loadStudentsForUpdate includes Authorization header', async () => {
    render(<ManageStudents />);

    // Switch to update tab
    fireEvent.click(screen.getByText('Update Students'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/onboardstudents', {
        headers: {
          'Authorization': 'Bearer mock-jwt-token',
          'Content-Type': 'application/json'
        }
      });
    });
  });

  test('updateStudent includes Authorization header', async () => {
    // Mock students data
    const mockStudents = [{
      _id: '123',
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@example.com',
      cellnumber: '0123456789',
      program: 'Mentorship Program',
      track: 'Web Development',
      accessAllowed: 'granted'
    }];

    fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockStudents),
      })
    );

    render(<ManageStudents />);

    // Switch to update tab
    fireEvent.click(screen.getByText('Update Students'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/onboardstudents', expect.any(Object));
    });

    // Mock successful update response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );

    // Click save button (assuming student data is loaded)
    const saveButtons = screen.getAllByText('💾 Save');
    if (saveButtons.length > 0) {
      fireEvent.click(saveButtons[0]);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/onboardstudents/123', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          },
          body: expect.any(String)
        });
      });
    }
  });

  test('student access can be deactivated and restored without removing the row', async () => {
    // Mock students data
    const mockStudents = [{
      _id: '123',
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@example.com',
      program: 'Mentorship Program',
      track: 'Web Development',
      accessAllowed: 'granted'
    }];

    fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockStudents),
      })
    );

    render(<ManageStudents />);

    fireEvent.click(screen.getByText('Manage Access'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/onboardstudents', expect.any(Object));
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/onboardstudents/123/access', {
      method: 'PATCH', headers: { 'Authorization': 'Bearer mock-jwt-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ active: false })
    }));
    fireEvent.click(await screen.findByRole('button', { name: 'Activate' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/onboardstudents/123/access', {
      method: 'PATCH', headers: { 'Authorization': 'Bearer mock-jwt-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true })
    }));
  });

  test('handles authentication errors gracefully', async () => {
    // Mock failed authentication response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      })
    );

    render(<ManageStudents />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load students.')).toBeInTheDocument();
    });
  });

  test('creates a single-use reset link for a student', async () => {
    fetch.mockImplementation(url => Promise.resolve({
      ok: true,
      json: async () => url.includes('/password-reset/')
        ? { token: 'A'.repeat(43) }
        : [{ _id: '123', name: 'Test', surname: 'Student', username: 'teststudent', accessAllowed: 'granted' }]
    }));
    render(<ManageStudents />);
    fireEvent.click(screen.getByRole('button', { name: 'View Students' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reset password for teststudent' }));
    const field = await screen.findByLabelText('Student password reset link');
    expect(field.value).toContain(`/reset-password#${'A'.repeat(43)}`);
    expect(fetch).toHaveBeenCalledWith('/api/password-reset/issue/123', expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer mock-jwt-token' } }));
  });

  test('handles network errors gracefully', async () => {
    // Mock network error
    fetch.mockImplementationOnce(() =>
      Promise.reject(new Error('Network error'))
    );

    render(<ManageStudents />);

    await waitFor(() => {
      expect(screen.getByText('Network error loading students.')).toBeInTheDocument();
    });
  });
});
