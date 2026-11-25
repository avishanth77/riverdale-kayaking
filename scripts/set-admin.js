require('dotenv').config();
const crypto = require('crypto');
const db = require('../db');

// Read command line arguments: node scripts/set-admin.js <username> <password>
const args = process.argv.slice(2);
const newUsername = args[0];
const newPassword = args[1];

if (!newUsername || !newPassword) {
  console.log('\n❌ Usage:');
  console.log('  node scripts/set-admin.js <new_username> <new_password>\n');
  console.log('Example:');
  console.log('  node scripts/set-admin.js avishanth mySecretPassword123\n');
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error('\n❌ Password must be at least 6 characters long.\n');
  process.exit(1);
}

async function run() {
  console.log('\n⏳ Connecting to database...');
  await db.initDB();

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.createHash('sha256').update(`${newPassword}:${salt}`).digest('hex');

  await db.saveAdminCredentials(newUsername.trim(), passwordHash, salt);

  console.log('\n✅ Admin credentials successfully updated!');
  console.log('-------------------------------------------');
  console.log(`👤 New Username : ${newUsername.trim()}`);
  console.log(`🔑 New Password : ${newPassword}`);
  console.log(`🗄️  Saved to     : ${db.isMongoConnected() ? 'MongoDB Cloud Database + data/admin.json' : 'data/admin.json'}`);
  console.log('-------------------------------------------\n');

  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Error updating credentials:', err.message);
  process.exit(1);
});
