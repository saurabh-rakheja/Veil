/**
 * Usage: node ChatApp/scripts/makeAdmin.js <clerkUserId>
 * Run from the project root (Loom/) directory.
 *
 * Sets isAdmin: true on the UserProfile with the given Clerk userId.
 * If no UserProfile exists for that userId, one is created.
 *
 * Example:
 *   node ChatApp/scripts/makeAdmin.js user_2abc123xyz
 *
 * To generate the ADMIN_PASSWORD_HASH for .env, run:
 *   node -e "require('bcryptjs').hash('yourpassword', 12).then(h => console.log(h))"
 *   (run from ChatApp/ directory after npm install)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../ChatApp/.env') })
const mongoose    = require('mongoose')
const UserProfile = require('../models/UserProfile')

const userId = process.argv[2]
if (!userId) {
  console.error('Usage: node ChatApp/scripts/makeAdmin.js <clerkUserId>')
  process.exit(1)
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/volunteerManagement')
  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $set: { isAdmin: true } },
    { upsert: true, new: true }
  )
  console.log(`✓ ${userId} is now an admin (displayName: "${profile.displayName || '(none)'}")`)
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
