// The legacy administrator-debug endpoint could disclose account records.
console.error('Disabled: administrator debugging is not supported.');
process.exitCode = 1;
