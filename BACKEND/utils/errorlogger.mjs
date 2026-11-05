import { logError } from './logError.mjs';

// Route names and request details can contain personal data; do not log them.
// Keep the existing signature for any callers of this legacy helper.
export const logRouteError = (_routeName, error, _req) => {
  logError('Route operation failed:', error);
};
