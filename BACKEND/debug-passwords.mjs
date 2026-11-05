// The legacy password-debug endpoint could disclose account credentials.
console.error('Disabled: password debugging is not supported.');
process.exitCode = 1;
