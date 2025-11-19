// Generate a secure random session secret
const crypto = require('crypto');

console.log('\n========================================');
console.log('  Session Secret Generator');
console.log('========================================\n');

const secret = crypto.randomBytes(32).toString('hex');

console.log('Your secure session secret:');
console.log('----------------------------');
console.log(secret);
console.log('----------------------------\n');

console.log('Copy this value and use it as your SESSION_SECRET');
console.log('environment variable in Vercel.\n');

console.log('NEVER commit this to git or share it publicly!\n');

