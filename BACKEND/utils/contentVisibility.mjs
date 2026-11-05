// A record with both fields requires both to match. Records targeting only one
// field remain available to that programme or track; general records are shared.
export function contentVisibility(user) {
  const programme = typeof user?.program === 'string' && user.program.trim() ? user.program : null;
  const track = typeof user?.track === 'string' && user.track.trim() ? user.track : null;
  const missing = field => ({ $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: '' }] });
  // Explicit targeting always takes precedence over a legacy general flag.
  const options = [{ $and: [{ isGeneral: true }, missing('program'), missing('track')] }];
  if (programme && track) options.push({ program: programme, track });
  if (programme) options.push({ $and: [{ program: programme }, missing('track')] });
  if (track) options.push({ $and: [{ track }, missing('program')] });
  return { $or: options };
}
