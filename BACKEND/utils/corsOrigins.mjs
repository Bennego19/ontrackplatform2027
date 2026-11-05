export function allowedCorsOrigins() {
  const production = process.env.NODE_ENV === 'production';
  const origins = ['https://platform.ontrackconnect.co.za'];
  if (!production) origins.push('http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173');
  for (const value of (process.env.CORS_EXTRA_ORIGINS || '').split(',').map(item => item.trim()).filter(Boolean)) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Invalid CORS_EXTRA_ORIGINS entry'); }
    if (url.origin !== value || !['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:')) {
      throw new Error('CORS_EXTRA_ORIGINS must contain exact HTTPS origins in production');
    }
    origins.push(value);
  }
  return [...new Set(origins)];
}
