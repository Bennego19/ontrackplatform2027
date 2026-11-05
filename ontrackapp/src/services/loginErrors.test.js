import { authAPI } from './authMiddleware';
import { mentorAuthAPI } from './mentorAuthMiddleware';

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

test.each([
  ['student', authAPI.login],
  ['administrator', authAPI.adminLogin],
  ['mentor', mentorAuthAPI.login]
])('%s sign-in handles a non-JSON hosting error', async (_role, login) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new SyntaxError('Unexpected HTML'); } }));
  await expect(login('user', 'password')).rejects.toThrow('The server returned an unexpected response. Please try again shortly.');
});

test('student sign-in preserves useful API validation errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Invalid credentials' }) }));
  await expect(authAPI.login('user', 'password')).rejects.toThrow('Invalid credentials');
});
