const cron      = require('node-cron')
const Handshake = require('../models/Handshake')
const UserProfile = require('../models/UserProfile')
const { createAndEmit } = require('../services/notificationService')

function startExpireJob(io) {
  cron.schedule('0 * * * *', async () => {
    try {
      const expired = await Handshake.find({
        status:    'pending',
        expiresAt: { $lt: new Date() },
      }).select('_id initiatorId recipientId')

      if (expired.length === 0) return

      await Handshake.updateMany(
        { _id: { $in: expired.map(h => h._id) } },
        { $set: { status: 'expired' } }
      )

      console.log(`[expireHandshakes] Expired ${expired.length} handshake(s)`)

      for (const h of expired) {
        const recipientProfile = await UserProfile.findOne({ userId: h.recipientId })
        createAndEmit(io, h.initiatorId, 'handshake_expired', {
          actorId:          h.recipientId,
          actorDisplayName: recipientProfile?.displayName || null,
          handshakeId:      String(h._id),
        })
      }
    } catch (err) {
      console.error('[expireHandshakes] Error:', err)
    }
  })
}

module.exports = { startExpireJob }
