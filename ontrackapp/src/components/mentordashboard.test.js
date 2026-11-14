import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import MentorDashboard from './mentordashboard';
import { mentorAuthAPI } from '../services/mentorAuthMiddleware';
import { tokenManager } from '../services/authMiddleware';

vi.mock('../services/mentorAuthMiddleware', () => ({ mentorAuthAPI: {
  getProfile: vi.fn(), getAssignedStudents: vi.fn(), getTasks: vi.fn(), getAssignments: vi.fn(),
  getProjects: vi.fn(), getResources: vi.fn(), updateAssignment: vi.fn(), updateProject: vi.fn()
} }));
vi.mock('../services/authMiddleware', () => ({ tokenManager: { getToken: vi.fn(), getStoredUser: vi.fn(), setStoredUser: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  tokenManager.getToken.mockReturnValue('test-token');
  tokenManager.getStoredUser.mockReturnValue({ name: 'Test Mentor' });
  mentorAuthAPI.getProfile.mockResolvedValue({ name: 'Test Mentor' });
  mentorAuthAPI.getAssignedStudents.mockResolvedValue([{ id: 'student-a', name: 'Student A' }, { id: 'student-b', name: 'Student B' }]);
  mentorAuthAPI.getTasks.mockResolvedValue([]);
  mentorAuthAPI.getResources.mockResolvedValue([]);
  mentorAuthAPI.getAssignments.mockResolvedValue([{ id: 'assignment-1', title: 'Assignment A', description: 'Details', dueDate: '2026-12-01', course: '', instructions: '', maxScore: 100, studentIds: ['student-a'] }]);
  mentorAuthAPI.getProjects.mockResolvedValue([{ id: 'project-1', title: 'Project A', description: 'Details', startDate: '2026-11-01', endDate: '2026-12-01', status: 'planning', studentIds: ['student-a'] }]);
  mentorAuthAPI.updateAssignment.mockImplementation(async (id, item) => item);
  mentorAuthAPI.updateProject.mockImplementation(async (id, item) => item);
});

test.each([
  ['Assignments', 'Assignment A', 'Update Assignment', 'updateAssignment'],
  ['Projects', 'Project A', 'Update Project', 'updateProject']
])('mentor can change selected students for %s', async (tab, title, submit, method) => {
  render(<MentorDashboard />);
  await screen.findByRole('button', { name: new RegExp(tab) });
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tab) }));
  await screen.findByText(title);
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  expect(screen.getByRole('checkbox', { name: 'Student A' })).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Student A' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Student B' }));
  fireEvent.click(screen.getByRole('button', { name: submit }));
  await waitFor(() => expect(mentorAuthAPI[method]).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ studentIds: ['student-b'] })));
});
