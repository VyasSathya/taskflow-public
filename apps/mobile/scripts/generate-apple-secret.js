const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Configuration
const TEAM_ID = 'YOUR_TEAM_ID';
const KEY_ID = 'YOUR_KEY_ID'; // From your .p8 file
const P8_FILE_PATH = path.join(__dirname, '..', '..', 'Secrets', 'TaskFlow', 'AuthKey_YOUR_KEY_ID.p8');
const SERVICE_ID = 'com.taskflowapp.app.web'; // Your web service ID

try {
  // Read private key
  const privateKey = fs.readFileSync(P8_FILE_PATH, 'utf8');

  // Generate JWT payload
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 15777000; // 6 months in seconds

  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: now + expiresIn,
    aud: 'https://appleid.apple.com',
    sub: SERVICE_ID,
  };

  // Sign JWT
  const token = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: KEY_ID,
  });

  console.log('\n✅ Apple OAuth Secret Generated!\n');
  console.log('='.repeat(80));
  console.log(token);
  console.log('='.repeat(80));
  console.log('\nExpires:', new Date(Date.now() + 15777000000).toLocaleDateString());

} catch (error) {
  console.error('❌ Error:', error.message);
}
