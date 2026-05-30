/**
 * Usage:
 *   node ChatApp/scripts/generateAdminInvites.js <clerkUserId> <count>
 *
 * Generates N invite codes owned by the given user. Codes bypass the
 * 5-code free-tier limit — use this to seed beta invites for admins.
 *
 * Example:
 *   node ChatApp/scripts/generateAdminInvites.js user_abc123 20
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose             = require('mongoose')
const InviteCode           = require('../models/InviteCode')
const { generateInviteCode } = require('../utils/generateInviteCode')

const [,, adminUserId, countArg] = process.argv
const count = parseInt(countArg, 10)

if (!adminUserId || isNaN(count) || count < 1) {
  console.error('Usage: node ChatApp/scripts/generateAdminInvites.js <clerkUserId> <count>')
  process.exit(1)
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log(`Generating ${count} invite code(s) for ${adminUserId}…`)

  const created = []
  for (let i = 0; i < count; i++) {
    let code
    let attempts = 0
    do {
      code = generateInviteCode()
      attempts++
    } while (await InviteCode.exists({ code }) && attempts < 20)

    await InviteCode.create({ code, createdByUserId: adminUserId })
    created.push(code)
  }

  console.log('\nCodes:')
  created.forEach(c => console.log(`  ${c}`))
  console.log(`\nDone. Share these with beta testers.`)
  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
