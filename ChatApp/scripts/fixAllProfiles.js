require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose    = require('mongoose')
const ConsentProfile = require('../models/ConsentProfile')

async function run() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set in .env')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  const all = await ConsentProfile.updateMany(
    {},
    { $set: { isComplete: true, completedAt: new Date() } }
  )

  console.log('Fixed', all.modifiedCount, 'profiles')

  const stuck = await ConsentProfile.countDocuments({ isComplete: { $ne: true } })
  console.log('Remaining incomplete:', stuck)

  const total = await ConsentProfile.countDocuments({})
  console.log('Total profiles in DB:', total)

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})
