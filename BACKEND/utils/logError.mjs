// Database and third-party errors can contain credentials or personal data.
// Keep production logs useful without recording their messages, stacks or data.
const knownTypes = new Set([
  'Error', 'TypeError', 'RangeError', 'SyntaxError',
  'MongoError', 'MongoServerError', 'MongoNetworkError',
  'MongoServerSelectionError', 'MongoParseError',
  'JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'
]);
const knownCodes = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EADDRINUSE']);

export function logError(context, error) {
  const details = { type: knownTypes.has(error?.name) ? error.name : 'Error' };
  if (Number.isSafeInteger(error?.code)) details.code = error.code;
  else if (knownCodes.has(error?.code)) details.code = error.code;
  console.error(context, details);
}
