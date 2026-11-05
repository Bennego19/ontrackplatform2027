// Treat filter text literally rather than allowing callers to supply regexes.
export function exactCaseInsensitive(value) {
  if (typeof value !== 'string' || value.length > 200) throw new TypeError('Invalid filter');
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}
