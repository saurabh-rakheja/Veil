const LoomConnection = require('../models/LoomConnection')
const Block          = require('../models/Block')

async function checkConnection(userId, otherUserId) {
  const [conn, blocked] = await Promise.all([
    LoomConnection.getConnection(userId, otherUserId),
    Block.findOne({
      $or: [
        { blockerId: userId,      blockedUserId: otherUserId },
        { blockerId: otherUserId, blockedUserId: userId      },
      ],
    }),
  ])

  if (blocked)             return { allowed: false, reason: 'blocked' }
  if (!conn || !conn.isActive) return { allowed: false, reason: 'not_connected' }

  return { allowed: true, connection: conn }
}

// Express middleware factory: derives otherUserId from req.params or req.body
function requireConnection(getOtherUserId) {
  return async (req, res, next) => {
    try {
      const { getAuth } = require('./requireAuth')
      const { userId }  = getAuth(req)
      if (!userId) return res.status(401).json({ error: 'Unauthorized' })

      const otherUserId = typeof getOtherUserId === 'function'
        ? getOtherUserId(req)
        : getOtherUserId

      const { allowed, reason } = await checkConnection(userId, otherUserId)
      if (!allowed) {
        const msg = reason === 'blocked'
          ? 'You are not connected with this user.'
          : 'You are not connected with this user.'
        return res.status(403).json({ error: msg })
      }

      next()
    } catch (err) {
      console.error('[requireConnection] error:', err)
      res.status(500).json({ error: 'Failed to verify connection.' })
    }
  }
}

module.exports = { requireConnection, checkConnection }
