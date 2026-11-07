import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import axios from 'axios';
import Events from './events';
import ManageGraduate from './managegraduate';
import ManageInternship from './manageinternship';
import ManageMentorship from './managementorship';
import ManageSkillDevelopment from './manageskilldevelopment';
import ManageResources from './manageresources';
import userEvent from '@testing-library/user-event';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('../services/authMiddleware', () => ({ tokenManager: { getToken: () => 'test-token' } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

test.each([
  ['Graduate Program', ManageGraduate],
  ['Internship Program', ManageInternship],
  ['Mentorship Program', ManageMentorship],
  ['Skill Development Program', ManageSkillDevelopment]
])('%s edits only its own assessment with the API ID and canonical track', async (programme, Page) => {
  const item = { _id: 'assessment-123', assessmentname: 'Own item', assessmenttype: 'task', program: programme, track: 'Web Development', dateadded: '2026-01-01', datedue: '2026-01-02' };
  axios.get.mockResolvedValue({ data: [item, { ...item, _id: 'other-id', assessmentname: 'Other item', program: 'Other Program' }] });
  axios.patch.mockResolvedValue({ data: {} });
  render(<Page />);
  expect(screen.getByRole('option', { name: 'Web Development' })).toHaveValue('Web Development');
  fireEvent.click(screen.getByRole('button', { name: /Update Assessments/i }));
  const input = await screen.findByDisplayValue('Own item');
  expect(screen.queryByDisplayValue('Other item')).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'Updated item' } });
  fireEvent.click(screen.getByRole('button', { name: /Save/i }));
  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith('/api/assessments/assessment-123', expect.objectContaining({ assessmentname: 'Updated item', program: programme }), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })));
});

test.each([
  ['Graduate Program', ManageGraduate],
  ['Internship Program', ManageInternship],
  ['Mentorship Program', ManageMentorship],
  ['Skill Development Program', ManageSkillDevelopment]
])('%s creates content using the student track name', async (programme, Page) => {
  axios.get.mockResolvedValue({ data: [] });
  axios.post.mockResolvedValue({ data: { id: 'new-id', message: 'Created' } });
  const { container } = render(<Page />);
  fireEvent.change(screen.getByPlaceholderText('Enter Assessment Name'), { target: { value: 'New task' } });
  const selects = container.querySelectorAll('select');
  fireEvent.change(selects[0], { target: { value: 'task' } });
  fireEvent.change(selects[1], { target: { value: 'Web Development' } });
  const dates = container.querySelectorAll('input[type="date"]');
  fireEvent.change(dates[0], { target: { value: '2026-11-05' } });
  fireEvent.change(dates[1], { target: { value: '2026-11-06' } });
  fireEvent.click(container.querySelector('button[type="submit"]'));
  await waitFor(() => expect(axios.post).toHaveBeenCalled());
  const [url, form, options] = axios.post.mock.calls[0];
  expect(url).toBe('/api/assessments');
  expect(form.get('program')).toBe(programme);
  expect(form.get('track')).toBe('Web Development');
  expect(options.headers.Authorization).toBe('Bearer test-token');
});

test('event list, creation and update send the administrator token', async () => {
  const event = { _id: 'event-123', name: 'Existing event', description: 'Description', date: '2026-11-05', type: 'online', link: 'https://example.test' };
  const fetchMock = vi.fn(async (_url, options = {}) => ({ ok: true, json: async () => options.method ? {} : [event] }));
  vi.stubGlobal('fetch', fetchMock);
  const { container } = render(<Events />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
  fireEvent.change(screen.getByPlaceholderText('Enter event name'), { target: { value: 'New event' } });
  fireEvent.change(screen.getByPlaceholderText('Enter event description'), { target: { value: 'Description' } });
  fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-11-05' } });
  fireEvent.change(container.querySelector('select'), { target: { value: 'online' } });
  fireEvent.change(screen.getByPlaceholderText('https://example.com'), { target: { value: 'https://example.test' } });
  fireEvent.click(container.querySelector('button[type="submit"]'));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url, options]) => url === '/api/events' && options?.method === 'POST' && options.headers.Authorization === 'Bearer test-token')).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: /Update Events/i }));
  fireEvent.change(await screen.findByDisplayValue('Existing event'), { target: { value: 'Changed event' } });
  fireEvent.click(screen.getByRole('button', { name: /Save/i }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url, options]) => url === '/api/events/event-123' && options?.method === 'PATCH' && options.headers.Authorization === 'Bearer test-token')).toBe(true));
});

test('a successful resource upload clears the file input so the same file can be selected again', async () => {
  const fetchMock = vi.fn(async (url, options = {}) => ({
    ok: true,
    json: async () => options.method === 'POST' ? {} :
      url === '/api/programs' ? [{ _id: 'p', name: 'Mentorship Program' }] :
      url === '/api/tracks' ? [{ _id: 't', name: 'C# Programming' }] : []
  }));
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  const { container } = render(<ManageResources />);
  await screen.findByRole('option', { name: 'Mentorship Program' });
  await screen.findByRole('option', { name: 'C# Programming' });
  await user.type(screen.getByPlaceholderText('Enter resource name'), 'Test document');
  await user.type(screen.getByPlaceholderText('Enter resource description'), 'Preview only');
  const fileInput = container.querySelector('input[type="file"]');
  const document = new File(['preview test'], 'test.txt', { type: 'text/plain' });
  await user.upload(fileInput, document);
  const selects = container.querySelectorAll('select');
  await user.selectOptions(selects[0], 'Mentorship Program');
  await user.selectOptions(selects[1], 'C# Programming');
  await user.click(container.querySelector('button[type="submit"]'));
  await screen.findByText(/created successfully/i);
  const request = fetchMock.mock.calls.find(([url, options]) => url === '/api/resources' && options?.method === 'POST');
  expect(request[1].body.get('document')).toBe(document);
  expect(fileInput.files).toHaveLength(0);
  await user.upload(fileInput, document);
  expect(fileInput.files[0]).toBe(document);
});
