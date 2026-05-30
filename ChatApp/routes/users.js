/**
 * routes/users.js
 * User profile management — update profile, data export, Zone 3 opt-in,
 * and permanent account deletion (cascades to Clerk + all DB records).
 */

const { Router }               = require('express')
const { requireAuth, getAuth } = require('../middleware/requireAuth')
const { clerkClient }          = require('@clerk/express')
const UserProfile              = require('../models/UserProfile')
const ConsentProfile           = require('../models/ConsentProfile')
const Handshake                = require('../models/Handshake')
const LoomConnection           = require('../models/LoomConnection')
const Block                    = require('../models/Block')
const { logAuditEvent }        = require('../utils/auditLogger')

const router = Router()

const ALLOWED_PROFILE_FIELDS = ['displayName', 'city', 'bio', 'pronouns', 'isProfileVisible', 'notificationPreferences']

// PATCH /api/users/profile — update own UserProfile
router.patch('/profile', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req)
    const update = {}
    for (const key of ALLOWED_PROFILE_FIELDS) {
      if (key in req.body) update[key] = req.body[key]
    }

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    )

    logAuditEvent(userId, 'profile_updated', {
      metadata: { fields: Object.keys(update) },
      ip: req.ip,
    })

    res.json({ profile })
  } catch (err) {
    console.error('[users/profile PATCH] error:', err)
    res.status(500).json({ error: 'Failed to update profile.' })
  }
})

// GET /api/users/profile — get own UserProfile
router.get('/profile', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req)
    const profile = await UserProfile.findOne({ userId })
    res.json({ profile: profile || {} })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' })
  }
})

// POST /api/users/data-export — export all user data
router.post('/data-export', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req)
    const [profile, consentProfile, handshakes, connections, blocks] = await Promise.all([
      UserProfile.findOne({ userId }).lean(),
      ConsentProfile.findOne({ userId }).lean(),
      Handshake.find({ $or: [{ initiatorId: userId }, { recipientId: userId }] }).lean(),
      LoomConnection.find({ $or: [{ userAId: userId }, { userBId: userId }] }).lean(),
      Block.find({ blockerId: userId }).lean(),
    ])

    logAuditEvent(userId, 'profile_updated', {
      metadata: { action: 'data_export_requested' },
      ip: req.ip,
    })

    res.json({
      exportedAt: new Date(),
      userId,
      profile:        profile        || null,
      consentProfile: consentProfile || null,
      handshakes:     handshakes     || [],
      connections:    connections    || [],
      blocks:         blocks         || [],
    })
  } catch (err) {
    console.error('[users/data-export] error:', err)
    res.status(500).json({ error: 'Failed to export data.' })
  }
})

// POST /api/users/zone3-opt-in — record explicit Zone 3 consent
router.post('/zone3-opt-in', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req)

    const profile = await UserProfile.findOne({ userId })
    if (!profile) return res.status(404).json({ error: 'Profile not found.' })

    if (!['phone_verified', 'id_verified'].includes(profile.verificationTier)) {
      return res.status(403).json({
        error: 'Phone verification is required to access Zone 3.',
        code: 'VERIFICATION_REQUIRED',
      })
    }

    await UserProfile.updateOne(
      { userId },
      { $set: { zone3OptedIn: true, zone3OptedInAt: new Date() } }
    )

    logAuditEvent(userId, 'zone3_opted_in', {
      metadata: { verificationTier: profile.verificationTier },
      ip: req.ip,
    })

    res.json({ success: true })
  } catch (err) {
    console.error('[users/zone3-opt-in] error:', err)
    res.status(500).json({ error: 'Failed to enable Zone 3 access.' })
  }
})

// POST /api/users/delete-account — permanently delete account
router.post('/delete-account', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req)
    console.log('[delete-account] starting for:', userId)

    // Step 1 — Delete from Clerk first. If this fails, stop immediately.
    try {
      await clerkClient.users.deleteUser(userId)
      console.log('[delete-account] Clerk user deleted:', userId)
    } catch (clerkErr) {
      console.error('[delete-account] Clerk deletion failed:', clerkErr)
      return res.status(500).json({
        error: 'Failed to delete account from authentication system: ' + clerkErr.message,
      })
    }

    // Step 2 — Mark UserProfile as deleted (not visible, banned)
    await UserProfile.findOneAndUpdate(
      { userId },
      { $set: { isProfileVisible: false, isBanned: true } }
    )
    console.log('[delete-account] UserProfile marked deleted')

    // Step 3 — Delete consent profile
    await ConsentProfile.deleteOne({ userId })
    console.log('[delete-account] ConsentProfile deleted')

    // Step 4 — Deactivate all connections
    await LoomConnection.updateMany(
      { $or: [{ userAId: userId }, { userBId: userId }] },
      { $set: { isActive: false } }
    )
    console.log('[delete-account] connections deactivated')

    // Step 5 — Cancel pending handshakes
    await Handshake.updateMany(
      {
        $or: [{ initiatorId: userId }, { recipientId: userId }],
        status: 'pending',
      },
      { $set: { status: 'withdrawn' } }
    )
    console.log('[delete-account] pending handshakes cancelled')

    // Step 6 — Set retention on existing audit logs
    const retainUntil = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
    await logAuditEvent(userId, 'account_deleted', { ip: req.ip, retainUntil })
    console.log('[delete-account] complete for:', userId)

    res.json({ success: true })
  } catch (err) {
    console.error('[users/delete-account] error:', err)
    res.status(500).json({ error: 'Failed to delete account.' })
  }
})

module.exports = router
