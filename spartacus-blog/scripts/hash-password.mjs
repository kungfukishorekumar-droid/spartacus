#!/usr/bin/env node
/**
 * Generate the value for ADMIN_PASSWORD_HASH.
 *
 *   npm run hash-password -- "your-admin-password"
 *
 * Paste the printed line into .env.local (locally) and into the Hostinger
 * Node.js app's environment variables (production). The plain password is
 * never stored anywhere.
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

function hash(password) {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;
}

let password = process.argv[2];
if (!password) {
  const rl = createInterface({ input: stdin, output: stdout });
  password = (await rl.question('Admin password: ')).trim();
  rl.close();
}

if (!password || password.length < 12) {
  console.error('Refusing: use a password of at least 12 characters.');
  process.exit(1);
}

console.log('\nAdd this line to .env.local and to your Hostinger env vars:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash(password)}`);
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString('hex')}\n`);
