const geoip      = require('geoip-lite')
const { getAuth } = require('./requireAuth')
const UserProfile = require('../models/UserProfile')

// Zone 1 — public content, no auth required
function requireZone1() {
  return (req, res, next) => next()
}

// Zone 2 — authenticated, not banned, not suspended
function requireZone2() {
  return async (req, res, next) => {
    try {
      const { userId } = getAuth(req)
      if (!userId) return res.status(401).json({ error: 'Authentication required.' })

      const profile = await UserProfile.findOne({ userId })
      if (!profile) return res.status(401).json({ error: 'Profile not found.' })

      if (profile.isBanned) {
        return res.status(403).json({ error: 'Account banned.', code: 'BANNED' })
      }
      if (profile.suspendedUntil && new Date(profile.suspendedUntil) > new Date()) {
        return res.status(403).json({ error: 'Account suspended.', code: 'SUSPENDED' })
      }

      req.userProfile = profile
      next()
    } catch (err) {
      console.error('[requireZone2]', err)
      res.status(500).json({ error: 'Access check failed.' })
    }
  }
}

// Zone 3 — Zone 2 requirements + explicit opt-in + phone verified + not in India
function requireZone3() {
  return async (req, res, next) => {
    try {
      const { userId } = getAuth(req)
      if (!userId) return res.status(401).json({ error: 'Authentication required.' })

      const profile = await UserProfile.findOne({ userId })
      if (!profile) return res.status(401).json({ error: 'Profile not found.' })

      // Zone 2 base checks
      if (profile.isBanned) {
        return res.status(403).json({ error: 'Account banned.', code: 'BANNED' })
      }
      if (profile.suspendedUntil && new Date(profile.suspendedUntil) > new Date()) {
        return res.status(403).json({ error: 'Account suspended.', code: 'SUSPENDED' })
      }

      // Zone 3 specific checks
      if (!profile.zone3OptedIn) {
        return res.status(403).json({
          error: 'Zone 3 access not enabled.',
          code: 'ZONE3_NOT_OPTED_IN',
        })
      }

      if (!['phone_verified', 'id_verified'].includes(profile.verificationTier)) {
        return res.status(403).json({
          error: 'Phone verification required for Zone 3 access.',
          code: 'VERIFICATION_REQUIRED',
        })
      }

      // IT Act Section 67A — geo-block India
      const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip
      const geo = geoip.lookup(clientIp)
      if (geo && geo.country === 'IN') {
        return res.status(451).json({
          error: 'This content is not available in your region.',
          code: 'GEO_RESTRICTED',
        })
      }

      req.userProfile = profile
      next()
    } catch (err) {
      console.error('[requireZone3]', err)
      res.status(500).json({ error: 'Access check failed.' })
    }
  }
}

module.exports = { requireZone1, requireZone2, requireZone3 }
