import { stdin, stderr } from 'node:process';

export async function readPassword(prompt = 'Password: ') {
  if (!stdin.isTTY) {
    let input = '';
    for await (const chunk of stdin) input += chunk;
    return input.replace(/\r?\n$/, '');
  }
  stderr.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  return await new Promise((resolve, reject) => {
    let input = '';
    stdin.setEncoding('utf8');
    stdin.on('data', function onData(chunk) {
      for (const character of chunk) {
        if (character === '\u0003') {
          stdin.off('data', onData); stdin.setRawMode(false); stdin.pause();
          reject(new Error('Cancelled'));
          return;
        }
        if (character === '\r' || character === '\n') {
          stdin.off('data', onData); stdin.setRawMode(false); stdin.pause(); stderr.write('\n');
          resolve(input);
          return;
        }
        if (character === '\u007f' || character === '\b') input = input.slice(0, -1);
        else if (character >= ' ') input += character;
      }
    });
  });
}
